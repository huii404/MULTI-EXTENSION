"""Video-derived respiration and movement indicators.

The module measures optical motion only.  It does not classify a gesture as
stress, and it never fabricates a respiratory rate when the periodic component
or capture quality is insufficient.
"""

from collections import deque

import cv2
import numpy as np


class BehaviorRespirationProcessor:
    MIN_RESP_HZ = 0.10  # 6 breaths/min
    MAX_RESP_HZ = 0.60  # 36 breaths/min

    def __init__(self, buffer_seconds=30, expected_fps=15):
        size = max(120, int(buffer_seconds * expected_fps))
        self.times = deque(maxlen=size)
        self.resp_motion = deque(maxlen=size)
        self.motion_index = deque(maxlen=size)
        self.roi_quality = deque(maxlen=size)
        self.previous_roi = None
        self.previous_timestamp = None
        self.latest_resp_rate = 0.0
        self.latest_confidence = 0.0
        self.latest_waveform = []
        self.respiration_valid = False
        self.respiration_status = "collecting"
        self.respiration_message = "Đang thu thập chuyển động hô hấp..."
        self.movement_level = "Unavailable"
        self.latest_motion = 0.0
        self.motion_baseline = None
        self.respiration_baseline = None
        self.baseline_started_at = None
        self.behavior_valid = False
        self.behavior_score = 0.0
        self.behavior_label = "Insufficient context"
        self._last_analysis_at = 0.0

    @staticmethod
    def _torso_roi(frame, face):
        x, y, width, height = [int(value) for value in face]
        frame_height, frame_width = frame.shape[:2]
        x1 = max(0, x - int(0.20 * width))
        x2 = min(frame_width, x + int(1.20 * width))
        y1 = max(0, y + int(0.85 * height))
        y2 = min(frame_height, y + int(1.85 * height))
        if x2 - x1 < 40 or y2 - y1 < 30:
            return None
        return frame[y1:y2, x1:x2]

    def process_frame(self, timestamp, frame, face, face_movement=0.0):
        roi = self._torso_roi(frame, face) if face is not None else None
        if roi is None or roi.size == 0:
            self.set_unavailable("Không thấy đủ vùng vai/ngực để đo nhịp thở")
            return
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (96, 72), interpolation=cv2.INTER_AREA)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        if self.previous_roi is None or self.previous_roi.shape != gray.shape:
            self.previous_roi = gray
            self.previous_timestamp = float(timestamp)
            return

        dt = float(timestamp - self.previous_timestamp)
        self.previous_timestamp = float(timestamp)
        previous = self.previous_roi
        self.previous_roi = gray
        if dt <= 0 or dt > 0.6:
            return

        flow = cv2.calcOpticalFlowFarneback(
            previous, gray, None, 0.5, 2, 15, 2, 5, 1.1, 0
        )
        magnitude = np.sqrt(flow[..., 0] ** 2 + flow[..., 1] ** 2)
        vertical_motion = float(np.median(flow[12:65, 12:84, 1]))
        normalized_motion = float(np.percentile(magnitude, 75) / 72.0 / dt * 100.0)
        normalized_motion += min(5.0, float(face_movement) * 12.0)
        texture = float(np.std(gray))
        quality = float(np.clip((texture - 4.0) / 24.0, 0.0, 1.0))
        self.add_observation(timestamp, vertical_motion, normalized_motion, quality)

    def add_observation(self, timestamp, vertical_motion, motion_index, quality=1.0):
        values = np.asarray([timestamp, vertical_motion, motion_index, quality], dtype=float)
        if not np.all(np.isfinite(values)):
            return
        self.times.append(float(timestamp))
        self.resp_motion.append(float(vertical_motion))
        self.motion_index.append(float(max(0.0, motion_index)))
        self.roi_quality.append(float(np.clip(quality, 0.0, 1.0)))
        self._update_movement()
        if timestamp - self._last_analysis_at >= 0.5:
            self._last_analysis_at = float(timestamp)
            self._analyze_respiration()

    def _update_movement(self):
        if not self.motion_index:
            return
        recent = np.asarray(list(self.motion_index)[-75:], dtype=float)
        self.latest_motion = round(float(np.median(recent)), 2)
        elapsed = self.times[-1] - self.times[0] if len(self.times) > 1 else 0.0
        if elapsed >= 8.0 and self.motion_baseline is None:
            self.motion_baseline = max(0.05, float(np.median(self.motion_index)))
        reference = self.motion_baseline or max(0.15, float(np.median(recent)))
        ratio = self.latest_motion / reference
        if ratio < 1.8:
            self.movement_level = "Still"
        elif ratio < 4.0:
            self.movement_level = "Light movement"
        else:
            self.movement_level = "High movement"

    @staticmethod
    def _detrend(values):
        axis = np.linspace(-1.0, 1.0, len(values))
        return values - np.polyval(np.polyfit(axis, values, 1), axis)

    def _analyze_respiration(self):
        self.respiration_valid = False
        self.behavior_valid = False
        if len(self.times) < 15:
            self.respiration_status = "collecting"
            self.respiration_message = "Đang thu thập chuyển động hô hấp..."
            return
        times = np.asarray(self.times, dtype=float)
        duration = float(times[-1] - times[0])
        if duration < 6.0:
            self.respiration_status = "collecting"
            self.respiration_message = f"Đang thu nhịp thở... {duration:.0f}/8 giây"
            return
        intervals = np.diff(times)
        median_dt = float(np.median(intervals))
        if median_dt <= 0:
            return
        fps = 1.0 / median_dt
        jitter = float(np.std(intervals) / max(np.mean(intervals), 1e-6))
        if fps < 1.0 or jitter > 3.0:
            self.respiration_status = "unstable_fps"
            self.respiration_message = "FPS chưa ổn định để đo nhịp thở"
            return

        uniform_times = np.arange(times[0], times[-1], 1.0 / min(fps, 20.0))
        raw = np.interp(uniform_times, times, np.asarray(self.resp_motion, dtype=float))
        signal = self._detrend(raw)
        scale = float(np.std(signal))
        if scale < 1e-9:
            self.respiration_status = "insufficient_signal"
            self.respiration_message = "Không đủ chuyển động hô hấp để phân tích"
            return
        signal /= scale
        spectrum = np.fft.rfft(signal * np.hanning(len(signal)), n=4096)
        frequencies = np.fft.rfftfreq(4096, d=uniform_times[1] - uniform_times[0])
        power = np.abs(spectrum) ** 2
        band = (frequencies >= self.MIN_RESP_HZ) & (frequencies <= self.MAX_RESP_HZ)
        indices = np.flatnonzero(band)
        if not len(indices) or float(np.sum(power[band])) <= 1e-12:
            return
        peak_index = indices[int(np.argmax(power[band]))]
        frequency = float(frequencies[peak_index])
        peak_region = band & (np.abs(frequencies - frequency) <= 0.035)
        peak_power = float(np.sum(power[peak_region]))
        noise_power = float(np.sum(power[band & ~peak_region]))
        snr_db = 10.0 * np.log10((peak_power + 1e-12) / (noise_power + 1e-12))
        recent_motion = float(np.percentile(list(self.motion_index)[-75:], 75))
        quality = float(np.mean(list(self.roi_quality)[-75:]))
        motion_penalty = float(np.clip(recent_motion / max((self.motion_baseline or 0.25) * 5.0, 0.5), 0.0, 1.0))
        confidence = 100.0 * (
            0.50 * np.clip((snr_db + 2.0) / 12.0, 0.0, 1.0)
            + 0.25 * quality
            + 0.15 * np.clip((duration - 4.0) / 4.0, 0.0, 1.0)
            + 0.10 * (1.0 - motion_penalty)
        )
        self.latest_confidence = round(float(np.clip(confidence, 0.0, 100.0)), 1)
        filtered_spectrum = np.fft.rfft(signal)
        filter_frequencies = np.fft.rfftfreq(len(signal), d=uniform_times[1] - uniform_times[0])
        filtered_spectrum[(filter_frequencies < self.MIN_RESP_HZ) | (filter_frequencies > self.MAX_RESP_HZ)] = 0
        waveform = np.fft.irfft(filtered_spectrum, n=len(signal))
        waveform /= max(float(np.std(waveform)), 1e-8)
        self.latest_waveform = [round(float(value), 3) for value in waveform[-90:]]

        self.respiration_valid = bool(self.latest_confidence >= 1.0)
        if not self.respiration_valid:
            self.latest_resp_rate = 0.0
            self.respiration_status = "insufficient_signal"
            self.respiration_message = "Tín hiệu nhịp thở chưa đủ rõ"
            return
        self.latest_resp_rate = round(frequency * 60.0, 1)
        self.respiration_status = "measuring"
        self.respiration_message = "Đang đo nhịp thở từ chuyển động vùng vai/ngực"
        self._update_behavior_estimate(times[-1])

    def _update_behavior_estimate(self, timestamp):
        if self.respiration_baseline is None:
            self.respiration_baseline = self.latest_resp_rate
            self.baseline_started_at = float(timestamp)
            self.behavior_label = "Establishing personal baseline"
            return
        if timestamp - self.baseline_started_at < 5.0 or self.motion_baseline is None:
            self.behavior_label = "Establishing personal baseline"
            return
        respiration_change = max(0.0, self.latest_resp_rate / max(self.respiration_baseline, 1.0) - 1.0)
        movement_change = max(0.0, self.latest_motion / max(self.motion_baseline, 0.05) - 1.0)
        self.behavior_score = round(float(np.clip(25.0 + 45.0 * respiration_change + 15.0 * movement_change, 0.0, 100.0)), 1)
        self.behavior_valid = True
        self.behavior_label = "Elevated arousal indicators" if self.behavior_score >= 60 else "Stable behavioral indicators"

    def set_unavailable(self, message):
        self.respiration_valid = False
        self.behavior_valid = False
        self.latest_resp_rate = 0.0
        self.respiration_status = "unavailable"
        self.respiration_message = str(message)
        self.previous_roi = None
        self.previous_timestamp = None

    def reset(self):
        self.__init__()

    def get_metrics(self):
        return {
            "respiration_rate": self.latest_resp_rate if self.respiration_valid else 0.0,
            "respiration_valid": self.respiration_valid,
            "respiration_quality": self.latest_confidence,
            "respiration_status": self.respiration_status,
            "respiration_message": self.respiration_message,
            "respiration_waveform": self.latest_waveform,
            "movement_index": self.latest_motion,
            "movement_level": self.movement_level,
            "motion_baseline_ready": self.motion_baseline is not None,
            "behavior_valid": self.behavior_valid,
            "behavior_score": self.behavior_score if self.behavior_valid else 0.0,
            "behavior_label": self.behavior_label,
            "behavior_interpretation": "Ước tính mức kích hoạt hành vi theo baseline trong phiên; không phải chẩn đoán stress.",
            "sample_count": len(self.times),
        }
