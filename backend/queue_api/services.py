from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError

from .adapters import adapter_for
from .models import AppointmentSlot, AuditLog, Booking, Hospital, Payment, PatientProfile, QueueControl, Refund, StaffProfile


class Conflict(APIException):
    status_code = 409
    default_code = "conflict"
    default_detail = "The requested resource is no longer available."


class ServiceUnavailable(APIException):
    status_code = 503
    default_code = "service_unavailable"
    default_detail = "The required booking or payment service is unavailable."


def event_audit(action, booking, actor=None, metadata=None):
    AuditLog.objects.create(
        hospital=booking.hospital if booking else None,
        actor=actor,
        booking=booking,
        action=action,
        metadata=metadata or {},
    )


def get_patient(user):
    try:
        return user.patient_profile
    except Exception as exc:
        raise PermissionDenied("A patient profile is required.") from exc


def available_slots(doctor, day):
    return AppointmentSlot.objects.filter(doctor=doctor, appointment_date=day).annotate(
        active_bookings=Count(
            "bookings",
            filter=~Q(
                bookings__status__in=[Booking.Status.CANCELLED, Booking.Status.MISSED]
            ),
        )
    )


def _allocate_managed_token(hospital, department, day):
    token_count = Booking.objects.filter(hospital=hospital, department=department, appointment_date=day).count()
    return f"{department.code.upper()}-{token_count + 1:03d}"


@transaction.atomic
def create_booking(user, data):
    patient = PatientProfile.objects.select_for_update().get(pk=get_patient(user).pk)
    existing = Booking.objects.filter(patient=patient, idempotency_key=data["idempotency_key"]).first()
    if existing:
        return existing, False

    try:
        hospital = Hospital.objects.select_for_update().get(pk=data["hospital_id"], is_active=True)
    except Hospital.DoesNotExist as exc:
        raise NotFound("Hospital was not found or is inactive.") from exc

    existing = Booking.objects.filter(patient=patient, idempotency_key=data["idempotency_key"]).first()
    if existing:
        return existing, False

    department_id = data["department_id"]
    doctor_id = data["doctor_id"]
    day = data["date"]
    if not hospital.departments.filter(pk=department_id, is_active=True).exists():
        raise ValidationError({"department_id": "Department does not belong to this hospital."})
    try:
        doctor = hospital.departments.get(pk=department_id).doctors.get(pk=doctor_id, is_available=True)
    except Exception as exc:
        raise ValidationError({"doctor_id": "Doctor is unavailable or does not belong to this department."}) from exc

    if hospital.integration_type == Hospital.IntegrationType.WEBSITE:
        raise Conflict({
            "code": "external_booking_required",
            "message": "This hospital confirms appointments on its official website; QueueFree has not booked a token.",
            "official_booking_url": hospital.official_booking_url or hospital.website,
        })

    if Booking.objects.filter(
        patient=patient,
        status__in=[Booking.Status.WAITING, Booking.Status.SERVING, Booking.Status.ARRIVED, Booking.Status.EXTERNAL],
    ).exists():
        raise Conflict("You already have an active booking. Cancel or complete it before making another.")

    if hospital.payment_required and not settings.DEMO_PAYMENTS_ENABLED:
        raise ServiceUnavailable("This hospital requires payment, but no payment provider is configured. No booking was created.")

    if hospital.integration_type == Hospital.IntegrationType.API:
        if not hospital.integration_configured:
            adapter = adapter_for(hospital)
        else:
            try:
                adapter = adapter_for(hospital)
            except NotImplementedError as exc:
                raise ServiceUnavailable("No authorized hospital API adapter is configured. No booking was created.") from exc
    else:
        adapter = None

    try:
        slot = AppointmentSlot.objects.select_for_update().get(
            pk=data["slot_id"], doctor=doctor, appointment_date=day
        )
    except AppointmentSlot.DoesNotExist as exc:
        raise Conflict("The selected slot is no longer available.") from exc

    active_statuses = [Booking.Status.WAITING, Booking.Status.SERVING, Booking.Status.ARRIVED, Booking.Status.EXTERNAL]
    current_count = Booking.objects.filter(slot=slot, status__in=active_statuses).count()
    if hospital.integration_type == Hospital.IntegrationType.QUEUEFREE and current_count >= slot.capacity:
        raise Conflict("This slot is no longer available. Refresh availability and choose another time.")

    if adapter:
        availability = adapter.availability(hospital, [slot])
        if not any(item["slot_id"] == slot.pk and item["available"] for item in availability):
            raise Conflict("The hospital reports that this slot is no longer available.")
        reservation = adapter.reserve(hospital, slot, data["idempotency_key"])
        token_number = reservation["token_number"]
        integration_reference = reservation["reference"]
        status = Booking.Status.WAITING
        external = True
    else:
        token_number = _allocate_managed_token(hospital, doctor.department, day)
        integration_reference = ""
        status = Booking.Status.WAITING
        external = False

    payment_state = Booking.PaymentState.NOT_REQUIRED
    if hospital.payment_required:
        payment_state = Booking.PaymentState.PENDING

    booking = Booking.objects.create(
        hospital=hospital,
        department=doctor.department,
        doctor=doctor,
        patient=patient,
        slot=slot,
        appointment_date=day,
        token_number=token_number,
        status=status,
        payment_state=payment_state,
        integration_reference=integration_reference,
        authoritative_external=external,
        idempotency_key=data["idempotency_key"],
    )
    if hospital.payment_required:
        payment_status = Payment.Status.SUCCEEDED if settings.DEMO_PAYMENTS_ENABLED else Payment.Status.PENDING
        payment = Payment.objects.create(
            booking=booking,
            amount=hospital.consultation_fee,
            currency=hospital.currency,
            status=payment_status,
            provider="demo" if settings.DEMO_PAYMENTS_ENABLED else "unconfigured",
            provider_reference="DEMO-PAY-" + str(booking.pk)[:8] if settings.DEMO_PAYMENTS_ENABLED else "",
            simulated=True,
        )
        if payment.status == Payment.Status.SUCCEEDED:
            booking.payment_state = Booking.PaymentState.PAID
            booking.save(update_fields=["payment_state", "updated_at"])
    event_audit("booking.created", booking, user, {"integration_type": hospital.integration_type})
    return booking, True


