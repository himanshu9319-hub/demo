import unittest

from .refund_policy import DEFAULT_POLICY, refund_percentage


class RefundPolicyTests(unittest.TestCase):
    def test_tiers_and_boundaries(self):
        p = DEFAULT_POLICY
        self.assertEqual(refund_percentage(p, "patient", 48), 100)
        self.assertEqual(refund_percentage(p, "patient", 24.01), 100)
        self.assertEqual(refund_percentage(p, "patient", 24), 75)
        self.assertEqual(refund_percentage(p, "patient", 6), 75)
        self.assertEqual(refund_percentage(p, "patient", 5.99), 50)
        self.assertEqual(refund_percentage(p, "patient", -2), 50)

    def test_special_reasons(self):
        p = DEFAULT_POLICY
        self.assertEqual(refund_percentage(p, "no_show", 100), 0)
        self.assertEqual(refund_percentage(p, "doctor_unavailable", 1), 100)
        self.assertEqual(refund_percentage(p, "duplicate_payment", 1), 100)

    def test_custom_and_invalid_values_are_clamped(self):
        self.assertEqual(refund_percentage({"less_than_6_hours": 250}, "x", 1), 100)
        self.assertEqual(refund_percentage({"less_than_6_hours": -5}, "x", 1), 0)
        self.assertEqual(refund_percentage({}, "x", 30), 100)


if __name__ == "__main__":
    unittest.main()
