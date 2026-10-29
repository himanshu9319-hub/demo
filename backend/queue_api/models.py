import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


def default_cancellation_policy():
    return {
        "more_than_24_hours": 100,
        "between_6_and_24_hours": 75,
        "less_than_6_hours": 50,
        "no_show": 0,
        "doctor_unavailable": 100,
        "duplicate_payment": 100,
    }


class Hospital(models.Model):
    class IntegrationType(models.TextChoices):
        API = "A", "API integrated"
        WEBSITE = "B", "Website booking"
        QUEUEFREE = "C", "QueueFree managed"

    name = models.CharField(max_length=180)
    integration_type = models.CharField(max_length=1, choices=IntegrationType.choices)
    integration_configured = models.BooleanField(default=False)
    is_demo = models.BooleanField(default=False)
    official_booking_url = models.URLField(blank=True)
    city = models.CharField(max_length=120)
    address = models.CharField(max_length=240, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    website = models.URLField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    payment_required = models.BooleanField(default=False)
    consultation_fee = models.DecimalField(max_digits=9, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="INR")
    cancellation_policy = models.JSONField(default=default_cancellation_policy)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["city", "name"]

    def __str__(self):
        return f"{self.name} ({self.city})"

    @property
    def integration_label(self):
        return self.get_integration_type_display()


class Department(models.Model):
    hospital = models.ForeignKey(Hospital, related_name="departments", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    code = models.SlugField(max_length=24)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["hospital", "code"], name="unique_hospital_department")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.hospital.name} - {self.name}"


class Doctor(models.Model):
    department = models.ForeignKey(Department, related_name="doctors", on_delete=models.CASCADE)
    display_name = models.CharField(max_length=120)
    average_consultation_minutes = models.PositiveSmallIntegerField(default=10)
    is_available = models.BooleanField(default=True)
    delay_minutes = models.PositiveSmallIntegerField(default=0)
    delay_reason = models.CharField(max_length=180, blank=True)
    available_weekdays = models.JSONField(default=list)

    class Meta:
        ordering = ["display_name"]


class PatientProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="patient_profile", on_delete=models.CASCADE)
    abha_demo_identifier = models.CharField(max_length=40, unique=True)
    display_name = models.CharField(max_length=120, default="QueueFree demo patient")
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    preferred_language = models.CharField(max_length=8, default="en")
    consent_preferences = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


class StaffProfile(models.Model):
    class Role(models.TextChoices):
        RECEPTION = "reception", "Reception"
        DOCTOR = "doctor", "Doctor"
        ADMIN = "hospital_admin", "Hospital admin"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="staff_profile", on_delete=models.CASCADE)
    hospital = models.ForeignKey(Hospital, related_name="staff", on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices)
    doctor = models.ForeignKey(Doctor, null=True, blank=True, on_delete=models.SET_NULL)


class AppointmentSlot(models.Model):
    doctor = models.ForeignKey(Doctor, related_name="slots", on_delete=models.CASCADE)
    appointment_date = models.DateField()
    start_time = models.TimeField()
    capacity = models.PositiveSmallIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["doctor", "appointment_date", "start_time"], name="unique_doctor_slot"),
            models.CheckConstraint(condition=Q(capacity__gt=0), name="slot_capacity_positive"),
        ]
        ordering = ["appointment_date", "start_time"]


class QueueControl(models.Model):
    hospital = models.ForeignKey(Hospital, related_name="queue_controls", on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, related_name="queue_controls", null=True, blank=True, on_delete=models.CASCADE)
    appointment_date = models.DateField()
    paused = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["hospital", "doctor", "appointment_date"], name="unique_queue_control")]


class Booking(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        SERVING = "serving", "Serving"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"
        ARRIVED = "arrived", "Arrived"
        MISSED = "missed", "Missed"
        CANCELLED = "cancelled", "Cancelled"
        EXTERNAL = "external_pending", "Awaiting hospital confirmation"

    class PaymentState(models.TextChoices):
        NOT_REQUIRED = "not_required", "Not required"
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        REFUNDED = "refunded", "Refunded"
        PARTIALLY_REFUNDED = "partially_refunded", "Partially refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital = models.ForeignKey(Hospital, related_name="bookings", on_delete=models.PROTECT)
    department = models.ForeignKey(Department, related_name="bookings", on_delete=models.PROTECT)
    doctor = models.ForeignKey(Doctor, related_name="bookings", on_delete=models.PROTECT)
    patient = models.ForeignKey(PatientProfile, related_name="bookings", on_delete=models.PROTECT)
    slot = models.ForeignKey(AppointmentSlot, related_name="bookings", on_delete=models.PROTECT)
    appointment_date = models.DateField()
    token_number = models.CharField(max_length=40)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.WAITING)
    payment_state = models.CharField(max_length=24, choices=PaymentState.choices, default=PaymentState.NOT_REQUIRED)
    integration_reference = models.CharField(max_length=120, blank=True)
    authoritative_external = models.BooleanField(default=False)
    idempotency_key = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["patient", "idempotency_key"], name="unique_patient_idempotency"),
            models.UniqueConstraint(fields=["hospital", "department", "appointment_date", "token_number"], name="unique_daily_token"),
        ]
        ordering = ["appointment_date", "slot__start_time", "token_number"]


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    booking = models.ForeignKey(Booking, related_name="payments", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=9, decimal_places=2)
    currency = models.CharField(max_length=3)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    provider = models.CharField(max_length=32, default="demo")
    provider_reference = models.CharField(max_length=120, blank=True)
    simulated = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Refund(models.Model):
    payment = models.ForeignKey(Payment, related_name="refunds", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=9, decimal_places=2)
    currency = models.CharField(max_length=3)
    status = models.CharField(max_length=16, default="simulated")
    reason = models.CharField(max_length=40)
    provider_reference = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    hospital = models.ForeignKey(Hospital, null=True, blank=True, on_delete=models.SET_NULL)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    booking = models.ForeignKey(Booking, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
