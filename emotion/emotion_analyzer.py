# -*- coding: utf-8 -*-
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

from .feature_extractor import extract_features
from .emotion_scorer import score_emotion
from .confidence_calculator import calculate_confidence
from .trend_analyzer import analyze_trend

load_dotenv(override=True)

class EmotionResult:
    def __init__(self, emotion, intensity, confidence, trend, scores, signals, text):
        self.emotion = emotion
        self.intensity = intensity
        self.confidence = confidence
        self.trend = trend
        self.scores = scores
        self.signals = signals
        self.text = text

    def to_dict(self):
        return {
            "emotion": self.emotion,
            "intensity": self.intensity,
            "confidence": self.confidence,
            "trend": self.trend,
            "scores": self.scores,
            "signals": self.signals,
            "text": self.text
        }

class EmotionAnalyzer:
    def __init__(self):
        # Nạp danh sách các Gemini API Keys từ .env
        keys_str = os.getenv("GEMINI_API_KEYS", "")
        self.api_keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        self.current_key_index = 0

    def _analyze_with_ai(self, text):
        """
        [Tier 1] Gọi API Gemini phân tích ngữ nghĩa sâu của câu nói.
        """
        if not self.api_keys:
            raise ValueError("Chưa cấu hình GEMINI_API_KEYS trong file .env!")

        system_instruction = self._get_system_instruction()

        # Xoay vòng các key API nếu một key bị hết hạn hoặc lỗi kết nối
        for attempt in range(len(self.api_keys)):
            try:
                key = self.api_keys[self.current_key_index]
                genai.configure(api_key=key)
                
                model = genai.GenerativeModel(
                    model_name="gemini-2.5-flash",
                    system_instruction=system_instruction,
                    generation_config={
                        "temperature": 0.1,
                        "response_mime_type": "application/json"
                    }
                )
                
                response = model.generate_content(f"Hãy phân tích câu sau: \"{text}\"")
                res_text = response.text.strip()
                return json.loads(res_text)
                
            except Exception as e:
                print(f"[GEMINI AI ERROR] Key index {self.current_key_index} failed: {e}")
                self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
                
        raise RuntimeError("Tất cả các Gemini API Keys đều không khả dụng.")

    def _analyze_with_groq(self, text):
        """
        [Tier 2] Gọi API Groq sử dụng model Llama 3.3 70B Versatile làm fallback cấp 1.
        """
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key or api_key.startswith("gsk_your_"):
            raise ValueError("Chưa cấu hình GROQ_API_KEY hợp lệ trong file .env!")
            
        import urllib.request
        import urllib.error
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        system_instruction = self._get_system_instruction()
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"Hãy phân tích câu sau: \"{text}\""}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                res_text = res_data["choices"][0]["message"]["content"].strip()
                return json.loads(res_text)
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8")
            raise RuntimeError(f"Groq API HTTP Error {he.code}: {err_body}")
        except Exception as e:
            raise RuntimeError(f"Groq API connection failed: {e}")

    def _get_system_instruction(self):
        return """
        Bạn là một chuyên gia tâm lý học đường và chuyên gia ngôn ngữ học tiếng Việt.
        Nhiệm vụ của bạn là phân tích sâu ngữ nghĩa câu nói (tin nhắn hoặc transcript giọng nói) và phân loại vào một cảm xúc duy nhất:
        - STRESS (Căng thẳng, áp lực, bực dọc, cáu gắt)
        - ANXIETY (Lo lắng, hồi hộp, lo sợ, run rẩy, không chắc chắn)
        - SADNESS (Buồn bã, chán nản, cô đơn, tuyệt vọng, tổn thương)
        - HAPPY (Vui vẻ, hạnh phúc, hào hứng, phấn khích, cười đùa như 'haha', 'hehe', 'kkkk')
        - NEUTRAL (Bình thường, xã giao, hoặc không có dấu hiệu cảm xúc nào nổi bật)

        Hãy phân tích kỹ các hiện tượng:
        1. Phủ định: 'không buồn' -> không được tính Sadness; 'không vui' -> Sadness tăng, Happy giảm.
        2. Sự ngập ngừng: '...', từ đệm 'ừm', 'ờ', 'à', 'hmm'.
        3. Lặp từ: lặp từ do hồi hộp ('tôi... tôi') hoặc lặp từ bực tức.
        4. Tiếng cười viết tắt: 'kkkk', 'kaka', 'haha' là dấu hiệu của tiếng cười (HAPPY).
        5. Phó từ mức độ: 'hơi', 'rất', 'cực kỳ', 'chịu không nổi'.

        Hãy trả về một chuỗi JSON duy nhất, KHÔNG chứa thẻ markdown (như ```json) hay văn bản giải thích nào khác. Cấu trúc JSON phải tuân thủ chính xác mẫu sau:
        {
          "emotion": "STRESS" | "ANXIETY" | "SADNESS" | "HAPPY" | "NEUTRAL",
          "intensity": 0 đến 100 (số nguyên biểu thị cường độ),
          "confidence": 0.0 đến 1.0 (độ tin cậy phân loại),
          "scores": {
            "stress": 0 đến 10 (số thực),
            "anxiety": 0 đến 10 (số thực),
            "sadness": 0 đến 10 (số thực),
            "happy": 0 đến 10 (số thực)
          },
          "signals": ["laughter", "hesitation", "word_repetition", "negation", "intensity_low", "intensity_high", "question", "exclamation", "indirect_stress", "indirect_anxiety", "indirect_sadness", "indirect_happy"] (chỉ thêm những tín hiệu thực sự xuất hiện trong câu nói)
        }
        """

    def _build_result(self, ai_data, text, history):
        # Tính toán xu hướng (trend) dựa trên lịch sử
        current_record = {
            "emotion": ai_data["emotion"],
            "scores": ai_data["scores"],
            "intensity": ai_data["intensity"]
        }
        history_with_current = history + [current_record]
        trend = analyze_trend(history_with_current, ai_data["emotion"])
        
        return EmotionResult(
            emotion=ai_data["emotion"],
            intensity=ai_data["intensity"],
            confidence=ai_data["confidence"],
            trend=trend,
            scores=ai_data["scores"],
            signals=ai_data["signals"],
            text=text
        )

    def _analyze_with_rules(self, text, history):
        features = extract_features(text)
        scores = score_emotion(features)
        
        dominant_emotion = "NEUTRAL"
        max_score = 0.0
        
        label_map = {
            "stress": "STRESS",
            "anxiety": "ANXIETY",
            "sadness": "SADNESS",
            "happy": "HAPPY"
        }
        
        for k, val in scores.items():
            if val > max_score:
                max_score = val
                dominant_emotion = label_map[k]
                
        if max_score < 0.5:
            dominant_emotion = "NEUTRAL"
            
        confidence = calculate_confidence(scores, dominant_emotion)
        
        intensity = 0
        if dominant_emotion != "NEUTRAL":
            dom_key = dominant_emotion.lower()
            base_score = scores[dom_key]
            base_intensity = int(min(100, max(15, base_score * 15)))
            
            if features["has_high"]:
                intensity = min(100, base_intensity + 20)
            elif features["has_low"]:
                intensity = max(5, base_intensity - 20)
            else:
                intensity = base_intensity
        else:
            intensity = 0
            
        current_record = {
            "emotion": dominant_emotion,
            "scores": scores,
            "intensity": intensity
        }
        history_with_current = history + [current_record]
        trend = analyze_trend(history_with_current, dominant_emotion)
        
        signals = features["signals"]
        
        return EmotionResult(
            emotion=dominant_emotion,
            intensity=intensity,
            confidence=confidence,
            trend=trend,
            scores=scores,
            signals=signals,
            text=text
        )

    def analyze(self, text, history=None):
        """
        Phân tích cảm xúc từ nội dung văn bản (3 tầng).
        """
        if history is None:
            history = []

        # Tầng 1: Thử phân tích bằng AI (Gemini 2.5 Flash)
        try:
            ai_data = self._analyze_with_ai(text)
            return self._build_result(ai_data, text, history)
            
        except Exception as e_gemini:
            print(f"--> [GEMINI ERROR] Không thể gọi Gemini: {e_gemini}")
            
            # Tầng 2: Thử phân tích bằng Groq (Llama 3.3 70B) làm fallback cấp 1
            try:
                ai_data = self._analyze_with_groq(text)
                print("--> [GROQ SUCCESS] Phân tích cảm xúc thành công qua Groq Fallback.")
                return self._build_result(ai_data, text, history)
            except Exception as e_groq:
                # Tầng 3: Fallback sang hệ thống Luật (Rule-based) cục bộ nếu cả 2 AI đều lỗi
                print(f"--> [EMOTION FALLBACK] Chuyển sang dùng Rule-based do cả 2 AI đều lỗi (Groq lỗi: {e_groq})")
                return self._analyze_with_rules(text, history)

