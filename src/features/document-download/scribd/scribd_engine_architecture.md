# Kiến Trúc: Scribd Real-Time Accumulative Page Capture Engine
*(Động cơ Gom & Lưu trữ trang Scribd thời gian thực)*

## 1. Vấn Đề Kỹ Thuật Của Scribd
Scribd sử dụng một thư viện ảo hóa luồng cuộn (React Virtualized Viewport hoặc tương tự). Khi người dùng đọc một cuốn sách dài:
- Chỉ có khoảng 2-3 trang nằm trong tầm nhìn (Viewport) và 1-2 trang phụ cận được nạp HTML vào bộ nhớ (DOM Mount).
- Các trang ở xa phía trên (đã cuộn qua) hoặc ở tít phía dưới sẽ bị hệ thống **xóa sạch thẻ HTML (Unmount) để tiết kiệm RAM**.
- Khi cuộn rất nhanh, các trang chưa kịp gọi API lấy dữ liệu chữ/ảnh sẽ bị bỏ qua hoặc nằm ở trạng thái "Trắng" (Skeleton/Placeholder).

=> Vì vậy, cách tải truyền thống: "Chờ cuộn xong 100% rồi mới bắt đầu lệnh in/quét toàn bộ thẻ DOM" sẽ thất bại thảm hại, bởi lúc đó DOM chỉ còn lại vài trang ở cuối, toàn bộ các trang trên đã bốc hơi khỏi DOM.

## 2. Giải Pháp: Real-Time Accumulative Capture (Gom Tích Lũy)

Để hóa giải cơ chế Virtual Viewport, chúng ta áp dụng mô hình "Vừa Cuộn Vừa Bắt":

### Bước 1: Smart Scrolling (Cuộn mượt dò đáy)
- Sử dụng `setInterval` để liên tục cuộn xuống một khoảng cách nhỏ (VD: `500px`).
- Tốc độ cuộn không được quá nhanh, phải để một độ trễ đủ lâu (VD: `700ms`) ở mỗi bước để trình duyệt kịp phát lệnh gọi mạng (Network Request) tải nội dung của trang mới và React kịp Render gắn chữ vào DOM.
- Hệ thống có khả năng nhận biết khi thanh cuộn "chạm đáy" (thông qua so sánh `scrollTop` không thay đổi qua nhiều nhịp cuộn liên tiếp) để tự động kết thúc.

### Bước 2: Immediate Cloning (Chụp ngay lập tức)
- Ở mỗi nhịp cuộn, hệ thống quét ngay toàn bộ các thẻ đại diện cho trang đang nằm trong DOM (`.outer_page, .doc_page`).
- Khi phát hiện thẻ trang chứa nội dung (`textLen > 5` hoặc có thẻ `<img/>`, `[style*="background"]`), hệ thống dùng `node.cloneNode(true)` để nhân bản (chụp ảnh) cấu trúc HTML đó vào một từ điển độc lập ngoài DOM là `pagesMap`.
- Một khi đã được `cloneNode()` vào `pagesMap`, cho dù vài giây sau Scribd có xóa thẻ thật ngoài DOM thì bản chụp của ta vẫn an toàn vĩnh viễn.

### Bước 3: Overwrite & Update (Tự nâng cấp bản chụp)
- Trong quá trình cuộn, một trang có thể mất nhiều nhịp để tải xong toàn bộ chữ (Pha 1) và tải xong hình ảnh (Pha 2).
- Nếu trang `[Page X]` đã có trong `pagesMap`, hệ thống sẽ so sánh liên tục độ dài văn bản (`textLen`) và số lượng hình ảnh (`imgCount`).
- Nếu bản chụp đang xuất hiện trên màn hình hiện tại phong phú hơn (nhiều chữ hơn, hoặc nhiều ảnh hơn) bản đã lưu -> Hệ thống sẽ **Ghi Đè (Overwrite)** bản cũ bằng bản mới hoàn hảo hơn.

### Bước 4: Image Recovery (Cấp cứu hình ảnh)
- Scribd hay dùng chiêu trò đặt ảnh vào `background-image: url("...")` của một `div` thay vì dùng thẻ `<img>` tiêu chuẩn.
- Khi xuất DOM rời, `background-image` hay bị lỗi hiển thị.
- Giải pháp: Quét tất cả thẻ nghi ngờ, biểu thức chính quy (Regex) trích xuất URL ảnh, tự động cấy thẻ `<img src="...">` vào lòng nó và xóa `background-image` đi. Giúp bảo toàn 100% ảnh.

### Bước 5: Lossless Print Renderer (Kết xuất cửa sổ sạch)
- Thay vì bắt trình duyệt In thẳng, ta mở một `window.open` mới (Cửa sổ Clean Window).
- Trích xuất toàn bộ thẻ `<style>` của Scribd chèn vào cửa sổ mới này để giữ nguyên Typography, canh lề, bôi đậm.
- Gom `pagesMap` lại thành chuỗi theo thứ tự trang (1 -> N), loại bỏ các quảng cáo (`.paywall`, `#onetrust-banner`) và CSS làm mờ (`.blur`).
- Kích hoạt `@media print` của CSS, thiết lập `page-break-after: always` ép mỗi trang Web biến thành đúng 1 trang PDF A4 không bị cắt chữ.
