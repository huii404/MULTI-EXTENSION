import sys
import types
import unittest
from unittest.mock import patch

import cv2
import numpy as np


# Camera quality logic does not need to load TensorFlow/DeepFace in unit tests.
fake_deepface = types.ModuleType("deepface")
fake_deepface.DeepFace = object
sys.modules.setdefault("deepface", fake_deepface)

from camera import VideoCamera
from hrv_processor import HRVProcessor
from hrv_baseline import HRVBaselineManager
from behavior_processor import BehaviorRespirationProcessor


class FakeDetector:
    def __init__(self, faces):
        self.faces = faces

    def detectMultiScale(self, *args, **kwargs):
        return np.asarray(self.faces, dtype=np.int32)


class CameraQualityTests(unittest.TestCase):
    def make_camera_shell(self):
        camera = VideoCamera.__new__(VideoCamera)
        camera.frame_counter = 0
        camera._last_face = None
        camera._last_face_seen_at = 0.0
        camera._last_luminance = None
        camera._last_face_count = 0
        camera.behavior_processor = BehaviorRespirationProcessor()
        return camera

    def test_multiple_faces_are_reported(self):
        camera = self.make_camera_shell()
        camera._face_detector = FakeDetector([(20, 20, 90, 110), (180, 25, 90, 110)])
        frame = np.zeros((270, 360, 3), dtype=np.uint8)
        face, count, _ = camera._detect_or_track_face(frame)
        self.assertIsNone(face)
        self.assertEqual(count, 2)

    def test_small_face_is_rejected(self):
        camera = self.make_camera_shell()
        frame = np.full((270, 360, 3), (80, 120, 170), dtype=np.uint8)
        rgb, _, code, _ = camera._extract_rgb(frame, (100, 70, 50, 55), 0.0)
        self.assertIsNone(rgb)
        self.assertEqual(code, "face_too_small")

    def test_dark_roi_gets_specific_guidance(self):
        camera = self.make_camera_shell()
        frame = np.full((270, 360, 3), 15, dtype=np.uint8)
        rgb, _, code, _ = camera._extract_rgb(frame, (70, 25, 200, 210), 0.0)
        self.assertIsNone(rgb)
        self.assertEqual(code, "low_light")

    def test_large_motion_is_rejected_without_reset(self):
        camera = self.make_camera_shell()
        frame = np.full((270, 360, 3), (80, 120, 170), dtype=np.uint8)
        rgb, _, code, _ = camera._extract_rgb(frame, (70, 25, 200, 210), 0.25)
        self.assertIsNone(rgb)
        self.assertEqual(code, "excessive_motion")

    def test_roi_layout_avoids_eye_and_mouth_bands(self):
        forehead, left_cheek, right_cheek = VideoCamera._roi_rectangles((0, 0, 200, 200))
        self.assertLess(forehead[1] + forehead[3], 70)
        self.assertGreaterEqual(left_cheek[1], 90)
        self.assertGreaterEqual(right_cheek[1], 90)
        self.assertLess(left_cheek[1] + left_cheek[3], 155)

    def test_no_face_makes_hrv_unavailable(self):
        processor = HRVProcessor()
        processor.set_measurement_state("no_face", "Không có khuôn mặt", 0.0)
        metrics = processor.get_metrics()
        self.assertFalse(metrics["hrv_valid"])
        self.assertEqual(metrics["hrv_status_code"], "unavailable")
        self.assertEqual(metrics["rmssd"], 0.0)
        self.assertEqual(metrics["nn_intervals"], [])

    def test_hrv_is_not_mapped_to_stress_without_personal_baseline(self):
        camera = self.make_camera_shell()
        camera.hrv_processor = types.SimpleNamespace(get_metrics=lambda: {
            "hrv_valid": True, "rmssd": 42.0, "hrv_stress": 99.0
        })
        camera.baseline_manager = HRVBaselineManager()
        with patch("camera.get_hrv_baseline_7days", return_value=[]):
            camera._merge_capture_metadata(1, 0.9)
        self.assertFalse(camera.current_hrv_metrics["baseline_available"])
        self.assertIsNone(camera.current_hrv_metrics["z_score"])
        self.assertEqual(camera.current_hrv_metrics["hrv_stress"], 0.0)

    def test_personal_baseline_enables_contextual_hrv_estimate(self):
        camera = self.make_camera_shell()
        camera.hrv_processor = types.SimpleNamespace(get_metrics=lambda: {
            "hrv_valid": True, "rmssd": 40.0, "hrv_stress": 0.0
        })
        camera.baseline_manager = HRVBaselineManager()
        baseline = [{"RMSSD": 38.0}, {"RMSSD": 42.0}, {"RMSSD": 40.0}]
        with patch("camera.get_hrv_baseline_7days", return_value=baseline):
            camera._merge_capture_metadata(1, 0.9)
        self.assertTrue(camera.current_hrv_metrics["baseline_available"])
        self.assertIsNotNone(camera.current_hrv_metrics["z_score"])
        self.assertIn("không phải chẩn đoán stress", camera.current_hrv_metrics["hrv_interpretation"])

    def test_multimodal_stress_ignores_hrv_without_personal_baseline(self):
        manager = HRVBaselineManager()
        result = manager.calculate_multimodal_stress(35.0, 12.0, baseline_history=[])
        self.assertEqual(result["combined_stress"], 35.0)
        self.assertEqual(result["hrv_stress"], 0.0)


if __name__ == "__main__":
    unittest.main()
