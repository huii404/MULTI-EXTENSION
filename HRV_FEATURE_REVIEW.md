# TÀI LIỆU REVIEW TÍNH NĂNG: TRÍCH XUẤT BIẾN THIÊN NHỊP TIM (HRV) QUA WEBCAM (rPPG)

> **Dự án:** Bio-Gate (Hệ thống đánh giá sức khỏe tinh thần và căng thẳng)  
> **Nhánh phát triển:** `feature/python311-hrv-update`  
> **Ngày cập nhật:** 09/08/2026  

---

## 1. TỔNG QUAN TÍNH NĂNG (FEATURE OVERVIEW)

Tính năng **HRV & rPPG Biometrics** cho phép Bio-Gate đo lường chỉ số **Biến thiên Nhịp tim (Heart Rate Variability - HRV)** và **Nhịp tim (BPM)** của người dùng thông qua Webcam hoàn toàn **không tiếp xúc (Non-contact Photoplethysmography - rPPG)**.

### Cơ Sở Sinh Lý Học
* **Khi Cơ Thể Thư Giãn (Hệ Đối Giao Cảm Hoạt Động):** Nhịp tim điều chỉnh linh hoạt theo nhịp thở (khoảng cách giữa các nhịp đập biến động liên tục) $\rightarrow$ **Chỉ số HRV (RMSSD) CAO (> 45 ms)**.
* **Khi Cơ Thể Căng Thẳng / Stress (Hệ Giao Cảm Kích Hoạt):** Nhịp tim bị dồn dập và đập "đều chằn chặn" $\rightarrow$ **Chỉ số HRV (RMSSD) THẤP (< 25 ms)**.

### Mô Hình Đánh Giá Căng Thẳng Đa Tầng (Multi-Modal Stress)
Hệ thống kết hợp **Căng thẳng Cảm xúc khuôn mặt** (Takagi-Sugeno Fuzzy System hiện tại) với **Căng thẳng Sinh lý** (HRV Stress Score) theo công thức trọng số để đưa ra điểm số Stress sinh học chính xác vượt trội.

$$\text{Final Stress} = 0.5 \times \text{Stress}_{\text{Emotion}} + 0.5 \times \text{Stress}_{\text{HRV}}$$

---

## 2. CẤU TRÚC KIẾN TRÚC & CÁC FILE ĐÃ TRIỂN KHAI

```
bio-gate/
├── hrv_processor.py              # [NEW] Module xử lý tín hiệu rPPG, lọc dải thông và tính RMSSD/SDNN/BPM
├── camera.py                     # [MODIFY] Trích xuất kênh Xanh lá (Green ROI) từ khuôn mặt & tính Combined Stress
├── data_manager.py               # [MODIFY] Lưu trữ lịch sử HRV (RMSSD, SDNN, BPM) & Thống kê Admin Dashboard
├── app.py                        # [MODIFY] Bổ sung API /api/analyze_frame, /api/reset_scan, /api/hrv/metrics
├── templates/
│   ├── index.html                # [MODIFY] Giao diện thẻ rPPG Biometrics & Biểu đồ sóng mạch nhịp tim ppgChart
│   ├── result.html               # [MODIFY] Hiển thị tóm tắt kết quả đo HRV & BPM trên trang giải pháp
│   └── admin/dashboard.html      # [MODIFY] Thêm thẻ HRV (RMSSD Trung bình) trên trang Quản trị Admin
└── HRV_FEATURE_REVIEW.md         # [NEW] Tài liệu tổng quan review tính năng
```

---

## 3. CHI TIẾT CÁC CHỈ SỐ HRV & THUẬT TOÁN

### Các Chỉ Số Sinh Lý Đo Được
1. **BPM (Beats Per Minute):** Nhịp tim trung bình trong 1 phút.
2. **RMSSD (Root Mean Square of Successive Differences):** Chỉ số chính đo hoạt động thần kinh đối giao cảm (khả năng hồi phục/thư giãn).
3. **SDNN (Standard Deviation of NN intervals):** Độ lệch chuẩn tổng thể của các khoảng nhịp tim.
4. **HRV Stress Score (%):** Quy đổi từ RMSSD sang thang đo căng thẳng 0 – 100%.

