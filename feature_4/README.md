# Feature 4: Voice Chat & Multimodal Emotion Analysis Integration

Tài liệu này hướng dẫn chi tiết cách cấu hình, sử dụng và kiểm thử Chức năng 4: Tích hợp Ghi âm giọng nói Microphone, tải file âm thanh MP3/WAV và phân tích cảm xúc đa phương thức (giọng nói kết hợp ngữ nghĩa).

---

## I. CÁC TÍNH NĂNG CHÍNH

1. **Ghi âm thông minh tự động (Speech VAD Silence Detection)**:
   - Sử dụng **MediaRecorder API** để thu âm giọng nói thực tế dưới dạng file nhị phân.
   - Kết hợp **Web Audio API AnalyserNode** để đo biên độ âm thanh (RMS).
   - Tự động phát hiện khi học sinh ngừng nói quá **1.5 giây** để dừng ghi âm và gửi tệp phân tích ngay lập tức, đem lại trải nghiệm rảnh tay (hands-free) mượt mà.
2. **Tải file âm thanh đính kèm**:
   - Tích hợp nút đính kèm file (icon kẹp giấy) cho phép tải lên trực tiếp các tệp tin `.mp3` hoặc `.wav` có sẵn dưới 10MB.
3. **Phân tích đa phương thức 3 tầng (3-Tier Multimodal Resilience Pipeline)**:
   - **Tầng 1 (Gemini 2.5 Flash Multimodal)**: Đọc trực tiếp tệp âm thanh nhị phân để dịch văn bản tiếng Việt, đánh giá tốc độ nói, khoảng lặng ngắt quãng, cường độ âm lượng kết hợp phân tích ngữ nghĩa thấu cảm. Tích hợp quay vòng API key.
   - **Tầng 2 (Groq Whisper + Llama 3.3)**: Dự phòng khi Gemini lỗi, dùng Whisper của Groq để dịch giọng nói thành văn bản, sau đó dùng Llama 3.3 phân tích cảm xúc văn bản.
   - **Tầng 3 (Groq Whisper + Local Rule-based)**: Nếu cả hai AI phân tích đều lỗi, hệ thống lấy văn bản từ Groq Whisper phân tích qua công cụ so khớp quy tắc từ vựng cục bộ.
4. **Bảng theo dõi cảm xúc thời gian thực**: Trực quan hóa tiến trình cảm xúc của học sinh qua biểu đồ đường Chart.js, đo cường độ, độ tin cậy và hiển thị các tag tín hiệu phát hiện.

---

## II. HƯỚNG DẪN CẤU HÌNH BIẾN MÔI TRƯỜNG (`.env`)

Cấu hình các API key cần thiết trong tệp `.env` tại thư mục gốc:

