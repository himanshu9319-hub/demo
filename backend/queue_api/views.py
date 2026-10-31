import uuid
from datetime import date

from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .adapters import adapter_for
from .models import AppointmentSlot, AuditLog, Booking, Department, Doctor, Hospital, PatientProfile, Payment, QueueControl, StaffProfile
from .permissions import IsHospitalAdmin, IsHospitalStaff, IsPatient
from .serializers import (
    BookingCreateSerializer, BookingSerializer, CancelSerializer, DemoPatientLoginSerializer,
    DepartmentSerializer, DoctorSerializer, HospitalSerializer, PatientPhoneLoginSerializer,
    PatientVerifyAbhaSerializer, QueueActionSerializer, RescheduleSerializer, StaffLoginSerializer,
)
from .services import Conflict, ServiceUnavailable, available_slots, cancel_booking, create_booking, get_patient, perform_queue_action, staff_for

User = get_user_model()


def tokens_for(user, role):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = role
    return {"access": str(refresh.access_token), "refresh": str(refresh), "role": role}


class PatientDemoLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DemoPatientLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["abha_demo_identifier"]
        phone = serializer.validated_data["phone"]
        user, _ = User.objects.get_or_create(username="patient-" + identifier.lower())
        profile, _ = PatientProfile.objects.get_or_create(
            user=user,
            defaults={"abha_demo_identifier": identifier, "display_name": "QueueFree demo patient"},
        )
        if profile.abha_demo_identifier != identifier:
            raise APIException("The demo identity is already associated with another account.")
        profile.phone = phone
        profile.consent_preferences = {
            **profile.consent_preferences,
            "whatsapp_queue_notifications": True,
            "whatsapp_queue_notifications_consented_at": timezone.now().isoformat(),
        }
        profile.save(update_fields=["phone", "consent_preferences"])
        return Response(tokens_for(user, "patient"))


class PatientPhoneLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PatientPhoneLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        email = (serializer.validated_data.get("email") or "").strip()
        name = (serializer.validated_data.get("name") or "").strip()

        if not name and email:
            user_part = email.split("@")[0].replace(".", " ").replace("_", " ").replace("-", " ")
            name = " ".join(w.capitalize() for w in user_part.split() if not w.isdigit()) or "Patient User"
        if not name:
            name = "Patient User"

        clean_phone = "".join(ch for ch in phone if ch.isdigit())
        username = f"patient-phone-{clean_phone}"
        user, _ = User.objects.get_or_create(username=username)
        temp_abha = f"PENDING-ABHA-{clean_phone[-8:]}"
        profile, created = PatientProfile.objects.get_or_create(
            user=user,
            defaults={"abha_demo_identifier": temp_abha, "display_name": name, "phone": phone, "email": email},
        )
        update_fields = []
        if not created:
            if name and profile.display_name != name:
                profile.display_name = name
                update_fields.append("display_name")
            if phone and profile.phone != phone:
                profile.phone = phone
                update_fields.append("phone")
            if email and profile.email != email:
                profile.email = email
                update_fields.append("email")
            if update_fields:
                profile.save(update_fields=update_fields)

        is_verified = bool(profile.abha_demo_identifier and not profile.abha_demo_identifier.startswith("PENDING-"))
        tokens = tokens_for(user, "patient")
        tokens["abha_verified"] = is_verified
        tokens["abha_id"] = profile.abha_demo_identifier if is_verified else ""
        tokens["display_name"] = profile.display_name
        tokens["phone"] = profile.phone
        tokens["email"] = profile.email or email
        return Response(tokens)


class PatientVerifyAbhaView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def post(self, request):
        serializer = PatientVerifyAbhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        abha_id = serializer.validated_data["abha_identifier"]
        patient = get_patient(request.user)
        existing = PatientProfile.objects.filter(abha_demo_identifier=abha_id).exclude(pk=patient.pk).first()
        if existing:
            raise ValidationError({"abha": "This ABHA ID is already linked to another patient profile."})
        patient.abha_demo_identifier = abha_id
        patient.consent_preferences = {
            **patient.consent_preferences,
            "whatsapp_queue_notifications": serializer.validated_data.get("whatsapp_notifications_consent", True),
            "whatsapp_queue_notifications_consented_at": timezone.now().isoformat(),
        }
        patient.save(update_fields=["abha_demo_identifier", "consent_preferences"])
        return Response({
            "status": "verified",
            "abha_id": abha_id,
            "message": "ABHA ID verified and linked to your patient profile successfully.",
        })


class StaffLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StaffLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, username=serializer.validated_data["username"], password=serializer.validated_data["password"])
        if not user or not hasattr(user, "staff_profile"):
            return Response({"error": {"code": "invalid_credentials", "message": "Invalid demo staff credentials.", "details": None}}, status=401)
        staff = user.staff_profile
        return Response({**tokens_for(user, staff.role), "hospital_id": staff.hospital_id})


class HospitalListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = HospitalSerializer
    queryset = Hospital.objects.filter(is_active=True)

    def get_queryset(self):
        queryset = super().get_queryset()
        city = self.request.query_params.get("city")
        if city:
            queryset = queryset.filter(city__iexact=city)
        return queryset


class HospitalDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = HospitalSerializer
    queryset = Hospital.objects.filter(is_active=True)
    lookup_url_kwarg = "hospital_id"


class DepartmentListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.filter(hospital_id=self.kwargs["hospital_id"], hospital__is_active=True, is_active=True)


class DoctorListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = DoctorSerializer

    def get_queryset(self):
        queryset = Doctor.objects.filter(is_available=True, department__is_active=True, department__hospital__is_active=True)
        department_id = self.request.query_params.get("department_id")
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        return queryset


class AvailabilityView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            doctor_id = int(request.query_params["doctor_id"])
            day = date.fromisoformat(request.query_params["date"])
        except (KeyError, ValueError):
            raise ValidationError({"date": "Provide doctor_id and a valid ISO date (YYYY-MM-DD)."})
        doctor = get_object_or_404(Doctor.objects.select_related("department__hospital"), pk=doctor_id, is_available=True)
        if not doctor.department.hospital.is_active:
            raise NotFound("Hospital is inactive.")
        slots = available_slots(doctor, day)
        integration = doctor.department.hospital.integration_type
        if integration == Hospital.IntegrationType.API:
            try:
                adapter = adapter_for(doctor.department.hospital)
            except NotImplementedError as exc:
                raise ServiceUnavailable("No authorized hospital availability adapter is configured.") from exc
            adapter_status = {item["slot_id"]: item["available"] for item in adapter.availability(doctor.department.hospital, slots)}
        else:
            adapter_status = {}
        results = []
        for slot in slots:
            available = slot.capacity - slot.active_bookings > 0
            if integration == Hospital.IntegrationType.API:
                available = adapter_status.get(slot.pk, False)
            if integration == Hospital.IntegrationType.API:
                slot_remaining = int(available)
            else:
                slot_remaining = max(0, slot.capacity - slot.active_bookings)
            results.append({
                "id": slot.pk,
                "time": slot.start_time.strftime("%H:%M"),
                "available": available,
                "remaining": slot_remaining,
                "capacity": slot.capacity,
            })
        return Response({"doctor_id": doctor.pk, "date": day.isoformat(), "integration_type": integration, "slots": results})


class PatientBookingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.filter(patient=get_patient(self.request.user)).select_related(
            "hospital", "department", "doctor", "slot", "patient"
        ).prefetch_related("payments__refunds")

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking, created = create_booking(request.user, serializer.validated_data)
        response = BookingSerializer(booking, context={"request": request}).data
        response["created"] = created
        response["message"] = "Booking confirmed by the explicitly simulated hospital API adapter." if booking.authoritative_external else "QueueFree-managed demo token confirmed."
        return Response(response, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PatientBookingDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = BookingSerializer
    lookup_url_kwarg = "booking_id"

    def get_queryset(self):
        return Booking.objects.filter(patient=get_patient(self.request.user)).select_related("hospital", "department", "doctor", "slot", "patient").prefetch_related("payments__refunds")


class PatientCancelView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def post(self, request, booking_id):
        serializer = CancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = get_patient(request.user)
        booking = get_object_or_404(Booking.objects.select_related("hospital", "slot"), pk=booking_id)
        result, refund, percentage = cancel_booking(booking, patient, serializer.validated_data["reason"], request.user)
        return Response({
            "booking": BookingSerializer(result, context={"request": request}).data,
            "refund": {"amount": str(refund), "percentage": percentage, "status": "simulated" if refund else "not_applicable"},
        })


class PatientRescheduleView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def post(self, request, booking_id):
        serializer = RescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = get_patient(request.user)
        with transaction.atomic():
            booking = get_object_or_404(
                Booking.objects.select_for_update().select_related("hospital", "doctor", "slot", "patient"),
                pk=booking_id,
                patient=patient,
            )
            if booking.status not in {Booking.Status.WAITING, Booking.Status.ARRIVED}:
                raise Conflict("Only a waiting booking can be rescheduled.")
            if booking.authoritative_external:
                raise Conflict("This hospital manages the booking; use its official booking service to reschedule.")
            Hospital.objects.select_for_update().get(pk=booking.hospital_id)
            new_slot = get_object_or_404(
                AppointmentSlot.objects.select_for_update(),
                pk=serializer.validated_data["slot_id"],
                doctor=booking.doctor,
                appointment_date=serializer.validated_data["date"],
            )
            occupied = Booking.objects.filter(
                slot=new_slot,
                status__in=[Booking.Status.WAITING, Booking.Status.ARRIVED, Booking.Status.SERVING],
            ).exclude(pk=booking.pk).count()
            if occupied >= new_slot.capacity:
                raise Conflict("This slot is no longer available.")
            booking.slot = new_slot
            booking.appointment_date = serializer.validated_data["date"]
            booking.save(update_fields=["slot", "appointment_date", "updated_at"])
            AuditLog.objects.create(hospital=booking.hospital, actor=request.user, booking=booking, action="booking.rescheduled")
        return Response(BookingSerializer(booking, context={"request": request}).data)


class DemoPaymentConfirmView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def post(self, request, booking_id):
        if not settings.DEMO_PAYMENTS_ENABLED:
            raise APIException("No payment provider is configured; payment has not been confirmed.")
        booking = get_object_or_404(Booking, pk=booking_id, patient=get_patient(request.user), hospital__payment_required=True)
        payment = booking.payments.order_by("-created_at").first()
        if not payment:
            raise NotFound("Payment record was not found.")
        if payment.status != Payment.Status.SUCCEEDED:
            payment.status = Payment.Status.SUCCEEDED
            payment.provider = "demo"
            payment.provider_reference = "DEMO-PAY-" + str(booking.pk)[:8]
            payment.simulated = True
            payment.save(update_fields=["status", "provider", "provider_reference", "simulated", "updated_at"])
            booking.payment_state = Booking.PaymentState.PAID
            booking.save(update_fields=["payment_state", "updated_at"])
            AuditLog.objects.create(hospital=booking.hospital, actor=request.user, booking=booking, action="payment.demo_confirmed")
        return Response({"status": "succeeded", "simulated": True, "booking": BookingSerializer(booking, context={"request": request}).data})


class StaffQueueView(APIView):
    permission_classes = [IsAuthenticated, IsHospitalStaff]

    def get(self, request):
        staff = staff_for(request.user)
        day_text = request.query_params.get("date", timezone.localdate().isoformat())
        try:
            day = date.fromisoformat(day_text)
        except ValueError as exc:
            raise ValidationError({"date": "Provide an ISO date (YYYY-MM-DD)."}) from exc
        bookings = Booking.objects.filter(hospital=staff.hospital, appointment_date=day).exclude(
            status=Booking.Status.CANCELLED
        ).select_related("hospital", "department", "doctor", "patient", "slot")
        if staff.role == StaffProfile.Role.DOCTOR:
            bookings = bookings.filter(doctor=staff.doctor)
        return Response({
            "hospital": HospitalSerializer(staff.hospital).data,
            "role": staff.role,
            "paused": QueueControl.objects.filter(
                hospital=staff.hospital,
                doctor=staff.doctor if staff.role == StaffProfile.Role.DOCTOR else None,
                appointment_date=day,
                paused=True,
            ).exists(),
            "bookings": BookingSerializer(bookings, many=True, context={"request": request}).data,
        })


class StaffQueueActionView(APIView):
    permission_classes = [IsAuthenticated, IsHospitalStaff]

    def post(self, request, booking_id):
        serializer = QueueActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = perform_queue_action(request.user, booking_id, serializer.validated_data["action"])
        booking.refresh_from_db()
        return Response(BookingSerializer(booking, context={"request": request}).data)


class StaffQueueControlView(APIView):
    permission_classes = [IsAuthenticated, IsHospitalStaff]

    def post(self, request):
        staff = staff_for(request.user)
        action = request.data.get("action")
        if action not in {"pause", "resume"}:
            raise ValidationError({"action": "Choose pause or resume."})
        try:
            day = date.fromisoformat(request.data.get("date", timezone.localdate().isoformat()))
        except ValueError as exc:
            raise ValidationError({"date": "Provide an ISO date (YYYY-MM-DD)."}) from exc
        QueueControl.objects.update_or_create(
            hospital=staff.hospital,
            doctor=staff.doctor if staff.role == StaffProfile.Role.DOCTOR else None,
            appointment_date=day,
            defaults={"paused": action == "pause"},
        )
        AuditLog.objects.create(hospital=staff.hospital, actor=request.user, action="queue." + action)
        return Response({"paused": action == "pause", "date": day.isoformat()})


class IntegrationAdminView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsHospitalAdmin]
    serializer_class = HospitalSerializer
    queryset = Hospital.objects.all()
