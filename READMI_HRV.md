```python
markdown_content = """# BÁO CÁO NGHIÊN CỨU & TRIỂN KHAI HỆ THỐNG PHÂN TÍCH BIẾN THIÊN NHỊP TIM (HRV) TRONG PYTHON

**Tác giả:** Đội ngũ Nghiên cứu & Phát triển (R&D)  
**Ngày lập báo cáo:** 09/08/2026  
**Ngôn ngữ triển khai:** Python 3.x  
**Lĩnh vực ứng dụng:** Phân tích Tín hiệu Sinh học (Biosignal Processing) & AI trong Y tế / Sức khỏe Kỹ thuật số  

---

## 1. TỔNG QUAN VỀ BIẾN THIÊN NHỊP TIM (HRV)

### 1.1. Định nghĩa & Bản chất Sinh lý học
Biến thiên nhịp tim (**Heart Rate Variability - HRV**) là sự chênh lệch khoảng thời gian tính bằng mili-giây ($ms$) giữa các nhịp đập liên tiếp của tim (khoảng cách $R-R$ trên tín hiệu ECG hoặc $P-P$ / $Peak-to-Peak$ trên tín hiệu PPG). 

Trái tim con người không đập như một chiếc đồng hồ cơ học đều chặn chặn. Khoảng cách giữa các nhịp tim luôn có sự biến động nhỏ liên tục:
- Ví dụ: Nhịp 1 cách Nhịp 2 là $0.90\\text{s}$ ($900\\text{ms}$), Nhịp 2 cách Nhịp 3 là $1.10\\text{s}$ ($1100\\text{ms}$), Nhịp 3 cách Nhịp 4 là $0.95\\text{s}$ ($950\\text{ms}$).

Sự biến động này chịu sự điều khiển trực tiếp của **Hệ thần kinh thực vật (Autonomic Nervous System - ANS)**, bao gồm hai nhánh đối lập:

1. **Hệ Giao cảm (Sympathetic Nervous System - SNS - "Pedal Ga"):**
   - Kích hoạt khi cơ thể đối mặt với căng thẳng (Stress), nguy hiểm, vận động mạnh, hoặc bệnh tật.
   - Khi SNS chiếm ưu thế, nó ép tim đập nhanh và **cực kỳ đồng đều** để tối ưu hóa lưu lượng máu. Phanh phó giao cảm bị nhả ra, làm giảm độ linh hoạt của nhịp tim $\\rightarrow$ **HRV THẤP**.
2. **Hệ Phó giao cảm (Parasympathetic Nervous System - PNS - "Chân Thắng / Phanh"):**
   - Kích hoạt khi cơ thể nghỉ ngơi, thư giãn, tiêu hóa, hoặc phục hồi.
   - Thông qua **Dây thần kinh phế vị (Vagus Nerve)**, PNS liên tục "bóp/nhả" nhịp tim theo nhịp thở (khi hít vào tim đập nhanh hơn một chút, khi thở ra tim đập chậm lại – hiện tượng *Respiratory Sinus Arrhythmia*).
   - Sự can thiệp liên tục này tạo ra độ biến thiên cao $\\rightarrow$ **HRV CAO**.

> **Kết luận cốt lõi:** HRV cao đại diện cho một hệ thần kinh thực vật linh hoạt, có khả năng thích ứng cao với môi trường. HRV thấp phản ánh trạng thái căng thẳng, mệt mỏi, quá sức (Burnout) hoặc nguy cơ biến cố sức khỏe.

---

## 2. TOÁN HỌC & CÁC CHỈ SỐ HRV QUAN TRỌNG

Để đưa dữ liệu sinh học vào mô hình AI/Machine Learning, dữ liệu khoảng R-R được quy đổi thành các chỉ số định lượng thuộc 3 nhóm chính:
```

```
           ┌─────────────────────────────────────────────────────────┐
           │                CÁC CHỈ SỐ HRV CỐT LÕI                   │
           └───────────────────────────┬─────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
```

┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
│   Time-Domain   │               │ Frequency-Domain│                  │Non-Linear      │
│  (Miền thời gian)│               │  (Miền tần số)  │                         │(Phi tuyến tính)│
├─────────────────┤               ├─────────────────┤               ├─────────────────┤
│ • SDNN          │                   │ • VLF      │               │ • Poincaré Plot  │
│ • RMSSD         │                  │ • LF        │               │   (SD1, SD2)       │
│ • pNN50         │                  │ • HF        │               │ • Sample Entropy│
│ • Mean RR       │                 │ • LF/HF Ratio│         │ • DFA (α1, α2)  │
└─────────────────┘               └─────────────────┘               └─────────────────┘

```

### 2.1. Miền Thời gian (Time-Domain Parameters)
Đo lường độ phân tán của khoảng $N-N$ (Normal-to-Normal intervals – khoảng R-R đã lọc sạch nhiễu).

* **SDNN (Standard Deviation of NN intervals):**
  $$SDNN = \\sqrt{\\frac{1}{N-1} \\sum_{i=1}^{N} (RR_i - \\overline{RR})^2}$$
  - *Ý nghĩa:* Phản ánh tổng độ biến thiên của nhịp tim. Bị ảnh hưởng bởi cả hệ giao cảm và phó giao cảm. Phù hợp nhất cho đo lường dài hạn (24h).

* **RMSSD (Root Mean Square of Successive Differences):**
  $$RMSSD = \\sqrt{\\frac{1}{N-1} \\sum_{i=1}^{N-1} (RR_{i+1} - RR_i)^2}$$
  - *Ý nghĩa:* Đo lường sự thay đổi giữa hai nhịp đập kế tiếp. Là chỉ số vàng phản ảnh hoạt động của **Phó giao cảm (PNS/Vagal Tone)**. Cực kỳ ổn định và phù hợp cho các phép đo ngắn hạn (1 - 5 phút).

* **pNN50 (Percentage of successive RR intervals > 50ms):**
  Tỷ lệ phần trăm các khoảng R-R kế tiếp chênh lệch nhau hơn $50\\text{ms}$. Cũng đại diện cho hoạt động phó giao cảm.

### 2.2. Miền Tần số (Frequency-Domain Parameters)
Sử dụng Biến đổi Fourier (FFT) hoặc Autoregressive (AR) để phân tích năng lượng tín hiệu ở các dải tần số khác nhau:

* **VLF (Very Low Frequency, $0.0033 - 0.04\\text{ Hz}$):** Liên quan đến cơ chế điều hòa thân nhiệt và hệ thống renin-angiotensin.
* **LF (Low Frequency, $0.04 - 0.15\\text{ Hz}$):** Phản ánh sự kết hợp của cả hệ Giao cảm và Phó giao cảm (thường liên quan đến điều hòa huyết áp - Baroreflex).
* **HF (High Frequency, $0.15 - 0.40\\text{ Hz}$):** Phản ánh trực tiếp hoạt động Phó giao cảm thông qua nhịp thở (*Respiratory frequency*).
* **LF/HF Ratio:** Tỷ lệ giữa năng lượng LF và HF, thường được dùng để đánh giá **Sự cân bằng Giao cảm / Phó giao cảm (Sympathovagal Balance)**.
  - $LF/HF$ cao $\\rightarrow$ Uống cà phê, Stress, Tập luyện (Giao cảm ưu thế).
  - $LF/HF$ thấp $\\rightarrow$ Nghỉ ngơi, Thư giãn, Thở sâu (Phó giao cảm ưu thế).

### 2.3. Miền Phi tuyến tính (Non-Linear Parameters)
Đo lường tính phức tạp và cấu trúc tự tương quan của nhịp tim:
* **SD1 & SD2 (Poincaré Plot):** $SD1$ đại diện cho biến thiên ngắn hạn (tương đương RMSSD), $SD2$ đại diện cho biến thiên dài hạn.
* **Sample Entropy (SampEn):** Độ hỗn loạn/không dự đoán được của chuỗi R-R.

---

## 3. THIẾT KẾ ARCHITECTURE PIPELINE XỬ LÝ TRONG PYTHON

Một hệ thống xử lý HRV đạt chuẩn Production cần tuân theo sơ đồ pipeline 5 bước khép kín bên dưới:
```

┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   RAW SIGNAL   │────►│  PREPROCESSING │────►│ PEAK DETECTION │────►│  RRI CLEANING  │────►│   HRV METRICS  │
│  (ECG / PPG)   │     │ (Bandpass/Notch│     │(Pan-Tompkins / │     │(Ectopic/Outlier│     │ (Time/Freq/    │
│  fs ≥ 100 Hz   │     │  Filtering)    │     │ NeuroKit/Elg)  │     │ Interpolation) │     │ Non-Linear)    │
└────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘

```

---

## 4. CODE PYTHON HOÀN CHỈNH (PRODUCTION-READY TEMPLATE)

Dưới đây là module Python mã nguồn sạch, xử lý từ dữ liệu thô đến lọc nhiễu, làm sạch nhịp ngoại tâm thu và xuất báo cáo HRV hoàn chỉnh.

```python
"""
Module: hrv_processor.py
Mục đích: Trích xuất & xử lý chỉ số Biến thiên nhịp tim (HRV) đạt chuẩn y tế.
Thư viện yêu cầu: neurokit2, numpy, scipy, pandas
"""

