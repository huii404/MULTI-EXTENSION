# QUY TRÌNH LÀM VIỆC NHÓM VỚI GIT & GITHUB

Chào các bạn, đây là tài liệu hướng dẫn quy trình làm việc chung của nhóm chúng ta. 
Mục tiêu của quy trình này là đảm bảo code của mọi người không bị đè lên nhau, dễ dàng theo dõi tiến độ và luôn giữ cho hệ thống chính (nhánh `main`) chạy ổn định nhất.

---

## 1. NGUYÊN TẮC CỐT LÕI
* **TUYỆT ĐỐI KHÔNG** làm việc và push code trực tiếp lên nhánh `main`. Nhánh `main` chỉ chứa code đã hoàn chỉnh và chạy không có lỗi.
* Mỗi tính năng mới hoặc một lỗi cần sửa (bug fix) phải được làm trên một **nhánh riêng biệt (Branch)**.
* Khi làm xong, phải tạo **Pull Request (PR)** trên GitHub để Leader review trước khi gộp vào `main`.

---

## 2. QUY TRÌNH LÀM VIỆC HÀNG NGÀY

Đây là các bước bạn cần thực hiện mỗi khi được giao một tính năng mới (ví dụ: làm tính năng Đăng nhập).

### Bước 1: Luôn cập nhật code mới nhất từ nhánh chính
Trước khi bắt đầu bất cứ việc gì, hãy đảm bảo bạn đang ở nhánh `main` và có code mới nhất.
```bash
git checkout main
git pull origin main
```

### Bước 2: Tạo nhánh làm việc của riêng bạn
Tên nhánh nên thể hiện rõ bạn đang làm gì. Cú pháp: `feature/ten-tinh-nang` hoặc `fix/ten-loi`.
```bash
# Lệnh này vừa tạo nhánh mới vừa chuyển bạn sang nhánh đó luôn
git checkout -b feature/dang-nhap
```

### Bước 3: Viết code và Lưu lại (Commit)
Bạn cứ mở file, code và làm việc bình thường trên máy của mình. 
Khi làm xong một phần việc nhỏ (có ý nghĩa), hãy lưu lại:
```bash
git add .
git commit -m "Hoàn thành giao diện trang đăng nhập"
```
*(Hãy viết dòng ghi chú `commit -m` thật rõ ràng, tiếng Việt có dấu càng tốt để sau này dễ đọc lại).*

### Bước 4: Đẩy code của bạn lên GitHub
Cuối ngày, hoặc khi hoàn thành xong toàn bộ chức năng, bạn đẩy nhánh này lên kho lưu trữ trên GitHub.
```bash
# Chỉ cần gõ lệnh này trong LẦN ĐẦU TIÊN push nhánh này lên
git push -u origin feature/dang-nhap

# Ở các lần push tiếp theo (nếu bạn tiếp tục sửa code trên nhánh này), chỉ cần gõ:
git push
```

---

## 3. CÁCH NỘP BÀI (TẠO PULL REQUEST)

Khi bạn đã hoàn thành tính năng và test kỹ trên máy mình:
1. Lên trang GitHub của dự án.
2. Bạn sẽ thấy một thông báo màu vàng gợi ý **"Compare & pull request"** ở nhánh bạn vừa push lên. Hãy bấm vào đó.
3. (Hoặc chuyển sang tab **Pull requests** -> Bấm **New pull request** -> Chọn nhánh của bạn).
4. Viết mô tả ngắn gọn bạn đã làm gì ở tính năng này.
5. Chọn **Create pull request**.
6. Leader sẽ vào đọc code của bạn, nếu ok sẽ bấm **Merge** (Gộp) vào nhánh `main`. Nếu chưa ok, Leader sẽ comment yêu cầu bạn sửa thêm. Bạn chỉ cần sửa trên máy tính, commit và push lại, Pull Request sẽ tự động được cập nhật.

---

## 4. XỬ LÝ XUNG ĐỘT (CONFLICT)
Xung đột xảy ra khi bạn và một người khác cùng sửa chung một dòng code ở cùng một file. Git sẽ không biết nên giữ lại dòng nào.
Đừng hoảng! Nếu có conflict:
1. Git hoặc VS Code sẽ bôi đậm đoạn bị xung đột (có các dấu `<<<<<<<`, `=======`, `>>>>>>>`).
2. Bạn chỉ cần đọc, xóa đi dòng code bị sai, giữ lại dòng code đúng (hoặc giữ cả hai nếu cần).
3. Sau khi xóa hết các dấu `<<<<<<<` kia đi, hãy lưu file lại.
4. Chạy lệnh:
   ```bash
   git add .
   git commit -m "Fix conflict"
   git push
   ```

Nếu thấy khó quá, hãy hú Leader hỗ trợ xử lý conflict ngay, không tự ý xóa code lạ của người khác nhé!

---
Chúc các bạn code vui và ít bug! 🚀
