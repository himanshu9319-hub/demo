from django.urls import path

from . import views


urlpatterns = [
    path("auth/patient/demo/", views.PatientDemoLoginView.as_view(), name="patient-demo-login"),
    path("auth/patient/phone/", views.PatientPhoneLoginView.as_view(), name="patient-phone-login"),
    path("auth/patient/verify-abha/", views.PatientVerifyAbhaView.as_view(), name="patient-verify-abha"),
    path("auth/staff/login/", views.StaffLoginView.as_view(), name="staff-login"),
    path("hospitals/", views.HospitalListView.as_view(), name="hospital-list"),
    path("hospitals/<int:hospital_id>/", views.HospitalDetailView.as_view(), name="hospital-detail"),
    path("hospitals/<int:hospital_id>/departments/", views.DepartmentListView.as_view(), name="department-list"),
    path("doctors/", views.DoctorListView.as_view(), name="doctor-list"),
    path("availability/", views.AvailabilityView.as_view(), name="availability"),
    path("bookings/", views.PatientBookingListCreateView.as_view(), name="patient-bookings"),
    path("bookings/<uuid:booking_id>/", views.PatientBookingDetailView.as_view(), name="patient-booking-detail"),
    path("bookings/<uuid:booking_id>/cancel/", views.PatientCancelView.as_view(), name="patient-cancel"),
    path("bookings/<uuid:booking_id>/reschedule/", views.PatientRescheduleView.as_view(), name="patient-reschedule"),
    path("payments/<uuid:booking_id>/demo-confirm/", views.DemoPaymentConfirmView.as_view(), name="demo-payment-confirm"),
    path("staff/queue/", views.StaffQueueView.as_view(), name="staff-queue"),
    path("staff/queue/control/", views.StaffQueueControlView.as_view(), name="staff-queue-control"),
    path("staff/bookings/<uuid:booking_id>/action/", views.StaffQueueActionView.as_view(), name="staff-queue-action"),
    path("admin/integrations/", views.IntegrationAdminView.as_view(), name="integration-admin"),
]