import numpy as np
import pandas as pd
import neurokit2 as nk
from scipy.signal import butter, filtfilt
import warnings
warnings.filterwarnings('ignore')

class HRVProcessor:
    def __init__(self, sampling_rate: int = 500):
        """
        Khởi tạo pipeline xử lý HRV.
        :param sampling_rate: Tần số lấy mẫu của tín hiệu (Hz). Khuyến nghị >= 250Hz.
        """
        self.fs = sampling_rate

    def preprocess_ecg(self, raw_signal: np.ndarray) -> np.ndarray:
        """
        Lọc nhiễu tín hiệu ECG bằng Bộ lọc Dải thông (Bandpass Butterworth).
        Lọc bỏ nhiễu đường đẳng điện (Low-cut 0.5Hz) và nhiễu cơ/lưới điện (High-cut 45Hz).
        """
        nyquist = 0.5 * self.fs
        low = 0.5 / nyquist
        high = 45.0 / nyquist
        b, a = butter(2, [low, high], btype='band')
        cleaned_signal = filtfilt(b, a, raw_signal)
        return cleaned_signal

    def extract_rpeaks(self, cleaned_signal: np.ndarray):
        """
        Phát hiện các đỉnh R (R-peaks) sử dụng thuật toán tối ưu của NeuroKit2.
        """
        # Tự động chọn thuật toán phát hiện đỉnh tốt nhất (Pan-Tompkins / NeuroKit)
        signals, info = nk.ecg_peaks(cleaned_signal, sampling_rate=self.fs, method="neurokit")
        rpeaks = info["ECG_R_Peaks"]
        return rpeaks, signals

    def clean_rr_intervals(self, rpeaks: np.ndarray) -> np.ndarray:
        """
        Chuyển đổi R-peaks thành khoảng R-R (ms) và lọc bỏ các nhịp ngoại tâm thu / nhiễu.
        Sử dụng quy tắc Malik / Outlier Detection.
        """
        # Tính khoảng cách giữa các đỉnh (giây -> mili-giây)
        rri_raw = np.diff(rpeaks) / self.fs * 1000.0

        # Loại bỏ các khoảng RR bất thường sinh lý (< 300ms hoặc > 2000ms)
        valid_mask = (rri_raw >= 300) & (rri_raw <= 2000)
        rri_filtered = rri_raw[valid_mask]

        # Loại bỏ các ngoại lệ biến thiên đột biến (> 20% so với nhịp liền trước)
        rri_clean = nk.signal_outliers(rri_filtered, method="median", threshold=3)
      
        # Thay thế ngoại lệ bằng phương pháp nội suy Cubic Spline
        clean_rri_series = pd.Series(rri_filtered)
        clean_rri_series[rri_clean] = np.nan
        rri_interpolated = clean_rri_series.interpolate(method='cubic').bfill().ffill().to_numpy()

        return rri_interpolated

    def compute_hrv(self, rpeaks: np.ndarray) -> pd.DataFrame:
        """
        Tính toán toàn bộ chỉ số HRV Time-domain, Frequency-domain và Non-linear.
        """
        # Tạo cấu trúc dữ liệu peaks tương thích với NeuroKit2
        peaks_dict = {"ECG_R_Peaks": rpeaks}
      
        # Tính toán tất cả các chỉ số
        hrv_time = nk.hrv_time(peaks_dict, sampling_rate=self.fs)
        hrv_freq = nk.hrv_frequency(peaks_dict, sampling_rate=self.fs)
        hrv_non = nk.hrv_nonlinear(peaks_dict, sampling_rate=self.fs)

        # Tổng hợp kết quả
        hrv_summary = pd.concat([hrv_time, hrv_freq, hrv_non], axis=1)
        return hrv_summary

    def run_pipeline(self, raw_ecg: np.ndarray):
        """
        Thực thi toàn bộ quy trình end-to-end.
        """
        print("[1/4] Đang tiền xử lý & lọc nhiễu...")
        cleaned = self.preprocess_ecg(raw_ecg)

        print("[2/4] Đang trích xuất đỉnh R...")
        rpeaks, _ = self.extract_rpeaks(cleaned)

        print(f" -> Tìm thấy {len(rpeaks)} đỉnh R-peak.")

        print("[3/4] Đang lọc sạch nhịp ngoại tâm thu (NN intervals)...")
        rri_clean = self.clean_rr_intervals(rpeaks)

        print("[4/4] Đang tính toán các chỉ số HRV...")
        hrv_metrics = self.compute_hrv(rpeaks)

        return hrv_metrics, rri_clean


# ==========================================
# THI CÔNG MINH HỌA (DEMO RUN)
# ==========================================
if __name__ == "__main__":
    FS = 500  # Tần số lấy mẫu 500Hz
    DURATION = 300  # 5 phút dữ liệu

    print("--- KHỞI TẠO DỮ LIỆU TÍN HIỆU ECG GIẢ LẬP ---")
    # Giả lập tín hiệu ECG dài 5 phút với nhịp tim trung bình 75 BPM
    ecg_raw = nk.ecg_simulate(duration=DURATION, sampling_rate=FS, heart_rate=75, noise=0.05)

    processor = HRVProcessor(sampling_rate=FS)
    metrics, rri = processor.run_pipeline(ecg_raw)

    print("\\n=== KẾT QUẢ TRÍCH XUẤT HRV CHỦ YẾU ===")
    key_metrics = [
        "HRV_MeanNN", "HRV_SDNN", "HRV_RMSSD", "HRV_pNN50",
        "HRV_LF", "HRV_HF", "HRV_LFHF", "HRV_SD1", "HRV_SD2"
    ]
    for m in key_metrics:
        if m in metrics.columns:
            print(f" - {m:<15}: {metrics[m].values[0]:.2f}")
```

---

## 5. THÁCH THỨC THỰC TẾ & PHƯƠNG ÁN XỬ LÝ (EDGE CASES)

Triển khai HRV trong phòng thí nghiệm hoàn toàn khác với đưa sản phẩm vào thiết bị thương mại. Dưới đây là các tình huống gãy mô hình thực tế:

| Tình huống thực tế                         | Nguyên nhân kỹ thuật                                            | Hậu quả lên dữ liệu                                                           | Phương án xử lý (Engineering Solution)                                            |
| ---------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Motion Artifacts (Nhiễu cử động)** | Người dùng đi lại, vung tay, hoặc tuột dây đeo cảm biến. | Xuất hiện các đỉnh ảo (False Positive) hoặc mất đỉnh R (False Negative). | • Dùng bộ lọc thích ứng (Adaptive Filter) kết hợp dữ liệu IMU/Accelerometer. |

• Bỏ hẳn đoạn dữ liệu nhiễu quá $20\\%$ khoảng thời gian đo. |
| **Tần số lấy mẫu thấp ($F_s < 100\text{ Hz}$)** | Đồng hồ thông minh giá rẻ cắt giảm công suất pin, hạ $F_s$ xuống $50 - 100\text{ Hz}$. | Độ phân giải thời gian bị sai lệch $\pm 10 - 20\text{ ms}$, phá hỏng chỉ số RMSSD. | • Áp dụng thuật toán **Cubic Spline Interpolation** nâng tần số lên $500\text{ Hz}$ trước khi xác định peak.

• Dùng thuật toán Parabolic Peak Interpolation. |
| **Loạn nhịp tim (Arrhythmia / Ectopic Beats)** | Tim bị bỏ nhịp hoặc đập sớm (PVC/PAC) do sinh lý tự nhiên. | Khoảng RR bị co giãn bất thường ($300\text{ ms} \rightarrow 1500\text{ ms}$), làm SDNN và RMSSD vọt lên vô nghĩa. | • Áp dụng quy tắc lọc **Malik Rule** hoặc **Quotient Filter** (loại bỏ RR lệch quá $20\\%$ so với trung bình trượt).

• Thay thế bằng phép nội suy Spline thay vì xóa bỏ trực tiếp. |
| **Ultra-short term (< 2 phút)** | Người dùng chỉ mở app đo trong $30 - 60$ giây. | Các chỉ số miền tần số (LF, HF) không thể hội tụ, kết quả bị sai lệch nặng. | • **Chỉ tin dùng RMSSD và pNN50** cho các khoảng đo $< 2$ phút.

• Khóa không xuất chỉ số LF/HF nếu thời gian đo $< 3$ phút. |

---

## 6. BẪY LOGIC & QUY TRÌNH XÂY DỰNG CA LÂM SÀNG (BASELINE)

### 6.1. "Bẫy" Ngưỡng cố định (Fixed Threshold Trap)

Một sai lầm phổ biến của các lập trình viên là gán nhãn cứng:

* *Nếu $RMSSD < 20\text{ms} \rightarrow$ Stress.*
* *Nếu $RMSSD > 50\text{ms} \rightarrow$ Thư giãn.*

**Sự thật sinh học:**

* Giá trị HRV phụ thuộc mạnh mẽ vào **Độ tuổi, Giới tính, Gen và Cơ địa**.
* Một vận động viên 20 tuổi có thể có $RMSSD = 80\text{ms}$ (Bình thường), nhưng khi bị Stress nặng $RMSSD$ tụt xuống $40\text{ms}$.
* Một người 65 tuổi có $RMSSD = 25\text{ms}$ khi khỏe mạnh bình thường. Nếu dùng ngưỡng cố định, người lớn tuổi sẽ luôn bị mô hình phán đoán là "Stress nặng".

```
     MÔ HÌNH SAI (Fixed Threshold):
     [Dữ liệu HRV] ───► [RMSSD < 30ms?] ───► YES ───► Cảnh báo Stress (Lỗi nặng cho người già)

     MÔ HÌNH ĐÚNG (Personalized Baseline):
     [Dữ liệu HRV] ───► [So sánh với Baseline 7 ngày của chính cá nhân đó]
                              │
                              ├──► Thấp hơn > 1.5 StdDev ───► Cảnh báo Stress / Cần nghỉ ngơi
                              └──► Trong biên độ bình thường ───► Trạng thái ổn định
