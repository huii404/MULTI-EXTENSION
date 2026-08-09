import cv2
from deepface import DeepFace
import threading
import numpy as np
import time
from collections import deque
from hrv_processor import HRVProcessor

class VideoCamera(object):
    def __init__(self):
        self.current_stress = 0.0
        self.current_emotion = "Đang khởi tạo..."
        self.current_emotions_dict = {}
        self.history_len = 7
        self.emotion_history = deque(maxlen=self.history_len)
        self.force_stress = False
        self.hrv_processor = HRVProcessor()
        self.current_hrv_metrics = self.hrv_processor.get_metrics()
        self.latest_hrv_metrics = self.current_hrv_metrics

    def trigger_fake_stress(self):
        self.force_stress = True
        self.current_stress = 88.5
        self.current_emotion = "fear"
        self.current_emotions_dict = {'angry': 15.0, 'fear': 88.5, 'sad': 60.0, 'happy': 0.0, 'neutral': 5.0}
        self.current_hrv_metrics = {
            "bpm": 115,
            "BPM": 115,
            "rmssd": 14.2,
            "RMSSD": 14.2,
            "sdnn": 18.5,
            "SDNN": 18.5,
            "pnn50": 0.0,
            "hrv_stress": 88.5,
            "status": "Căng thẳng (HRV Thấp)",
            "signal": []
        }
        self.latest_hrv_metrics = self.current_hrv_metrics
        
        threading.Timer(15.0, self.reset_fake_stress).start()

    def reset_fake_stress(self):
        self.force_stress = False    

    def __del__(self):
        pass

    def process_frame(self, img):
        if getattr(self, 'force_stress', False):
            return

        try:
            # 1. Trích xuất tín hiệu rPPG Xanh lá từ ROI khuôn mặt (trán/má)
            h, w, _ = img.shape
            roi = img[int(h*0.12):int(h*0.45), int(w*0.25):int(w*0.75)]
            if roi.size > 0:
                green_mean = float(np.mean(roi[:, :, 1]))
                self.hrv_processor.add_sample(time.time(), green_mean)
                self.current_hrv_metrics = self.hrv_processor.get_metrics()
                self.latest_hrv_metrics = self.current_hrv_metrics
            
            # 2. Phân tích cảm xúc khuôn mặt bằng DeepFace
            objs = DeepFace.analyze(img, 
                                  actions=['emotion'], 
                                  enforce_detection=True, 
                                  detector_backend='mtcnn', 
                                  silent=True)
            
            raw_emotions = objs[0]['emotion']
            self.emotion_history.append(raw_emotions)
            
            avg_emotions = self.calculate_average_emotions()
            self.current_emotions_dict = {key: float(val) for key, val in avg_emotions.items()}
            
            fuzzy_stress = self.fuzzy_inference_system(avg_emotions)
            self.current_emotion = max(avg_emotions, key=avg_emotions.get)
            
            # 3. Kết hợp Đa mô hình: Emotion Fuzzy Stress + HRV Bio-Stress
            hrv_stress = self.current_hrv_metrics.get('hrv_stress', 0.0)
            if self.current_hrv_metrics.get('rmssd', 0.0) > 0:
                self.current_stress = round(0.5 * fuzzy_stress + 0.5 * hrv_stress, 1)
            else:
                self.current_stress = round(fuzzy_stress, 1)
            
        except ValueError:
            self.current_stress = 0.0
            self.current_emotion = "Không thấy mặt"
        except Exception as e:
            print(f"Lỗi phân tích: {e}")

    def get_hrv_metrics(self):
        return getattr(self, 'current_hrv_metrics', self.hrv_processor.get_metrics())

    def switch_camera(self):
        self.is_processing = True 
        
        if self.video.isOpened():
            self.video.release()
            
        self.camera_index = 1 if self.camera_index == 0 else 0
        
        self.video = cv2.VideoCapture(self.camera_index)
        
        if not self.video.isOpened():
            print(f"Lỗi: Không tìm thấy Camera số {self.camera_index}")
            self.camera_index = 1 if self.camera_index == 0 else 0
            self.video = cv2.VideoCapture(self.camera_index)
            
        self.is_processing = False

    def get_frame(self):
        success, image = self.video.read()
        if not success: return None

        self.frame_counter += 1

        if self.frame_counter % 15 == 0 and not getattr(self, 'is_processing', False):
            self.is_processing = True
            threading.Thread(target=self.detect_emotion, args=(image.copy(),)).start()

        ret, jpeg = cv2.imencode('.jpg', image)
        return jpeg.tobytes()

    def detect_emotion(self, img):
        try:
            if getattr(self, 'force_stress', False):
                return
          
            h, w, _ = img.shape
            roi = img[int(h*0.12):int(h*0.45), int(w*0.25):int(w*0.75)]
            if roi.size > 0:
                green_mean = float(np.mean(roi[:, :, 1]))
                self.hrv_processor.add_sample(time.time(), green_mean)
                self.current_hrv_metrics = self.hrv_processor.get_metrics()
                self.latest_hrv_metrics = self.current_hrv_metrics
            
            objs = DeepFace.analyze(img, 
                                  actions=['emotion'], 
                                  enforce_detection=True, 
                                  detector_backend='mtcnn', 
                                  silent=True)
            
            raw_emotions = objs[0]['emotion']
            self.emotion_history.append(raw_emotions)
            
            avg_emotions = self.calculate_average_emotions()
            self.current_emotions_dict = {key: float(val) for key, val in avg_emotions.items()}
            
            fuzzy_stress = self.fuzzy_inference_system(avg_emotions)
            self.current_emotion = max(avg_emotions, key=avg_emotions.get)
            
            hrv_stress = self.current_hrv_metrics.get('hrv_stress', 0.0)
            if self.current_hrv_metrics.get('rmssd', 0.0) > 0:
                self.current_stress = round(0.5 * fuzzy_stress + 0.5 * hrv_stress, 1)
            else:
                self.current_stress = round(fuzzy_stress, 1)
            
            print(f"Stress: {self.current_stress:.2f}% | Emotion: {self.current_emotion} | HRV RMSSD: {self.current_hrv_metrics.get('rmssd')}ms")
            
        except ValueError:
            self.emotion_history.clear()
            self.current_stress = 0.0
            self.current_emotion = "Không thấy mặt"
            self.current_emotions_dict = {} 
            
        except Exception as e:
            print(f"System Error: {e}")
            
        finally:
            self.is_processing = False

    def calculate_average_emotions(self):
        if not self.emotion_history: return {}
        totals = {k: 0.0 for k in self.emotion_history[0].keys()}
        
        weights = list(range(1, len(self.emotion_history) + 1))
        total_weight = sum(weights)
        
        for i, entry in enumerate(self.emotion_history):
            w = weights[i]
            for emotion, value in entry.items():
                totals[emotion] += (value * w)
                
        return {k: v / total_weight for k, v in totals.items()}

    def fuzzy_inference_system(self, emotions):
        """
        HỆ THỐNG SUY LUẬN MỜ - KIỂU TAKAGI-SUGENO
        """
        if not emotions: return 0.0

        angry = emotions.get('angry', 0) / 100.0
        fear = emotions.get('fear', 0) / 100.0
        sad = emotions.get('sad', 0) / 100.0
        happy = emotions.get('happy', 0) / 100.0
        neutral = emotions.get('neutral', 0) / 100.0

        sad = max(0.0, sad - 0.15)

        if neutral > sad:
            sad = sad * 0.5
            neutral = neutral * 1.2

        mu_danger = max(angry, fear) 
        mu_stress = sad
        mu_balance = neutral
        mu_relax = happy
        
        numerator = (mu_danger * 100) + (mu_stress * 70) + (mu_balance * 20) + (mu_relax * 0)
        denominator = mu_danger + mu_stress + mu_balance + mu_relax

        if denominator == 0: return 0.0
        result = numerator / denominator
        
        return float(max(0, min(100, result)))

    def get_stress_level(self):
        return self.current_stress