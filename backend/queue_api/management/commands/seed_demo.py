import os
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from queue_api.models import AppointmentSlot, Department, Doctor, Hospital, PatientProfile, StaffProfile


User = get_user_model()


class Command(BaseCommand):
    help = "Create clearly labeled QueueFree demo hospitals, users, doctors, and appointment slots."

    def handle(self, *args, **options):
        from django.conf import settings

        if not settings.DEBUG and os.environ.get("ALLOW_DEMO_ACCOUNTS", "").lower() != "true":
            raise CommandError("Demo staff accounts are disabled outside DEBUG. Set ALLOW_DEMO_ACCOUNTS=true only for a demo deployment.")
        password = os.environ.get("DEMO_SEED_PASSWORD")
        if not password or len(password) < 12:
            raise CommandError("Set DEMO_SEED_PASSWORD to a value of at least 12 characters before seeding.")

        specs = [
            ("QueueFree API Demo Hospital", "Dehradun", Hospital.IntegrationType.API, "https://api-demo.example.test/book", True),
            ("QueueFree Website Demo Clinic", "Dehradun", Hospital.IntegrationType.WEBSITE, "https://booking.example.test", False),
            ("QueueFree Managed Demo Hospital", "Bengaluru", Hospital.IntegrationType.QUEUEFREE, "", True),
        ]
        for name, city, mode, url, payment_required in specs:
            hospital, _ = Hospital.objects.update_or_create(
                name=name,
                city=city,
                defaults={
                    "integration_type": mode,
                    "integration_configured": False,
                    "is_demo": True,
                    "official_booking_url": url,
                    "website": url,
                    "address": f"Demo address, {city}",
                    "phone": "+91-00000-00000",
                    "payment_required": payment_required,
                    "consultation_fee": Decimal("350.00") if payment_required else Decimal("0.00"),
                    "cancellation_policy": {
                        "more_than_24_hours": 100,
                        "between_6_and_24_hours": 75,
                        "less_than_6_hours": 50,
                        "no_show": 0,
                        "doctor_unavailable": 100,
                        "duplicate_payment": 100,
                    },
                },
            )
            for name_in_dept, code in [("General Medicine", "gen-med"), ("Cardiology", "cardio")]:
                department, _ = Department.objects.get_or_create(hospital=hospital, code=code, defaults={"name": name_in_dept})
                doctor, _ = Doctor.objects.get_or_create(
                    department=department,
                    display_name="Dr. Demo " + ("Rao" if code == "gen-med" else "Shah"),
                    defaults={"available_weekdays": [0, 1, 2, 3, 4, 5, 6]},
                )
                for day_offset in range(0, 8):
                    appointment_day = date.today() + timedelta(days=day_offset)
                    for hour, minute in [(9, 0), (9, 30), (10, 0), (10, 30), (11, 0), (11, 30)]:
                        AppointmentSlot.objects.get_or_create(
                            doctor=doctor,
                            appointment_date=appointment_day,
                            start_time=time(hour, minute),
                            defaults={"capacity": 1 if mode == Hospital.IntegrationType.QUEUEFREE else 3},
                        )

        reception_password = os.environ.get("DEMO_RECEPTION_PASSWORD") or password
        doctor_password = os.environ.get("DEMO_DOCTOR_PASSWORD") or password
        self._create_staff("reception.demo", "Reception Demo", Hospital.objects.get(name=specs[2][0]), StaffProfile.Role.RECEPTION, reception_password)
        doctor = Doctor.objects.filter(department__hospital__name=specs[2][0]).order_by("pk").first()
        self._create_staff("doctor.demo", "Doctor Demo", doctor.department.hospital, StaffProfile.Role.DOCTOR, doctor_password, doctor)
        patient_user, _ = User.objects.get_or_create(username="patient-demo")
        patient_user.set_password(password)
        patient_user.save()
        PatientProfile.objects.update_or_create(
            user=patient_user,
            defaults={"abha_demo_identifier": "DEMO-ABHA-0000-0001", "display_name": "Demo patient"},
        )
        self.stdout.write(self.style.SUCCESS("Demo facilities, accounts, and availability are ready."))

    def _create_staff(self, username, first_name, hospital, role, password, doctor=None):
        user, _ = User.objects.get_or_create(username=username, defaults={"first_name": first_name})
        user.first_name = first_name
        user.set_password(password)
        user.save()
        StaffProfile.objects.update_or_create(
            user=user,
            defaults={"hospital": hospital, "role": role, "doctor": doctor},
        )