```

### 6.2. Giải pháp: Xây dựng HRV Baseline cá nhân hóa

1. **Thu thập Baseline 7-14 ngày:** Yêu cầu người dùng đo HRV vào **cùng một thời điểm cố định trong ngày** (tốt nhất là 3 phút ngay sau khi thức dậy vào buổi sáng, trước khi rời khỏi giường).
2. **Tính toán Z-Score cá nhân:**

$$
Z = \frac{HRV_{today} - \mu_{baseline}}{\sigma_{baseline}}
$$

* $Z < -1.5$: Cơ thể đang chịu áp lực lớn, kiệt sức hoặc có dấu hiệu ốm/sốt.
* $-1.0 \le Z \le 1.0$: Trạng thái bình thường, cân bằng.
* $Z > 1.5$: Cơ thể phục hồi rất tốt, sẵn sàng cho các hoạt động thể lực/trí óc cường độ cao.

---

## 7. ƯU ĐIỂM & NHƯỢC ĐIỂM CỦA HRV

### 7.1. Ưu điểm

* **Chỉ báo sinh học không xâm lấn (Non-invasive Bio-marker):** Đo lường trực tiếp trạng thái của Hệ thần kinh thực vật mà không cần xét nghiệm máu hay các thủ thuật phức tạp.
* **Độ nhạy sớm (Early Warning Signal):** HRV phản ứng với tình trạng quá tải, thiếu ngủ, dị ứng, hoặc vi-rút xâm nhập **24 - 48 giờ trước khi các triệu chứng lâm sàng (sốt, mệt mỏi) xuất hiện**.
* **Khả năng tự động hóa cao:** Dễ dàng tích hợp vào các thuật toán Machine Learning trên thiết bị đeo (Wearables).

### 7.2. Nhược điểm & Hạn chế

* **Cực kỳ nhạy cảm với nhiễu:** Chỉ cần $1\\%$ dữ liệu R-R bị nhiễu do cử động cũng có thể làm sai lệch $50\\%$ chỉ số RMSSD.
* **Chịu ảnh hưởng bởi quá nhiều biến số nhiễu (Confounding Factors):** HRV thay đổi do tư thế (đứng/nằm), nhiệt độ môi trường, vừa uống cà phê, rượu bia, nhịp thở nhanh/chậm.
* **Đòi hỏi sự tuân thủ cao từ người dùng:** Việc đo đạc không chuẩn thời điểm khiến dữ liệu bị phân tán mạnh.

---

## 8. LỘ TRÌNH KỸ THUẬT CHO DỰ ÁN PYTHON

```
   GIAI ĐOẠN 1: Thu thập & Tiền xử lý
   ├── Xây dựng module nhận dữ liệu từ phần cứng (BLE / CSV / API)
   ├── Triển khai bộ lọc Butterworth & FIR để làm sạch tín hiệu
   └── Áp dụng Spline Interpolation xử lý tín hiệu tần số thấp

   GIAI ĐOẠN 2: Trích xuất Feature & Lọc ngoại lệ
   ├── Lập trình thuật toán Pan-Tompkins / Elgendi xác định R-peak
   ├── Áp dụng Malik Filter loại bỏ nhịp ngoại tâm thu
   └── Tính toán bộ chỉ số: RMSSD, SDNN, LF/HF, SD1/SD2

   GIAI ĐOẠN 3: Xây dựng Mô hình AI / Cá nhân hóa
   ├── Thiết lập pipeline lưu trữ & tính toán Baseline 7 ngày
   ├── Tính Z-Score daily cho từng user
   └── Huấn luyện mô hình phân loại Stress / Recovery (Random Forest / XGBoost)

   GIAI ĐOẠN 4: Đóng gói & Triển khai (Deployment)
   ├── Tối ưu hóa code Python (Chuyển đổi sang C++ / ONNX nếu chạy Edge Device)
   └── Đóng gói REST API (FastAPI / Docker) phục vụ Mobile App
```

---

## 9. TÀI LIỆU THAM KHẢO (REFERENCES)

1. **Task Force of the European Society of Cardiology and the North American Society of Pacing and Electrophysiology (1996).** *Heart rate variability: standards of measurement, physiological interpretation and clinical use.* Circulation, 93(5), 1043-1065.
2. **Makowski, D., et al. (2021).** *NeuroKit2: A Python toolbox for neurophysiological signal processing.* Behavior Research Methods, 53(4), 1689–1696.
3. **Shaffer, F., & Ginsberg, J. P. (2017).** *An overview of heart rate variability metrics and norms.* Frontiers in public health, 5, 258.

---

*Báo cáo được khởi tạo tự động phục vụ công tác R&D cho dự án Phân tích HRV Python.*
"""

file_name = "Bao_Cao_Nghien_Cuu_va_Trien_Khai_HRV_Python.md"
with open(file_name, "w", encoding="utf-8") as f:
f.write(markdown_content)

print(f"File saved successfully as {file_name}")

```

```text?code_stdout&code_event_index=1
Traceback (most recent call last):
  File "<xbox-string>", line 121
    :param sampling_rate: Tần số lấy mẫu của tín hiệu (Hz). Khuyến nghị >= 250Hz.
                                                                             ^
SyntaxError: invalid decimal literal
```

```python
markdown_content = """# BÁO CÁO NGHIÊN CỨU & TRIỂN KHAI HỆ THỐNG PHÂN TÍCH BIẾN THIÊN NHỊP TIM (HRV) TRONG PYTHON

**Tác giả:** Đội ngũ Nghiên cứu & Phát triển (R&D)  
**Ngày lập báo cáo:** 09/08/2026  
**Ngôn ngữ triển khai:** Python 3.x  
**Lĩnh vực ứng dụng:** Phân tích Tín hiệu Sinh học (Biosignal Processing) & AI trong Y tế / Sức khỏe Kỹ thuật số  

---

## 1. TỔNG QUAN VỀ BIẾN THIÊN NHỊP TIM (HRV)

### 1.1. Định nghĩa & Bản chất Sinh lý học
Biến thiên nhịp tim (**Heart Rate Variability - HRV**) là sự chênh lệch khoảng thời gian tính bằng mili-giây ($ms$) giữa các nhịp đập liên tiếp của tim (khoảng cách $R-R$ trên tín hiệu ECG hoặc $P-P$ / $Peak-to-Peak$ trên tín hiệu PPG). 

Trái tim con người không đập như một chiếc đồng hồ cơ học đều chặn chặn. Khoảng cách giữa các nhịp tim luôn có sự biến động nhỏ liên tục:
- Ví dụ: Nhịp 1 cách Nhịp 2 là $0.90\\text{s}$ ($900\\text{ms}$), Nhịp 2 cách Nhịp 3 là $1.10\\text{s}$ ($1100\\text{ms}$), Nhịp 3 cách Nhịp 4 là $0.95\\text{s}$ ($950\\text{ms}$).

Sự biến động này chịu sự điều khiển trực tiếp của **Hệ thần kinh thực vật (Autonomic Nervous System - ANS)**, bao gồm hai nhánh đối lập:

1. **Hệ Giao cảm (Sympathetic Nervous System - SNS - "Pedal Ga"):**
   - Kích hoạt khi cơ thể đối mặt với căng thẳng (Stress), nguy hiểm, vận động mạnh, hoặc bệnh tật.
   - Khi SNS chiếm ưu thế, nó ép tim đập nhanh và **cực kỳ đồng đều** để tối ưu hóa lưu lượng máu. Phanh phó giao cảm bị nhả ra, làm giảm độ linh hoạt của nhịp tim $\\rightarrow$ **HRV THẤP**.
2. **Hệ Phó giao cảm (Parasympathetic Nervous System - PNS - "Chân Thắng / Phanh"):**
   - Kích hoạt khi cơ thể nghỉ ngơi, thư giãn, tiêu hóa, hoặc phục hồi.
   - Thông qua **Dây thần kinh phế vị (Vagus Nerve)**, PNS liên tục "bóp/nhả" nhịp tim theo nhịp thở (khi hít vào tim đập nhanh hơn một chút, khi thở ra tim đập chậm lại – hiện tượng *Respiratory Sinus Arrhythmia*).
   - Sự can thiệp liên tục này tạo ra độ biến thiên cao $\\rightarrow$ **HRV CAO**.

> **Kết luận cốt lõi:** HRV cao đại diện cho một hệ thần kinh thực vật linh hoạt, có khả năng thích ứng cao với môi trường. HRV thấp phản ánh trạng thái căng thẳng, mệt mỏi, quá sức (Burnout) hoặc nguy cơ biến cố sức khỏe.

---

## 2. TOÁN HỌC & CÁC CHỈ SỐ HRV QUAN TRỌNG

Để đưa dữ liệu sinh học vào mô hình AI/Machine Learning, dữ liệu khoảng R-R được quy đổi thành các chỉ số định lượng thuộc 3 nhóm chính:
```

