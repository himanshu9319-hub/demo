from django.contrib import admin

from .models import AppointmentSlot, AuditLog, Booking, Department, Doctor, Hospital, PatientProfile, Payment, Refund, StaffProfile


admin.site.register([Hospital, Department, Doctor, PatientProfile, StaffProfile, AppointmentSlot, Booking, Payment, Refund, AuditLog])
