# BẢNG QUY TẮC PHÂN LOẠI CẢM XÚC - EMOTION ANALYZER (HYBRID AI)

Tài liệu này tổng hợp toàn bộ quy tắc phân loại cảm xúc, kiến trúc hệ thống 3 tầng và ma trận trọng số điểm chi tiết của module **Emotion Analyzer**.

---

## I. KIẾN TRÚC HỆ THỐNG PHÂN TÍCH CẢM XÚC LAI 3 TẦNG (3-TIER RESILIENCE PIPELINE)

| Tầng xử lý (Tier) | Công nghệ / Model AI | Vai trò hệ thống | Cơ chế hoạt động & Xử lý ngoại lệ |
| :--- | :--- | :--- | :--- |
| **Tầng 1 (Ưu tiên)** | Google Gemini 2.5 Flash | Phân tích ngữ nghĩa sâu chính | Phân tích sâu ngữ nghĩa, cảm xúc ẩn ý, ngữ cảnh phức tạp. Có cơ chế tự động luân chuyển khóa API (**Key Rotation**) khi gặp lỗi quota. |
| **Tầng 2 (Dự phòng 1)** | Groq Llama 3.3 70B Versatile | Dự phòng AI tốc độ cao | Kích hoạt khi Gemini cạn hạn mức (Quota 429). Tích hợp `User-Agent` trình duyệt chuẩn giúp vượt tường lửa Cloudflare (Error 403) mượt mà. |
| **Tầng 3 (Dự phòng 2)** | Rule-based Engine (Python) | Bảo vệ hệ thống & Chạy Offline | Kích hoạt khi cả 2 AI đều lỗi. Phân tích từ khóa, ngập ngừng, lặp từ, phủ định. Đảm bảo ứng dụng **100% không bị crash** và vẫn chạy tốt khi ngoại tuyến. |

---

## II. BẢNG QUY TẮC PHÂN LOẠI CẢM XÚC CHỦ ĐẠO

| Cảm xúc chủ đạo | Điểm số từ khóa trực tiếp (Keywords) | Biểu hiện gián tiếp & Mẫu câu (Indirect & Sentence Patterns) | Tác động của Ngập ngừng, Lặp từ & Tiếng cười (Voice/Text Signals) | Điều kiện phân loại (Conditions) |
| :--- | :--- | :--- | :--- | :--- |
| **STRESS**<br>*(Căng thẳng / Bực bội)* | - **Tức giận (+3)**: bực, tức, cáu, điên, phát điên, ức chế...<br>- **Áp lực (+3)**: áp lực, stress, căng thẳng.<br>- **Khó chịu (+2)**: khó chịu, phiền phức, ngán ngẩm...<br>- **Mệt mỏi (+2)**: mệt mỏi, mệt quá. | - **Ý kiến gián tiếp (+2)**: *"sao cứ như vậy hoài vậy"*, *"làm gì lâu vậy"*, *"chịu không nổi"*, *"tôi mệt với chuyện này rồi"*...<br>- **Cảm thán tiêu cực**: Câu chứa cảm xúc tiêu cực có dấu `!` được cộng thêm Stress (+2). | - **Lặp từ nhấn mạnh**: Lặp từ bực tức (ví dụ: *"không! không! không!"*) làm tăng điểm Stress.<br><br>*(Lưu ý: Các từ tiếng cười như 'kkkk' được loại trừ khỏi bộ lặp từ)*. | Điểm **Stress** là cao nhất trong 4 nhóm cảm xúc và **≥ 0.5**. |
| **ANXIETY**<br>*(Lo lắng / Hồi hộp)* | - **Lo lắng (+3)**: lo, lo lắng, hồi hộp, bồn chồn, run...<br>- **Sợ hãi (+3)**: sợ, e là, sợ quá, tôi sợ, tôi lo...<br>- **Mơ hồ (+2)**: không biết, không chắc, hình như, có lẽ, có vẻ, liệu, nhỡ, lỡ... | - **Mẫu câu bất an (+2)**: Câu hỏi có dấu `?` chứa các từ *"nếu... thì sao"*, *"nhỡ"*, *"lỡ"*, *"mình phải làm sao"*... | - **Ngập ngừng (+2)**: Có dấu `...` hoặc từ đệm (*ừm, ờ, à, hmm*...).<br>- **Lặp từ hồi hộp (+2)**: Lặp từ đại từ (*"tôi... tôi"*) hoặc lặp từ khác. | Điểm **Anxiety** là cao nhất và **≥ 0.5**.<br><br>*(Lưu ý: Nếu chỉ có ngập ngừng mà không có từ khóa lo lắng nào khác thì điểm Anxiety sẽ bị loại bỏ để tránh nhầm lẫn)*. |
| **SADNESS**<br>*(Buồn bã)* | - **Buồn (+3)**: buồn, buồn quá, đau lòng, tổn thương, không vui...<br>- **Thất vọng (+3)**: thất vọng, chán, chán nản, nản lòng, thất bại, tuyệt vọng, vô vọng...<br>- **Cô đơn (+3)**: cô đơn, một mình, nhớ... | - **Biểu hiện gián tiếp (+2)**: *"dạo này tôi chẳng muốn làm gì cả"*, *"mọi thứ hình như chẳng còn ý nghĩa"*, *"hôm nay thật sự là một ngày tệ"*...<br>- **Phủ định tích cực (+2)**: Cấu trúc dạng `không + từ vui vẻ` (ví dụ: *"không vui"*, *"không thích"*). | - Góp phần tăng nhẹ cảm giác buồn bã gián tiếp khi kết hợp với ngập ngừng chậm rãi. | Điểm **Sadness** là cao nhất trong 4 nhóm và **≥ 0.5**. |
| **HAPPY**<br>*(Vui vẻ)* | - **Hạnh phúc (+3)**: vui, vui vẻ, hạnh phúc, tuyệt vời, thích, thích quá, may quá, tốt quá...<br>- **Hào hứng (+3)**: hào hứng, phấn khích, thành công, chiến thắng... | - **Biểu hiện gián tiếp (+2)**: *"cuối cùng cũng làm xong rồi"*, *"tôi qua môn rồi"*, *"hôm nay thật tuyệt"*...<br>- **Cảm thán tích cực (+2)**: Câu chứa cảm xúc vui vẻ có dấu `!`. | - **Tiếng cười chat lóng (+2)**: Các từ *haha, hehe, hihi, hahaha, kkkk, kaka, kkk, kk*.<br><br>AI & Rule-based nhận diện chuẩn xác *"kkkk"* là **HAPPY** thay vì lặp từ. | Điểm **Happy** là cao nhất trong 4 nhóm và **≥ 0.5**. |
| **NEUTRAL**<br>*(Bình thường)* | - Không có từ khóa cảm xúc nào hoặc điểm số của các từ khóa bị triệt tiêu bởi phủ định (ví dụ: *"tôi không lo"*, *"tôi không buồn"*). | - Các câu giao tiếp xã giao thông thường (ví dụ: *"xin chào"*, *"bạn khỏe không"*, *"cảm ơn bạn"*). | - Các từ ngập ngừng đệm thuần túy không mang tính lo âu (ví dụ: *"ừm... để tôi xem"*). | Tất cả điểm số cảm xúc đều **< 0.5**. |