```
           ┌─────────────────────────────────────────────────────────┐
           │                CÁC CHỈ SỐ HRV CỐT LÕI                   │
           └───────────────────────────┬─────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
```

┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
│   Time-Domain   │               │ Frequency-Domain│               │   Non-Linear    │
│  (Miền thời gian)│               │  (Miền tần số)  │               │ (Phi tuyến tính)│
├─────────────────┤               ├─────────────────┤               ├─────────────────┤
│ • SDNN          │               │ • VLF           │               │ • Poincaré Plot │
│ • RMSSD         │               │ • LF            │               │   (SD1, SD2)    │
│ • pNN50         │               │ • HF            │               │ • Sample Entropy│
│ • Mean RR       │               │ • LF/HF Ratio   │               │ • DFA (α1, α2)  │
└─────────────────┘               └─────────────────┘               └─────────────────┘

```

### 2.1. Miền Thời gian (Time-Domain Parameters)
Đo lường độ phân tán của khoảng $N-N$ (Normal-to-Normal intervals – khoảng R-R đã lọc sạch nhiễu).

* **SDNN (Standard Deviation of NN intervals):**
  $$SDNN = \\sqrt{\\frac{1}{N-1} \\sum_{i=1}^{N} (RR_i - \\overline{RR})^2}$$
  - *Ý nghĩa:* Phản ánh tổng độ biến thiên của nhịp tim. Bị ảnh hưởng bởi cả hệ giao cảm và phó giao cảm. Phù hợp nhất cho đo lường dài hạn (24h).

* **RMSSD (Root Mean Square of Successive Differences):**
  $$RMSSD = \\sqrt{\\frac{1}{N-1} \\sum_{i=1}^{N-1} (RR_{i+1} - RR_i)^2}$$
  - *Ý nghĩa:* Đo lường sự thay đổi giữa hai nhịp đập kế tiếp. Là chỉ số vàng phản ảnh hoạt động của **Phó giao cảm (PNS/Vagal Tone)**. Cực kỳ ổn định và phù hợp cho các phép đo ngắn hạn (1 - 5 phút).

* **pNN50 (Percentage of successive RR intervals > 50ms):**
  Tỷ lệ phần trăm các khoảng R-R kế tiếp chênh lệch nhau hơn $50\\text{ms}$. Cũng đại diện cho hoạt động phó giao cảm.

### 2.2. Miền Tần số (Frequency-Domain Parameters)
Sử dụng Biến đổi Fourier (FFT) hoặc Autoregressive (AR) để phân tích năng lượng tín hiệu ở các dải tần số khác nhau:

* **VLF (Very Low Frequency, $0.0033 - 0.04\\text{ Hz}$):** Liên quan đến cơ chế điều hòa thân nhiệt và hệ thống renin-angiotensin.
* **LF (Low Frequency, $0.04 - 0.15\\text{ Hz}$):** Phản ánh sự kết hợp của cả hệ Giao cảm và Phó giao cảm (thường liên quan đến điều hòa huyết áp - Baroreflex).
* **HF (High Frequency, $0.15 - 0.40\\text{ Hz}$):** Phản ánh trực tiếp hoạt động Phó giao cảm thông qua nhịp thở (*Respiratory frequency*).
* **LF/HF Ratio:** Tỷ lệ giữa năng lượng LF và HF, thường được dùng để đánh giá **Sự cân bằng Giao cảm / Phó giao cảm (Sympathovagal Balance)**.
  - $LF/HF$ cao $\\rightarrow$ Uống cà phê, Stress, Tập luyện (Giao cảm ưu thế).
  - $LF/HF$ thấp $\\rightarrow$ Nghỉ ngơi, Thư giãn, Thở sâu (Phó giao cảm ưu thế).

### 2.3. Miền Phi tuyến tính (Non-Linear Parameters)
Đo lường tính phức tạp và cấu trúc tự tương quan của nhịp tim:
* **SD1 & SD2 (Poincaré Plot):** $SD1$ đại diện cho biến thiên ngắn hạn (tương đương RMSSD), $SD2$ đại diện cho biến thiên dài hạn.
* **Sample Entropy (SampEn):** Độ hỗn loạn/không dự đoán được của chuỗi R-R.

---

## 3. THIẾT KẾ ARCHITECTURE PIPELINE XỬ LÝ TRONG PYTHON

Một hệ thống xử lý HRV đạt chuẩn Production cần tuân theo sơ đồ pipeline 5 bước khép kín bên dưới:
```

┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   RAW SIGNAL   │────►│  PREPROCESSING │────►│ PEAK DETECTION │────►│  RRI CLEANING  │────►│   HRV METRICS  │
│  (ECG / PPG)   │     │ (Bandpass/Notch│     │(Pan-Tompkins / │     │(Ectopic/Outlier│     │ (Time/Freq/    │
│  fs ≥ 100 Hz   │     │  Filtering)    │     │ NeuroKit/Elg)  │     │ Interpolation) │     │ Non-Linear)    │
└────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘

```

---

## 4. CODE PYTHON HOÀN CHỈNH (PRODUCTION-READY TEMPLATE)

Dưới đây là module Python mã nguồn sạch, xử lý từ dữ liệu thô đến lọc nhiễu, làm sạch nhịp ngoại tâm thu và xuất báo cáo HRV hoàn chỉnh.

```python
\"\"\"
Module: hrv_processor.py
Mục đích: Trích xuất & xử lý chỉ số Biến thiên nhịp tim (HRV) đạt chuẩn y tế.
Thư viện yêu cầu: neurokit2, numpy, scipy, pandas
\"\"\"

import numpy as np
import pandas as pd
import neurokit2 as nk
from scipy.signal import butter, filtfilt
import warnings
warnings.filterwarnings('ignore')

