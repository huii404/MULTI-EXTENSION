import threading
import time
from collections import deque

import cv2
import numpy as np
from deepface import DeepFace

from data_manager import get_hrv_baseline_7days
from behavior_processor import BehaviorRespirationProcessor
from hrv_baseline import HRVBaselineManager
from hrv_processor import HRVProcessor


class VideoCamera(object):
    """Camera/emotion integration plus a face-locked optical rPPG sampler."""

    def __init__(self):
        self.current_stress = 0.0
        self.current_emotion = "Đang khởi tạo..."
        self.current_emotions_dict = {}
        self.history_len = 7
        self.emotion_history = deque(maxlen=self.history_len)
        self.force_stress = False

        self.hrv_processor = HRVProcessor(buffer_seconds=20, fps=15)
        self.behavior_processor = BehaviorRespirationProcessor(buffer_seconds=30, expected_fps=15)
        self.baseline_manager = HRVBaselineManager()
        self.current_hrv_metrics = self.hrv_processor.get_metrics()
        self.latest_hrv_metrics = self.current_hrv_metrics

        self.camera_index = 0
        self.video = None
        self.frame_counter = 0
        self.is_processing = False
        self._emotion_processing = False
        self._last_emotion_at = 0.0
        self._emotion_interval = 2.5
        self._last_face = None
        self._last_face_seen_at = 0.0
        self._last_luminance = None
        self._last_face_count = 0
        self._roi_quality = 0.0
        self._state_lock = threading.RLock()
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self._face_detector = cv2.CascadeClassifier(cascade_path)

    def trigger_fake_stress(self):
        """Legacy demo shortcut: affects stress only, never fabricates BPM/rPPG."""
        self.force_stress = True
        self.current_stress = 88.5
        self.current_emotion = "fear"
        self.current_emotions_dict = {
            "angry": 15.0, "fear": 88.5, "sad": 60.0,
            "happy": 0.0, "neutral": 5.0,
        }
        threading.Timer(15.0, self.reset_fake_stress).start()

    def reset_fake_stress(self):
        self.force_stress = False

    def __del__(self):
        video = getattr(self, "video", None)
        if video is not None and video.isOpened():
            video.release()

    @staticmethod
    def _clip_face(face, frame_shape):
        height, width = frame_shape[:2]
        x, y, w, h = [int(value) for value in face]
        x, y = max(0, x), max(0, y)
        w, h = min(w, width - x), min(h, height - y)
        return x, y, max(0, w), max(0, h)

    def _detect_or_track_face(self, img):
        """Run a lightweight detector periodically and smooth its tracked box."""
        self.frame_counter += 1
        should_detect = self._last_face is None or self.frame_counter % 3 == 0
        detected = []
        if should_detect:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)
            min_side = max(50, int(min(img.shape[:2]) * 0.18))
            detected = list(self._face_detector.detectMultiScale(
                gray, scaleFactor=1.12, minNeighbors=5,
                minSize=(min_side, min_side), flags=cv2.CASCADE_SCALE_IMAGE,
            ))
            self._last_face_count = len(detected)
            if len(detected) != 1:
                if len(detected) == 0 and time.time() - self._last_face_seen_at < 0.9:
                    return self._last_face, 1, 0.0
                self._last_face = None
                return None, len(detected), 0.0

            detected_face = np.asarray(detected[0], dtype=float)
            movement = 0.0
            if self._last_face is not None:
                previous = np.asarray(self._last_face, dtype=float)
                previous_center = previous[:2] + previous[2:] / 2.0
                current_center = detected_face[:2] + detected_face[2:] / 2.0
                translation = np.linalg.norm(current_center - previous_center) / max(previous[2], previous[3], 1.0)
                scale_change = np.max(np.abs(detected_face[2:] - previous[2:]) / np.maximum(previous[2:], 1.0))
                movement = float(max(translation, scale_change))
                detected_face = 0.72 * previous + 0.28 * detected_face
            self._last_face = tuple(detected_face.astype(int))
            self._last_face_seen_at = time.time()
            return self._last_face, 1, movement

        return self._last_face, 1 if self._last_face is not None else 0, 0.0

    @staticmethod
    def _roi_rectangles(face):
        """Forehead and upper cheeks; deliberately excludes eyes, lips and edges."""
        x, y, w, h = face
        return [
            (x + int(0.28 * w), y + int(0.15 * h), int(0.44 * w), int(0.17 * h)),
            (x + int(0.13 * w), y + int(0.48 * h), int(0.25 * w), int(0.22 * h)),
            (x + int(0.62 * w), y + int(0.48 * h), int(0.25 * w), int(0.22 * h)),
        ]

    @staticmethod
    def _skin_pixels(roi):
        if roi.size == 0:
            return np.empty((0, 3), dtype=np.uint8), 0.0
        ycrcb = cv2.cvtColor(roi, cv2.COLOR_BGR2YCrCb)
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        # Broad chroma constraints retain diverse skin tones; intensity/clipping
        # checks below reject shadow and specular highlights independently.
        y_channel, cr, cb = cv2.split(ycrcb)
        _, saturation, value = cv2.split(hsv)
        mask = (
            (cr >= 125) & (cr <= 180) & (cb >= 70) & (cb <= 140)
            & (y_channel >= 35) & (y_channel <= 235)
            & (saturation <= 190) & (value >= 35) & (value <= 245)
        )
        pixels = roi[mask]
        return pixels, float(np.mean(mask))

    def _extract_rgb(self, img, face, movement):
        frame_area = float(img.shape[0] * img.shape[1])
        if face[2] * face[3] < frame_area * 0.045 or face[2] < 60:
            return None, 0.0, "face_too_small", "Đưa khuôn mặt lại gần camera hơn"
        if movement > 0.16:
            return None, 0.0, "excessive_motion", "Giữ yên trong vài giây để hệ thống đo"

        pixel_groups = []
        raw_groups = []
        skin_coverages = []
        for rectangle in self._roi_rectangles(face):
            x, y, w, h = self._clip_face(rectangle, img.shape)
            roi = img[y:y + h, x:x + w]
            if roi.size:
                raw_groups.append(roi.reshape(-1, 3))
            pixels, coverage = self._skin_pixels(roi)
            if len(pixels):
                pixel_groups.append(pixels)
            skin_coverages.append(coverage)
        if raw_groups:
            raw_pixels = np.concatenate(raw_groups, axis=0).astype(float)
            raw_luminance = float(np.mean(
                0.114 * raw_pixels[:, 0] + 0.587 * raw_pixels[:, 1] + 0.299 * raw_pixels[:, 2]
            ))
            if raw_luminance < 40.0:
                return None, 0.0, "low_light", "Ánh sáng hiện tại chưa đủ tốt"
            if raw_luminance > 235.0:
                return None, 0.0, "overexposed", "Ánh sáng quá mạnh, hãy tránh nguồn sáng trực tiếp"
        if not pixel_groups:
            return None, 0.0, "roi_occluded", "Vùng da mặt bị che hoặc không rõ"

        pixels = np.concatenate(pixel_groups, axis=0).astype(float)
        skin_coverage = float(np.mean(skin_coverages))
        if skin_coverage < 0.16:
            return None, skin_coverage, "roi_occluded", "Vùng trán/má bị che hoặc không rõ"

        luminance = float(np.mean(0.114 * pixels[:, 0] + 0.587 * pixels[:, 1] + 0.299 * pixels[:, 2]))
        if luminance < 45.0:
            return None, 0.0, "low_light", "Ánh sáng hiện tại chưa đủ tốt"
        if luminance > 225.0:
            return None, 0.0, "overexposed", "Ánh sáng quá mạnh, hãy tránh nguồn sáng trực tiếp"

        clipping = float(np.mean((pixels <= 5) | (pixels >= 250)))
        light_change = abs(luminance - self._last_luminance) if self._last_luminance is not None else 0.0
        self._last_luminance = luminance
        if light_change > 28.0:
            return None, 0.15, "lighting_change", "Ánh sáng thay đổi mạnh, hãy chờ ổn định"

        brightness_score = float(np.clip(1.0 - abs(luminance - 125.0) / 110.0, 0.0, 1.0))
        coverage_score = float(np.clip((skin_coverage - 0.12) / 0.50, 0.0, 1.0))
        clipping_score = float(np.clip(1.0 - clipping / 0.10, 0.0, 1.0))
        motion_score = float(np.clip(1.0 - movement / 0.16, 0.0, 1.0))
        quality = 0.30 * brightness_score + 0.30 * coverage_score + 0.20 * clipping_score + 0.20 * motion_score
        bgr = np.mean(pixels, axis=0)
        return (float(bgr[2]), float(bgr[1]), float(bgr[0])), quality, "collecting", "Đang phân tích tín hiệu..."

    def _merge_capture_metadata(self, face_count, roi_quality):
        metrics = self.hrv_processor.get_metrics()
        metrics["face_detected"] = face_count == 1
        metrics["face_count"] = int(face_count)
        metrics["roi_quality"] = round(float(roi_quality) * 100.0, 1)
        metrics["roi_regions"] = ["forehead", "left_cheek", "right_cheek"]
        baseline = get_hrv_baseline_7days()
        valid_baseline = [
            item for item in baseline
            if isinstance(item, dict) and float(item.get("rmssd", item.get("RMSSD", 0)) or 0) > 0
        ]
        baseline_available = self.baseline_manager.has_personal_baseline(valid_baseline)
        z_score = None
        metrics["hrv_stress"] = 0.0
        metrics["hrv_interpretation"] = "Cần baseline cá nhân từ ít nhất 3 phiên đo để diễn giải xu hướng."
        if metrics.get("hrv_valid") and baseline_available:
            z_score = self.baseline_manager.calculate_zscore(metrics["rmssd"], valid_baseline)
            metrics["hrv_stress"] = self.baseline_manager.zscore_to_stress_score(z_score)
            if z_score < -1.0:
                interpretation = "Thấp hơn xu hướng HRV cá nhân gần đây"
            elif z_score > 1.0:
                interpretation = "Cao hơn xu hướng HRV cá nhân gần đây"
            else:
                interpretation = "Trong vùng xu hướng HRV cá nhân gần đây"
            metrics["hrv_interpretation"] = (
                interpretation + ". Đây là ước tính theo bối cảnh, không phải chẩn đoán stress."
            )
            metrics["status"] = interpretation
        elif metrics.get("hrv_valid"):
            metrics["status"] = "HRV khả dụng – chưa đủ baseline cá nhân"
        metrics["baseline_available"] = baseline_available
        metrics["z_score"] = metrics["Z_Score"] = z_score
        metrics["behavior"] = self.behavior_processor.get_metrics()
        self.current_hrv_metrics = metrics
        self.latest_hrv_metrics = metrics

    def process_frame(self, img):
        if img is None or not isinstance(img, np.ndarray) or img.size == 0:
            self.hrv_processor.set_measurement_state("invalid_frame", "Không đọc được khung hình camera", 0.0)
            self._merge_capture_metadata(0, 0.0)
            return

        with self._state_lock:
            frame_timestamp = time.time()
            face, face_count, movement = self._detect_or_track_face(img)
            self._last_face_count = face_count
            if face_count > 1:
                self.hrv_processor.set_measurement_state("multiple_faces", "Chỉ để một khuôn mặt trong khung hình", 0.0)
                self.behavior_processor.set_unavailable("Nhiều khuôn mặt – không thể chọn vùng vai/ngực")
                self._roi_quality = 0.0
            elif face is None:
                self.hrv_processor.set_measurement_state("no_face", "Đưa khuôn mặt vào giữa khung hình", 0.0)
                self.behavior_processor.set_unavailable("Không có khuôn mặt – nhịp thở không khả dụng")
                self._roi_quality = 0.0
            else:
                self.behavior_processor.process_frame(frame_timestamp, img, face, movement)
                rgb, quality, code, message = self._extract_rgb(img, face, movement)
                self._roi_quality = quality
                if rgb is None:
                    self.hrv_processor.set_measurement_state(code, message, quality)
                else:
                    self.hrv_processor.add_rgb_sample(frame_timestamp, *rgb, quality=quality)
            self._merge_capture_metadata(face_count, self._roi_quality)

        # DeepFace is preserved for the existing emotion/stress feature, but runs
        # asynchronously and much less often than the lightweight ROI tracker.
        now = time.time()
        if (face_count == 1 and not self._emotion_processing
                and now - self._last_emotion_at >= self._emotion_interval):
            self._emotion_processing = True
            self._last_emotion_at = now
            threading.Thread(target=self._analyze_emotion, args=(img.copy(),), daemon=True).start()

    def _analyze_emotion(self, img):
        try:
            if self.force_stress:
                return
            objects = DeepFace.analyze(
                img, actions=["emotion"], enforce_detection=True,
                detector_backend="mtcnn", silent=True,
            )
            if not objects:
                return
            raw_emotions = objects[0]["emotion"]
            with self._state_lock:
                self.emotion_history.append(raw_emotions)
                averaged = self.calculate_average_emotions()
                self.current_emotions_dict = {key: float(value) for key, value in averaged.items()}
                self.current_emotion = max(averaged, key=averaged.get)
                fuzzy_stress = self.fuzzy_inference_system(averaged)
                hrv_stress = self.current_hrv_metrics.get("hrv_stress", 0.0)
                behavior = self.current_hrv_metrics.get("behavior", {})
                self.current_stress = self.combine_stress_sources(fuzzy_stress, hrv_stress, behavior)
        except ValueError:
            # Face status is owned by the lightweight detector; an emotion-model
            # miss must not erase an otherwise valid rPPG tracking buffer.
            pass
        except Exception as error:
            print(f"Lỗi phân tích cảm xúc: {error}")
        finally:
            self._emotion_processing = False

    def reset_hrv(self):
        with self._state_lock:
            self.hrv_processor.reset()
            self.behavior_processor.reset()
            self._last_face = None
            self._last_luminance = None
            self._last_face_count = 0
            self._roi_quality = 0.0
            self._merge_capture_metadata(0, 0.0)
            self.emotion_history.clear()
            self.current_emotions_dict = {}

    def get_hrv_metrics(self):
        with self._state_lock:
            return dict(self.current_hrv_metrics)

    def _ensure_video(self):
        if self.video is None or not self.video.isOpened():
            self.video = cv2.VideoCapture(self.camera_index)
            self.video.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.video.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.video.set(cv2.CAP_PROP_FPS, 15)
        return self.video.isOpened()

    def switch_camera(self):
        if self.video is not None and self.video.isOpened():
            self.video.release()
        original = self.camera_index
        self.camera_index = 1 if original == 0 else 0
        self.video = cv2.VideoCapture(self.camera_index)
        if not self.video.isOpened():
            self.camera_index = original
            self.video = cv2.VideoCapture(self.camera_index)
        self.reset_hrv()

    def get_frame(self):
        if not self._ensure_video():
            return None
        success, image = self.video.read()
        if not success:
            return None
        self.process_frame(image)
        success, jpeg = cv2.imencode(".jpg", image)
        return jpeg.tobytes() if success else None

    # Legacy public name retained for callers that used the old camera stream.
    def detect_emotion(self, img):
        self.process_frame(img)

    def calculate_average_emotions(self):
        if not self.emotion_history:
            return {}
        totals = {key: 0.0 for key in self.emotion_history[0].keys()}
        weights = list(range(1, len(self.emotion_history) + 1))
        total_weight = sum(weights)
        for index, entry in enumerate(self.emotion_history):
            for emotion, value in entry.items():
                totals[emotion] += value * weights[index]
        return {key: value / total_weight for key, value in totals.items()}

    def fuzzy_inference_system(self, emotions):
        if not emotions:
            return 0.0
        angry = emotions.get("angry", 0) / 100.0
        fear = emotions.get("fear", 0) / 100.0
        sad = max(0.0, emotions.get("sad", 0) / 100.0 - 0.15)
        happy = emotions.get("happy", 0) / 100.0
        neutral = emotions.get("neutral", 0) / 100.0
        if neutral > sad:
            sad *= 0.5
            neutral *= 1.2
        numerator = max(angry, fear) * 100 + sad * 70 + neutral * 20
        denominator = max(angry, fear) + sad + neutral + happy
        return float(np.clip(numerator / denominator if denominator else 0.0, 0.0, 100.0))

    @staticmethod
    def combine_stress_sources(facial_stress, hrv_stress=0.0, behavior=None):
        """Fuse only available evidence; behavior can never create stress alone."""
        weighted_sum = 0.65 * float(facial_stress)
        total_weight = 0.65
        if float(hrv_stress or 0.0) > 0:
            weighted_sum += 0.25 * float(hrv_stress)
            total_weight += 0.25
        behavior = behavior or {}
        if behavior.get("behavior_valid") and float(facial_stress) >= 25.0:
            weighted_sum += 0.10 * float(behavior.get("behavior_score", 0.0))
            total_weight += 0.10
        return round(float(np.clip(weighted_sum / total_weight, 0.0, 100.0)), 1)

    def get_stress_level(self):
        return self.current_stress
