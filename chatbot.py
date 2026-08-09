import os
import random
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class PsychologyChatbot:
    def __init__(self):
        keys_str = os.getenv("GEMINI_API_KEYS", "")
        self.api_keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        
        if not self.api_keys:
            raise ValueError("Chưa cấu hình GEMINI_API_KEYS trong file .env!")

        self.system_prompt = """
        Bạn là "AI Chia Sẻ" - một người bạn đồng hành tin cậy và chuyên gia tâm lý học đường tại trường THCS Nguyễn Văn A.
        
        NHIỆM VỤ & TÍNH CÁCH:
        1.  **Thấu cảm:** Luôn bắt đầu bằng việc công nhận cảm xúc của học sinh (Ví dụ: "Mình hiểu bạn đang buồn...", "Nghe có vẻ mệt mỏi nhỉ...").
        2.  **Gợi mở:** Không chỉ trả lời, hãy hỏi ngược lại nhẹ nhàng để học sinh chia sẻ thêm.
        3.  **Phong cách:** Dùng ngôn ngữ Gen Z nhẹ nhàng, icon (🌿, 🌤️, ✨) hợp lý, không sáo rỗng.
        4.  **Giới hạn:** Tuyệt đối KHÔNG giải bài tập. Nếu học sinh hỏi bài, hãy khéo léo từ chối và động viên tự làm.
        5.  **An toàn:** Nếu phát hiện ý định tự hại/trầm cảm nặng, hãy đưa ra lời khuyên tìm gặp thầy cô/ba mẹ hoặc hotline 111 ngay lập tức.
        
        QUY TẮC TRẢ LỜI:
        - Ngắn gọn (dưới 4 câu).
        - Không giảng đạo lý.
        """
        
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 7500,
        }

        self.chat_session = None
        self.current_key_index = 0
        
        self.initialize_chat()

    def _get_next_key(self):
        key = self.api_keys[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        return key

    def initialize_chat(self):
        key = self._get_next_key()
        genai.configure(api_key=key)
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=self.system_prompt,
            generation_config=self.generation_config
        )
        
        self.chat_session = model.start_chat(history=[])
        print(f"--> Đã khởi tạo Bot với Key: ...{key[-5:]}")

    def get_response(self, user_message):
        for attempt in range(len(self.api_keys)):
            try:
                response = self.chat_session.send_message(user_message)
                
                text = response.text.strip()
                return text

            except Exception as e:
                print(f"[LỖI API] Key hiện tại bị lỗi: {e}")
                print("--> Đang đổi Key và thử lại...")
                self.initialize_chat()
                
        return "Hệ thống đang bảo trì một chút, bạn chờ 30s rồi quay lại tâm sự với mình nhé! 😿"

    def clear_history(self):
        self.chat_session.history.clear()
        print("--> Đã xóa lịch sử trò chuyện.")

bot_instance = PsychologyChatbot()

def get_gemini_response(message):
    return bot_instance.get_response(message)

def reset_conversation():
    bot_instance.clear_history()

# Test
if __name__ == "__main__":
    print(get_gemini_response("Chào bạn, mình thấy buồn quá"))
    print(get_gemini_response("Mình bị điểm kém môn Toán")) 