class HRVProcessor:
    def __init__(self, sampling_rate: int = 500):
        \"\"\"
        Khởi tạo pipeline xử lý HRV.
        :param sampling_rate: Tần số lấy mẫu của tín hiệu (Hz). Khuyến nghị >= 250Hz.
        \"\"\"
        self.fs = sampling_rate

    def preprocess_ecg(self, raw_signal: np.ndarray) -> np.ndarray:
        \"\"\"
        Lọc nhiễu tín hiệu ECG bằng Bộ lọc Dải thông (Bandpass Butterworth).
        Lọc bỏ nhiễu đường đẳng điện (Low-cut 0.5Hz) và nhiễu cơ/lưới điện (High-cut 45Hz).
        \"\"\"
        nyquist = 0.5 * self.fs
        low = 0.5 / nyquist
        high = 45.0 / nyquist
        b, a = butter(2, [low, high], btype='band')
        cleaned_signal = filtfilt(b, a, raw_signal)
        return cleaned_signal

    def extract_rpeaks(self, cleaned_signal: np.ndarray):
        \"\"\"
        Phát hiện các đỉnh R (R-peaks) sử dụng thuật toán tối ưu của NeuroKit2.
        \"\"\"
        # Tự động chọn thuật toán phát hiện đỉnh tốt nhất (Pan-Tompkins / NeuroKit)
        signals, info = nk.ecg_peaks(cleaned_signal, sampling_rate=self.fs, method="neurokit")
        rpeaks = info["ECG_R_Peaks"]
        return rpeaks, signals

    def clean_rr_intervals(self, rpeaks: np.ndarray) -> np.ndarray:
        \"\"\"
        Chuyển đổi R-peaks thành khoảng R-R (ms) và lọc bỏ các nhịp ngoại tâm thu / nhiễu.
        Sử dụng quy tắc Malik / Outlier Detection.
        \"\"\"
        # Tính khoảng cách giữa các đỉnh (giây -> mili-giây)
        rri_raw = np.diff(rpeaks) / self.fs * 1000.0

        # Loại bỏ các khoảng RR bất thường sinh lý (< 300ms hoặc > 2000ms)
        valid_mask = (rri_raw >= 300) & (rri_raw <= 2000)
        rri_filtered = rri_raw[valid_mask]

        # Loại bỏ các ngoại lệ biến thiên đột biến (> 20% so với nhịp liền trước)
        rri_clean = nk.signal_outliers(rri_filtered, method="median", threshold=3)
      
        # Thay thế ngoại lệ bằng phương pháp nội suy Cubic Spline
        clean_rri_series = pd.Series(rri_filtered)
        clean_rri_series[rri_clean] = np.nan
        rri_interpolated = clean_rri_series.interpolate(method='cubic').bfill().ffill().to_numpy()

        return rri_interpolated

    def compute_hrv(self, rpeaks: np.ndarray) -> pd.DataFrame:
        \"\"\"
        Tính toán toàn bộ chỉ số HRV Time-domain, Frequency-domain và Non-linear.
        \"\"\"
        # Tạo cấu trúc dữ liệu peaks tương thích với NeuroKit2
        peaks_dict = {"ECG_R_Peaks": rpeaks}
      
        # Tính toán tất cả các chỉ số
        hrv_time = nk.hrv_time(peaks_dict, sampling_rate=self.fs)
        hrv_freq = nk.hrv_frequency(peaks_dict, sampling_rate=self.fs)
        hrv_non = nk.hrv_nonlinear(peaks_dict, sampling_rate=self.fs)

        # Tổng hợp kết quả
        hrv_summary = pd.concat([hrv_time, hrv_freq, hrv_non], axis=1)
        return hrv_summary

    def run_pipeline(self, raw_ecg: np.ndarray):
        \"\"\"
        Thực thi toàn bộ quy trình end-to-end.
        \"\"\"
        print("[1/4] Đang tiền xử lý & lọc nhiễu...")
        cleaned = self.preprocess_ecg(raw_ecg)

        print("[2/4] Đang trích xuất đỉnh R...")
        rpeaks, _ = self.extract_rpeaks(cleaned)

        print(f" -> Tìm thấy {len(rpeaks)} đỉnh R-peak.")

        print("[3/4] Đang lọc sạch nhịp ngoại tâm thu (NN intervals)...")
        rri_clean = self.clean_rr_intervals(rpeaks)

        print("[4/4] Đang tính toán các chỉ số HRV...")
        hrv_metrics = self.compute_hrv(rpeaks)

        return hrv_metrics, rri_clean


# ==========================================
# THI CÔNG MINH HỌA (DEMO RUN)
# ==========================================
if __name__ == "__main__":
    FS = 500  # Tần số lấy mẫu 500Hz
    DURATION = 300  # 5 phút dữ liệu

    print("--- KHỞI TẠO DỮ LIỆU TÍN HIỆU ECG GIẢ LẬP ---")
    # Giả lập tín hiệu ECG dài 5 phút với nhịp tim trung bình 75 BPM
    ecg_raw = nk.ecg_simulate(duration=DURATION, sampling_rate=FS, heart_rate=75, noise=0.05)

    processor = HRVProcessor(sampling_rate=FS)
    metrics, rri = processor.run_pipeline(ecg_raw)

    print("\\n=== KẾT QUẢ TRÍCH XUẤT HRV CHỦ YẾU ===")
    key_metrics = [
        "HRV_MeanNN", "HRV_SDNN", "HRV_RMSSD", "HRV_pNN50",
        "HRV_LF", "HRV_HF", "HRV_LFHF", "HRV_SD1", "HRV_SD2"
    ]
    for m in key_metrics:
        if m in metrics.columns:
            print(f" - {m:<15}: {metrics[m].values[0]:.2f}")
```

---

## 5. THÁCH THỨC THỰC TẾ & PHƯƠNG ÁN XỬ LÝ (EDGE CASES)

Triển khai HRV trong phòng thí nghiệm hoàn toàn khác với đưa sản phẩm vào thiết bị thương mại. Dưới đây là các tình huống gãy mô hình thực tế:

| Tình huống thực tế                         | Nguyên nhân kỹ thuật                                            | Hậu quả lên dữ liệu                                                           | Phương án xử lý (Engineering Solution)                                            |
| ---------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Motion Artifacts (Nhiễu cử động)** | Người dùng đi lại, vung tay, hoặc tuột dây đeo cảm biến. | Xuất hiện các đỉnh ảo (False Positive) hoặc mất đỉnh R (False Negative). | • Dùng bộ lọc thích ứng (Adaptive Filter) kết hợp dữ liệu IMU/Accelerometer. |

• Bỏ hẳn đoạn dữ liệu nhiễu quá $20\\%$ khoảng thời gian đo. |
| **Tần số lấy mẫu thấp ($F_s < 100\text{ Hz}$)** | Đồng hồ thông minh giá rẻ cắt giảm công suất pin, hạ $F_s$ xuống $50 - 100\text{ Hz}$. | Độ phân giải thời gian bị sai lệch $\pm 10 - 20\text{ ms}$, phá hỏng chỉ số RMSSD. | • Áp dụng thuật toán **Cubic Spline Interpolation** nâng tần số lên $500\text{ Hz}$ trước khi xác định peak.

• Dùng thuật toán Parabolic Peak Interpolation. |
| **Loạn nhịp tim (Arrhythmia / Ectopic Beats)** | Tim bị bỏ nhịp hoặc đập sớm (PVC/PAC) do sinh lý tự nhiên. | Khoảng RR bị co giãn bất thường ($300\text{ ms} \rightarrow 1500\text{ ms}$), làm SDNN và RMSSD vọt lên vô nghĩa. | • Áp dụng quy tắc lọc **Malik Rule** hoặc **Quotient Filter** (loại bỏ RR lệch quá $20\\%$ so với trung bình trượt).

• Thay thế bằng phép nội suy Spline thay vì xóa bỏ trực tiếp. |
| **Ultra-short term (< 2 phút)** | Người dùng chỉ mở app đo trong $30 - 60$ giây. | Các chỉ số miền tần số (LF, HF) không thể hội tụ, kết quả bị sai lệch nặng. | • **Chỉ tin dùng RMSSD và pNN50** cho các khoảng đo $< 2$ phút.

• Khóa không xuất chỉ số LF/HF nếu thời gian đo $< 3$ phút. |

---

## 6. BẪY LOGIC & QUY TRÌNH XÂY DỰNG CA LÂM SÀNG (BASELINE)

### 6.1. "Bẫy" Ngưỡng cố định (Fixed Threshold Trap)

Một sai lầm phổ biến của các lập trình viên là gán nhãn cứng:

* *Nếu $RMSSD < 20\text{ms} \rightarrow$ Stress.*
* *Nếu $RMSSD > 50\text{ms} \rightarrow$ Thư giãn.*

**Sự thật sinh học:**

* Giá trị HRV phụ thuộc mạnh mẽ vào **Độ tuổi, Giới tính, Gen và Cơ địa**.
* Một vận động viên 20 tuổi có thể có $RMSSD = 80\text{ms}$ (Bình thường), nhưng khi bị Stress nặng $RMSSD$ tụt xuống $40\text{ms}$.
* Một người 65 tuổi có $RMSSD = 25\text{ms}$ khi khỏe mạnh bình thường. Nếu dùng ngưỡng cố định, người lớn tuổi sẽ luôn bị mô hình phán đoán là "Stress nặng".

```
     MÔ HÌNH SAI (Fixed Threshold):
     [Dữ liệu HRV] ───► [RMSSD < 30ms?] ───► YES ───► Cảnh báo Stress (Lỗi nặng cho người già)

     MÔ HÌNH ĐÚNG (Personalized Baseline):
     [Dữ liệu HRV] ───► [So sánh với Baseline 7 ngày của chính cá nhân đó]
                              │
                              ├──► Thấp hơn > 1.5 StdDev ───► Cảnh báo Stress / Cần nghỉ ngơi
                              └──► Trong biên độ bình thường ───► Trạng thái ổn định