@transaction.atomic
def cancel_booking(booking, patient, reason, actor):
    booking = Booking.objects.select_for_update().select_related("hospital").get(pk=booking.pk)
    if booking.patient_id != patient.pk:
        raise PermissionDenied("You can only cancel your own booking.")
    if booking.status not in {Booking.Status.WAITING, Booking.Status.ARRIVED}:
        raise Conflict("Only a waiting or arrived booking can be cancelled.")
    if booking.authoritative_external:
        raise Conflict("This hospital owns the booking. Contact its booking service to cancel; QueueFree did not allocate the token.")

    policy = booking.hospital.cancellation_policy
    if reason == "doctor_unavailable":
        percentage = int(policy.get("doctor_unavailable", 100))
    elif reason == "duplicate_payment":
        percentage = int(policy.get("duplicate_payment", 100))
    else:
        hours = (datetime.combine(booking.appointment_date, booking.slot.start_time, tzinfo=timezone.get_current_timezone()) - timezone.now()).total_seconds() / 3600
        if hours > 24:
            percentage = int(policy.get("more_than_24_hours", 100))
        elif hours >= 6:
            percentage = int(policy.get("between_6_and_24_hours", 75))
        else:
            percentage = int(policy.get("less_than_6_hours", 50))

    booking.status = Booking.Status.CANCELLED
    booking.save(update_fields=["status", "updated_at"])
    refund_total = Decimal("0.00")
    payment = booking.payments.filter(status=Payment.Status.SUCCEEDED).order_by("-created_at").first()
    if payment and percentage:
        previously_refunded = sum((refund.amount for refund in payment.refunds.all()), Decimal("0.00"))
        refund_total = min(payment.amount - previously_refunded, (payment.amount * percentage / 100).quantize(Decimal("0.01")))
        if refund_total > 0:
            Refund.objects.create(
                payment=payment,
                amount=refund_total,
                currency=payment.currency,
                status="simulated",
                reason=reason,
                provider_reference="DEMO-REFUND-" + str(booking.pk)[:8],
            )
            total_refunded = previously_refunded + refund_total
            booking.payment_state = Booking.PaymentState.REFUNDED if total_refunded >= payment.amount else Booking.PaymentState.PARTIALLY_REFUNDED
            booking.save(update_fields=["payment_state", "updated_at"])
    event_audit("booking.cancelled", booking, actor, {"reason": reason, "refund_amount": str(refund_total), "simulated": True})
    return booking, refund_total, percentage


def staff_for(user):
    try:
        return user.staff_profile
    except StaffProfile.DoesNotExist as exc:
        raise PermissionDenied("A hospital staff profile is required.") from exc


@transaction.atomic
def perform_queue_action(user, booking_id, action):
    staff = staff_for(user)
    booking = Booking.objects.select_for_update().select_related("hospital", "doctor").get(pk=booking_id)
    if booking.hospital_id != staff.hospital_id:
        raise PermissionDenied("You cannot access bookings for another hospital.")
    if booking.authoritative_external:
        raise Conflict("The hospital system owns this queue. QueueFree cannot change its status.")
    if staff.role == StaffProfile.Role.DOCTOR and staff.doctor_id != booking.doctor_id:
        raise PermissionDenied("Doctors can only act on their assigned patients.")
    if action in {"pause", "resume"}:
        QueueControl.objects.update_or_create(
            hospital=booking.hospital,
            doctor=booking.doctor,
            appointment_date=booking.appointment_date,
            defaults={"paused": action == "pause"},
        )
        event_audit("queue." + action, booking, user)
        return booking

    if action == "call_next":
        current = Booking.objects.select_for_update().filter(
            hospital=booking.hospital, doctor=booking.doctor, appointment_date=booking.appointment_date,
            status=Booking.Status.SERVING,
        ).first()
        if current:
            current.status = Booking.Status.COMPLETED
            current.save(update_fields=["status", "updated_at"])
        next_booking = Booking.objects.select_for_update().filter(
            hospital=booking.hospital, doctor=booking.doctor, appointment_date=booking.appointment_date,
            status__in=[Booking.Status.WAITING, Booking.Status.ARRIVED],
        ).order_by("created_at").first()
        if next_booking:
            next_booking.status = Booking.Status.SERVING
            next_booking.save(update_fields=["status", "updated_at"])
            booking = next_booking
    elif action == "complete":
        booking.status = Booking.Status.COMPLETED
    elif action == "skip":
        booking.status = Booking.Status.SKIPPED
    elif action == "arrived":
        if booking.status != Booking.Status.WAITING:
            raise Conflict("Only waiting bookings can be marked arrived.")
        booking.status = Booking.Status.ARRIVED
    elif action == "missed":
        if booking.status not in {Booking.Status.WAITING, Booking.Status.ARRIVED}:
            raise Conflict("Only waiting or arrived bookings can be marked missed.")
        booking.status = Booking.Status.MISSED
    booking.save(update_fields=["status", "updated_at"])
    event_audit("queue." + action, booking, user)
    return booking
