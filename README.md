# Multi Tool Hub - Browser Extension (v2.0.0)

<p align="center">
  <img src="icons/d.png" alt="Multi Tool Hub Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Tiện ích mở rộng đa năng trên trình duyệt (Manifest V3)</strong><br>
  Tối ưu hóa tác vụ học tập tại Đại học Duy Tân (DTU), trích xuất tài liệu Studocu, chụp ảnh trang web, tạo & quét mã QR và kết nối tác giả.
</p>

---

## 📑 Bảng Mục Lục

1. [Giới Thiệu Tổng Quan](#-giới-thiệu-tổng-quan)
2. [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
3. [Danh Sách Tính Năng & Hướng Dẫn Sử Dụng](#-danh-sách-tính-năng--hướng-dẫn-sử-dụng)
   - [1. SINHVIEN DTU (Hỗ Trợ Sinh Viên Duy Tân)](#1-sinhvien-dtu-hỗ-trợ-sinh-viên-duy-tân)
     - [⭐ Đánh Giá Giảng Viên Tự Động](#-đánh-giá-giảng-viên-tự-động)
     - [📅 Xuất Lịch Học MyDTU](#-xuất-lịch-học-mydtu)
     - [📝 Tự Động Đăng Ký Môn Học (Săn Tín Chỉ)](#-tự-động-đăng-ký-môn-học-săn-tín-chỉ)
   - [2. Tải Tài Liệu Studocu (Document Downloader)](#2-tải-tài-liệu-studocu-document-downloader)
   - [3. Chụp Ảnh Web (Web Screenshot)](#3-chụp-ảnh-web-web-screenshot)
   - [4. QR Code Suite (Tạo & Quét Mã QR)](#4-qr-code-suite-tạo--quét-mã-qr)
   - [5. Kênh Truyền Thông & Tác Giả (Social Hub)](#5-kênh-truyền-thông--tác-giả-social-hub)
4. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
5. [Kiến Trúc Kỹ Thuật](#-kiến-trúc-kỹ-thuật)
6. [Tác Giả & Đóng Góp](#-tác-giả--đóng-góp)

---

## 🌟 Giới Thiệu Tổng Quan

**Multi Tool Hub** là tiện ích mở rộng chuẩn **Google Chrome Manifest V3**, được thiết kế với giao diện hiện đại, tối ưu hiệu suất và mang lại giải pháp toàn diện cho người dùng:
- **Dành cho sinh viên DTU**: Đánh giá giảng viên siêu tốc, xuất lịch học đa định dạng, hỗ trợ săn môn học nhanh chóng qua Network API.
- **Dành cho học tập & làm việc**: Tải tài liệu Studocu không dính mờ/watermark, chụp ảnh trang web đa chế độ, tạo & quét mã QR thông minh.

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Tải về mã nguồn
```bash
git clone https://github.com/huii404/MULTI-EXTENSION.git
```
*(hoặc tải file ZIP từ GitHub và giải nén vào máy tính của bạn)*

### 2. Cài đặt vào trình duyệt (Chrome, Edge, Brave, Cốc Cốc,...)
1. Mở trình duyệt và truy cập vào trang quản lý tiện ích:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
2. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
3. Nhấp vào nút **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục dự án `multi-tool-extension` (thư mục chứa file `manifest.json`).
5. Ghim (Pin) biểu tượng tiện ích lên thanh công cụ trình duyệt để tiện sử dụng.

---

## 🛠️ Danh Sách Tính Năng & Hướng Dẫn Sử Dụng

### 1. SINHVIEN DTU (Hỗ Trợ Sinh Viên Duy Tân)

#### ⭐ Đánh Giá Giảng Viên Tự Động
- **Mục đích**: Hoàn thành bài khảo sát đánh giá giảng viên cuối kỳ nhanh chóng và chính xác.
- **Cách sử dụng**:
  1. Mở trang Đánh giá giảng viên trên cổng MyDTU (`mydtu.duytan.edu.vn`).
  2. Mở popup **Multi Tool Hub** -> Chọn **SINHVIEN DTU** -> **Đánh giá giảng viên**.
  3. Chọn mức xếp loại mong muốn (Tốt, Khá, Trung bình,...), nhập nhận xét (hoặc để trống để điền câu mẫu), chọn mức độ hài lòng ở câu 53.
  4. Nhấn **Xác nhận đánh giá**. Toàn bộ 53 câu hỏi sẽ được điền tự động ngay lập tức.

#### 📅 Xuất Lịch Học MyDTU
- **Mục đích**: Trích xuất thời khóa biểu MyDTU để xem offline hoặc đồng bộ vào ứng dụng lịch cá nhân.
- **Cách sử dụng**:
  1. Đăng nhập vào MyDTU.
  2. Mở popup tiện ích -> Chọn **Xuất lịch học MyDTU**.
  3. Chọn phạm vi: **Lịch tháng này** hoặc **Lịch tuần này**.
  4. Chọn định dạng xuất:
     - **File Excel (.XLS)**: Bảng lịch 2D trực quan.
     - **File .ICS**: Nhập trực tiếp vào Google Calendar, Apple Calendar, Outlook.
     - **File .PDF**: Dàn trang phục vụ in ấn.
  5. Nhấn **Xuất File Excel Lịch Học** (tiện ích tự động điều hướng sang trang lịch và cào dữ liệu chuẩn).

#### 📝 Tự Động Đăng Ký Môn Học (Săn Tín Chỉ)
- **Mục đích**: Hỗ trợ đăng ký học phần nhanh chóng trong các đợt mở cổng tín chỉ MyDTU bị nghẽn mạng.
- **Cách sử dụng**:
  1. Nhập danh sách Mã môn học / Mã lớp vào ô văn bản (mỗi mã 1 dòng hoặc cách nhau bởi dấu phẩy).
  2. Chọn chế độ: **Direct Network API** (Bypass UI - chống giật lag và sập UI khi server quá tải) hoặc **Hybrid**.
  3. Thiết lập độ trễ giữa các lần gọi (Delay: 0.5s - 3s) và số lần tự động thử lại (Retry: 10 - 100 lần).
  4. Tùy chọn tiện ích: Tự động focus vào ô Captcha và tự tick chọn lớp hợp lệ.
  5. Nhấn **Lưu danh sách** để ghi nhớ vào bộ nhớ tiện ích, sau đó nhấn **Bắt đầu đăng ký**. Tiến trình chi tiết sẽ hiển thị theo thời gian thực tại khung nhật ký.

---

### 2. Tải Tài Liệu Studocu (Document Downloader)

Bộ công cụ trích xuất và tải tài liệu học tập trên nền tảng **Studocu**:
- **📥 Tải File PDF**: Tự động dọn dẹp cookie giới hạn, loại bỏ rào cản làm mờ trang, kích hoạt quy trình cuộn và xuất file PDF in sạch sẽ, sắc nét.
- **👁️ Xem file & Xóa Watermark**: Xóa sạch cookie và reload trang để xem tài liệu không bị che phủ bởi các thành phần giới hạn.
- **📸 Lưu thành Ảnh**: Tự động nhận diện các trang tài liệu đang hiển thị trên màn hình và tải về dưới dạng file ảnh chất lượng cao (.PNG).

---

### 3. Chụp Ảnh Web (Web Screenshot)

Công cụ chụp ảnh trang web tích hợp sẵn:
- **📱 Khung nhìn hiện tại (Viewport)**: Tận dụng Chrome Native API chụp ảnh siêu tốc (~50ms), giữ nguyên chất lượng hiển thị.
- **📄 Toàn bộ trang (Full Page)**: Tự động render toàn bộ trang web từ đầu đến cuối, chủ động loại bỏ banner quảng cáo rác.
- **🎯 Chọn phần tử (Element Picker)**: Di chuột và click để chụp chính xác một khối/phần tử HTML bất kỳ trên trang web (nhấn phím `ESC` để hủy chọn).
- Hỗ trợ xem trước (preview) và tải ảnh về máy nhanh chóng.

---

### 4. QR Code Suite (Tạo & Quét Mã QR)

Bộ giải pháp QR Code 2 chiều:
- **🔲 Tạo Mã QR**:
  - Nhập văn bản hoặc liên kết URL tùy ý (hỗ trợ tối đa 200 ký tự có thanh đếm ký tự trực quan).
  - Nút **Dùng URL tab hiện tại** giúp lấy ngay địa chỉ trang web đang mở chỉ với 1 click.
  - Tải mã QR đã tạo về máy dưới dạng hình ảnh PNG.
- **🔍 Quét & Giải Mã QR**:
  - **Quét từ ảnh**: Hỗ trợ chọn file ảnh từ máy, kéo thả ảnh vào vùng quét, hoặc dán trực tiếp ảnh từ bộ nhớ tạm (`Ctrl + V`).
  - **Quét từ màn hình**: Nhấn nút **Quét QR từ màn hình** để tiện ích tự động chụp màn hình tab hiện tại và giải mã QR hiển thị trên trang.
  - Hỗ trợ sao chép nội dung kết quả vào Clipboard bằng 1 click hoặc mở trực tiếp đường dẫn nếu kết quả là URL.

---

### 5. Kênh Truyền Thông & Tác Giả (Social Hub)

Giao diện kết nối trực tiếp đến các kênh chính thức của tác giả:
- 📺 **YouTube**: [`@huiitapcode`](https://www.youtube.com/@huiitapcode) - Học lập trình, thủ thuật phần mềm & công nghệ.
- 🎵 **TikTok**: [`@babysharkkk____________`](https://www.tiktok.com/@babysharkkk____________) - Video ngắn chia sẻ mẹo IT hữu ích.
- 🐙 **GitHub**: [`huii404`](https://github.com/huii404) - Dự án mã nguồn mở & công cụ miễn phí.
- 💛 **Locket App**: [`@nhuii.3`](https://locket.cam/nhuii.3) - Kết nối & chia sẻ khoảnh khắc.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
multi-tool-extension/
├── icons/                      # Biểu tượng của Extension (16, 32, 48, 128)
├── libs/                       # Thư viện bên thứ ba (html2canvas, jsPDF, tesseract)
├── styles/                     # Stylesheet dùng chung
├── src/
│   ├── core/                   # Các module lõi (constants, utils)
│   ├── popup/                  # Giao diện Popup chính (HTML, CSS, JS điều hướng)
│   └── features/               # Các module tính năng chuyên biệt
│       ├── dtu-univer/         # Tính năng DTU Hub
│       │   ├── skills/
│       │   │   ├── rating/     # Đánh giá giảng viên MyDTU
│       │   │   ├── schedule/   # Xuất lịch học MyDTU
│       │   │   └── course-register/ # Đăng ký tín chỉ tự động
│       │   ├── dtu-content.js  # Content script MyDTU
│       │   └── dtu-univer.js   # Module xử lý DTU Hub
│       ├── document-download/  # Tải tài liệu Studocu
│       ├── screenshot/         # Chụp ảnh màn hình Web
│       ├── qrcode/             # Tạo và giải mã QR Code
│       └── social/             # Kết nối kênh truyền thông tác giả
├── manifest.json               # Cấu hình Chrome Extension (Manifest V3)
└── README.md                   # Tài liệu hướng dẫn sử dụng
```

---

## ⚡ Kiến Trúc Kỹ Thuật

- **Manifest V3**: Tuân thủ tiêu chuẩn bảo mật và hiệu năng mới nhất của Google Chrome.
- **Client-Side First**: Hầu hết các tác vụ (chụp ảnh, tạo & đọc QR, xử lý dữ liệu) đều thực thi trực tiếp trên trình duyệt người dùng, đảm bảo tính bảo mật và quyền riêng tư.
- **Modular Component Architecture**: Cấu trúc module rõ ràng, tách biệt logic từng tính năng (`features/`), dễ dàng nâng cấp và mở rộng.
- **Persistent Storage**: Tích hợp `chrome.storage.local` để lưu trữ cài đặt và dữ liệu người dùng an toàn.
- **Clean & Responsive UI**: Giao diện mang hơi hướng hiện đại, mượt mà, tối ưu từng thao tác nhấp chuột.

---

## 👨‍💻 Tác Giả & Đóng Góp

- **Developer**: [huii404](https://github.com/huii404)
- **Mã nguồn**: [GitHub Repository](https://github.com/huii404/MULTI-EXTENSION)
- **Đóng góp**: Mọi ý kiến đóng góp, đề xuất tính năng mới hoặc báo cáo lỗi (Bug report) xin vui lòng tạo [Issue](https://github.com/huii404/MULTI-EXTENSION/issues) hoặc gửi [Pull Request](https://github.com/huii404/MULTI-EXTENSION/pulls) trên GitHub.

<p align="center">
  <em>Cảm ơn bạn đã sử dụng Multi Tool Hub! 💖</em>
</p>