```

### 6.2. Giải pháp: Xây dựng HRV Baseline cá nhân hóa

1. **Thu thập Baseline 7-14 ngày:** Yêu cầu người dùng đo HRV vào **cùng một thời điểm cố định trong ngày** (tốt nhất là 3 phút ngay sau khi thức dậy vào buổi sáng, trước khi rời khỏi giường).
2. **Tính toán Z-Score cá nhân:**

$$
Z = \frac{HRV_{today} - \mu_{baseline}}{\sigma_{baseline}}
$$

* $Z < -1.5$: Cơ thể đang chịu áp lực lớn, kiệt sức hoặc có dấu hiệu ốm/sốt.
* $-1.0 \le Z \le 1.0$: Trạng thái bình thường, cân bằng.
* $Z > 1.5$: Cơ thể phục hồi rất tốt, sẵn sàng cho các hoạt động thể lực/trí óc cường độ cao.

---

## 7. ƯU ĐIỂM & NHƯỢC ĐIỂM CỦA HRV

### 7.1. Ưu điểm

* **Chỉ báo sinh học không xâm lấn (Non-invasive Bio-marker):** Đo lường trực tiếp trạng thái của Hệ thần kinh thực vật mà không cần xét nghiệm máu hay các thủ thuật phức tạp.
* **Độ nhạy sớm (Early Warning Signal):** HRV phản ứng với tình trạng quá tải, thiếu ngủ, dị ứng, hoặc vi-rút xâm nhập **24 - 48 giờ trước khi các triệu chứng lâm sàng (sốt, mệt mỏi) xuất hiện**.
* **Khả năng tự động hóa cao:** Dễ dàng tích hợp vào các thuật toán Machine Learning trên thiết bị đeo (Wearables).

### 7.2. Nhược điểm & Hạn chế

* **Cực kỳ nhạy cảm với nhiễu:** Chỉ cần $1\\%$ dữ liệu R-R bị nhiễu do cử động cũng có thể làm sai lệch $50\\%$ chỉ số RMSSD.
* **Chịu ảnh hưởng bởi quá nhiều biến số nhiễu (Confounding Factors):** HRV thay đổi do tư thế (đứng/nằm), nhiệt độ môi trường, vừa uống cà phê, rượu bia, nhịp thở nhanh/chậm.
* **Đòi hỏi sự tuân thủ cao từ người dùng:** Việc đo đạc không chuẩn thời điểm khiến dữ liệu bị phân tán mạnh.

---

## 8. LỘ TRÌNH KỸ THUẬT CHO DỰ ÁN PYTHON

```
   GIAI ĐOẠN 1: Thu thập & Tiền xử lý
   ├── Xây dựng module nhận dữ liệu từ phần cứng (BLE / CSV / API)
   ├── Triển khai bộ lọc Butterworth & FIR để làm sạch tín hiệu
   └── Áp dụng Spline Interpolation xử lý tín hiệu tần số thấp

   GIAI ĐOẠN 2: Trích xuất Feature & Lọc ngoại lệ
   ├── Lập trình thuật toán Pan-Tompkins / Elgendi xác định R-peak
   ├── Áp dụng Malik Filter loại bỏ nhịp ngoại tâm thu
   └── Tính toán bộ chỉ số: RMSSD, SDNN, LF/HF, SD1/SD2

   GIAI ĐOẠN 3: Xây dựng Mô hình AI / Cá nhân hóa
   ├── Thiết lập pipeline lưu trữ & tính toán Baseline 7 ngày
   ├── Tính Z-Score daily cho từng user
   └── Huấn luyện mô hình phân loại Stress / Recovery (Random Forest / XGBoost)

   GIAI ĐOẠN 4: Đóng gói & Triển khai (Deployment)
   ├── Tối ưu hóa code Python (Chuyển đổi sang C++ / ONNX nếu chạy Edge Device)
   └── Đóng gói REST API (FastAPI / Docker) phục vụ Mobile App
```

---

## 9. TÀI LIỆU THAM KHẢO (REFERENCES)

1. **Task Force of the European Society of Cardiology and the North American Society of Pacing and Electrophysiology (1996).** *Heart rate variability: standards of measurement, physiological interpretation and clinical use.* Circulation, 93(5), 1043-1065.
2. **Makowski, D., et al. (2021).** *NeuroKit2: A Python toolbox for neurophysiological signal processing.* Behavior Research Methods, 53(4), 1689–1696.
3. **Shaffer, F., & Ginsberg, J. P. (2017).** *An overview of heart rate variability metrics and norms.* Frontiers in public health, 5, 258.

---

*Báo cáo được khởi tạo tự động phục vụ công tác R&D cho dự án Phân tích HRV Python.*
"""

file_name = "Bao_Cao_Nghien_Cuu_va_Trien_Khai_HRV_Python.md"
with open(file_name, "w", encoding="utf-8") as f:
f.write(markdown_content)

print(f"File saved successfully as {file_name}")

```

```text?code_stdout&code_event_index=2
File saved successfully as Bao_Cao_Nghien_Cuu_va_Trien_Khai_HRV_Python.md
```

Your Markdown file is ready

---

# BÁO CÁO NGHIÊN CỨU & TRIỂN KHAI HỆ THỐNG PHÂN TÍCH BIẾN THIÊN NHỊP TIM (HRV) TRONG PYTHON

**Tác giả:** Đội ngũ Nghiên cứu & Phát triển (R&D)

**Ngày lập báo cáo:** 09/08/2026

**Ngôn ngữ triển khai:** Python 3.x

**Lĩnh vực ứng dụng:** Phân tích Tín hiệu Sinh học (Biosignal Processing) & AI trong Y tế / Sức khỏe Kỹ thuật số

---

## 1. TỔNG QUAN VỀ BIẾN THIÊN NHỊP TIM (HRV)

### 1.1. Định nghĩa & Bản chất Sinh lý học

Biến thiên nhịp tim (**Heart Rate Variability - HRV**) là sự chênh lệch khoảng thời gian tính bằng mili-giây ($ms$) giữa các nhịp đập liên tiếp của tim (khoảng cách $R-R$ trên tín hiệu ECG hoặc $P-P$ / $Peak-to-Peak$ trên tín hiệu PPG).

Trái tim con người không đập như một chiếc đồng hồ cơ học đều chằn chặn. Khoảng cách giữa các nhịp tim luôn có sự biến động nhỏ liên tục:

* *Ví dụ:* Nhịp 1 cách Nhịp 2 là $0.90\text{s}$ ($900\text{ms}$), Nhịp 2 cách Nhịp 3 là $1.10\text{s}$ ($1100\text{ms}$), Nhịp 3 cách Nhịp 4 là $0.95\text{s}$ ($950\text{ms}$).

Sự biến động này chịu sự điều khiển trực tiếp của **Hệ thần kinh thực vật (Autonomic Nervous System - ANS)**, bao gồm hai nhánh đối lập:

1. **Hệ Giao cảm (Sympathetic Nervous System - SNS - "Pedal Ga"):**

* Kích hoạt khi cơ thể đối mặt với căng thẳng (Stress), nguy hiểm, vận động mạnh, hoặc bệnh tật.
* Khi SNS chiếm ưu thế, nó ép tim đập nhanh và **cực kỳ đồng đều** để tối ưu hóa lưu lượng máu. Phanh phó giao cảm bị nhả ra, làm giảm độ linh hoạt của nhịp tim $\rightarrow$ **HRV THẤP**.

2. **Hệ Phó giao cảm (Parasympathetic Nervous System - PNS - "Chân Thắng / Phanh"):**

* Kích hoạt khi cơ thể nghỉ ngơi, thư giãn, tiêu hóa, hoặc phục hồi.
* Thông qua **Dây thần kinh phế vị (Vagus Nerve)**, PNS liên tục "bóp/nhả" nhịp tim theo nhịp thở (khi hít vào tim đập nhanh hơn một chút, khi thở ra tim đập chậm lại – hiện tượng *Respiratory Sinus Arrhythmia*).
* Sự can thiệp liên tục này tạo ra độ biến thiên cao $\rightarrow$ **HRV CAO**.

> **Kết luận cốt lõi:** HRV cao đại diện cho một hệ thần kinh thực vật linh hoạt, có khả năng thích ứng cao với môi trường. HRV thấp phản ánh trạng thái căng thẳng, mệt mỏi, quá sức (Burnout) hoặc nguy cơ biến cố sức khỏe.

---

## 2. TOÁN HỌC & CÁC CHỈ SỐ HRV QUAN TRỌNG

Để đưa dữ liệu sinh học vào mô hình AI/Machine Learning, dữ liệu khoảng R-R được quy đổi thành các chỉ số định lượng thuộc 3 nhóm chính:

```
               ┌─────────────────────────────────────────────────────────┐
               │                CÁC CHỈ SỐ HRV CỐT LÕI                   │
               └───────────────────────────┬─────────────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
│   Time-Domain   │               │ Frequency-Domain│               │   Non-Linear    │
│  (Miền thời gian)│               │  (Miền tần số)  │               │ (Phi tuyến tính)│
├─────────────────┤               ├─────────────────┤               ├─────────────────┤
│ • SDNN          │               │ • VLF           │               │ • Poincaré Plot │
│ • RMSSD         │               │ • LF            │               │   (SD1, SD2)    │
│ • pNN50         │               │ • HF            │               │ • Sample Entropy│
│ • Mean RR       │               │ • LF/HF Ratio   │               │ • DFA (α1, α2)  │
└─────────────────┘               └─────────────────┘               └─────────────────┘
```

### 2.1. Miền Thời gian (Time-Domain Parameters)

Đo lường độ phân tán của khoảng $N-N$ (Normal-to-Normal intervals – khoảng R-R đã lọc sạch nhiễu).

* **SDNN (Standard Deviation of NN intervals):**

$$
SDNN = \sqrt{\frac{1}{N-1} \sum_{i=1}^{N} (RR_i - \overline{RR})^2}
$$

