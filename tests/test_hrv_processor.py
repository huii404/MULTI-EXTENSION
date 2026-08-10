import unittest

import numpy as np

from hrv_processor import HRVProcessor


class HRVProcessorTests(unittest.TestCase):
    def make_periodic_processor(self, bpm=72.0, duration=20.0, seed=7):
        rng = np.random.default_rng(seed)
        processor = HRVProcessor(buffer_seconds=20, fps=15)
        timestamp = 0.0
        for _ in range(int(duration * 15)):
            timestamp += 1.0 / 15.0 + rng.normal(0, 0.0015)
            pulse = np.sin(2 * np.pi * (bpm / 60.0) * timestamp)
            processor.add_rgb_sample(
                timestamp,
                125 + 0.35 * pulse + rng.normal(0, 0.06),
                145 + 1.15 * pulse + rng.normal(0, 0.06),
                105 + 0.20 * pulse + rng.normal(0, 0.06),
                quality=0.92,
            )
        return processor

    def test_periodic_rgb_signal_produces_expected_bpm(self):
        metrics = self.make_periodic_processor().get_metrics()
        self.assertTrue(metrics["signal_valid"])
        self.assertAlmostEqual(metrics["bpm"], 72.0, delta=1.0)
        self.assertGreaterEqual(metrics["signal_quality"], 70.0)
        self.assertEqual(metrics["algorithm"], "POS")
        self.assertTrue(metrics["signal"])
        self.assertTrue(metrics["hrv_valid"])
        self.assertGreaterEqual(metrics["nn_count"], 10)
        nn = np.asarray(metrics["nn_intervals"], dtype=float)
        expected_rmssd = np.sqrt(np.mean(np.diff(nn) ** 2))
        expected_sdnn = np.std(nn, ddof=1)
        self.assertAlmostEqual(metrics["rmssd"], expected_rmssd, delta=0.15)
        self.assertAlmostEqual(metrics["sdnn"], expected_sdnn, delta=0.15)
        self.assertAlmostEqual(metrics["mean_nn"], np.mean(nn), delta=0.15)

    def test_short_window_never_publishes_bpm(self):
        metrics = self.make_periodic_processor(duration=4.0).get_metrics()
        self.assertFalse(metrics["signal_valid"])
        self.assertEqual(metrics["bpm"], 0)

    def test_noise_is_rejected(self):
        rng = np.random.default_rng(11)
        processor = HRVProcessor(buffer_seconds=20, fps=15)
        for index in range(300):
            processor.add_rgb_sample(
                index / 15.0, *rng.normal(120, 5, 3), quality=0.35
            )
        metrics = processor.get_metrics()
        self.assertFalse(metrics["signal_valid"])
        self.assertEqual(metrics["bpm"], 0)

    def test_bad_capture_state_keeps_buffer_but_hides_bpm(self):
        processor = self.make_periodic_processor()
        sample_count = processor.get_metrics()["sample_count"]
        processor.set_measurement_state("excessive_motion", "Giữ yên", 0.0)
        metrics = processor.get_metrics()
        self.assertEqual(metrics["sample_count"], sample_count)
        self.assertFalse(metrics["signal_valid"])
        self.assertEqual(metrics["bpm"], 0)
        self.assertEqual(metrics["status_code"], "excessive_motion")

    def test_non_finite_sample_is_ignored(self):
        processor = HRVProcessor()
        processor.add_rgb_sample(1.0, np.nan, 100, 100)
        self.assertEqual(processor.get_metrics()["sample_count"], 0)

    def test_low_fps_is_rejected(self):
        processor = HRVProcessor(buffer_seconds=20, fps=15)
        for index in range(50):
            timestamp = index / 2.0
            pulse = np.sin(2 * np.pi * 1.2 * timestamp)
            processor.add_rgb_sample(timestamp, 120 + pulse, 140 + 2 * pulse, 100, quality=0.9)
        metrics = processor.get_metrics()
        self.assertFalse(metrics["signal_valid"])
        self.assertEqual(metrics["bpm"], 0)
        self.assertEqual(metrics["status_code"], "unstable_fps")

    def test_unstable_frame_timing_is_rejected(self):
        processor = HRVProcessor(buffer_seconds=20, fps=15)
        timestamp = 0.0
        for index in range(140):
            timestamp += 0.03 if index % 2 else 0.17
            pulse = np.sin(2 * np.pi * 1.2 * timestamp)
            processor.add_rgb_sample(timestamp, 120 + pulse, 140 + 2 * pulse, 100, quality=0.9)
        metrics = processor.get_metrics()
        self.assertFalse(metrics["signal_valid"])
        self.assertEqual(metrics["status_code"], "unstable_fps")

    def test_long_capture_gap_starts_new_analysis_segment_without_clearing_buffer(self):
        processor = self.make_periodic_processor(duration=10.0)
        stored_before_gap = len(processor.time_buffer)
        timestamp = processor.time_buffer[-1] + 2.0
        processor.add_rgb_sample(timestamp, 125, 145, 105, quality=0.9)
        metrics = processor.get_metrics()
        self.assertGreater(len(processor.time_buffer), stored_before_gap)
        self.assertEqual(metrics["sample_count"], 1)
        self.assertEqual(metrics["window_seconds"], 0.0)
        self.assertFalse(metrics["signal_valid"])
        self.assertEqual(metrics["status_code"], "collecting")

    def test_new_contiguous_segment_recovers_after_old_gap(self):
        rng = np.random.default_rng(29)
        processor = HRVProcessor(buffer_seconds=30, fps=10)
        timestamp = 0.0
        for segment in range(2):
            if segment:
                timestamp += 3.0
            for _ in range(120):
                timestamp += 0.1 + rng.normal(0, 0.004)
                pulse = np.sin(2 * np.pi * 1.2 * timestamp)
                processor.add_rgb_sample(
                    timestamp,
                    125 + 0.35 * pulse,
                    145 + 1.15 * pulse,
                    105 + 0.20 * pulse,
                    quality=0.92,
                )
        metrics = processor.get_metrics()
        self.assertTrue(metrics["signal_valid"])
        self.assertLess(metrics["window_seconds"], 13.0)
        self.assertAlmostEqual(metrics["bpm"], 72.0, delta=1.5)

    def test_smoothing_limits_single_update_jump(self):
        processor = HRVProcessor()
        processor._smooth_bpm(72)
        processor._smooth_bpm(105)
        self.assertLessEqual(processor.latest_bpm, 76.0)

    def test_artifact_is_detected_and_interpolated_without_random_data(self):
        raw_ibi = np.asarray([920, 1110, 950, 2500, 1070, 980, 1030, 990, 1040, 960, 1010, 995], dtype=float)
        nn, artifact_mask, correctable = HRVProcessor._clean_ibi(raw_ibi)
        self.assertTrue(correctable)
        self.assertEqual(np.flatnonzero(artifact_mask).tolist(), [3])
        self.assertEqual(nn[3], (raw_ibi[2] + raw_ibi[4]) / 2.0)
        self.assertFalse(np.array_equal(nn, raw_ibi))

    def test_peak_timestamps_create_real_beat_to_beat_intervals(self):
        fs = 30.0
        expected_seconds = np.asarray([0.90, 1.10, 0.95, 1.05] * 5)
        expected_peaks = np.r_[0.8, 0.8 + np.cumsum(expected_seconds)]
        times = np.arange(0.0, expected_peaks[-1] + 0.8, 1.0 / fs)
        pulse_signal = sum(
            np.exp(-0.5 * ((times - peak_time) / 0.07) ** 2)
            for peak_time in expected_peaks
        )
        detected_times, _ = HRVProcessor._detect_pulse_peaks(pulse_signal, times, fs, 1.0)
        detected_ibi = np.diff(detected_times) * 1000.0
        self.assertEqual(len(detected_times), len(expected_peaks))
        np.testing.assert_allclose(detected_ibi, expected_seconds * 1000.0, atol=1.0)
        metrics = HRVProcessor._calculate_hrv_metrics(detected_ibi)
        expected_rmssd = np.sqrt(np.mean(np.diff(expected_seconds * 1000.0) ** 2))
        self.assertAlmostEqual(metrics["rmssd"], expected_rmssd, delta=1.0)

    def test_too_many_artifacts_make_hrv_uncorrectable(self):
        raw_ibi = np.asarray([900, 2500, 300, 2400, 950, 2600, 920, 2500, 940, 2600], dtype=float)
        _, artifact_mask, correctable = HRVProcessor._clean_ibi(raw_ibi)
        self.assertFalse(correctable)
        self.assertGreater(np.mean(artifact_mask), 0.20)

    def test_frequency_domain_is_not_fabricated_for_short_recording(self):
        metrics = self.make_periodic_processor().get_metrics()
        frequency_domain = metrics["frequency_domain"]
        self.assertEqual(frequency_domain["status"], "insufficient_data")
        self.assertIsNone(frequency_domain["lf"])
        self.assertIsNone(frequency_domain["hf"])
        self.assertIsNone(frequency_domain["lf_hf"])


if __name__ == "__main__":
    unittest.main()