---

## III. BẢNG HỆ SỐ TRỌNG SỐ ĐIỂM CHI TIẾT (SCORING MATRIX)

| Đặc trưng / Tín hiệu phát hiện | STRESS | ANXIETY | SADNESS | HAPPY | Mô tả chi tiết từ khóa / Ví dụ thực tế |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Từ khóa Tức giận** | **+3** | 0 | 0 | 0 | bực, tức, cáu, điên, phát điên, ức chế... |
| **Từ khóa Khó chịu** | **+2** | 0 | **+1** | 0 | khó chịu, phiền, phiền phức, ngán, ngán ngẩm... |
| **Từ khóa Áp lực** | **+3** | **+2** | 0 | 0 | áp lực, stress, căng thẳng... |
| **Từ khóa Lo lắng** | 0 | **+3** | 0 | 0 | lo, lo lắng, hồi hộp, bất an, bồn chồn, run... |
| **Từ khóa Sợ hãi** | 0 | **+3** | **+1** | 0 | sợ, e là, sợ quá, sợ rằng... |
| **Ngập ngừng (Do từ đệm hoặc dấu ...)** | 0 | **+2** | 0 | 0 | Có dấu `...` hoặc từ đệm ngập ngừng: *ừm, ờ, à, hmm, um*... |
| **Lặp từ do hồi hộp** | 0 | **+2** | 0 | 0 | Lặp từ đứng cạnh nhau (ví dụ: *"sợ... sợ"*, *"không... không"*) |
| **Lặp đại từ đặc biệt "tôi... tôi"** | 0 | **+3** | 0 | 0 | Lặp đại từ nhân xưng *"tôi... tôi"* (cấp độ ngập ngừng cao) |
| **Từ khóa Không chắc chắn** | 0 | **+2** | 0 | 0 | hình như, có lẽ, có vẻ, liệu, nhỡ, lỡ, hay là, có khi... |
| **Từ khóa Thất vọng** | 0 | **+1** | **+3** | 0 | thất vọng, chán, chán nản, nản lòng, thất bại, tuyệt vọng, vô vọng... |
| **Từ khóa Cô đơn** | 0 | **+1** | **+3** | 0 | cô đơn, một mình, nhớ, nhớ ai đó... |
| **Từ khóa Buồn bã** | 0 | 0 | **+3** | 0 | buồn, buồn quá, đau lòng, tổn thương, không vui... |
| **Từ khóa Hạnh phúc / Vui vẻ** | 0 | 0 | 0 | **+3** | vui, vui vẻ, hạnh phúc, tuyệt vời, thích, thích quá... |
| **Từ khóa Hào hứng** | 0 | 0 | 0 | **+3** | hào hứng, phấn khích, thành công, chiến thắng... |
| **Tiếng cười & Từ lóng ("kkkk", "haha")** | 0 | 0 | 0 | **+2** | *haha, hahaha, hehe, hihi, kkkk, kaka, kkk, kk*... |
| **Không + Từ tích cực (Phủ định)** | 0 | 0 | **+2** | **-2** | Khi phát hiện phủ định từ vui vẻ (ví dụ: *"không vui"*, *"chẳng thích"*) |
| **Không + Từ tiêu cực (Phủ định)** | **-2** | **-2** | **-2** | 0 | Giảm điểm của cảm xúc tiêu cực tương ứng (ví dụ: *"không lo"*, *"không sợ"*) |
| **Câu hỏi bất an** | 0 | **+2** | 0 | 0 | Câu hỏi (`?`) chứa từ nghi vấn lo lắng: *"liệu"*, *"nếu... thì sao"*, *"phải làm sao"* |
| **Câu cảm thán tích cực** | 0 | 0 | 0 | **+2** | Câu cảm thán (`!`) khi câu nói có chứa từ khóa vui vẻ (HAPPY) |
| **Câu cảm thán tiêu cực** | **+2** | **+1** | **+1** | 0 | Câu cảm thán (`!`) khi câu nói chứa các từ khóa tiêu cực (Stress/Anxiety/Sadness) |