* *Ý nghĩa:* Phản ánh tổng độ biến thiên của nhịp tim. Bị ảnh hưởng bởi cả hệ giao cảm và phó giao cảm. Phù hợp nhất cho đo lường dài hạn (24h).
* **RMSSD (Root Mean Square of Successive Differences):**

$$
RMSSD = \sqrt{\frac{1}{N-1} \sum_{i=1}^{N-1} (RR_{i+1} - RR_i)^2}
$$

* *Ý nghĩa:* Đo lường sự thay đổi giữa hai nhịp đập kế tiếp. Là chỉ số vàng phản ảnh hoạt động của **Phó giao cảm (PNS/Vagal Tone)**. Cực kỳ ổn định và phù hợp cho các phép đo ngắn hạn (1 - 5 phút).
* **pNN50 (Percentage of successive RR intervals > 50ms):**
  Tỷ lệ phần trăm các khoảng R-R kế tiếp chênh lệch nhau hơn $50\text{ms}$. Cũng đại diện cho hoạt động phó giao cảm.

### 2.2. Miền Tần số (Frequency-Domain Parameters)

Sử dụng Biến đổi Fourier (FFT) hoặc Autoregressive (AR) để phân tích năng lượng tín hiệu ở các dải tần số khác nhau:

* **VLF (Very Low Frequency, $0.0033 - 0.04\text{ Hz}$):** Liên quan đến cơ chế điều hòa thân nhiệt và hệ thống renin-angiotensin.
* **LF (Low Frequency, $0.04 - 0.15\text{ Hz}$):** Phản ánh sự kết hợp của cả hệ Giao cảm và Phó giao cảm (thường liên quan đến điều hòa huyết áp - Baroreflex).
* **HF (High Frequency, $0.15 - 0.40\text{ Hz}$):** Phản ánh trực tiếp hoạt động Phó giao cảm thông qua nhịp thở (*Respiratory frequency*).
* **LF/HF Ratio:** Tỷ lệ giữa năng lượng LF và HF, thường được dùng để đánh giá **Sự cân bằng Giao cảm / Phó giao cảm (Sympathovagal Balance)**.
* $LF/HF$ cao $\rightarrow$ Uống cà phê, Stress, Tập luyện (Giao cảm ưu thế).
* $LF/HF$ thấp $\rightarrow$ Nghỉ ngơi, Thư giãn, Thở sâu (Phó giao cảm ưu thế).

### 2.3. Miền Phi tuyến tính (Non-Linear Parameters)

Đo lường tính phức tạp và cấu trúc tự tương quan của nhịp tim:

* **SD1 & SD2 (Poincaré Plot):** $SD1$ đại diện cho biến thiên ngắn hạn (tương đương RMSSD), $SD2$ đại diện cho biến thiên dài hạn.
* **Sample Entropy (SampEn):** Độ hỗn loạn/không dự đoán được của chuỗi R-R.

---

## 3. THIẾT KẾ ARCHITECTURE PIPELINE XỬ LÝ TRONG PYTHON

Một hệ thống xử lý HRV đạt chuẩn Production cần tuân theo sơ đồ pipeline 5 bước khép kín bên dưới:

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   RAW SIGNAL   │────►│  PREPROCESSING │────►│ PEAK DETECTION │────►│  RRI CLEANING  │────►│   HRV METRICS  │
│  (ECG / PPG)   │     │ (Bandpass/Notch│     │(Pan-Tompkins / │     │(Ectopic/Outlier│     │ (Time/Freq/    │
│  fs ≥ 100 Hz   │     │  Filtering)    │     │ NeuroKit/Elg)  │     │ Interpolation) │     │ Non-Linear)    │
└────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘
```

---

## 4. CODE PYTHON HOÀN CHỈNH (PRODUCTION-READY TEMPLATE)

Module Python mã nguồn sạch, xử lý từ dữ liệu thô đến lọc nhiễu, làm sạch nhịp ngoại tâm thu và xuất báo cáo HRV hoàn chỉnh:

```python
"""
Module: hrv_processor.py
Mục đích: Trích xuất & xử lý chỉ số Biến thiên nhịp tim (HRV) đạt chuẩn y tế.
Thư viện yêu cầu: neurokit2, numpy, scipy, pandas
"""

import numpy as np
import pandas as pd
import neurokit2 as nk
from scipy.signal import butter, filtfilt
import warnings
warnings.filterwarnings('ignore')

class HRVProcessor:
    def __init__(self, sampling_rate: int = 500):
        """
        Khởi tạo pipeline xử lý HRV.
        :param sampling_rate: Tần số lấy mẫu của tín hiệu (Hz). Khuyến nghị >= 250Hz.
        """
        self.fs = sampling_rate

    def preprocess_ecg(self, raw_signal: np.ndarray) -> np.ndarray:
        """
        Lọc nhiễu tín hiệu ECG bằng Bộ lọc Dải thông (Bandpass Butterworth).
        Lọc bỏ nhiễu đường đẳng điện (Low-cut 0.5Hz) và nhiễu cơ/lưới điện (High-cut 45Hz).
        """
        nyquist = 0.5 * self.fs
        low = 0.5 / nyquist
        high = 45.0 / nyquist
        b, a = butter(2, [low, high], btype='band')
        cleaned_signal = filtfilt(b, a, raw_signal)
        return cleaned_signal

    def extract_rpeaks(self, cleaned_signal: np.ndarray):
        """
        Phát hiện các đỉnh R (R-peaks) sử dụng thuật toán tối ưu của NeuroKit2.
        """
        signals, info = nk.ecg_peaks(cleaned_signal, sampling_rate=self.fs, method="neurokit")
        rpeaks = info["ECG_R_Peaks"]
        return rpeaks, signals

    def clean_rr_intervals(self, rpeaks: np.ndarray) -> np.ndarray:
        """
        Chuyển đổi R-peaks thành khoảng R-R (ms) và lọc bỏ các nhịp ngoại tâm thu / nhiễu.
        Sử dụng quy tắc Malik / Outlier Detection.
        """
        rri_raw = np.diff(rpeaks) / self.fs * 1000.0

        # Loại bỏ các khoảng RR bất thường sinh lý (< 300ms hoặc > 2000ms)
        valid_mask = (rri_raw >= 300) & (rri_raw <= 2000)
        rri_filtered = rri_raw[valid_mask]

        # Loại bỏ các ngoại lệ biến thiên đột biến (> 20% so với nhịp liền trước)
        rri_clean = nk.signal_outliers(rri_filtered, method="median", threshold=3)
      
        # Thay thế ngoại lệ bằng phương pháp nội suy Cubic Spline
        clean_rri_series = pd.Series(rri_filtered)
        clean_rri_series[rri_clean] = np.nan
        rri_interpolated = clean_rri_series.interpolate(method='cubic').bfill().ffill().to_numpy()

        return rri_interpolated

    def compute_hrv(self, rpeaks: np.ndarray) -> pd.DataFrame:
        """
        Tính toán toàn bộ chỉ số HRV Time-domain, Frequency-domain và Non-linear.
        """
        peaks_dict = {"ECG_R_Peaks": rpeaks}
      
        hrv_time = nk.hrv_time(peaks_dict, sampling_rate=self.fs)
        hrv_freq = nk.hrv_frequency(peaks_dict, sampling_rate=self.fs)
        hrv_non = nk.hrv_nonlinear(peaks_dict, sampling_rate=self.fs)

        hrv_summary = pd.concat([hrv_time, hrv_freq, hrv_non], axis=1)
        return hrv_summary

    def run_pipeline(self, raw_ecg: np.ndarray):
        """
        Thực thi toàn bộ quy trình end-to-end.
        """
        print("[1/4] Đang tiền xử lý & lọc nhiễu...")
        cleaned = self.preprocess_ecg(raw_ecg)

        print("[2/4] Đang trích xuất đỉnh R...")
        rpeaks, _ = self.extract_rpeaks(cleaned)

        print(f" -> Tìm thấy {len(rpeaks)} đỉnh R-peak.")

        print("[3/4] Đang lọc sạch nhịp ngoại tâm thu (NN intervals)...")
        rri_clean = self.clean_rr_intervals(rpeaks)

        print("[4/4] Đang tính toán các chỉ số HRV...")
        hrv_metrics = self.compute_hrv(rpeaks)

        return hrv_metrics, rri_clean


# ==========================================
# THI CÔNG MINH HỌA (DEMO RUN)
# ==========================================
if __name__ == "__main__":
    FS = 500  # Tần số lấy mẫu 500Hz
    DURATION = 300  # 5 phút dữ liệu

    print("--- KHỞI TẠO DỮ LIỆU TÍN HIỆU ECG GIẢ LẬP ---")
    ecg_raw = nk.ecg_simulate(duration=DURATION, sampling_rate=FS, heart_rate=75, noise=0.05)

    processor = HRVProcessor(sampling_rate=FS)
    metrics, rri = processor.run_pipeline(ecg_raw)

    print("\n=== KẾT QUẢ TRÍCH XUẤT HRV CHỦ YẾU ===")
    key_metrics = [
        "HRV_MeanNN", "HRV_SDNN", "HRV_RMSSD", "HRV_pNN50",
        "HRV_LF", "HRV_HF", "HRV_LFHF", "HRV_SD1", "HRV_SD2"
    ]
    for m in key_metrics:
        if m in metrics.columns:
            print(f" - {m:<15}: {metrics[m].values[0]:.2f}")
