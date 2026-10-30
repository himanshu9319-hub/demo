"""Pure refund-percentage rules. No Django imports so they can be unit-tested anywhere.

The default policy is a proposal that each hospital must approve; it is stored per
hospital in Hospital.cancellation_policy and can be changed there.
"""

DEFAULT_POLICY = {
    "more_than_24_hours": 100,
    "between_6_and_24_hours": 75,
    "less_than_6_hours": 50,
    "no_show": 0,
    "doctor_unavailable": 100,
    "duplicate_payment": 100,
}

SPECIAL_REASONS = {"doctor_unavailable", "duplicate_payment", "no_show"}


def _pct(policy, key):
    value = int((policy or {}).get(key, DEFAULT_POLICY[key]))
    return max(0, min(100, value))


def refund_percentage(policy, reason, hours_to_appointment):
    """Return the refund percentage (0-100) for a cancellation.

    Boundaries: > 24h -> full tier; 6h <= h <= 24h -> middle tier; < 6h (including
    appointments already started) -> late tier. Special reasons override timing.
    """
    if reason in SPECIAL_REASONS:
        return _pct(policy, reason)
    if hours_to_appointment > 24:
        return _pct(policy, "more_than_24_hours")
    if hours_to_appointment >= 6:
        return _pct(policy, "between_6_and_24_hours")
    return _pct(policy, "less_than_6_hours")
