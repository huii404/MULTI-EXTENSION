import math
import unittest

from voice_stress_processor import VoiceStressProcessor


class VoiceStressProcessorTests(unittest.TestCase):
    def setUp(self):
        self.processor = VoiceStressProcessor()
        self.clean_metrics = {
            "duration_seconds": 8.0,
            "speech_seconds": 6.0,
            "sample_count": 90,
            "pitch_sample_count": 35,
            "silence_ratio": 0.25,
            "rms_mean": 0.05,
            "rms_p95": 0.10,
            "rms_cv": 0.35,
            "noise_rms": 0.008,
            "speech_to_noise_ratio": 6.25,
            "pitch_mean_hz": 155,
            "pitch_cv": 0.06,
            "voiced_ratio": 0.55,
            "pause_count": 1,
            "words_per_minute": 120,
            "clipping_ratio": 0.0,
        }

    def test_stable_voice_is_valid_without_stress_claim(self):
        result = self.processor.analyze(self.clean_metrics)
        self.assertTrue(result["valid"])
        self.assertEqual(result["status"], "stable")
        self.assertFalse(result["elevated_cues"])
        self.assertEqual(result["signals"], [])

    def test_short_or_low_quality_recording_is_not_interpreted(self):
        metrics = dict(self.clean_metrics, duration_seconds=1.2, speech_seconds=0.5, sample_count=8)
        result = self.processor.analyze(metrics)
        self.assertFalse(result["valid"])
        self.assertEqual(result["status"], "insufficient_signal")
        self.assertFalse(result["elevated_cues"])

    def test_fast_pace_alone_does_not_mark_elevated_cues(self):
        metrics = dict(self.clean_metrics, words_per_minute=190)
        result = self.processor.analyze(metrics)
        self.assertIn("fast_pace", result["signals"])
        self.assertFalse(result["elevated_cues"])

    def test_multiple_concordant_measured_cues_are_reported(self):
        metrics = dict(
            self.clean_metrics,
            words_per_minute=190,
            pitch_cv=0.20,
            silence_ratio=0.42,
            pause_count=4,
        )
        result = self.processor.analyze(metrics)
        self.assertTrue(result["valid"])
        self.assertTrue(result["elevated_cues"])
        self.assertIn("fast_pace", result["signals"])
        self.assertIn("shaky_voice", result["signals"])
        self.assertIn("frequent_pauses", result["signals"])
        self.assertGreaterEqual(result["confidence"], 0.45)

    def test_untrusted_fields_and_non_finite_values_are_ignored(self):
        metrics = dict(self.clean_metrics, hardcoded_stress=100, pitch_cv=math.nan)
        result = self.processor.analyze(metrics)
        self.assertNotIn("hardcoded_stress", result["metrics"])
        self.assertNotIn("shaky_voice", result["signals"])


if __name__ == "__main__":
    unittest.main()
