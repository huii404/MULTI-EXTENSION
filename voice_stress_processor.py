"""Validation and conservative interpretation of browser acoustic features.

This module does not diagnose stress. It turns measured voice features into
quality-gated cues that can support (but never replace) transcript analysis.
"""

from __future__ import annotations

import math
from typing import Any, Dict, Iterable


class VoiceStressProcessor:
    MIN_DURATION_SECONDS = 2.0
    MIN_SPEECH_SECONDS = 1.0

    _FIELDS = {
        "duration_seconds",
        "speech_seconds",
        "sample_count",
        "pitch_sample_count",
        "silence_ratio",
        "rms_mean",
        "rms_p95",
        "rms_cv",
        "noise_rms",
        "speech_to_noise_ratio",
        "pitch_mean_hz",
        "pitch_cv",
        "voiced_ratio",
        "pause_count",
        "words_per_minute",
        "clipping_ratio",
    }

    @staticmethod
    def _number(value: Any, default: float = 0.0) -> float:
        if isinstance(value, bool):
            return default
        try:
            number = float(value)
        except (TypeError, ValueError):
            return default
        return number if math.isfinite(number) else default

    @staticmethod
    def _clamp(value: float, low: float, high: float) -> float:
        return max(low, min(high, value))

    def _clean(self, raw: Any) -> Dict[str, float]:
        if not isinstance(raw, dict):
            return {}
        return {key: self._number(raw[key]) for key in self._FIELDS if key in raw}

    @staticmethod
    def _unique(items: Iterable[str]) -> list[str]:
        return list(dict.fromkeys(items))

    def analyze(self, raw_metrics: Any) -> Dict[str, Any]:
        metrics = self._clean(raw_metrics)
        duration = self._clamp(metrics.get("duration_seconds", 0.0), 0.0, 300.0)
        speech_seconds = self._clamp(metrics.get("speech_seconds", 0.0), 0.0, duration)
        samples = int(self._clamp(metrics.get("sample_count", 0.0), 0.0, 100000.0))
        pitch_samples = int(self._clamp(metrics.get("pitch_sample_count", 0.0), 0.0, samples))
        voiced_ratio = self._clamp(metrics.get("voiced_ratio", 0.0), 0.0, 1.0)
        silence_ratio = self._clamp(metrics.get("silence_ratio", 1.0), 0.0, 1.0)
        snr_ratio = self._clamp(metrics.get("speech_to_noise_ratio", 0.0), 0.0, 100.0)
        clipping_ratio = self._clamp(metrics.get("clipping_ratio", 0.0), 0.0, 1.0)

        quality_parts = [
            self._clamp(duration / 5.0, 0.0, 1.0),
            self._clamp(speech_seconds / 3.0, 0.0, 1.0),
            self._clamp(samples / 35.0, 0.0, 1.0),
            self._clamp(snr_ratio / 4.0, 0.0, 1.0),
            1.0 - self._clamp(clipping_ratio / 0.08, 0.0, 1.0),
        ]
        quality = round(100.0 * sum(quality_parts) / len(quality_parts), 1)
        valid = (
            duration >= self.MIN_DURATION_SECONDS
            and speech_seconds >= self.MIN_SPEECH_SECONDS
            and samples >= 15
            and snr_ratio >= 1.5
            and clipping_ratio < 0.15
        )

        signals: list[str] = []
        evidence: list[str] = []
        wpm = self._clamp(metrics.get("words_per_minute", 0.0), 0.0, 400.0)
        pitch_cv = self._clamp(metrics.get("pitch_cv", 0.0), 0.0, 2.0)
        rms_cv = self._clamp(metrics.get("rms_cv", 0.0), 0.0, 5.0)
        pause_count = int(self._clamp(metrics.get("pause_count", 0.0), 0.0, 1000.0))
        pause_rate = pause_count / max(speech_seconds / 60.0, 1.0 / 60.0)

        if valid and wpm >= 170:
            signals.append("fast_pace")
            evidence.append("Tốc độ nói cao so với hội thoại thông thường")
        elif valid and 0 < wpm <= 75 and speech_seconds >= 2.0:
            signals.append("slow_pace")
            evidence.append("Tốc độ nói chậm")

        pitch_reliable = pitch_samples >= 8 and voiced_ratio >= 0.25
        if valid and pitch_reliable and pitch_cv >= 0.14:
            signals.append("shaky_voice")
            evidence.append("Cao độ biến thiên mạnh trong các đoạn hữu thanh")

        if valid and 0.28 <= silence_ratio <= 0.78 and pause_rate >= 10:
            signals.append("frequent_pauses")
            evidence.append("Có nhiều khoảng ngắt trong lời nói")

        # Absolute microphone levels vary by device. These cues therefore require
        # both a relative SNR condition and an extreme normalized level.
        rms_mean = self._clamp(metrics.get("rms_mean", 0.0), 0.0, 1.0)
        rms_p95 = self._clamp(metrics.get("rms_p95", 0.0), 0.0, 1.0)
        if valid and snr_ratio >= 4.0 and rms_p95 >= 0.22 and clipping_ratio < 0.05:
            signals.append("loud_voice")
            evidence.append("Mức năng lượng giọng nói cao")
        elif valid and snr_ratio >= 2.0 and rms_mean <= 0.018:
            signals.append("quiet_voice")
            evidence.append("Mức năng lượng giọng nói thấp")

        if valid and rms_cv >= 1.1:
            signals.append("high_energy_variation")
            evidence.append("Năng lượng giọng nói thay đổi mạnh")

        stress_weights = {
            "shaky_voice": 0.34,
            "fast_pace": 0.18,
            "frequent_pauses": 0.18,
            "high_energy_variation": 0.14,
            "loud_voice": 0.12,
            "quiet_voice": 0.08,
        }
        cue_score = sum(stress_weights.get(signal, 0.0) for signal in signals)
        confidence = round(self._clamp((quality / 100.0) * min(1.0, len(signals) / 2.0), 0.0, 1.0), 3)
        elevated = valid and len(signals) >= 2 and cue_score >= 0.32 and confidence >= 0.45

        if not metrics:
            status = "unavailable"
        elif not valid:
            status = "insufficient_signal"
        elif elevated:
            status = "elevated_cues"
        elif signals:
            status = "some_cues"
        else:
            status = "stable"

        return {
            "valid": valid,
            "status": status,
            "quality": quality,
            "confidence": confidence,
            "elevated_cues": elevated,
            "signals": self._unique(signals),
            "evidence": evidence,
            "metrics": {
                "duration_seconds": round(duration, 2),
                "speech_seconds": round(speech_seconds, 2),
                "silence_ratio": round(silence_ratio, 3),
                "words_per_minute": round(wpm, 1) if wpm else None,
                "pitch_mean_hz": round(metrics.get("pitch_mean_hz", 0.0), 1) if pitch_reliable else None,
                "pitch_variability": round(pitch_cv, 3) if pitch_reliable else None,
                "voiced_ratio": round(voiced_ratio, 3),
                "pause_count": pause_count,
            },
            "disclaimer": "Chỉ là dấu hiệu tham khảo từ giọng nói, không phải chẩn đoán stress.",
        }
