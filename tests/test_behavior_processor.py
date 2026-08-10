import sys
import types
import unittest

import numpy as np
import cv2

from behavior_processor import BehaviorRespirationProcessor

fake_deepface = types.ModuleType("deepface")
fake_deepface.DeepFace = object
sys.modules.setdefault("deepface", fake_deepface)

from camera import VideoCamera


class BehaviorRespirationTests(unittest.TestCase):
    def test_periodic_chest_motion_produces_respiration_rate(self):
        processor = BehaviorRespirationProcessor(buffer_seconds=30, expected_fps=15)
        for index in range(450):
            timestamp = index / 15.0
            vertical_motion = 0.08 * np.sin(2 * np.pi * 0.25 * timestamp)
            processor.add_observation(timestamp, vertical_motion, 0.10, quality=0.95)
        metrics = processor.get_metrics()
        self.assertTrue(metrics["respiration_valid"])
        self.assertAlmostEqual(metrics["respiration_rate"], 15.0, delta=0.5)
        self.assertGreaterEqual(metrics["respiration_quality"], 55.0)
        self.assertTrue(metrics["respiration_waveform"])
        self.assertTrue(metrics["behavior_valid"])

    def test_short_signal_does_not_publish_breathing_rate(self):
        processor = BehaviorRespirationProcessor()
        for index in range(120):
            timestamp = index / 15.0
            processor.add_observation(timestamp, np.sin(timestamp), 0.1, quality=1.0)
        metrics = processor.get_metrics()
        self.assertFalse(metrics["respiration_valid"])
        self.assertEqual(metrics["respiration_rate"], 0.0)

    def test_large_movement_blocks_respiration(self):
        processor = BehaviorRespirationProcessor()
        for index in range(450):
            timestamp = index / 15.0
            motion = 0.1 if timestamp < 10 else 3.0
            processor.add_observation(timestamp, np.sin(2 * np.pi * 0.25 * timestamp), motion, quality=0.9)
        metrics = processor.get_metrics()
        self.assertEqual(metrics["movement_level"], "High movement")
        self.assertFalse(metrics["respiration_valid"])
        self.assertEqual(metrics["respiration_status"], "motion_artifact")

    def test_behavior_does_not_create_stress_without_concordant_facial_signal(self):
        behavior = {"behavior_valid": True, "behavior_score": 90.0}
        self.assertEqual(VideoCamera.combine_stress_sources(0.0, 0.0, behavior), 0.0)
        combined = VideoCamera.combine_stress_sources(40.0, 60.0, behavior)
        self.assertEqual(combined, 50.0)

    def test_missing_torso_roi_is_unavailable(self):
        frame = np.zeros((270, 360, 3), dtype=np.uint8)
        self.assertIsNone(BehaviorRespirationProcessor._torso_roi(frame, (120, 210, 80, 60)))

    def test_optical_flow_frame_pipeline_detects_breathing_motion(self):
        rng = np.random.default_rng(4)
        texture = rng.integers(40, 210, (270, 360), dtype=np.uint8)
        texture = cv2.GaussianBlur(texture, (3, 3), 0)
        processor = BehaviorRespirationProcessor()
        face = (120, 45, 100, 100)
        for index in range(450):
            timestamp = index / 15.0
            vertical_shift = 0.7 * np.sin(2 * np.pi * 0.25 * timestamp)
            transform = np.float32([[1, 0, 0], [0, 1, vertical_shift]])
            shifted = cv2.warpAffine(texture, transform, (360, 270), borderMode=cv2.BORDER_REFLECT)
            processor.process_frame(timestamp, cv2.cvtColor(shifted, cv2.COLOR_GRAY2BGR), face)
        metrics = processor.get_metrics()
        self.assertTrue(metrics["respiration_valid"])
        self.assertAlmostEqual(metrics["respiration_rate"], 15.0, delta=0.5)


if __name__ == "__main__":
    unittest.main()
