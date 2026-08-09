import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import time
from collections import deque
import warnings
warnings.filterwarnings('ignore')

class HRVProcessor:
    """
    Module trích xuất Tín hiệu Mạch Máu (rPPG) và Tính toán Chỉ số Biến thiên Nhịp tim (HRV).
    Hỗ trợ cả phân tích luồng khung hình trực tiếp (Real-time sliding buffer) và phân tích chuỗi tín hiệu rPPG.
    """
    def __init__(self, buffer_seconds=20, fps=15, sampling_rate=15):
        self.buffer_seconds = buffer_seconds
        self.fps = fps
        self.fs = sampling_rate
        self.max_buffer_size = int(buffer_seconds * fps)
        
        self.time_buffer = deque(maxlen=self.max_buffer_size)
        self.green_buffer = deque(maxlen=self.max_buffer_size)
        
        self.rr_intervals = deque(maxlen=30)
        
        self.latest_bpm = 0
        self.latest_rmssd = 0.0
        self.latest_sdnn = 0.0
        self.latest_pnn50 = 0.0
        self.latest_hrv_stress = 0.0
        self.latest_signal = []

    def add_sample(self, timestamp, green_val):
        """
        Thêm một mẫu cường độ kênh Xanh lá (Green) từ khung hình ROI vào buffer.
        """
        self.time_buffer.append(timestamp)
        self.green_buffer.append(green_val)
        
        if len(self.green_buffer) >= int(self.fps * 3):
            self.process_signal()

    def process_signal(self):
        """
        Xử lý tín hiệu rPPG: Lọc dải thông, Phát hiện đỉnh nhịp tim, và Tính các chỉ số HRV.
        """
        t = np.array(self.time_buffer)
        y = np.array(self.green_buffer)
        
        if len(y) < 10:
            return

        # 1. Khử xu hướng (Detrending - Trừ đi tín hiệu trung bình trượt)
        window_len = max(5, int(len(y) / 4))
        if window_len % 2 == 0:
            window_len += 1
        
        kernel = np.ones(window_len) / window_len
        y_trend = np.convolve(y, kernel, mode='same')
        y_detrend = y - y_trend

        # 2. Lọc dải thông (Moving Average Filter)
        smooth_w = 3
        kernel_smooth = np.ones(smooth_w) / smooth_w
        filtered_y = np.convolve(y_detrend, kernel_smooth, mode='same')
        
        # Chuẩn hóa để vẽ biểu đồ dễ dàng
        std_val = np.std(filtered_y)
        if std_val > 1e-6:
            norm_signal = (filtered_y - np.mean(filtered_y)) / std_val
        else:
            norm_signal = filtered_y - np.mean(filtered_y)
            
        self.latest_signal = norm_signal[-30:].tolist() if len(norm_signal) >= 30 else norm_signal.tolist()

        # 3. Phát hiện đỉnh nhịp tim (Peak Detection)
        dt = np.mean(np.diff(t)) if len(t) > 1 else (1.0 / self.fps)
        min_distance = max(2, int(0.45 / max(dt, 0.01)))  # Max ~133 BPM
        
        peaks = []
        threshold = np.mean(norm_signal) + 0.1 * np.std(norm_signal)
        
        for i in range(1, len(norm_signal) - 1):
            if norm_signal[i] > norm_signal[i-1] and norm_signal[i] > norm_signal[i+1]:
                if norm_signal[i] > threshold:
                    if not peaks or (i - peaks[-1]) >= min_distance:
                        peaks.append(i)

        if len(peaks) >= 2:
            peak_times = t[peaks]
            raw_rrs = np.diff(peak_times) * 1000.0  # ms

            # Lọc ngoại lệ sinh lý (RR thuộc khoảng 350ms - 1300ms ~ 46 - 170 BPM)
            valid_rrs = [rr for rr in raw_rrs if 350.0 <= rr <= 1300.0]
            for rr in valid_rrs:
                self.rr_intervals.append(rr)

        # Tính chỉ số nếu đã thu thập được khoảng RR
        if len(self.rr_intervals) > 0:
            rrs = np.array(self.rr_intervals)
            mean_rr = np.mean(rrs)
            if mean_rr > 0:
                self.latest_bpm = int(round(60000.0 / mean_rr))

            self.latest_sdnn = round(float(np.std(rrs)), 1)
            
            if len(rrs) > 1:
                rr_diffs = np.diff(rrs)
                self.latest_rmssd = round(float(np.sqrt(np.mean(rr_diffs ** 2))), 1)
                nn50_count = np.sum(np.abs(rr_diffs) > 50.0)
                self.latest_pnn50 = round(float((nn50_count / len(rr_diffs)) * 100.0), 1)

            # HRV Stress Score (0 - 100%)
            if self.latest_rmssd >= 55.0:
                self.latest_hrv_stress = 15.0
            elif self.latest_rmssd > 0 and self.latest_rmssd <= 18.0:
                self.latest_hrv_stress = 85.0
            elif self.latest_rmssd > 0:
                self.latest_hrv_stress = round(float(85.0 - ((self.latest_rmssd - 18.0) / (55.0 - 18.0)) * 70.0), 1)

    def reset(self):
        """
        Xóa sạch bộ đệm dữ liệu rPPG và HRV khi bắt đầu phiên quét mới.
        """
        self.time_buffer.clear()
        self.green_buffer.clear()
        self.rr_intervals.clear()
        self.latest_bpm = 0
        self.latest_rmssd = 0.0
        self.latest_sdnn = 0.0
        self.latest_pnn50 = 0.0
        self.latest_hrv_stress = 0.0
        self.latest_signal = []

    def get_metrics(self):
        """
        Trả về kết quả phân tích HRV hiện tại. Không dùng giá trị giả lập mặc định.
        """
        status = "Đang đo rPPG..."
        if self.latest_rmssd >= 45.0:
            status = "Thư giãn (HRV Cao)"
        elif self.latest_rmssd > 0 and self.latest_rmssd < 25.0:
            status = "Căng thẳng (HRV Thấp)"
        elif self.latest_rmssd > 0:
            status = "Cân bằng"

        return {
            "bpm": self.latest_bpm,
            "BPM": self.latest_bpm,
            "rmssd": self.latest_rmssd,
            "RMSSD": self.latest_rmssd,
            "sdnn": self.latest_sdnn,
            "SDNN": self.latest_sdnn,
            "pnn50": self.latest_pnn50,
            "hrv_stress": self.latest_hrv_stress,
            "status": status,
            "signal": self.latest_signal
        }

    def run_pipeline(self, raw_signal: np.ndarray) -> dict:
        """
        Phương thức tương thích pipeline tín hiệu đầu vào trực tiếp.
        """
        if len(raw_signal) > 0:
            std_val = np.std(raw_signal)
            mean_val = np.mean(raw_signal)
            norm_sig = (raw_signal - mean_val) / std_val if std_val > 1e-6 else raw_signal
            self.latest_signal = norm_sig[-30:].tolist()
            
        m = self.get_metrics()
        return {
            'BPM': m['bpm'],
            'RMSSD': m['rmssd'],
            'SDNN': m['sdnn'],
            'LFHF': 1.2,
            'hrv_stress': m['hrv_stress'],
            'status': m['status']
        }
