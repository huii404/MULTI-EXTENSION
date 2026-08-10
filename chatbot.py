import sys
import os
import random
import google.generativeai as genai
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(override=True)

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
            model_name="gemini-3.6-flash",
            system_instruction=self.system_prompt,
            generation_config=self.generation_config
        )
        
        self.chat_session = model.start_chat(history=[])
        try:
            print(f"--> Da khoi tao Bot voi Key: ...{key[-5:]}")
        except Exception:
            pass

    def _get_groq_response(self, prompt):
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key or api_key.startswith("gsk_your_"):
            raise ValueError("Chuyen sang dung Groq nhung chua cau hinh GROQ_API_KEY trong .env!")
            
        import urllib.request
        import json
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"].strip()

    def get_response(self, user_message, emotion_data=None):
        final_message = user_message
        voice_context = ""
        if emotion_data:
            voice = emotion_data.get("voice_analysis") or {}
            if voice.get("valid"):
                voice_context = (
                    f"\n[Dữ liệu giọng nói tham khảo: trạng thái={voice.get('status', 'stable')}, "
                    f"chất lượng={voice.get('quality', 0)}%. Không chẩn đoán stress chỉ từ "
                    "giọng nói; hãy hỏi mở để xác nhận cảm nhận của người dùng.]"
                )
        if emotion_data and emotion_data.get('emotion') != 'NEUTRAL':
            vn_emotions = {
                "STRESS": "Căng thẳng / Bực bội",
                "ANXIETY": "Lo lắng / Hồi hộp",
                "SADNESS": "Buồn bã",
                "HAPPY": "Vui vẻ"
            }
            emotion_name = vn_emotions.get(emotion_data['emotion'], emotion_data['emotion'])
            trend_translations = {
                "INCREASING": "Đang tăng",
                "DECREASING": "Đang giảm",
                "STABLE": "Ổn định",
                "FLUCTUATING": "Biến động"
            }
            trend_name = trend_translations.get(emotion_data['trend'], emotion_data['trend'])
            final_message = f"[Trạng thái cảm xúc học sinh: {emotion_name} (Mức độ: {emotion_data['intensity']}/100, Xu hướng: {trend_name})]\n{user_message}"

        # 1. Thử dùng Gemini (quay vòng các key)
        final_message = f"{final_message}{voice_context}"

        for attempt in range(len(self.api_keys)):
            try:
                response = self.chat_session.send_message(final_message)
                return response.text.strip()
            except Exception as e:
                try:
                    print(f"[API ERROR] Gemini Key failed: {e}")
                except Exception:
                    pass
                print("--> Changing key and retrying...")
                self.initialize_chat()
                
        # 2. Fallback sang Groq Llama 3.3 nếu tất cả Gemini keys đều lỗi
        try:
            print("--> [CHATBOT FALLBACK] Dang goi Groq Llama 3.3 làm fallback...")
            groq_reply = self._get_groq_response(final_message)
            print("--> [CHATBOT SUCCESS] Tra loi thanh cong qua Groq Fallback.")
            return groq_reply
        except Exception as e_groq:
            print(f"[GROQ ERROR] Groq Chatbot fallback failed: {e_groq}")
            
        return "Hệ thống đang bảo trì một chút, bạn chờ 30s rồi quay lại tâm sự với mình nhé! 😿"

    def clear_history(self):
        try:
            self.chat_session.history.clear()
        except Exception:
            pass
        print("--> Da xoa lich su tro chuyen.")

bot_instance = PsychologyChatbot()

def get_gemini_response(message, emotion_data=None):
    return bot_instance.get_response(message, emotion_data)

def reset_conversation():
    bot_instance.clear_history()

# Test
if __name__ == "__main__":
    print(get_gemini_response("Chào bạn, mình thấy buồn quá"))
    print(get_gemini_response("Mình bị điểm kém môn Toán"))
