# -*- coding: utf-8 -*-
import csv
import os

data = [
    [
        "Cảm xúc chủ đạo", 
        "Điểm số từ khóa trực tiếp (Keywords)", 
        "Biểu hiện gián tiếp & Mẫu câu (Indirect & Sentence Patterns)", 
        "Tác động của Ngập ngừng & Lặp từ (Voice/Text Signals)", 
        "Điều kiện phân loại"
    ],
    [
        "STRESS (Căng thẳng / Bực bội)", 
        "Tức giận (+3): bực, tức, cáu, điên, phát điên, ức chế...\nÁp lực (+3): áp lực, stress, căng thẳng.\nKhó chịu (+2): khó chịu, phiền phức, ngán ngẩm...", 
        "Ý kiến gián tiếp (+2): 'sao cứ như vậy hoài vậy', 'làm gì lâu vậy', 'chịu không nổi'...\nCảm thán tiêu cực: Câu chứa cảm xúc tiêu cực có dấu '!' được cộng thêm Stress (+2).", 
        "Lặp từ nhấn mạnh: Lặp từ bực tức (ví dụ: 'không! không!') làm tăng điểm Stress.", 
        "Điểm Stress là cao nhất trong 4 nhóm và >= 0.5."
    ],
    [
        "ANXIETY (Lo lắng / Hồi hộp)", 
        "Lo lắng (+3): lo, lo lắng, hồi hộp, bồn chồn, run...\nSợ hãi (+3): sợ, e là, sợ quá...\nMơ hồ (+2): không biết, không chắc, có lẽ, hình như, có vẻ, liệu...", 
        "Mẫu câu bất an (+2): Câu hỏi có dấu '?' chứa các từ 'nếu... thì sao', 'nhỡ', 'lỡ', 'phải làm sao'...", 
        "Ngập ngừng (+2): Có dấu '...' hoặc từ đệm (ừm, ờ, à...).\nLặp từ hồi hộp (+2): Lặp từ đại từ ('tôi... tôi') hoặc lặp từ khác.", 
        "Điểm Anxiety là cao nhất và >= 0.5. (Lưu ý: Nếu chỉ có ngập ngừng mà không có từ khóa lo lắng nào khác thì điểm Anxiety sẽ bằng 0 để tránh nhầm lẫn)."
    ],
    [
        "SADNESS (Buồn bã)", 
        "Buồn (+3): buồn, đau lòng, tổn thương, thất bại...\nThất vọng (+3): thất vọng, chán nản, tuyệt vọng, vô vọng...\nCô đơn (+3): cô đơn, một mình, nhớ...", 
        "Biểu hiện gián tiếp (+2): 'chẳng muốn làm gì', 'chẳng còn ý nghĩa', 'ngày tệ'...\nPhủ định tích cực (+2): Cấu trúc dạng không + từ vui vẻ (ví dụ: 'không vui').", 
        "Góp phần tăng nhẹ cảm giác buồn bã gián tiếp khi kết hợp với ngập ngừng chậm rãi.", 
        "Điểm Sadness là cao nhất trong 4 nhóm và >= 0.5."
    ],
    [
        "HAPPY (Vui vẻ)", 
        "Hạnh phúc (+3): vui, vui vẻ, hạnh phúc, tuyệt vời, thích...\nHào hứng (+3): hào hứng, phấn khích, chiến thắng, đỉnh...", 
        "Biểu hiện gián tiếp (+2): 'cuối cùng cũng xong', 'qua môn rồi', 'thật tuyệt'...\nCảm thán tích cực (+2): Câu chứa cảm xúc vui vẻ có dấu '!'.", 
        "Tiếng cười (+2): các từ haha, hehe, hihi, hahaha...", 
        "Điểm Happy là cao nhất trong 4 nhóm và >= 0.5."
    ],
    [
        "NEUTRAL (Bình thường)", 
        "Không có từ khóa cảm xúc nào hoặc điểm số của các từ khóa bị triệt tiêu bởi phủ định (ví dụ: 'tôi không lo').", 
        "Các câu giao tiếp xã giao thông thường (ví dụ: 'xin chào', 'bạn khỏe không').", 
        "Các từ ngập ngừng đệm thuần túy không mang tính lo âu (ví dụ: 'ừm... để tôi xem').", 
        "Tất cả điểm số cảm xúc đều < 0.5."
    ]
]

file_path = "Bang_Quy_tac_Phan_loai_Cam_xuc.csv"

# Ghi ra file CSV mã hóa utf-8-sig (chứa BOM để Excel hiển thị đúng font tiếng Việt)
with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(data)

print(f"Exported successfully to {os.path.abspath(file_path)}")
