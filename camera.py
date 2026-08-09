import cv2
from deepface import DeepFace
import threading
import numpy as np
from collections import deque
from hrv_processor import HRVProcessor
from hrv_baseline import HRVBaselineManager
from data_manager import get_hrv_baseline_7days, save_hrv_data

class VideoCamera(object):
    def __init__(self):
        self.current_stress = 0.0
        self.current_emotion = "Đang khởi tạo..."
        self.current_emotions_dict = {}
        self.history_len = 7
        self.emotion_history = deque(maxlen=self.history_len)
        self.force_stress = False

        # Mô-đun HRV & rPPG (Webcam-based PPG)
        self.hrv_processor = HRVProcessor(sampling_rate=30)
        self.baseline_manager = HRVBaselineManager()
        self.rppg_signal_buffer = deque(maxlen=300) # 10 giây ở 30 FPS
        self.latest_hrv_metrics = {
            'BPM': 72.0,
            'RMSSD': 42.5,
            'SDNN': 48.2,
            'LFHF': 1.2,
            'z_score': 0.1,
            'hrv_stress': 35.0,
            'combined_stress': 0.0,
            'status': 'Bình thường'
        }

    def trigger_fake_stress(self):
        self.force_stress = True
        self.current_stress = 88.5
        self.current_emotion = "fear"
        self.current_emotions_dict = {'angry': 15.0, 'fear': 88.5, 'sad': 60.0, 'happy': 0.0, 'neutral': 5.0}
        self.latest_hrv_metrics['RMSSD'] = 18.2
        self.latest_hrv_metrics['z_score'] = -1.8
        self.latest_hrv_metrics['combined_stress'] = 86.4
        self.latest_hrv_metrics['status'] = 'Căng thẳng cao (Kiệt sức)'
        
        threading.Timer(15.0, self.reset_fake_stress).start()

    def reset_fake_stress(self):
        self.force_stress = False    

    def __del__(self):
        pass

    def process_frame(self, img):
        if getattr(self, 'force_stress', False):
            return

        try:
            self.update_hrv_analysis(img)
            
            objs = DeepFace.analyze(img, 
                                  actions=['emotion'], 
                                  enforce_detection=True, 
                                  detector_backend='mtcnn', 
                                  silent=True)
            
            raw_emotions = objs[0]['emotion']
            self.emotion_history.append(raw_emotions)
            
            avg_emotions = self.calculate_average_emotions()
            self.current_emotions_dict = {key: float(val) for key, val in avg_emotions.items()}
            
            self.current_stress = self.fuzzy_inference_system(avg_emotions)
            self.current_emotion = max(avg_emotions, key=avg_emotions.get)
            
        except ValueError:
            self.current_stress = 0.0
            self.current_emotion = "Không thấy mặt"
        except Exception as e:
            print(f"Lỗi phân tích: {e}")

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

    def extract_rppg_value(self, img):
        try:
            h, w, _ = img.shape
            # Cắt vùng trán/trung tâm khuôn mặt (ROI) để phân tích sắc độ da rPPG
            roi = img[int(h*0.2):int(h*0.6), int(w*0.3):int(w*0.7)]
            if roi.size > 0:
                green_channel = roi[:, :, 1] # Kênh Green có độ hấp thụ ánh sáng mạch máu tốt nhất
                return float(np.mean(green_channel))
        except Exception:
            pass
        return 0.0

    def update_hrv_analysis(self, img):
        val = self.extract_rppg_value(img)
        if val > 0:
            self.rppg_signal_buffer.append(val)

        if len(self.rppg_signal_buffer) >= 60 and not getattr(self, 'force_stress', False):
            try:
                sig = np.array(self.rppg_signal_buffer)
                hrv_res = self.hrv_processor.run_pipeline(sig)
                
                baseline_hist = get_hrv_baseline_7days()
                fusion_res = self.baseline_manager.calculate_multimodal_stress(
                    facial_stress=self.current_stress,
                    hrv_rmssd=hrv_res.get('RMSSD', 42.0),
                    baseline_history=baseline_hist
                )
                
                self.latest_hrv_metrics.update({
                    'BPM': hrv_res.get('BPM', 72.0),
                    'RMSSD': hrv_res.get('RMSSD', 42.0),
                    'SDNN': hrv_res.get('SDNN', 45.0),
                    'LFHF': hrv_res.get('LFHF', 1.1),
                    'z_score': fusion_res.get('z_score', 0.0),
                    'hrv_stress': fusion_res.get('hrv_stress', 35.0),
                    'combined_stress': fusion_res.get('combined_stress', self.current_stress),
                    'status': fusion_res.get('status', 'Bình thường')
                })
            except Exception as e:
                pass

    def detect_emotion(self, img):
        try:
            self.update_hrv_analysis(img)

            if getattr(self, 'force_stress', False):
                return
          
            objs = DeepFace.analyze(img, 
                                  actions=['emotion'], 
                                  enforce_detection=True, 
                                  detector_backend='mtcnn', 
                                  silent=True)
            
            raw_emotions = objs[0]['emotion']
            self.emotion_history.append(raw_emotions)
            
            avg_emotions = self.calculate_average_emotions()
            self.current_emotions_dict = {key: float(val) for key, val in avg_emotions.items()}
            
            self.current_stress = self.fuzzy_inference_system(avg_emotions)
            self.current_emotion = max(avg_emotions, key=avg_emotions.get)
            
            print(f"Stress: {self.current_stress:.2f}% | Emotion: {self.current_emotion} | HRV RMSSD: {self.latest_hrv_metrics['RMSSD']}ms")
            
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
        
        weights = list(range(1, len(self.emotion_history) + 1)) # [1, 2, 3, 4, 5...]
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

        # Trừ hao đi 15% (0.15) cho nỗi buồn để khắc phục lỗi "Resting Face" và góc camera thấp
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