### Quy Trình Xử Lý Tín Hiệu Tốc Độ Cao (Low-Latency rPPG Pipeline)
1. **Cắt vùng ROI khuôn mặt:** Lấy khu vực trán và má trung tâm nơi mao mạch máu dưới da dồi dào.
2. **Trích xuất kênh màu Xanh lá (Green Channel):** Màu xanh lá có độ hấp thụ ánh sáng của hồng cầu tối ưu nhất.
3. **Khử xu hướng & Lọc tín hiệu:** Loại bỏ nhiễu ánh sáng môi trường và rung lắc nhẹ.
4. **Phát hiện đỉnh nhịp tim & Tính khoảng $RR$:** Xác định khoảng cách giữa các nhịp $RR = t_k - t_{k-1}$ (ms).
5. **Xử lý linh hoạt 3–7 khung hình:** Đảm bảo hiển thị ngay kết quả chỉ sau 2–3 giây quét webcam.

---

## 4. GIAO DIỆN NGƯỜI DÙNG (UI/UX)

### Thẻ Giao Diện rPPG Biometrics Trên Màn Hình Chính (`index.html`)
* **Chỉ số Nhịp tim (BPM):** Đồng hồ số màu đỏ sinh động.
* **Chỉ số HRV (RMSSD):** Hiển thị độ biến thiên tính bằng miligiây (ms).
* **Độ lệch SDNN:** Độ lệch chuẩn tổng thể.
* **Badge Trạng Thái:** Nhãn nhấp nháy (*Thư giãn / Cân bằng / Căng thẳng*).
* **Biểu Đồ Sóng Mạch Máu (`ppgChart`):** Đường sóng nhịp tim màu xanh cyan hoạt động theo thời gian thực.

### Cơ Chế Làm Sạch Dữ Liệu Ảo (Scan Reset Engine)
Khi người dùng bấm **Quét Lại** hoặc khi mất dấu khuôn mặt, hệ thống tự động:
- Gọi API `/api/reset_scan` xóa 100% bộ đệm tín hiệu phiên trước.
- Đưa các thẻ số về trạng thái `-- bpm`, `-- ms` và làm sạch biểu đồ sóng `ppgChart`.

---

## 5. QUY TRÌNH KIỂM THỬ & REVIEW TÍNH NĂNG (TESTING GUIDE)

### Bước 1: Khởi chạy ứng dụng
```bash
python app.py
```

### Bước 2: Thử nghiệm tính năng Quét thời gian thực
1. Mở trình duyệt tại địa chỉ: `http://localhost:5000/`.
2. Đưa khuôn mặt vào giữa khung hình webcam.
3. Quan sát sau 2-3 giây: Các thông số **BPM**, **RMSSD**, **SDNN** xuất hiện và đường sóng mạch nhịp tim uốn lượn trên biểu đồ `ppgChart`.

### Bước 3: Kiểm tra cơ chế Reset bộ đệm (Tránh Data Ảo)
1. Bấm nút **Quét Lại**: Các thông số lập tức chuyển về `--` và đường sóng nhịp tim reset sạch sẽ.
2. Che mặt hoặc quay mặt đi chỗ khác: Hệ thống thông báo *"Không tìm thấy khuôn mặt"* và trả chỉ số về `--`.

### Bước 4: Kiểm tra Admin Dashboard
1. Truy cập: `http://localhost:5000/login` (Tài khoản: `admin` / Mật khẩu: `123456`).
2. Xem thẻ thống kê **HRV (RMSSD TB)** hiển thị giá trị trung bình của toàn bộ lịch sử đo.

---

## 6. THÔNG TIN GIT & BRANCH

- **Repository:** `https://github.com/kietlaptrinh/bio-gate`
- **Branch:** `feature/python311-hrv-update`
- **Commit mới nhất:** `Fix bug: Enable fast 3-frame rPPG HRV calculation and fix JS TypeError on index.html`
