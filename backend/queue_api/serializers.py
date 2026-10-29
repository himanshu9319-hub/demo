from datetime import date

from django.utils import timezone
from rest_framework import serializers

from .models import AppointmentSlot, Booking, Department, Doctor, Hospital, Payment, Refund


class HospitalSerializer(serializers.ModelSerializer):
    integration_label = serializers.CharField(read_only=True)
    booking_behavior = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            "id", "name", "city", "address", "phone", "website", "latitude", "longitude",
            "integration_type", "integration_label", "integration_configured", "is_demo", "official_booking_url",
            "payment_required", "consultation_fee", "currency", "booking_behavior",
        ]

    def get_booking_behavior(self, hospital):
        if hospital.integration_type == Hospital.IntegrationType.API:
            return "QueueFree demo adapter; no hospital API credentials are configured"
        if hospital.integration_type == Hospital.IntegrationType.WEBSITE:
            return "Continue on the hospital's official booking website"
        return "QueueFree-managed demo queue"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "code"]


class DoctorSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Doctor
        fields = ["id", "display_name", "department", "department_name", "average_consultation_minutes", "is_available", "delay_minutes", "delay_reason"]


class BookingSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    hospital_city = serializers.CharField(source="hospital.city", read_only=True)
    hospital_integration_type = serializers.CharField(source="hospital.integration_type", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.display_name", read_only=True)
    slot_time = serializers.TimeField(source="slot.start_time", read_only=True, format="%H:%M")
    patient_display_name = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    refund_amount = serializers.SerializerMethodField()
    queue_position = serializers.SerializerMethodField()
    estimated_wait_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "hospital", "hospital_name", "hospital_city", "hospital_integration_type", "department",
            "department_name", "doctor", "doctor_name", "appointment_date", "slot_time", "token_number",
            "status", "payment_state", "integration_reference", "authoritative_external", "patient_display_name",
            "payment", "refund_amount", "queue_position", "estimated_wait_minutes", "created_at", "updated_at",
        ]

    def get_patient_display_name(self, booking):
        name = booking.patient.display_name
        if not name or name == "QueueFree demo patient":
            return "Demo patient"
        parts = name.split()
        return parts[0] + (" " + parts[-1][0] + "." if len(parts) > 1 else "")

    def get_payment(self, booking):
        payment = booking.payments.order_by("-created_at").first()
        if not payment:
            return {"status": "not_required", "amount": "0.00", "currency": booking.hospital.currency, "simulated": True}
        return {
            "status": payment.status,
            "amount": str(payment.amount),
            "currency": payment.currency,
            "simulated": payment.simulated,
        }

    def get_refund_amount(self, booking):
        return str(sum((refund.amount for payment in booking.payments.all() for refund in payment.refunds.all()), start=0))

    def get_queue_position(self, booking):
        if booking.authoritative_external:
            return None
        if booking.status not in {Booking.Status.WAITING, Booking.Status.ARRIVED}:
            return None
        before = Booking.objects.filter(
            hospital=booking.hospital,
            doctor=booking.doctor,
            appointment_date=booking.appointment_date,
            status__in=[Booking.Status.WAITING, Booking.Status.ARRIVED, Booking.Status.SERVING],
            created_at__lt=booking.created_at,
        ).count()
        return before + 1

    def get_estimated_wait_minutes(self, booking):
        if booking.authoritative_external:
            return None
        position = self.get_queue_position(booking)
        if position is None:
            return 0
        return max(0, (position - 1) * booking.doctor.average_consultation_minutes + booking.doctor.delay_minutes)


class BookingCreateSerializer(serializers.Serializer):
    hospital_id = serializers.IntegerField()
    department_id = serializers.IntegerField()
    doctor_id = serializers.IntegerField()
    date = serializers.DateField()
    slot_id = serializers.IntegerField()
    idempotency_key = serializers.CharField(max_length=120)

    def validate(self, attrs):
        if attrs["date"] < timezone.localdate():
            raise serializers.ValidationError({"date": "Appointment date cannot be in the past."})
        return attrs


class DemoPatientLoginSerializer(serializers.Serializer):
    abha_demo_identifier = serializers.RegexField(r"^DEMO-ABHA-[0-9]{4}-[0-9]{4}$", max_length=40)
    phone = serializers.RegexField(r"^\+[1-9][0-9]{7,14}$", max_length=16)
    whatsapp_notifications_consent = serializers.BooleanField()

    def validate_whatsapp_notifications_consent(self, value):
        if not value:
            raise serializers.ValidationError("Consent is required to continue with the demo sign-in.")
        return value


class StaffLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class QueueActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["call_next", "complete", "skip", "pause", "resume", "arrived", "missed"])


class CancelSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=["patient_request", "doctor_unavailable", "duplicate_payment"])


class RescheduleSerializer(serializers.Serializer):
    date = serializers.DateField()
    slot_id = serializers.IntegerField()
