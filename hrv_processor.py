import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, find_peaks, welch
from scipy.interpolate import interp1d
import warnings
warnings.filterwarnings('ignore')

class HRVProcessor:
    """
    Module xử lý tín hiệu sinh học & biến thiên nhịp tim (HRV).
    Hỗ trợ cả tín hiệu ECG thô và tín hiệu rPPG (quang thể tích chụp qua camera).
    """
    def __init__(self, sampling_rate: int = 500):
        self.fs = sampling_rate

    def preprocess_signal(self, raw_signal: np.ndarray, lowcut: float = 0.5, highcut: float = 45.0) -> np.ndarray:
        """
        Lọc dải thông Butterworth (Bandpass Filter) để loại bỏ nhiễu đường đẳng điện và nhiễu cơ.
        """
        if len(raw_signal) < 10:
            return raw_signal
            
        nyquist = 0.5 * self.fs
        low = max(0.01, lowcut / nyquist)
        high = min(0.99, highcut / nyquist)
        
        b, a = butter(2, [low, high], btype='band')
        cleaned = filtfilt(b, a, raw_signal)
        return cleaned

    def extract_peaks(self, cleaned_signal: np.ndarray, distance_ms: float = 350.0) -> np.ndarray:
        """
        Trích xuất đỉnh R (Peak Detection) dựa trên khoảng cách tối thiểu giữa các nhịp.
        """
        if len(cleaned_signal) < 4:
            return np.array([])
            
        min_distance = int((distance_ms / 1000.0) * self.fs)
        min_distance = max(1, min_distance)
        
        std_val = np.std(cleaned_signal)
        prom = std_val * 0.1 if std_val > 1e-6 else None
        
        peaks, _ = find_peaks(cleaned_signal, distance=min_distance, prominence=prom)
        
        if len(peaks) < 2:
            # Fallback local maxima nếu prominence quá ngặt
            peaks, _ = find_peaks(cleaned_signal, distance=min_distance)
            
        return peaks

    def clean_rr_intervals(self, rpeaks: np.ndarray) -> np.ndarray:
        """
        Chuyển đổi đỉnh R thành khoảng R-R (ms) và áp dụng Quy tắc Malik lọc bỏ nhiễu / nhịp ngoại tâm thu.
        """
        if len(rpeaks) < 2:
            return np.array([])

        # RRI tính bằng mili-giây (ms)
        rri_raw = np.diff(rpeaks) / self.fs * 1000.0

        # Lọc sinh lý cơ bản: khoảng cách R-R chuẩn nằm trong range [300ms, 2000ms]
        valid_mask = (rri_raw >= 300) & (rri_raw <= 2000)
        rri_filtered = rri_raw[valid_mask]

        if len(rri_filtered) < 2:
            return rri_raw

        # Malik Filter: loại bỏ nhịp biến đổi bất thường (> 25% so với trung vị)
        median_rri = np.median(rri_filtered)
        malik_mask = np.abs(rri_filtered - median_rri) <= (0.25 * median_rri)
        rri_clean = rri_filtered[malik_mask]

        if len(rri_clean) < 2:
            return rri_filtered

        # Nội suy Cubic Spline nếu có điểm bị xóa
        if len(rri_clean) < len(rri_filtered):
            x_old = np.linspace(0, 1, len(rri_clean))
            x_new = np.linspace(0, 1, len(rri_filtered))
            f = interp1d(x_old, rri_clean, kind='linear', fill_value="extrapolate")
            rri_clean = f(x_new)

        return rri_clean

    def compute_time_domain(self, rri: np.ndarray) -> dict:
        """
        Tính toán các chỉ số HRV Miền thời gian (Time-Domain).
        """
        if len(rri) < 2:
            return {'MeanNN': 0.0, 'SDNN': 0.0, 'RMSSD': 0.0, 'pNN50': 0.0}

        mean_nn = float(np.mean(rri))
        sdnn = float(np.std(rri, ddof=1)) if len(rri) > 1 else 0.0

        # RMSSD: Căn bậc hai của trung bình bình phương các hiệu khoảng RR liên tiếp
        rr_diff = np.diff(rri)
        rmssd = float(np.sqrt(np.mean(rr_diff ** 2))) if len(rr_diff) > 0 else 0.0

        # pNN50: Tỷ lệ phần trăm hiệu khoảng RR > 50ms
        nn50 = np.sum(np.abs(rr_diff) > 50.0)
        pnn50 = float((nn50 / len(rr_diff)) * 100.0) if len(rr_diff) > 0 else 0.0

        return {
            'MeanNN': round(mean_nn, 2),
            'SDNN': round(sdnn, 2),
            'RMSSD': round(rmssd, 2),
            'pNN50': round(pnn50, 2)
        }

    def compute_frequency_domain(self, rri: np.ndarray) -> dict:
        """
        Tính toán các chỉ số HRV Miền tần số (Frequency-Domain): VLF, LF, HF, LF/HF Ratio.
        """
        if len(rri) < 4:
            return {'LF': 0.0, 'HF': 0.0, 'LFHF': 0.0}

        time_stamps = np.cumsum(rri) / 1000.0
        time_stamps -= time_stamps[0]
        
        fs_resample = 4.0
        interp_func = interp1d(time_stamps, rri, kind='linear', fill_value='extrapolate')
        time_uniform = np.arange(0, time_stamps[-1], 1.0 / fs_resample)
        
        if len(time_uniform) < 8:
            return {'LF': 0.0, 'HF': 0.0, 'LFHF': 0.0}

        rri_uniform = interp_func(time_uniform)

        nperseg = min(len(rri_uniform), 256)
        freqs, psd = welch(rri_uniform, fs=fs_resample, nperseg=nperseg)

        lf_mask = (freqs >= 0.04) & (freqs < 0.15)
        hf_mask = (freqs >= 0.15) & (freqs <= 0.40)

        trapz_func = getattr(np, 'trapezoid', getattr(np, 'trapz', None))
        
        lf_power = float(trapz_func(psd[lf_mask], freqs[lf_mask])) if np.any(lf_mask) and trapz_func else 0.0
        hf_power = float(trapz_func(psd[hf_mask], freqs[hf_mask])) if np.any(hf_mask) and trapz_func else 0.0

        lf_hf_ratio = float(lf_power / hf_power) if hf_power > 1e-6 else 0.0

        return {
            'LF': round(lf_power, 2),
            'HF': round(hf_power, 2),
            'LFHF': round(lf_hf_ratio, 2)
        }

    def compute_non_linear(self, rri: np.ndarray) -> dict:
        """
        Tính toán các chỉ số Phi tuyến tính (Poincaré plot: SD1, SD2).
        """
        if len(rri) < 3:
            return {'SD1': 0.0, 'SD2': 0.0}

        rr_n = rri[:-1]
        rr_n1 = rri[1:]

        sd1 = float(np.sqrt(0.5 * np.var(rr_n1 - rr_n)))
        sd2 = float(np.sqrt(2.0 * np.var(rri) - 0.5 * np.var(rr_n1 - rr_n)))

        return {
            'SD1': round(sd1, 2),
            'SD2': round(sd2, 2)
        }

    def run_pipeline(self, raw_signal: np.ndarray) -> dict:
        """
        Thực thi toàn bộ quy trình từ lọc nhiễu đến tính toán đầy đủ chỉ số HRV.
        """
        cleaned = self.preprocess_signal(raw_signal)
        peaks = self.extract_peaks(cleaned)
        rri = self.clean_rr_intervals(peaks)

        time_metrics = self.compute_time_domain(rri)
        freq_metrics = self.compute_frequency_domain(rri)
        non_linear_metrics = self.compute_non_linear(rri)

        bpm = round(float(60000.0 / time_metrics['MeanNN']), 1) if time_metrics['MeanNN'] > 0 else 0.0

        results = {
            'BPM': bpm,
            'peaks_count': len(peaks),
            'rri_count': len(rri),
            **time_metrics,
            **freq_metrics,
            **non_linear_metrics
        }
        return results

# Test demo
if __name__ == '__main__':
    processor = HRVProcessor(sampling_rate=500)
    t = np.linspace(0, 60, 500 * 60)
    synthetic_ecg = np.sin(2 * np.pi * 1.2 * t) + 0.5 * np.sin(2 * np.pi * 2.4 * t)
    
    res = processor.run_pipeline(synthetic_ecg)
    print("=== TEST KẾT QUẢ TRIỂN KHAI HRV PROCESSOR ===")
    for k, v in res.items():
        print(f" - {k:<12}: {v}")
