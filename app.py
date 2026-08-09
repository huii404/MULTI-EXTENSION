from flask import Flask, render_template, Response, jsonify, request, session, redirect, url_for
from functools import wraps
from camera import VideoCamera
from chatbot import get_gemini_response
from data_manager import get_dashboard_stats, save_real_data, get_alerts, resolve_alert, save_chat_log, get_chat_logs
from emotion import EmotionAnalyzer
import base64
import numpy as np
import cv2
import os

app = Flask(__name__)
app.secret_key = 'polkijfuvfrighohdsckdzmmdsowofjsirjvmssskcke9'
camera_stream = VideoCamera() 
emotion_analyzer = EmotionAnalyzer()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login_ui'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

def gen(camera):
    while True:
        frame = camera.get_frame()
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(gen(camera_stream),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stress_data')
def stress_data():
    return jsonify({
        'stress': float(camera_stream.get_stress_level()),
        'emotion_label': camera_stream.current_emotion,
        'details': camera_stream.current_emotions_dict if hasattr(camera_stream, 'current_emotions_dict') else {} 
    })


@app.route('/result')
def result():
    current_stress = camera_stream.get_stress_level()
    current_emotion = getattr(camera_stream, 'current_emotion', 'Unknown')
    save_real_data(current_stress, current_emotion)
    return render_template('result.html')

@app.route('/solution/breath')
def breath():
    return render_template('breath.html')

@app.route('/solution/game')
def game():
    return render_template('game.html')

@app.route('/solution/chat')
def chat():
    return render_template('chat.html')

@app.route('/api/chat', methods=['POST'])
def chat_api():
    user_msg = ""
    source = "text"
    audio_path = None
    
    # 1. Kiểm tra xem request gửi lên là FormData (có file âm thanh) hay JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        source = request.form.get('source', 'voice')
        if 'audio' in request.files:
            audio_file = request.files['audio']
            filename = audio_file.filename
            if filename:
                temp_dir = os.path.join(app.root_path, 'temp_audio')
                os.makedirs(temp_dir, exist_ok=True)
                audio_path = os.path.join(temp_dir, filename)
                audio_file.save(audio_path)
    else:
        data = request.json or {}
        user_msg = data.get('message', '')
        source = data.get('source', 'text')
        
    if not user_msg and not audio_path:
        return jsonify({'reply': "Bạn im lặng thế, tâm sự với mình đi!"})
        
    if 'emotion_history' not in session:
        session['emotion_history'] = []
        
    history = session['emotion_history']
    transcript = None
    emotion_res = None
    
    try:
        if audio_path:
            # Phân tích cảm xúc đa phương thức từ tệp âm thanh
            emotion_res, transcript = emotion_analyzer.analyze_audio(audio_path, history)
            try:
                os.remove(audio_path)
            except Exception as e:
                print(f"Error removing temp audio file: {e}")
                
            if not transcript:
                return jsonify({'error': "Không nhận diện được giọng nói trong file âm thanh này."})
            user_msg = transcript
        else:
            # Phân tích văn bản thông thường
            emotion_res = emotion_analyzer.analyze(user_msg, history)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f"Lỗi phân tích cảm xúc/âm thanh: {str(e)}"})
        
    emotion_data = emotion_res.to_dict()
    
    # Lưu vào lịch sử phiên để phân tích xu hướng ở lượt sau
    history.append({
        "emotion": emotion_res.emotion,
        "scores": emotion_res.scores,
        "intensity": emotion_res.intensity
    })
    session['emotion_history'] = history
    session.modified = True
    
    # Lấy câu trả lời từ trợ lý có chèn trạng thái cảm xúc thấu cảm
    ai_reply = get_gemini_response(user_msg, emotion_data)
    
    # Lưu log kèm nguồn và cảm xúc chi tiết
    save_chat_log(user_msg, ai_reply, source, emotion_data)
    
    resp = {
        'reply': ai_reply,
        'emotion_data': emotion_data
    }
    if transcript:
        resp['transcript'] = transcript
        
    return jsonify(resp)

@app.route('/admin')
@login_required
def admin_dashboard_ui():
    return render_template('admin/dashboard.html')


@app.route('/admin/alerts')
@login_required
def admin_alerts_ui():
    return render_template('admin/alerts.html')

@app.route('/admin/chatlogs')
@login_required
def admin_chatlogs_ui():
    return render_template('admin/chatlogs.html')

@app.route('/api/admin/stats')
def admin_stats_api():
    stats = get_dashboard_stats()
    return jsonify(stats)

@app.route('/api/admin/alerts')
def admin_alerts_api():
    return jsonify(get_alerts())

@app.route('/api/admin/alerts/resolve', methods=['POST'])
def admin_resolve_alert_api():
    data = request.json
    alert_id = data.get('id')
    
    if resolve_alert(alert_id):
        return jsonify({'success': True, 'message': 'Đã cập nhật trạng thái'})
    return jsonify({'success': False, 'message': 'Không tìm thấy ID'})


@app.route('/api/admin/chat-logs')
def admin_chat_logs_api():
    return jsonify(get_chat_logs())


@app.route('/switch_camera', methods=['POST'])
def switch_camera_api():
    try:
        camera_stream.switch_camera()
        return jsonify({'success': True, 'message': 'Đã đổi camera'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    

@app.route('/api/trigger_cheat', methods=['POST'])
def trigger_cheat_api():
    try:
        camera_stream.trigger_fake_stress()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False})
    
@app.route('/api/analyze_frame', methods=['POST'])
def analyze_frame_api():
    data = request.json
    base64_string = data.get('image')
    
    if base64_string:
        try:
            img_data = base64.b64decode(base64_string)
            np_arr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            camera_stream.process_frame(img)
        except Exception as e:
            print("Lỗi giải mã ảnh:", e)

    return jsonify({
        'stress': float(camera_stream.get_stress_level()),
        'emotion_label': getattr(camera_stream, 'current_emotion', 'Unknown'),
        'details': getattr(camera_stream, 'current_emotions_dict', {})
    })    


@app.route('/login', methods=['GET', 'POST'])
def login_ui():
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == 'admin' and password == '123456':
            session['logged_in'] = True
            return redirect(url_for('admin_dashboard_ui'))
        else:
            error = "Sai tên đăng nhập hoặc mật khẩu!"
            
    return render_template('login.html', error=error)

@app.route('/logout')
def logout_api():
    session.pop('logged_in', None)
    return redirect(url_for('login_ui'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)