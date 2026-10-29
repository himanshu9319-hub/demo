from rest_framework.permissions import BasePermission


def role_for_user(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return "platform_admin"
    if hasattr(user, "staff_profile"):
        return user.staff_profile.role
    if hasattr(user, "patient_profile"):
        return "patient"
    return None


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return role_for_user(request.user) == "patient"


class IsHospitalStaff(BasePermission):
    def has_permission(self, request, view):
        return role_for_user(request.user) in {"reception", "doctor", "hospital_admin", "platform_admin"}


class IsHospitalAdmin(BasePermission):
    def has_permission(self, request, view):
        return role_for_user(request.user) in {"hospital_admin", "platform_admin"}
