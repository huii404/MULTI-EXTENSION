# Multi Tool Hub - Browser Extension (v2.0.0)

Multi Tool Hub là tiện ích mở rộng trên trình duyệt (Browser Extension - Chrome Manifest V3) tích hợp bộ công cụ chuyên sâu giúp tối ưu hóa nhiều tác vụ thường ngày trên nền tảng Web, từ quản lý học tập tại Đại học Duy Tân (DTU) đến trích xuất tài liệu, xử lý văn bản, cào dữ liệu ngầm và tiện ích hình ảnh.

---

## Bảng Mục Lục
1. [Hướng Dẫn Cài Đặt](#hướng-dẫn-cài-đặt)
2. [Hướng Dẫn Sử Dụng Chi Tiết Từng Tính Năng](#hướng-dẫn-sử-dụng-chi-tiết-từng-tính-năng)
   - [1. DTU Hub (Hỗ trợ sinh viên DTU)](#1-dtu-hub-hỗ-trợ-sinh-viên-dtu)
   - [2. Document Download (Studocu & Scribd Downloader)](#2-document-download-studocu--scribd-downloader)
   - [3. Text Tools (Bộ công cụ văn bản & Cào dữ liệu ngầm)](#3-text-tools-bộ-công-cụ-văn-bản--cào-dữ-liệu-ngầm)
   - [4. QR Code Suite (Tạo & Quét mã QR)](#4-qr-code-suite-tạo--quét-mã-qr)
   - [5. Web Screenshot (Chụp ảnh màn hình Web)](#5-web-screenshot-chụp-ảnh-màn-hình-web)
   - [6. Social & Author Hub](#6-social--author-hub)
3. [Kiến Trúc Kỹ Thuật & Đánh Giá Tổng Quan](#kiến-trúc-kỹ-thuật--đánh-giá-tổng-quan)

---

## Hướng Dẫn Cài Đặt

1. **Tải về / Clone dự án**:
   ```bash
   git clone https://github.com/huii404/DTU-EXTENSION.git
   ```

2. **Cài đặt vào trình duyệt (Chrome / Edge / Brave)**:
   - Truy cập địa chỉ `chrome://extensions/` trên thanh địa chỉ trình duyệt.
   - Bật chế độ **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
   - Nhấp vào nút **Load unpacked (Tải tiện ích đã giải nén)**.
   - Chọn thư mục `multi-tool-extension` (thư mục chứa file `manifest.json`).

3. **Ghim tiện ích**: Nhấp vào biểu tượng tiện ích mở rộng trên thanh công cụ trình duyệt và ghim **Multi Tool Hub** để truy cập nhanh.

---

## Hướng Dẫn Sử Dụng Chi Tiết Từng Tính Năng

### 1. DTU Hub (Hỗ trợ sinh viên DTU)

Bộ công cụ tối ưu thao tác cho sinh viên Đại học Duy Tân trên cổng thông tin MyDTU:
* **Tự Động Đánh Giá Giảng Viên**:
  - **Cách sử dụng**: Mở trang Đánh giá giảng viên trên MyDTU (`mydtu.duytan.edu.vn`) -> Mở giao diện tiện ích -> Chọn mức xếp loại mong muốn (Xuất sắc, Tốt, Khá...) -> Nhấn **Tự động điền**. Tiện ích sẽ tự động hoàn tất toàn bộ 53 câu hỏi đánh giá chỉ trong 1 giây.
* **Đăng Ký Tín Chỉ Nhanh**:
  - Hỗ trợ giám sát mã môn học và tự động gửi yêu cầu đăng ký trực tiếp qua Network API, giúp tăng tốc độ ghi nhận môn học trong các thời điểm nghẽn mạng.

---

### 2. Document Download (Studocu & Scribd Downloader)

Bộ công cụ trích xuất và tải tài liệu học tập trực tuyến:
* **Scribd Downloader**:
  - **Cách sử dụng**: Truy cập trang tài liệu Scribd cần tải -> Mở tiện ích chọn **Tải tài liệu Scribd**.
  - **Tính năng**: Tự động gỡ bỏ lớp phủ mờ (blur paywall), loại bỏ quảng cáo banner, tự động cuộn nạp 100% nội dung trang ngầm, xuất file **PDF sạch (định dạng A4)** hoặc file **văn bản nguyên bản (.txt)**.
* **Studocu Downloader**:
  - **Cách sử dụng**: Mở trang tài liệu Studocu -> Nhấn nút tải về trong tiện ích.
  - **Tính năng**: Tải file PDF nguyên bản **không chứa Watermark của Studocu**, hỗ trợ xem trước và trích xuất từng trang ảnh chất lượng cao.

---

### 3. Text Tools (Bộ công cụ văn bản & Cào dữ liệu ngầm)

Truy cập danh mục **Text Tools** để sử dụng 4 công cụ xử lý văn bản chuyên sâu:

#### 3.1. Làm Sạch Văn Bản (Text Cleaner)
* **Cách sử dụng**: Dán văn bản từ Clipboard (`Ctrl + V`) hoặc kéo thả file văn bản -> Chọn cấp độ lọc (**Cơ bản**, **Tiêu chuẩn**, **Nâng cao**) -> Nhấn **Làm sạch lại**.
* **Công dụng**: Loại bỏ thẻ HTML rác, ký tự Unicode ẩn, ký tự điều khiển, dọn rác dính dấu khi quét OCR.

#### 3.2. So Sánh Văn Bản (Text Comparator)
* **Cách sử dụng**: Dán hai đoạn văn bản cần đối chiếu vào hai ô tương ứng -> Nhấn **So sánh ngay**.
* **Công dụng**: Đối chiếu sự khác biệt, tô màu phân biệt chính xác các từ ngữ được thêm, bớt hoặc chỉnh sửa giữa hai phiên bản.

#### 3.3. Quét Chữ Từ Ảnh (OCR)
* **Cách sử dụng**: Chọn file hình ảnh hoặc dán ảnh trực tiếp từ Clipboard (`Ctrl + V`) -> Nhấn **Quét chữ**.
* **Công dụng**: Nhận diện và trích xuất toàn bộ văn bản từ hình ảnh hoàn toàn Offline trên trình duyệt.

#### 3.4. Cào Text & Bằng Chứng Ngầm (Deep Scraper & Evidence Vault)
Công cụ cào ngầm tự động và xây dựng kho lưu trữ bằng chứng nghiên cứu:
* **Các chế độ cào**:
  - **Cào Đa Nền Tảng**: Tự động gửi từ khóa tìm kiếm ngầm đến 4 công cụ công cộng (**Google News, DuckDuckGo, Bing Search, Wikipedia**) -> Tự động đi sâu vào từng trang web bài báo mục tiêu để trích xuất các đoạn văn ngữ cảnh chứa từ khóa.
  - **Cào các Tab đang mở**: Quét và cào ngầm toàn bộ các tab trình duyệt đang mở trong cửa sổ hiện tại.
  - **Danh sách URLs nhập vào**: Dán danh sách URL tùy chỉnh để tiện ích tự động kết nối ngầm và trích xuất dữ liệu.
* **Bộ nhớ ngầm lũy tiến (Evidence Vault)**:
  - Tự động lưu ngầm từng bản ghi vào `chrome.storage.local` ngay trong quá trình cào. Dữ liệu được bảo toàn 100% ngay cả khi đóng tiện ích hoặc tắt trình duyệt.
* **Định dạng Xuất File**:
  - **Xuất TXT**: File văn bản phân đoạn rõ ràng.
  - **Xuất Excel (.xlsx)**: Tự động xuống dòng (**Auto Text Wrap**), định dạng độ rộng cột thông minh và mã hóa UTF-8 BOM chống lỗi font tiếng Việt khi mở trên MS Excel hoặc Google Sheets.
  - **Xuất Word (.doc)**: Xuất hồ sơ báo cáo định dạng khung Callout box, có tô màu Highlight từ khóa.

---

### 4. QR Code Suite (Tạo & Quét mã QR)

* **Tạo Mã QR**:
  - Nhập văn bản/URL bất kỳ hoặc nhấn nút **Dùng URL tab hiện tại** để tự động điền URL trang web đang xem -> Nhấn **Tạo QR** -> Tải file ảnh PNG.
* **Quét & Giải Mã QR**:
  - Tải lên file ảnh QR, dán ảnh từ Clipboard (`Ctrl + V`), hoặc nhấn nút **Quét QR từ trang web đang xem** để tiện ích tự động chụp và đọc mã QR hiển thị trên màn hình.
  - Hỗ trợ sao chép nội dung 1-click và mở liên kết trực tiếp nếu nội dung là URL.

---

### 5. Web Screenshot (Chụp ảnh màn hình Web)

* **Cách sử dụng**: Mở trang web cần chụp -> Truy cập tiện ích và chọn **Chụp ảnh Web**.
* **Công dụng**: Chụp toàn bộ nội dung hiển thị của trang web sạch sẽ, tự động cắt bỏ viền khung trình duyệt, cho phép sao chép ảnh vào Clipboard hoặc tải về định dạng PNG.

---

### 6. Social & Author Hub

Kết nối trực tiếp đến các kênh truyền thông chính thức của tác giả:
- **YouTube**: `@huiitapcode` (Video hướng dẫn lập trình & kỹ năng CNTT)
- **TikTok**: `@babysharkkk____________` (Video ngắn nội dung công nghệ)
- **GitHub**: `huii404` (Mã nguồn dự án Open-Source)
- **Locket App**: `@nhuii.3` (Kết nối & chia sẻ hình ảnh)

---

## Kiến Trúc Kỹ Thuật & Đánh Giá Tổng Quan

* **Xử lý phía Client (Client-Side Processing)**: Phần lớn tính năng (OCR, mã hóa, quét QR, làm sạch văn bản, chụp ảnh màn hình) được thực thi hoàn toàn trên trình duyệt người dùng, đảm bảo tốc độ và bảo mật dữ liệu.
* **Tự Động Hóa & Chạy Ngầm (Background Engine)**: Sử dụng Service Worker (`background.js`) và `DOMParser` để trích xuất dữ liệu sâu ngầm mà không mở tab rác hay ảnh hưởng đến trải nghiệm duyệt web.
* **Lưu Trữ Lũy Tiến (Persistent Storage)**: Sử dụng `chrome.storage.local` bảo đảm dữ liệu không bị thất thoát khi ngắt kết nối mạng hoặc tắt trình duyệt.
* **Giao Diện Minimalist**: Thiết kế chuẩn mực, bố cục rõ ràng, tối ưu trải nghiệm người dùng và hiệu năng hoạt động.

---

### Tác giả & Đóng góp
- **Developer**: [huii404](https://github.com/huii404)
- **Dự án Open-Source**: Đón nhận mọi đóng góp (Pull Requests) & báo lỗi (Issues) từ cộng đồng.
