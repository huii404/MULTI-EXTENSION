# Bio-Gate

Bio-Gate là hệ thống nhận diện cảm xúc và đánh giá mức độ căng thẳng (stress) dựa trên thời gian thực. Hệ thống sử dụng camera để phân tích khuôn mặt, kết hợp cùng hệ suy luận mờ Takagi-Sugeno, sau đó đưa ra các giải pháp giảm stress phù hợp thông qua các bài tập hoặc trò chuyện cùng trợ lý ảo AI (Gemini).

## Yêu cầu hệ thống

* Python 3.8 trở lên.
* Webcam (Tích hợp hoặc cắm ngoài).
* Tài khoản và API Key của Google Gemini (Cho tính năng Chatbot).

## Cách cấu hình và cài đặt

1. Tải mã nguồn từ GitHub:
   ```bash
   git clone https://github.com/kietlaptrinh/bio-gate.git
   cd bio-gate
   ```

2. Tạo môi trường ảo (Khuyến nghị):
   ```bash
   # Với Windows
   python -m venv venv
   venv\Scripts\activate

   # Với Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Tải và cài đặt các thư viện cần thiết:
   Dự án đã có sẵn file `requirements.txt` chứa các thư viện cần sử dụng như Flask, OpenCV, DeepFace, v.v. Bạn chỉ cần chạy lệnh sau:
   ```bash
   pip install -r requirements.txt
   ```

4. Cấu hình biến môi trường:
   Bạn cần cấu hình API Key cho Google Gemini để Chatbot có thể hoạt động. 
   Nếu chưa có, hãy tạo một file `.env` ở thư mục gốc của dự án (ngang hàng với `app.py`) và thêm thông tin sau:
   ```env
   GEMINI_API_KEY=dien_api_key_cua_ban_vao_day
   ```

## Cách chạy dự án

Sau khi đã hoàn tất bước cài đặt thư viện và cấu hình, bạn có thể khởi động máy chủ Flask bằng lệnh:

```bash
python app.py
```

Hệ thống sẽ chạy trên máy chủ cục bộ (localhost). Bạn hãy mở trình duyệt web và truy cập vào địa chỉ:
* http://127.0.0.1:5000/ hoặc http://localhost:5000/

Lưu ý: Trong lần chạy đầu tiên, thư viện DeepFace có thể sẽ cần thời gian để tải mô hình nhận diện khuôn mặt (model weights) nên ứng dụng khởi động sẽ mất một chút thời gian.

## Quản trị hệ thống (Admin Dashboard)

Dự án có tích hợp trang quản trị để theo dõi biểu đồ stress, lịch sử chat và cảnh báo:
* Đường dẫn: http://127.0.0.1:5000/login hoặc click vào mục Admin trên giao diện
* Tên đăng nhập mặc định: admin
* Mật khẩu mặc định: 123456

## Cấu trúc dự án chính

* `app.py`: File chính khởi chạy máy chủ web Flask và điều hướng các đường dẫn.
* `camera.py`: Xử lý hình ảnh từ camera, tích hợp DeepFace để đọc cảm xúc và trả về mức độ stress qua hệ suy luận mờ.
* `chatbot.py`: Kịch bản và cấu hình kết nối API đến Google Gemini để trò chuyện với người dùng.
* `data_manager.py`: Quản lý lưu trữ dữ liệu, lịch sử cảnh báo và thống kê ra file/json.
* `templates/`: Chứa các giao diện HTML (Trang chủ, đăng nhập, admin, chat...).
* `static/`: Chứa các file tĩnh như CSS, JS, Audio.
* `requirements.txt`: Danh sách thư viện Python.
