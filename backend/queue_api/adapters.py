import uuid

from .models import Booking, Hospital


class HospitalBookingAdapter:
    """Replace this interface with an authorized hospital API integration."""

    def availability(self, hospital, slots):
        raise NotImplementedError

    def reserve(self, hospital, slot, idempotency_key):
        raise NotImplementedError


class DemoHospitalAdapter(HospitalBookingAdapter):
    """Explicit test adapter; it does not call a real hospital system."""

    def availability(self, hospital, slots):
        active_statuses = [Booking.Status.WAITING, Booking.Status.SERVING, Booking.Status.ARRIVED, Booking.Status.EXTERNAL]
        return [
            {
                "slot_id": slot.pk,
                "available": Booking.objects.filter(slot=slot, status__in=active_statuses).count() < slot.capacity,
            }
            for slot in slots
        ]

    def reserve(self, hospital, slot, idempotency_key):
        return {
            "reference": "DEMO-API-" + uuid.uuid5(uuid.NAMESPACE_URL, idempotency_key).hex[:12].upper(),
            "token_number": "API-" + uuid.uuid5(uuid.NAMESPACE_URL, idempotency_key).hex[:6].upper(),
            "simulated": True,
        }


def adapter_for(hospital):
    if hospital.integration_type != Hospital.IntegrationType.API:
        raise ValueError("An API booking adapter is only valid for Type A hospitals.")
    if not hospital.integration_configured:
        return DemoHospitalAdapter()
    raise NotImplementedError("No real hospital adapter is configured for this facility.")
