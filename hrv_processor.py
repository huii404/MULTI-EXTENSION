"""Timestamp-aware rPPG and short-window pulse-rate processing.

This module intentionally does not fabricate a pulse when the optical signal is
insufficient.  It keeps the legacy metric keys used by the Flask UI while adding
quality, timing and measurement-state metadata.
"""

from collections import deque

import numpy as np


class HRVProcessor:
    MIN_BPM = 42.0
    MAX_BPM = 180.0
    MIN_FREQUENCY = MIN_BPM / 60.0
    MAX_FREQUENCY = MAX_BPM / 60.0

    def __init__(self, buffer_seconds=20, fps=15, sampling_rate=None):
        self.buffer_seconds = float(buffer_seconds)
        self.fps = float(fps)
        self.fs = float(sampling_rate or fps)
        self.max_buffer_size = max(60, int(self.buffer_seconds * max(self.fps, 5)))
        self.min_window_seconds = 8.0
        self.hrv_min_window_seconds = 8.0
        self.hrv_min_nn_intervals = 2

        self.time_buffer = deque(maxlen=self.max_buffer_size)
        self.rgb_buffer = deque(maxlen=self.max_buffer_size)
        # Kept for compatibility with older callers and diagnostics.
        self.green_buffer = deque(maxlen=self.max_buffer_size)
        self.frame_quality_buffer = deque(maxlen=self.max_buffer_size)
        self.bpm_history = deque(maxlen=7)
        self.rr_intervals = deque(maxlen=30)

        self.latest_bpm = 0.0
        self.latest_raw_bpm = 0.0
        self.latest_rmssd = 0.0
        self.latest_sdnn = 0.0
        self.latest_pnn50 = 0.0
        self.latest_mean_nn = 0.0
        self.latest_hrv_stress = 0.0
        self.latest_signal = []
        self.latest_ibi_series = []
        self.latest_peak_times = []
        self.latest_peak_count = 0
        self.latest_artifact_count = 0
        self.latest_artifact_ratio = 0.0
        self.latest_hrv_quality = 0.0
        self.hrv_valid = False
        self.hrv_status_code = "collecting"
        self.hrv_message = "Đang thu thập dữ liệu HRV..."
        self.latest_confidence = 0.0
        self.latest_snr_db = 0.0
        self.measured_fps = 0.0
        self.fps_stability = 0.0
        self.sample_count = 0
        self.window_seconds = 0.0
        self.is_valid = False
        self.status_code = "waiting_for_face"
        self.measurement_message = "Đưa khuôn mặt vào giữa khung hình"
        self.algorithm = "POS"
        self._last_processed_at = 0.0
        # Tolerate a brief Haar-detector miss without joining genuinely separate
        # measurement periods. Quality/SNR checks still reject a corrupted gap.
        self._segment_gap_seconds = 3.0

    def add_sample(self, timestamp, green_val, quality=1.0):
        """Backward-compatible Green-channel entry point."""
        value = float(green_val)
        self.add_rgb_sample(timestamp, value, value, value, quality=quality)

    def add_rgb_sample(self, timestamp, red, green, blue, quality=1.0):
        values = np.asarray([timestamp, red, green, blue, quality], dtype=float)
        if not np.all(np.isfinite(values)):
            self.set_measurement_state("noisy_signal", "Tín hiệu rPPG quá nhiễu", 0.0)
            return

        timestamp = float(timestamp)
        if self.time_buffer and timestamp <= self.time_buffer[-1]:
            return

        previous_timestamp = self.time_buffer[-1] if self.time_buffer else None
        self.time_buffer.append(timestamp)
        self.rgb_buffer.append((float(red), float(green), float(blue)))
        self.green_buffer.append(float(green))
        self.frame_quality_buffer.append(float(np.clip(quality, 0.0, 1.0)))
        if previous_timestamp is None or timestamp - previous_timestamp > self._segment_gap_seconds:
            self.status_code = "collecting"
            self.measurement_message = "Đang ổn định tín hiệu..."
        # FFT/resampling works on a temporal window, so recomputing it for every
        # camera frame only wastes CPU.  Three updates/second is responsive enough
        # for the UI while sampling itself remains at the camera's real cadence.
        if timestamp - self._last_processed_at >= 0.33:
            self._last_processed_at = timestamp
            self.process_signal()

    def set_measurement_state(self, code, message, frame_quality=0.0):
        """Report a bad capture condition without discarding the useful buffer."""
        self.status_code = str(code)
        self.measurement_message = str(message)
        if frame_quality <= 0.2:
            self.is_valid = False
            self.hrv_valid = False
            self.latest_hrv_quality = 0.0
            if code in {"excessive_motion", "lighting_change", "noisy_signal", "unstable_fps"}:
                self.hrv_status_code = "artifact_detected"
                self.hrv_message = "Nhiễu tín hiệu được phát hiện – HRV tạm dừng"
            else:
                self.hrv_status_code = "unavailable"
                self.hrv_message = "HRV unavailable"
        # Re-evaluate immediately when the next acceptable frame arrives.
        self._last_processed_at = 0.0

    @staticmethod
    def _linear_detrend(values):
        x = np.linspace(-1.0, 1.0, len(values))
        coefficients = np.polyfit(x, values, 1)
        return values - np.polyval(coefficients, x)

    def _recent_segment(self):
        """Return only the latest continuous run without deleting older samples.

        Browser capture can pause when the face is lost or a request is delayed.
        A large timestamp gap must not poison FPS stability for the next minute.
        """
        times = np.asarray(self.time_buffer, dtype=float)
        rgb = np.asarray(self.rgb_buffer, dtype=float)
        quality = np.asarray(self.frame_quality_buffer, dtype=float)
        if len(times) < 2:
            return times, rgb, quality
        intervals = np.diff(times)
        positive = intervals[intervals > 1e-4]
        typical_interval = float(np.median(positive)) if len(positive) else 0.0
        gap_limit = max(self._segment_gap_seconds, 5.0 * typical_interval)
        gaps = np.flatnonzero(intervals > gap_limit)
        start = int(gaps[-1] + 1) if len(gaps) else 0
        return times[start:], rgb[start:], quality[start:]

    def _resample(self):
        times, rgb, quality = self._recent_segment()
        if len(times) < 2:
            return None
        unique = np.r_[True, np.diff(times) > 1e-4]
        times, rgb, quality = times[unique], rgb[unique], quality[unique]
        if len(times) < 2:
            return None

        intervals = np.diff(times)
        median_dt = float(np.median(intervals))
        if median_dt <= 0:
            return None
        measured_fps = 1.0 / median_dt
        # A pulse band ending at 3 Hz needs sampling safely above Nyquist.
        target_fps = float(np.clip(measured_fps, 6.5, 30.0))
        uniform_times = np.arange(times[0], times[-1] + 0.5 / target_fps, 1.0 / target_fps)
        uniform_rgb = np.column_stack([
            np.interp(uniform_times, times, rgb[:, channel]) for channel in range(3)
        ])
        median_absolute_deviation = float(np.median(np.abs(intervals - median_dt)))
        robust_mad_jitter = 1.4826 * median_absolute_deviation / max(median_dt, 1e-6)
        percentile_spread = float(
            (np.percentile(intervals, 90) - np.percentile(intervals, 10))
            / max(2.0 * median_dt, 1e-6)
        )
        jitter = max(robust_mad_jitter, percentile_spread)
        self.measured_fps = round(measured_fps, 1)
        self.fps_stability = float(np.clip(1.0 - jitter / 0.90, 0.0, 1.0))
        return uniform_times, uniform_rgb, target_fps, quality

    @staticmethod
    def _extract_pos(rgb):
        means = np.mean(rgb, axis=0)
        if np.any(means < 1e-6):
            return None, "Green"
        normalized = rgb / means - 1.0
        s0 = normalized[:, 1] - normalized[:, 2]
        s1 = -2.0 * normalized[:, 0] + normalized[:, 1] + normalized[:, 2]
        std1 = float(np.std(s1))
        if std1 < 1e-8:
            green = normalized[:, 1]
            return green, "Green"
        pulse = s0 + (float(np.std(s0)) / std1) * s1
        return pulse, "POS"

    def _bandpass(self, signal, fs):
        detrended = self._linear_detrend(signal)
        std = float(np.std(detrended))
        if std < 1e-8:
            return None
        normalized = detrended / std
        spectrum = np.fft.rfft(normalized)
        frequencies = np.fft.rfftfreq(len(normalized), d=1.0 / fs)
        keep = (frequencies >= self.MIN_FREQUENCY) & (frequencies <= self.MAX_FREQUENCY)
        spectrum[~keep] = 0.0
        filtered = np.fft.irfft(spectrum, n=len(normalized))
        filtered_std = float(np.std(filtered))
        return filtered / filtered_std if filtered_std > 1e-8 else None

    def _estimate_frequency(self, filtered, fs):
        n_fft = max(2048, 1 << int(np.ceil(np.log2(max(len(filtered), 2)))))
        windowed = filtered * np.hanning(len(filtered))
        spectrum = np.abs(np.fft.rfft(windowed, n=n_fft)) ** 2
        frequencies = np.fft.rfftfreq(n_fft, d=1.0 / fs)
        band = (frequencies >= self.MIN_FREQUENCY) & (frequencies <= self.MAX_FREQUENCY)
        indices = np.flatnonzero(band)
        if not len(indices) or float(np.sum(spectrum[band])) <= 1e-12:
            return None

        peak_index = indices[int(np.argmax(spectrum[band]))]
        peak_frequency = float(frequencies[peak_index])
        peak_region = band & (np.abs(frequencies - peak_frequency) <= 0.12)
        peak_power = float(np.sum(spectrum[peak_region]))
        noise_power = float(np.sum(spectrum[band & ~peak_region]))
        snr_db = 10.0 * np.log10((peak_power + 1e-12) / (noise_power + 1e-12))
        dominance = peak_power / max(float(np.sum(spectrum[band])), 1e-12)
        return peak_frequency, snr_db, dominance

    @staticmethod
    def _prepare_peak_signal(filtered, fs, dominant_frequency):
        """Suppress distant in-band noise while preserving slow beat timing changes."""
        spectrum = np.fft.rfft(filtered)
        frequencies = np.fft.rfftfreq(len(filtered), d=1.0 / fs)
        half_width = max(0.45, 0.35 * dominant_frequency)
        keep = (
            (frequencies >= max(HRVProcessor.MIN_FREQUENCY, dominant_frequency - half_width))
            & (frequencies <= min(HRVProcessor.MAX_FREQUENCY, dominant_frequency + half_width))
        )
        spectrum[~keep] = 0.0
        peak_signal = np.fft.irfft(spectrum, n=len(filtered))
        scale = float(np.std(peak_signal))
        return peak_signal / scale if scale > 1e-8 else filtered

    @staticmethod
    def _detect_pulse_peaks(filtered, uniform_times, fs, dominant_frequency):
        """Detect pulse maxima with prominence and sub-frame interpolation."""
        if len(filtered) < 5 or dominant_frequency <= 0:
            return np.asarray([], dtype=float), np.asarray([], dtype=int)

        local_maxima = np.flatnonzero(
            (filtered[1:-1] > filtered[:-2])
            & (filtered[1:-1] >= filtered[2:])
        ) + 1
        expected_samples = fs / dominant_frequency
        prominence_radius = max(2, int(0.30 * expected_samples))
        amplitude_floor = float(np.median(filtered) + 0.05 * np.std(filtered))
        candidates = []
        for index in local_maxima:
            left = filtered[max(0, index - prominence_radius):index]
            right = filtered[index + 1:min(len(filtered), index + prominence_radius + 1)]
            if not len(left) or not len(right) or filtered[index] < amplitude_floor:
                continue
            prominence = float(filtered[index] - max(np.min(left), np.min(right)))
            if prominence >= 0.25:
                candidates.append((int(index), prominence))

        min_distance = max(2, int(0.50 * expected_samples))
        selected = []
        for index, prominence in candidates:
            if not selected or index - selected[-1][0] >= min_distance:
                selected.append((index, prominence))
            elif prominence > selected[-1][1]:
                selected[-1] = (index, prominence)

        peak_indices = np.asarray([item[0] for item in selected], dtype=int)
        peak_times = []
        for index in peak_indices:
            denominator = filtered[index - 1] - 2.0 * filtered[index] + filtered[index + 1]
            offset = 0.0
            if abs(denominator) > 1e-9:
                offset = 0.5 * (filtered[index - 1] - filtered[index + 1]) / denominator
                offset = float(np.clip(offset, -0.5, 0.5))
            peak_times.append(float(uniform_times[index] + offset / fs))
        return np.asarray(peak_times, dtype=float), peak_indices

    @staticmethod
    def _clean_ibi(raw_ibi):
        """Create NN intervals by detecting and linearly correcting IBI artifacts."""
        intervals = np.asarray(raw_ibi, dtype=float)
        if not len(intervals):
            return intervals, np.asarray([], dtype=bool), False

        finite_and_physiologic = np.isfinite(intervals) & (intervals >= 333.0) & (intervals <= 1429.0)
        reference = intervals[finite_and_physiologic]
        artifact_mask = ~finite_and_physiologic
        if len(reference) >= 3:
            median = float(np.median(reference))
            mad = float(np.median(np.abs(reference - median)))
            robust_sigma = 1.4826 * mad
            deviation_limit = max(120.0, 0.25 * median, 3.5 * robust_sigma)
            artifact_mask |= np.abs(intervals - median) > deviation_limit

            # A sudden beat-to-beat ratio is characteristic of an extra/missed
            # camera peak even when the interval remains physiologically possible.
            for index in range(1, len(intervals)):
                if artifact_mask[index] or artifact_mask[index - 1]:
                    continue
                ratio = intervals[index] / max(intervals[index - 1], 1e-6)
                if ratio < 0.72 or ratio > 1.38:
                    current_deviation = abs(intervals[index] - median)
                    previous_deviation = abs(intervals[index - 1] - median)
                    artifact_mask[index if current_deviation >= previous_deviation else index - 1] = True

        artifact_ratio = float(np.mean(artifact_mask))
        valid_indices = np.flatnonzero(~artifact_mask)
        can_correct = len(valid_indices) >= 2 and artifact_ratio <= 0.80
        if not can_correct:
            return intervals.copy(), artifact_mask, False

        corrected = intervals.copy()
        artifact_indices = np.flatnonzero(artifact_mask)
        if len(artifact_indices):
            corrected[artifact_indices] = np.interp(artifact_indices, valid_indices, intervals[valid_indices])
        return corrected, artifact_mask, True

    @staticmethod
    def _calculate_hrv_metrics(nn_intervals):
        nn = np.asarray(nn_intervals, dtype=float)
        if len(nn) < 2:
            return None
        differences = np.diff(nn)
        return {
            "mean_nn": float(np.mean(nn)),
            "sdnn": float(np.std(nn, ddof=1)),
            "rmssd": float(np.sqrt(np.mean(differences ** 2))),
            "pnn50": float(np.mean(np.abs(differences) > 50.0) * 100.0),
        }

    def _smooth_bpm(self, bpm):
        self.bpm_history.append(float(bpm))
        median_bpm = float(np.median(self.bpm_history))
        if self.latest_bpm <= 0:
            self.latest_bpm = median_bpm
        else:
            target = 0.35 * median_bpm + 0.65 * self.latest_bpm
            delta = float(np.clip(target - self.latest_bpm, -4.0, 4.0))
            self.latest_bpm += delta

    def process_signal(self):
        recent_times, _, _ = self._recent_segment()
        self.sample_count = len(recent_times)
        if self.sample_count < 2:
            self.window_seconds = 0.0
            self.latest_confidence = 0.0
            self.is_valid = False
            return
        self.window_seconds = float(recent_times[-1] - recent_times[0])
        if self.window_seconds < self.min_window_seconds or self.sample_count < 45:
            self.latest_confidence = min(35.0, 35.0 * self.window_seconds / self.min_window_seconds)
            self.is_valid = False
            self.hrv_valid = False
            self.latest_hrv_quality = 0.0
            self.hrv_status_code = "collecting"
            self.hrv_message = "Đang thu thập dữ liệu HRV..."
            self.measurement_message = f"Đang thu tín hiệu... {self.window_seconds:.1f}/{self.min_window_seconds:.0f} giây"
            return

        resampled = self._resample()
        if resampled is None or self.measured_fps < 4.0 or self.fps_stability < 0.15:
            self.set_measurement_state("unstable_fps", "Camera FPS không đủ ổn định", 0.0)
            self.latest_confidence = 0.0
            return
        uniform_times, rgb, fs, segment_quality = resampled
        pulse, self.algorithm = self._extract_pos(rgb)
        filtered = self._bandpass(pulse, fs) if pulse is not None else None
        if filtered is None:
            self.set_measurement_state("noisy_signal", "Tín hiệu rPPG quá nhiễu", 0.0)
            self.latest_confidence = 0.0
            return

        # Only expose the real, filtered waveform. No synthetic display component.
        display_count = min(90, len(filtered))
        self.latest_signal = [round(float(v), 3) for v in filtered[-display_count:]]
        estimate = self._estimate_frequency(filtered, fs)
        if estimate is None:
            self.set_measurement_state("noisy_signal", "Chất lượng tín hiệu thấp", 0.0)
            return
        frequency, snr_db, dominance = estimate
        raw_bpm = frequency * 60.0
        self.latest_raw_bpm = raw_bpm
        self.latest_snr_db = round(float(snr_db), 1)

        roi_quality = float(np.mean(segment_quality[-max(1, len(segment_quality) // 2):]))
        duration_score = float(np.clip((self.window_seconds - 6.0) / 8.0, 0.0, 1.0))
        snr_score = float(np.clip((snr_db + 3.0) / 12.0, 0.0, 1.0))
        dominance_score = float(np.clip((dominance - 0.18) / 0.52, 0.0, 1.0))
        confidence = 100.0 * (
            0.28 * snr_score
            + 0.22 * dominance_score
            + 0.20 * roi_quality
            + 0.15 * self.fps_stability
            + 0.15 * duration_score
        )
        self.latest_confidence = round(float(np.clip(confidence, 0.0, 100.0)), 1)

        valid_peak = self.MIN_BPM <= raw_bpm <= self.MAX_BPM
        self.is_valid = bool(valid_peak and self.latest_confidence >= 40.0)
        if not self.is_valid:
            self.status_code = "noisy_signal"
            self.measurement_message = "Đang ổn định tín hiệu..."
            self.hrv_valid = False
            self.latest_hrv_quality = 0.0
            self.hrv_status_code = "insufficient_quality"
            self.hrv_message = "Chất lượng tín hiệu chưa đủ để phân tích HRV"
            return

        self._smooth_bpm(raw_bpm)
        self.status_code = "measuring"
        self.measurement_message = "Đang đo nhịp tim..."

        peak_signal = self._prepare_peak_signal(filtered, fs, frequency)
        peak_times, _ = self._detect_pulse_peaks(peak_signal, uniform_times, fs, frequency)
        raw_ibi = np.diff(peak_times) * 1000.0 if len(peak_times) >= 2 else np.asarray([], dtype=float)
        nn_intervals, artifact_mask, correctable = self._clean_ibi(raw_ibi)
        artifact_count = int(np.sum(artifact_mask))
        artifact_ratio = float(np.mean(artifact_mask)) if len(artifact_mask) else 0.0

        self.latest_peak_times = [round(float(value - uniform_times[0]), 3) for value in peak_times[-31:]]
        self.latest_peak_count = len(peak_times)
        self.latest_artifact_count = artifact_count
        self.latest_artifact_ratio = round(artifact_ratio * 100.0, 1)
        self.latest_ibi_series = []
        for index, ibi in enumerate(raw_ibi[-30:]):
            source_index = len(raw_ibi) - min(30, len(raw_ibi)) + index
            self.latest_ibi_series.append({
                "time": round(float(peak_times[source_index + 1] - uniform_times[0]), 2),
                "ibi": round(float(ibi), 1),
                "nn": round(float(nn_intervals[source_index]), 1) if correctable else None,
                "artifact": bool(artifact_mask[source_index]),
            })

        self.rr_intervals.clear()
        if correctable:
            self.rr_intervals.extend(float(value) for value in nn_intervals[-30:])

        enough_duration = self.window_seconds >= 6.0
        enough_intervals = len(nn_intervals) >= self.hrv_min_nn_intervals
        peak_consistency = len(peak_times) / max(self.window_seconds * frequency, 1.0)
        plausible_peak_count = 0.20 <= peak_consistency <= 3.0
        hrv_quality = self.latest_confidence * max(0.0, 1.0 - 1.5 * artifact_ratio)
        self.latest_hrv_quality = round(float(np.clip(hrv_quality, 0.0, 100.0)), 1)
        self.hrv_valid = bool(
            enough_duration and enough_intervals and correctable
        )

        if self.hrv_valid:
            calculated = self._calculate_hrv_metrics(nn_intervals)
            self.latest_mean_nn = round(calculated["mean_nn"], 1)
            self.latest_sdnn = round(calculated["sdnn"], 1)
            self.latest_rmssd = round(calculated["rmssd"], 1)
            self.latest_pnn50 = round(calculated["pnn50"], 1)
            self.latest_hrv_stress = 0.0
            self.hrv_status_code = "ready"
            self.hrv_message = "HRV đã sẵn sàng (đo ngắn hạn)"
        else:
            self.latest_mean_nn = 0.0
            self.latest_rmssd = self.latest_sdnn = self.latest_pnn50 = self.latest_hrv_stress = 0.0
            if (artifact_count and (not correctable or artifact_ratio > 0.80)):
                self.hrv_status_code = "artifact_detected"
                self.hrv_message = "Phát hiện quá nhiều nhiễu nhịp – chưa cập nhật HRV"
            elif not enough_duration or not enough_intervals:
                self.hrv_status_code = "collecting"
                remaining = max(0.0, self.hrv_min_window_seconds - self.window_seconds)
                self.hrv_message = f"Đang thu thập NN intervals... còn khoảng {remaining:.0f} giây"
            else:
                self.hrv_status_code = "insufficient_quality"
                self.hrv_message = "Chất lượng tín hiệu chưa đủ để phân tích HRV"

    def reset(self):
        self.time_buffer.clear()
        self.rgb_buffer.clear()
        self.green_buffer.clear()
        self.frame_quality_buffer.clear()
        self.bpm_history.clear()
        self.rr_intervals.clear()
        self.latest_bpm = self.latest_raw_bpm = 0.0
        self.latest_rmssd = self.latest_sdnn = self.latest_pnn50 = self.latest_mean_nn = 0.0
        self.latest_hrv_stress = self.latest_confidence = self.latest_snr_db = 0.0
        self.latest_signal = []
        self.latest_ibi_series = []
        self.latest_peak_times = []
        self.latest_peak_count = 0
        self.latest_artifact_count = 0
        self.latest_artifact_ratio = 0.0
        self.latest_hrv_quality = 0.0
        self.hrv_valid = False
        self.hrv_status_code = "collecting"
        self.hrv_message = "Đang thu thập dữ liệu HRV..."
        self.measured_fps = self.fps_stability = self.window_seconds = 0.0
        self.sample_count = 0
        self.is_valid = False
        self.status_code = "waiting_for_face"
        self.measurement_message = "Đưa khuôn mặt vào giữa khung hình"
        self._last_processed_at = 0.0

    @property
    def quality_label(self):
        score = self.latest_confidence
        if score >= 85:
            return "Excellent"
        if score >= 70:
            return "Good"
        if score >= 55:
            return "Fair"
        return "Poor"

    def get_metrics(self):
        bpm = round(self.latest_bpm, 1) if self.is_valid else 0
        status = "HRV khả dụng (đo ngắn hạn)" if self.hrv_valid else self.hrv_message
        return {
            "bpm": bpm,
            "BPM": bpm,
            "raw_bpm": round(self.latest_raw_bpm, 1) if self.is_valid else 0,
            "rmssd": self.latest_rmssd if self.hrv_valid else 0.0,
            "RMSSD": self.latest_rmssd if self.hrv_valid else 0.0,
            "sdnn": self.latest_sdnn if self.hrv_valid else 0.0,
            "SDNN": self.latest_sdnn if self.hrv_valid else 0.0,
            "mean_nn": self.latest_mean_nn if self.hrv_valid else 0.0,
            "MeanNN": self.latest_mean_nn if self.hrv_valid else 0.0,
            "pnn50": self.latest_pnn50 if self.hrv_valid else 0.0,
            "hrv_stress": self.latest_hrv_stress if self.hrv_valid else 0.0,
            "hrv_valid": self.hrv_valid,
            "hrv_status_code": self.hrv_status_code,
            "hrv_message": self.hrv_message,
            "nn_intervals": [round(float(value), 1) for value in self.rr_intervals] if self.hrv_valid else [],
            "ibi_series": self.latest_ibi_series,
            "pulse_peak_times": self.latest_peak_times,
            "pulse_peak_count": self.latest_peak_count,
            "nn_count": len(self.rr_intervals) if self.hrv_valid else 0,
            "artifact_count": self.latest_artifact_count,
            "artifact_ratio": self.latest_artifact_ratio,
            "hrv_quality": self.latest_hrv_quality,
            "hrv_progress": round(min(100.0, 100.0 * self.window_seconds / self.hrv_min_window_seconds), 1),
            "frequency_domain": {"lf": None, "hf": None, "lf_hf": None, "status": "insufficient_data"},
            "status": status,
            "signal": self.latest_signal,
            "rppg_hz": round(bpm / 60.0, 2) if bpm else 0.0,
            "green_intensity": round(float(np.mean(self.green_buffer)), 1) if self.green_buffer else 0.0,
            "rppg_status": self.measurement_message,
            "measurement_status": self.measurement_message,
            "status_code": self.status_code,
            "signal_quality": self.latest_confidence,
            "quality_label": self.quality_label,
            "signal_valid": self.is_valid,
            "snr_db": self.latest_snr_db,
            "fps": self.measured_fps,
            "fps_stability": round(self.fps_stability * 100.0, 1),
            "sample_count": self.sample_count,
            "window_seconds": round(self.window_seconds, 1),
            "algorithm": self.algorithm,
        }

    def run_pipeline(self, raw_signal: np.ndarray) -> dict:
        """Compatibility helper for callers with an already sampled Green trace."""
        self.reset()
        for index, value in enumerate(np.asarray(raw_signal, dtype=float)):
            self.add_sample(index / self.fps, value)
        metrics = self.get_metrics()
        return {
            "BPM": metrics["bpm"], "RMSSD": metrics["rmssd"],
            "SDNN": metrics["sdnn"], "MeanNN": metrics["mean_nn"], "LFHF": None,
            "hrv_stress": metrics["hrv_stress"], "status": metrics["status"],
            "signal_quality": metrics["signal_quality"], "hrv_valid": metrics["hrv_valid"],
        }