```env
# Danh sách các API Key Gemini (cách nhau bởi dấu phẩy để tự động xoay vòng khi hết hạn mức)
GEMINI_API_KEYS=key_1,key_2,key_3,key_4,key_5

# API Key Groq dự phòng
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

## III. HƯỚNG DẪN KIỂM THỬ TỰ ĐỘNG (TEST SUITE)

Hệ thống đi kèm một bộ kiểm thử tự động toàn diện gồm **23 test cases** tiếng Việt (Stress, Anxiety, Sadness, Happy, Neutral, lóng cười `kkkk`, phủ định cửa sổ, ngập ngừng đệm):

### Chạy kiểm thử:
Mở Terminal PowerShell tại thư mục gốc và chạy lệnh:
```powershell
$env:PYTHONIOENCODING="utf-8"; venv\Scripts\python.exe feature_4/feature_4.py
```

### Kết quả mong đợi:
```text
================================================================================
KẾT QUẢ KIỂM THỬ: Đã vượt qua 23/23 test cases.
================================================================================
```

---

## IV. PHỤ LỤC: MA TRẬN TRỌNG SỐ ĐIỂM CHI TIẾT (LOCAL RULES ENGINE)

| Đặc trưng / Tín hiệu phát hiện | STRESS | ANXIETY | SADNESS | HAPPY | Ví dụ thực tế |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Từ khóa Tức giận** | **+3** | 0 | 0 | 0 | bực, tức, cáu, điên, phát điên, ức chế... |
| **Từ khóa Khó chịu** | **+2** | 0 | **+1** | 0 | khó chịu, phiền, phiền phức, ngán, ngán ngẩm... |
| **Từ khóa Áp lực** | **+3** | **+2** | 0 | 0 | áp lực, stress, căng thẳng... |
| **Từ khóa Lo lắng** | 0 | **+3** | 0 | 0 | lo, lo lắng, hồi hộp, bất an, bồn chồn, run... |
| **Từ khóa Sợ hãi** | 0 | **+3** | **+1** | 0 | sợ, e là, sợ quá, sợ rằng... |
| **Ngập ngừng** | 0 | **+2** | 0 | 0 | Có dấu `...` hoặc từ đệm: *ừm, ờ, à, hmm*... |
| **Lặp từ do hồi hộp** | 0 | **+2** | 0 | 0 | Lặp từ đứng cạnh nhau (ví dụ: *"sợ... sợ"*) |
| **Lặp từ "tôi... tôi"** | 0 | **+3** | 0 | 0 | Lặp đại từ nhân xưng *"tôi... tôi"* |
| **Từ khóa Không chắc chắn** | 0 | **+2** | 0 | 0 | hình như, có lẽ, có vẻ, liệu, nhỡ, lỡ... |
| **Từ khóa Thất vọng** | 0 | **+1** | **+3** | 0 | thất vọng, chán, chán nản, nản lòng, tuyệt vọng... |
| **Từ khóa Cô đơn** | 0 | **+1** | **+3** | 0 | cô đơn, một mình, nhớ... |
| **Từ khóa Buồn bã** | 0 | 0 | **+3** | 0 | buồn, buồn quá, đau lòng, tổn thương, không vui... |
| **Từ khóa Hạnh phúc** | 0 | 0 | 0 | **+3** | vui, vui vẻ, hạnh phúc, tuyệt vời, thích... |
| **Từ khóa Hào hứng** | 0 | 0 | 0 | **+3** | hào hứng, phấn khích, thành công, chiến thắng... |
| **Tiếng cười & Từ lóng** | 0 | 0 | 0 | **+2** | *haha, hahaha, hehe, hihi, kkkk, kaka, kkk, kk* |
| **Không + Từ tích cực** | 0 | 0 | **+2** | **-2** | *"không vui"*, *"chẳng thích"* |
| **Không + Từ tiêu cực** | **-2** | **-2** | **-2** | 0 | *"không lo"*, *"không sợ"* |
| **Câu hỏi bất an** | 0 | **+2** | 0 | 0 | Câu hỏi (`?`) chứa từ nghi vấn: *"nếu... thì sao"* |
| **Câu cảm thán tích cực** | 0 | 0 | 0 | **+2** | Câu cảm thán (`!`) chứa từ khóa vui vẻ (HAPPY) |
| **Câu cảm thán tiêu cực** | **+2** | **+1** | **+1** | 0 | Câu cảm thán (`!`) chứa từ khóa tiêu cực |

---

## V. NGUYÊN TẮC PHÂN TÍCH ÂM THANH GIỌNG NÓI (ACOUSTIC SPEECH PRINCIPLES)

Khi học sinh chia sẻ bằng giọng nói hoặc gửi tệp âm thanh, AI đa phương thức sẽ chấm điểm dựa trên 4 đặc trưng âm học chính để ánh xạ vào cảm xúc:

1. **Âm lượng / Cường độ (Loudness/Amplitude)**:
   - **`loud_voice` (Nói to, gắt)**: Biểu thị trạng thái **STRESS** (căng thẳng, tức giận làm co thắt thanh quản dẫn đến phát âm mạnh) hoặc **HAPPY** (phấn khích, vui mừng tông giọng cao lớn).
   - **`quiet_voice` (Nói nhỏ, thì thầm)**: Biểu thị trạng thái **SADNESS** (buồn bã làm suy giảm năng lượng phát âm) hoặc **ANXIETY** (lo lắng, thiếu tự tin, rụt rè).

2. **Tốc độ nói (Speaking Pace)**:
   - **`fast_pace` (Nói nhanh, dồn dập)**: Kích hoạt khi nhịp tim tăng cao do trạng thái kích động. Ánh xạ trực tiếp tăng điểm **STRESS** (nôn nóng, cáu gắt) hoặc **HAPPY** (hào hứng kể chuyện).
   - **`slow_pace` (Nói chậm, uể oải)**: Nhịp thở yếu và năng lượng thấp. Ánh xạ trực tiếp tăng điểm **SADNESS** (buồn ngủ, chán nản, u sầu).

3. **Khoảng lặng ngắt quãng (Speech Pauses & Hesitations)**:
   - **`hesitation` (Ngập ngừng, đứt quãng)**: Khoảng lặng kéo dài đan xen các từ đệm (*ừm, ờ, à*). Ánh xạ trực tiếp tăng điểm **ANXIETY** (hồi hộp suy nghĩ, sợ hãi nói sai) hoặc **SADNESS** (nghẹn ngào ngắt quãng).
   
4. **Sự ổn định của tần số giọng nói (Pitch Stability)**:
   - **`shaky_voice` (Giọng run rẩy, bất ổn)**: Tần số cơ bản phát âm dao động không ổn định do hơi thở đứt quãng. Đây là tín hiệu đặc trưng nhất của **ANXIETY** (lo sợ, hoảng loạn).
   - **`laughter` (Tiếng cười)**: Tiếng cười khúc khích, sảng khoái hoặc tiếng cười trừ viết tắt. Ánh xạ trực tiếp tăng điểm **HAPPY**.

