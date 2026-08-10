import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np

class HRVBaselineManager:
    """
    Quản lý Baseline cá nhân hóa (7 ngày) và tính toán Z-Score phản ánh mức độ Stress thực tế.
    Giải quyết triệt để "Bẫy ngưỡng cố định" (Fixed Threshold Trap) nêu trong nghiên cứu.
    """
    def __init__(self, default_mean_rmssd: float = 42.0, default_std_rmssd: float = 12.0):
        self.default_mean = default_mean_rmssd
        self.default_std = default_std_rmssd

    @staticmethod
    def has_personal_baseline(baseline_history: list = None) -> bool:
        valid = [
            item for item in (baseline_history or [])
            if isinstance(item, dict) and float(item.get('rmssd', item.get('RMSSD', 0)) or 0) > 0
        ]
        return len(valid) >= 3

    def calculate_zscore(self, current_rmssd: float, baseline_history: list = None) -> float:
        """
        Tính Z-Score cá nhân: Z = (RMSSD_today - mean_baseline) / std_baseline
        """
        if not baseline_history or len(baseline_history) < 3:
            mean = self.default_mean
            std = self.default_std
        else:
            rmssd_values = [
                item.get('rmssd', item.get('RMSSD', self.default_mean)) 
                for item in baseline_history 
                if isinstance(item, dict) and ('rmssd' in item or 'RMSSD' in item)
            ]
            if len(rmssd_values) >= 3:
                mean = float(np.mean(rmssd_values))
                std = float(np.std(rmssd_values, ddof=1))
                std = max(std, 2.0)  # Tránh chia cho 0
            else:
                mean = self.default_mean
                std = self.default_std

        z_score = (current_rmssd - mean) / std
        return round(float(z_score), 2)

    def zscore_to_stress_score(self, z_score: float) -> float:
        """
        Chuyển đổi Z-Score thành Thang điểm Stress (0 - 100%):
        - Z < -1.5 -> Stress cao (80% - 100%)
        - Z = 0 -> Bình thường (35% - 45%)
        - Z > 1.5 -> Phục hồi rất tốt (0% - 20%)
        """
        # Z-Score đảo ngược: RMSSD sụt giảm mạnh (Z < 0) tương ứng với Stress tăng cao
        raw_stress = 50.0 - (z_score * 25.0)
        stress_percentage = max(0.0, min(100.0, raw_stress))
        return round(stress_percentage, 1)

    def calculate_multimodal_stress(self, facial_stress: float, hrv_rmssd: float, baseline_history: list = None) -> dict:
        """
        Multi-modal Stress Fusion Engine:
        Kết hợp Mức độ Stress từ Khuôn mặt (Facial Emotion - DeepFace + Takagi-Sugeno)
        và Mức độ Stress từ HRV (Z-Score nhịp tim sinh học).
        Trọng số: 60% HRV + 40% Facial Emotion.
        """
        if hrv_rmssd <= 0 or not self.has_personal_baseline(baseline_history):
            # Không suy diễn stress từ một RMSSD đơn lẻ khi chưa có baseline cá nhân.
            return {
                'combined_stress': round(float(facial_stress), 1),
                'hrv_stress': 0.0,
                'facial_stress': round(float(facial_stress), 1),
                'z_score': 0.0,
                'status': 'Chưa đủ baseline HRV cá nhân để ước tính'
            }

        z_score = self.calculate_zscore(hrv_rmssd, baseline_history)
        hrv_stress = self.zscore_to_stress_score(z_score)

        # Trọng số Fusion
        combined_stress = (0.6 * hrv_stress) + (0.4 * facial_stress)
        combined_stress = round(float(max(0.0, min(100.0, combined_stress))), 1)

        if combined_stress >= 75.0:
            status = 'Căng thẳng cao (Kiệt sức)'
        elif combined_stress >= 45.0:
            status = 'Căng thẳng nhẹ'
        elif combined_stress >= 25.0:
            status = 'Bình thường / Cân bằng'
        else:
            status = 'Phục hồi rất tốt'

        return {
            'combined_stress': combined_stress,
            'hrv_stress': hrv_stress,
            'facial_stress': round(float(facial_stress), 1),
            'z_score': z_score,
            'status': status
        }

if __name__ == '__main__':
    manager = HRVBaselineManager()
    fake_baseline = [{'RMSSD': 45.0}, {'RMSSD': 42.0}, {'RMSSD': 48.0}, {'RMSSD': 40.0}]
    
    # Test 1: RMSSD bình thường (44ms)
    res1 = manager.calculate_multimodal_stress(facial_stress=30.0, hrv_rmssd=44.0, baseline_history=fake_baseline)
    print("Test 1 (Bình thường):", res1)

    # Test 2: RMSSD sụt giảm mạnh (18ms - Stress cao)
    res2 = manager.calculate_multimodal_stress(facial_stress=70.0, hrv_rmssd=18.0, baseline_history=fake_baseline)
    print("Test 2 (Stress cao):", res2)
