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
        # 1. Hậu xử lý trọng số: Ưu tiên cực cao cho các tín hiệu âm thanh nếu có
        signals = ai_data.get("signals", [])
        scores = ai_data.get("scores", {"stress": 0, "anxiety": 0, "sadness": 0, "happy": 0})
        
        # Nếu có các tín hiệu âm thanh, tăng mạnh điểm tương ứng để bảo đảm trọng số âm thanh cao hơn hẳn text
        if "shaky_voice" in signals:
            scores["anxiety"] = float(min(10.0, scores.get("anxiety", 0) + 4.5))
        if "laughter" in signals:
            scores["happy"] = float(min(10.0, scores.get("happy", 0) + 4.5))
        if "loud_voice" in signals:
            if ai_data.get("emotion") == "HAPPY" or scores.get("happy", 0) > scores.get("stress", 0):
                scores["happy"] = float(min(10.0, scores.get("happy", 0) + 2.5))
            else:
                scores["stress"] = float(min(10.0, scores.get("stress", 0) + 3.5))
        if "fast_pace" in signals:
            if ai_data.get("emotion") == "HAPPY" or scores.get("happy", 0) > scores.get("stress", 0):
                scores["happy"] = float(min(10.0, scores.get("happy", 0) + 2.5))
            else:
                scores["stress"] = float(min(10.0, scores.get("stress", 0) + 3.5))
        if "slow_pace" in signals:
            scores["sadness"] = float(min(10.0, scores.get("sadness", 0) + 4.0))
        if "quiet_voice" in signals:
            if ai_data.get("emotion") == "ANXIETY":
                scores["anxiety"] = float(min(10.0, scores.get("anxiety", 0) + 2.5))
            else:
                scores["sadness"] = float(min(10.0, scores.get("sadness", 0) + 3.0))

        # Tái xác định cảm xúc chủ đạo sau khi cộng điểm tín hiệu âm học
        dominant_emotion = ai_data.get("emotion", "NEUTRAL")
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
        
        if max_score < 4.0:
            dominant_emotion = "NEUTRAL"
            
        ai_data["emotion"] = dominant_emotion
        ai_data["scores"] = scores

        # Hậu xử lý an toàn: Nếu AI trả về ANXIETY nhưng thực tế chỉ chứa ngập ngừng đệm thuần túy (không có từ khóa lo lắng)
        from .feature_extractor import extract_features
        features = extract_features(text)
        if ai_data["emotion"] == "ANXIETY":
            if features["has_hesitation"] and not any(w in text.lower() for w in ["lo", "sợ", "hồi hộp", "băn khoăn", "ngại", "bồn chồn"]):
                ai_data["emotion"] = "NEUTRAL"
                ai_data["intensity"] = 0
                if "scores" in ai_data and "anxiety" in ai_data["scores"]:
                    ai_data["scores"]["anxiety"] = 1.0
                    
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

    def _analyze_audio_with_gemini(self, audio_path):
        """
        [Tier 1] Sử dụng Gemini 2.5 Flash đa phương thức để trực tiếp nghe và phân tích tệp âm thanh.
        """
        if not self.api_keys:
            raise ValueError("Chưa cấu hình GEMINI_API_KEYS trong file .env!")

        # Xác định mime-type
        filename = audio_path.lower()
        mime_type = "audio/mp3"
        if filename.endswith(".wav"):
            mime_type = "audio/wav"
        elif filename.endswith(".webm"):
            mime_type = "audio/webm"
        elif filename.endswith(".ogg"):
            mime_type = "audio/ogg"

        # Đọc tệp âm thanh dưới dạng bytes
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        audio_part = {
            "mime_type": mime_type,
            "data": audio_bytes
        }

        # Prompt hướng dẫn phân tích đa phương thức
        prompt = """
        Bạn là chuyên gia ngôn ngữ học và tâm lý học học đường Việt Nam.
        Hãy phân tích file âm thanh tiếng Việt được gửi kèm theo cả hai khía cạnh:
        1. [Dịch văn bản]: Trích xuất nguyên văn lời nói của học sinh (transcript).
        2. [Tín hiệu âm thanh]: Phân tích tốc độ nói (fast_pace/slow_pace), âm lượng giọng nói (to/nhỏ/gắt), nhịp điệu ngập ngừng (hesitation), tiếng cười (laughter), giọng run rẩy lo lắng (shaky_voice).
        3. [Phân loại cảm xúc]: Chấm điểm cảm xúc và phân loại vào một nhãn duy nhất: STRESS, ANXIETY, SADNESS, HAPPY, hoặc NEUTRAL.
           *QUAN TRỌNG*: Hãy ưu tiên cực kỳ cao các tín hiệu âm thanh thu được (tốc độ nói, âm lượng, giọng run, tiếng cười) để chấm điểm và phân loại cảm xúc (chiếm 70% trọng số). Phân tích nội dung chữ (text) chỉ chiếm 30% trọng số phụ. 
           Ví dụ: Nếu văn bản của học sinh là trung tính ("ừm... à... để tôi xem...") nhưng giọng nói có tín hiệu run rẩy (shaky_voice) và ngập ngừng (hesitation) nhiều, nhãn cảm xúc phải được xếp là ANXIETY thay vì NEUTRAL.
        
        Vui lòng trả về kết quả dưới dạng chuỗi JSON định dạng chuẩn sau đây, không kèm từ giải thích hay thẻ markdown:
        {
          "transcript": "nội dung văn bản dịch từ file ghi âm",
          "emotion": "STRESS" | "ANXIETY" | "SADNESS" | "HAPPY" | "NEUTRAL",
          "intensity": 0 đến 100,
          "confidence": 0.0 đến 1.0,
          "scores": {
            "stress": 0 đến 10 (số thực),
            "anxiety": 0 đến 10 (số thực),
            "sadness": 0 đến 10 (số thực),
            "happy": 0 đến 10 (số thực)
          },
          "signals": ["laughter", "hesitation", "word_repetition", "negation", "fast_pace", "slow_pace", "shaky_voice", "loud_voice", "quiet_voice"]
        }
        """

        for attempt in range(len(self.api_keys)):
            try:
                key = self.api_keys[self.current_key_index]
                genai.configure(api_key=key)
                
                model = genai.GenerativeModel(model_name="gemini-2.5-flash")
                response = model.generate_content([audio_part, prompt])
                
                res_text = response.text.strip()
                # Làm sạch markdown nếu có
                if res_text.startswith("```"):
                    lines = res_text.splitlines()
                    if lines[0].startswith("```json"):
                        res_text = "\n".join(lines[1:-1])
                    else:
                        res_text = "\n".join(lines[1:-1])
                
                return json.loads(res_text.strip())
                
            except Exception as e:
                print(f"[GEMINI AUDIO AI ERROR] Key index {self.current_key_index} failed: {e}")
                self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
                
        raise RuntimeError("Tất cả các Gemini API Keys đều không khả dụng cho phân tích âm thanh.")

    def _transcribe_audio_with_groq(self, audio_path):
        """
        [Tier 2 Fallback] Sử dụng Groq Whisper API (whisper-large-v3) để dịch file âm thanh sang văn bản.
        """
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            raise ValueError("Chưa cấu hình GROQ_API_KEY trong file .env")
            
        import uuid
        import urllib.request
        
        with open(audio_path, 'rb') as f:
            file_data = f.read()
            
        filename = os.path.basename(audio_path)
        mime_type = "audio/mpeg"
        if filename.endswith(".wav"):
            mime_type = "audio/wav"
        elif filename.endswith(".webm"):
            mime_type = "audio/webm"
            
        boundary = f"----Boundary{uuid.uuid4().hex}"
        
        # Xây dựng multipart form-data payload bằng bytes
        parts = []
        parts.append(f"--{boundary}".encode('utf-8'))
        parts.append('Content-Disposition: form-data; name="model"'.encode('utf-8'))
        parts.append(b'')
        parts.append('whisper-large-v3'.encode('utf-8'))
        
        parts.append(f"--{boundary}".encode('utf-8'))
        parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode('utf-8'))
        parts.append(f'Content-Type: {mime_type}'.encode('utf-8'))
        parts.append(b'')
        parts.append(file_data)
        
        parts.append(f"--{boundary}--".encode('utf-8'))
        parts.append(b'')
        
        body = b'\r\n'.join(parts)
        
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=20) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("text", "").strip()

    def analyze_audio(self, audio_path, history=None):
        """
        Phân tích tệp âm thanh đa phương thức (3 tầng).
        Trả về: (EmotionResult, transcript_text)
        """
        if history is None:
            history = []

        # Tầng 1: Sử dụng Gemini Multimodal
        try:
            ai_data = self._analyze_audio_with_gemini(audio_path)
            transcript = ai_data.get("transcript", "")
            emotion_res = self._build_result(ai_data, transcript, history)
            print("--> [GEMINI MULTIMODAL SUCCESS] Phân tích âm thanh thành công.")
            return emotion_res, transcript
        except Exception as e_gemini:
            print(f"--> [GEMINI MULTIMODAL ERROR] Thất bại: {e_gemini}")

            # Tầng 2: Dự phòng dịch qua Groq Whisper + Phân tích ngữ nghĩa qua Groq Llama 3.3
            try:
                print("--> [FALLBACK TIER 2] Đang dịch âm thanh bằng Groq Whisper...")
                transcript = self._transcribe_audio_with_groq(audio_path)
                if not transcript:
                    raise ValueError("Groq Whisper trả về văn bản trống.")
                
                print(f"--> [GROQ WHISPER SUCCESS] Bản dịch: \"{transcript}\"")
                print("--> [FALLBACK] Đang phân tích cảm xúc văn bản bằng Groq Llama 3.3...")
                ai_data = self._analyze_with_groq(transcript)
                emotion_res = self._build_result(ai_data, transcript, history)
                return emotion_res, transcript
            except Exception as e_groq:
                print(f"--> [GROQ FALLBACK ERROR] Thất bại: {e_groq}")
                
                # Tầng 3: Dự phòng dịch qua Groq Whisper (nếu đã có transcript) + Rule-based Engine cục bộ
                try:
                    if 'transcript' in locals() and transcript:
                        print("--> [FALLBACK TIER 3] Chạy Rule-based Engine trên bản dịch từ Groq Whisper...")
                        emotion_res = self._analyze_with_rules(transcript, history)
                        return emotion_res, transcript
                except Exception as e_rule:
                    print(f"--> [RULE FALLBACK ERROR] Thất bại: {e_rule}")
                
                raise RuntimeError("Tất cả các tầng dự phòng phân tích âm thanh đều thất bại.")

