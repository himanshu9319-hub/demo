from concurrent.futures import ThreadPoolExecutor
from datetime import date, time, timedelta
from decimal import Decimal
from unittest import skipUnless
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from .models import AppointmentSlot, Booking, Department, Doctor, Hospital, PatientProfile, Payment, StaffProfile


User = get_user_model()


class DemoPatientLoginTests(APITestCase):
    def test_demo_login_requires_phone_and_notification_consent(self):
        response = self.client.post(
            "/api/v1/auth/patient/demo/",
            {
                "abha_demo_identifier": "DEMO-ABHA-3000-3000",
                "phone": "+919876543210",
                "whatsapp_notifications_consent": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username="patient-demo-abha-3000-3000").exists())

    def test_demo_login_saves_phone_and_notification_consent(self):
        response = self.client.post(
            "/api/v1/auth/patient/demo/",
            {
                "abha_demo_identifier": "DEMO-ABHA-3001-3001",
                "phone": "+919876543210",
                "whatsapp_notifications_consent": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        profile = PatientProfile.objects.get(user__username="patient-demo-abha-3001-3001")
        self.assertEqual(profile.phone, "+919876543210")
        self.assertTrue(profile.consent_preferences["whatsapp_queue_notifications"])
        self.assertIn("whatsapp_queue_notifications_consented_at", profile.consent_preferences)
        self.assertNotIn("phone", response.data)


class BookingApiTests(APITestCase):
    def setUp(self):
        self.patient_user = User.objects.create_user(username="patient-a", password="test-password")
        self.patient = PatientProfile.objects.create(
            user=self.patient_user,
            abha_demo_identifier="DEMO-ABHA-1000-1000",
            display_name="Test Patient",
        )
        self.hospital = Hospital.objects.create(
            name="Managed Test Hospital",
            integration_type=Hospital.IntegrationType.QUEUEFREE,
            city="Test City",
            cancellation_policy={
                "more_than_24_hours": 100,
                "between_6_and_24_hours": 75,
                "less_than_6_hours": 50,
                "no_show": 0,
                "doctor_unavailable": 100,
                "duplicate_payment": 100,
            },
        )
        self.department = Department.objects.create(hospital=self.hospital, name="General Medicine", code="gen")
        self.doctor = Doctor.objects.create(department=self.department, display_name="Dr. Test")
        self.other_hospital = Hospital.objects.create(
            name="Other Test Hospital",
            integration_type=Hospital.IntegrationType.QUEUEFREE,
            city="Other City",
        )
        self.other_department = Department.objects.create(hospital=self.other_hospital, name="Cardiology", code="cardio")
        self.other_doctor = Doctor.objects.create(department=self.other_department, display_name="Dr. Other")
        self.day = date.today() + timedelta(days=3)
        self.slot = AppointmentSlot.objects.create(doctor=self.doctor, appointment_date=self.day, start_time=time(10), capacity=1)
        self.other_slot = AppointmentSlot.objects.create(doctor=self.other_doctor, appointment_date=self.day, start_time=time(10), capacity=1)
        self.client.force_authenticate(self.patient_user)

    def payload(self, slot=None, hospital=None, department=None, doctor=None, key=None):
        return {
            "hospital_id": (hospital or self.hospital).pk,
            "department_id": (department or self.department).pk,
            "doctor_id": (doctor or self.doctor).pk,
            "date": self.day.isoformat(),
            "slot_id": (slot or self.slot).pk,
            "idempotency_key": key or str(uuid4()),
        }

    def make_booking(self, **kwargs):
        response = self.client.post("/api/v1/bookings/", self.payload(**kwargs), format="json")
        self.assertIn(response.status_code, [200, 201], response.data)
        return response.data

    def test_type_c_booking_appears_in_scoped_reception_queue(self):
        booking = self.make_booking()
        staff_user = User.objects.create_user(username="reception", password="test-password")
        StaffProfile.objects.create(user=staff_user, hospital=self.hospital, role=StaffProfile.Role.RECEPTION)
        staff_client = APIClient()
        staff_client.force_authenticate(staff_user)
        response = staff_client.get("/api/v1/staff/queue/", {"date": self.day.isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data["bookings"]], [booking["id"]])
        self.assertEqual(response.data["bookings"][0]["patient_display_name"], "Test P.")

    def test_hospital_a_booking_is_not_visible_to_hospital_b(self):
        self.make_booking()
        other_staff = User.objects.create_user(username="other-reception", password="test-password")
        StaffProfile.objects.create(user=other_staff, hospital=self.other_hospital, role=StaffProfile.Role.RECEPTION)
        staff_client = APIClient()
        staff_client.force_authenticate(other_staff)
        response = staff_client.get("/api/v1/staff/queue/", {"date": self.day.isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["bookings"], [])

    def test_repeated_idempotency_key_returns_original_token(self):
        key = str(uuid4())
        first = self.make_booking(key=key)
        second = self.make_booking(key=key)
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(Booking.objects.count(), 1)

    @patch("queue_api.services.adapter_for")
    def test_type_a_delegates_reservation_without_claiming_real_api(self, adapter_for_mock):
        hospital = Hospital.objects.create(
            name="API Demo",
            integration_type=Hospital.IntegrationType.API,
            integration_configured=False,
            city="Test City",
        )
        department = Department.objects.create(hospital=hospital, name="General Medicine", code="api-gen")
        doctor = Doctor.objects.create(department=department, display_name="Dr. API")
        slot = AppointmentSlot.objects.create(doctor=doctor, appointment_date=self.day, start_time=time(11), capacity=2)
        adapter = adapter_for_mock.return_value
        adapter.availability.return_value = [{"slot_id": slot.pk, "available": True}]
        adapter.reserve.return_value = {"reference": "DEMO-REF-1", "token_number": "API-1001", "simulated": True}
        result = self.make_booking(slot=slot, hospital=hospital, department=department, doctor=doctor)
        adapter.availability.assert_called_once()
        adapter.reserve.assert_called_once()
        self.assertEqual(result["token_number"], "API-1001")
        self.assertTrue(result["authoritative_external"])
        self.assertEqual(Booking.objects.filter(hospital=hospital).count(), 1)

    def test_type_b_does_not_create_queuefree_booking(self):
        hospital = Hospital.objects.create(
            name="Website Test",
            integration_type=Hospital.IntegrationType.WEBSITE,
            official_booking_url="https://booking.example.test/",
            city="Test City",
        )
        department = Department.objects.create(hospital=hospital, name="General Medicine", code="web-gen")
        doctor = Doctor.objects.create(department=department, display_name="Dr. Website")
        slot = AppointmentSlot.objects.create(doctor=doctor, appointment_date=self.day, start_time=time(11), capacity=1)
        response = self.client.post(
            "/api/v1/bookings/",
            self.payload(slot=slot, hospital=hospital, department=department, doctor=doctor),
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["details"]["official_booking_url"], hospital.official_booking_url)
        self.assertFalse(Booking.objects.filter(hospital=hospital).exists())

    def test_queue_action_updates_patient_booking(self):
        booking = self.make_booking()
        staff_user = User.objects.create_user(username="reception-next", password="test-password")
        StaffProfile.objects.create(user=staff_user, hospital=self.hospital, role=StaffProfile.Role.RECEPTION)
        staff_client = APIClient()
        staff_client.force_authenticate(staff_user)
        response = staff_client.post(
            f"/api/v1/staff/bookings/{booking['id']}/action/",
            {"action": "call_next"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        patient_response = self.client.get(f"/api/v1/bookings/{booking['id']}/")
        self.assertEqual(patient_response.status_code, 200)
        self.assertEqual(patient_response.data["status"], Booking.Status.SERVING)

    def test_patient_cannot_access_staff_route_and_staff_cannot_cross_hospital(self):
        self.assertEqual(self.client.get("/api/v1/staff/queue/").status_code, 403)
        booking = self.make_booking()
        other_staff = User.objects.create_user(username="other-action", password="test-password")
        StaffProfile.objects.create(user=other_staff, hospital=self.other_hospital, role=StaffProfile.Role.RECEPTION)
        staff_client = APIClient()
        staff_client.force_authenticate(other_staff)
        result = staff_client.post(
            f"/api/v1/staff/bookings/{booking['id']}/action/",
            {"action": "complete"},
            format="json",
        )
        self.assertEqual(result.status_code, 403)

    def test_cancel_refund_uses_hospital_policy(self):
        hospital = self.hospital
        hospital.payment_required = True
        hospital.consultation_fee = Decimal("400.00")
        hospital.save()
        booking = self.make_booking(key=str(uuid4()))
        payment = Payment.objects.get(booking_id=booking["id"])
        self.assertEqual(payment.status, Payment.Status.SUCCEEDED)
        response = self.client.post(
            f"/api/v1/bookings/{booking['id']}/cancel/",
            {"reason": "patient_request"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["refund"]["percentage"], 100)
        self.assertEqual(response.data["refund"]["amount"], "400.00")
        self.assertEqual(payment.refunds.get().status, "simulated")


class ConcurrentBookingTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user(username="concurrent-patient", password="test-password")
        self.patient = PatientProfile.objects.create(user=self.user, abha_demo_identifier="DEMO-ABHA-2000-2000")
        self.hospital = Hospital.objects.create(name="Race Test", integration_type=Hospital.IntegrationType.QUEUEFREE, city="Test")
        self.department = Department.objects.create(hospital=self.hospital, name="General", code="gen")
        self.doctor = Doctor.objects.create(department=self.department, display_name="Dr. Race")
        self.day = date.today() + timedelta(days=2)
        self.slot = AppointmentSlot.objects.create(doctor=self.doctor, appointment_date=self.day, start_time=time(9), capacity=1)

    @skipUnless(connection.vendor == "postgresql", "The production row-lock race test requires PostgreSQL.")
    def test_two_concurrent_requests_cannot_allocate_the_last_slot(self):
        def attempt(key):
            close_old_connections()
            client = APIClient()
            client.force_authenticate(User.objects.get(pk=self.user.pk))
            result = client.post("/api/v1/bookings/", {
                "hospital_id": self.hospital.pk,
                "department_id": self.department.pk,
                "doctor_id": self.doctor.pk,
                "date": self.day.isoformat(),
                "slot_id": self.slot.pk,
                "idempotency_key": key,
            }, format="json")
            close_old_connections()
            return result.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(attempt, [str(uuid4()), str(uuid4())]))
        self.assertCountEqual(outcomes, [201, 409])
        self.assertEqual(Booking.objects.filter(slot=self.slot, status=Booking.Status.WAITING).count(), 1)