```

---

## 5. THÁCH THỨC THỰC TẾ & PHƯƠNG ÁN XỬ LÝ (EDGE CASES)

| Tình huống thực tế                         | Nguyên nhân kỹ thuật                                            | Hậu quả lên dữ liệu                                                           | Phương án xử lý (Engineering Solution)                                            |
| ---------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Motion Artifacts (Nhiễu cử động)** | Người dùng đi lại, vung tay, hoặc tuột dây đeo cảm biến. | Xuất hiện các đỉnh ảo (False Positive) hoặc mất đỉnh R (False Negative). | • Dùng bộ lọc thích ứng (Adaptive Filter) kết hợp dữ liệu IMU/Accelerometer. |

• Bỏ hẳn đoạn dữ liệu nhiễu quá $20\%$ khoảng thời gian đo. |
| **Tần số lấy mẫu thấp ($F_s < 100\text{ Hz}$)** | Đồng hồ thông minh giá rẻ cắt giảm công suất pin, hạ $F_s$ xuống $50 - 100\text{ Hz}$. | Độ phân giải thời gian bị sai lệch $\pm 10 - 20\text{ ms}$, phá hỏng chỉ số RMSSD. | • Áp dụng thuật toán **Cubic Spline Interpolation** nâng tần số lên $500\text{ Hz}$ trước khi xác định peak.

• Dùng thuật toán Parabolic Peak Interpolation. |
| **Loạn nhịp tim (Arrhythmia / Ectopic Beats)** | Tim bị bỏ nhịp hoặc đập sớm (PVC/PAC) do sinh lý tự nhiên. | Khoảng RR bị co giãn bất thường ($300\text{ ms} \rightarrow 1500\text{ ms}$), làm SDNN và RMSSD vọt lên vô nghĩa. | • Áp dụng quy tắc lọc **Malik Rule** hoặc **Quotient Filter** (loại bỏ RR lệch quá $20\%$ so với trung bình trượt).

• Thay thế bằng phép nội suy Spline thay vì xóa bỏ trực tiếp. |
| **Ultra-short term (< 2 phút)** | Người dùng chỉ mở app đo trong $30 - 60$ giây. | Các chỉ số miền tần số (LF, HF) không thể hội tụ, kết quả bị sai lệch nặng. | • **Chỉ tin dùng RMSSD và pNN50** cho các khoảng đo $< 2$ phút.

• Khóa không xuất chỉ số LF/HF nếu thời gian đo $< 3$ phút. |

---

## 6. BẪY LOGIC & QUY TRÌNH XÂY DỰNG CA LÂM SÀNG (BASELINE)

### 6.1. "Bẫy" Ngưỡng cố định (Fixed Threshold Trap)

Một sai lầm phổ biến của các lập trình viên là gán nhãn cứng:

* *Nếu $RMSSD < 20\text{ms} \rightarrow$ Stress.*
* *Nếu $RMSSD > 50\text{ms} \rightarrow$ Thư giãn.*

**Sự thật sinh học:**

* Giá trị HRV phụ thuộc mạnh mẽ vào **Độ tuổi, Giới tính, Gen và Cơ địa**.
* Một vận động viên 20 tuổi có thể có $RMSSD = 80\text{ms}$ (Bình thường), nhưng khi bị Stress nặng $RMSSD$ tụt xuống $40\text{ms}$.
* Một người 65 tuổi có $RMSSD = 25\text{ms}$ khi khỏe mạnh bình thường. Nếu dùng ngưỡng cố định, người lớn tuổi sẽ luôn bị mô hình phán đoán là "Stress nặng".

```
     MÔ HÌNH SAI (Fixed Threshold):
     [Dữ liệu HRV] ───► [RMSSD < 30ms?] ───► YES ───► Cảnh báo Stress (Lỗi nặng cho người già)

     MÔ HÌNH ĐÚNG (Personalized Baseline):
     [Dữ liệu HRV] ───► [So sánh với Baseline 7 ngày của chính cá nhân đó]
                              │
                              ├──► Thấp hơn > 1.5 StdDev ───► Cảnh báo Stress / Cần nghỉ ngơi
                              └──► Trong biên độ bình thường ───► Trạng thái ổn định

```

### 6.2. Giải pháp: Xây dựng HRV Baseline cá nhân hóa

1. **Thu thập Baseline 7-14 ngày:** Yêu cầu người dùng đo HRV vào **cùng một thời điểm cố định trong ngày** (tốt nhất là 3 phút ngay sau khi thức dậy vào buổi sáng, trước khi rời khỏi giường).
2. **Tính toán Z-Score cá nhân:**

$$
Z = \frac{HRV_{today} - \mu_{baseline}}{\sigma_{baseline}}
$$

* $Z < -1.5$: Cơ thể đang chịu áp lực lớn, kiệt sức hoặc có dấu hiệu ốm/sốt.
* $-1.0 \le Z \le 1.0$: Trạng thái bình thường, cân bằng.
* $Z > 1.5$: Cơ thể phục hồi rất tốt, sẵn sàng cho các hoạt động thể lực/trí óc cường độ cao.

---

## 7. ƯU ĐIỂM & NHƯỢC ĐIỂM CỦA HRV

### 7.1. Ưu điểm

* **Chỉ báo sinh học không xâm lấn (Non-invasive Bio-marker):** Đo lường trực tiếp trạng thái của Hệ thần kinh thực vật mà không cần xét nghiệm máu hay các thủ thuật phức tạp.
* **Độ nhạy sớm (Early Warning Signal):** HRV phản ứng với tình trạng quá tải, thiếu ngủ, dị ứng, hoặc vi-rút xâm nhập **24 - 48 giờ trước khi các triệu chứng lâm sàng (sốt, mệt mỏi) xuất hiện**.
* **Khả năng tự động hóa cao:** Dễ dàng tích hợp vào các thuật toán Machine Learning trên thiết bị đeo (Wearables).

### 7.2. Nhược điểm & Hạn chế

* **Cực kỳ nhạy cảm với nhiễu:** Chỉ cần $1\%$ dữ liệu R-R bị nhiễu do cử động cũng có thể làm sai lệch $50\%$ chỉ số RMSSD.
* **Chịu ảnh hưởng bởi quá nhiều biến số nhiễu (Confounding Factors):** HRV thay đổi do tư thế (đứng/nằm), nhiệt độ môi trường, vừa uống cà phê, rượu bia, nhịp thở nhanh/chậm.
* **Đòi hỏi sự tuân thủ cao từ người dùng:** Việc đo đạc không chuẩn thời điểm khiến dữ liệu bị phân tán mạnh.

---

## 8. LỘ TRÌNH KỸ THUẬT CHO DỰ ÁN PYTHON

```
   GIAI ĐOẠN 1: Thu thập & Tiền xử lý
   ├── Xây dựng module nhận dữ liệu từ phần cứng (BLE / CSV / API)
   ├── Triển khai bộ lọc Butterworth & FIR để làm sạch tín hiệu
   └── Áp dụng Spline Interpolation xử lý tín hiệu tần số thấp

   GIAI ĐOẠN 2: Trích xuất Feature & Lọc ngoại lệ
   ├── Lập trình thuật toán Pan-Tompkins / Elgendi xác định R-peak
   ├── Áp dụng Malik Filter loại bỏ nhịp ngoại tâm thu
   └── Tính toán bộ chỉ số: RMSSD, SDNN, LF/HF, SD1/SD2

   GIAI ĐOẠN 3: Xây dựng Mô hình AI / Cá nhân hóa
   ├── Thiết lập pipeline lưu trữ & tính toán Baseline 7 ngày
   ├── Tính Z-Score daily cho từng user
   └── Huấn luyện mô hình phân loại Stress / Recovery (Random Forest / XGBoost)

   GIAI ĐOẠN 4: Đóng gói & Triển khai (Deployment)
   ├── Tối ưu hóa code Python (Chuyển đổi sang C++ / ONNX nếu chạy Edge Device)
   └── Đóng gói REST API (FastAPI / Docker) phục vụ Mobile App
```

---

## 9. TÀI LIỆU THAM KHẢO (REFERENCES)

1. **Task Force of the European Society of Cardiology and the North American Society of Pacing and Electrophysiology (1996).** *Heart rate variability: standards of measurement, physiological interpretation and clinical use.* Circulation, 93(5), 1043-1065.
2. **Makowski, D., et al. (2021).** *NeuroKit2: A Python toolbox for neurophysiological signal processing.* Behavior Research Methods, 53(4), 1689–1696.
3. **Shaffer, F., & Ginsberg, J. P. (2017).** *An overview of heart rate variability metrics and norms.* Frontiers in public health, 5, 258.
