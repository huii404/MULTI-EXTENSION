import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from flask import Flask, render_template, Response, jsonify, request, session, redirect, url_for
from functools import wraps
from camera import VideoCamera
from chatbot import get_gemini_response
from data_manager import get_dashboard_stats, save_real_data, get_alerts, resolve_alert, save_chat_log, get_chat_logs, save_hrv_data, get_hrv_history, get_hrv_baseline_7days
import base64
import numpy as np
import cv2
import os

app = Flask(__name__)
app.secret_key = 'polkijfuvfrighohdsckdzmmdsowofjsirjvmssskcke9'
camera_stream = VideoCamera() 

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
        'details': camera_stream.current_emotions_dict if hasattr(camera_stream, 'current_emotions_dict') else {},
        'hrv': camera_stream.get_hrv_metrics()
    })

@app.route('/result')
def result():
    current_stress = camera_stream.get_stress_level()
    current_emotion = getattr(camera_stream, 'current_emotion', 'Unknown')
    hrv_data = camera_stream.get_hrv_metrics()
    save_real_data(current_stress, current_emotion, hrv_data)
    return render_template('result.html', stress=current_stress, emotion=current_emotion, hrv=hrv_data)

@app.route('/api/hrv/metrics')
def api_hrv_metrics():
    return jsonify(camera_stream.get_hrv_metrics())

@app.route('/api/hrv/baseline')
def api_hrv_baseline():
    baseline_data = get_hrv_baseline_7days()
    return jsonify({
        'history': get_hrv_history(30),
        'baseline_7days': baseline_data
    })

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
    data = request.json
    user_msg = data.get('message', '')
    
    if not user_msg:
        return jsonify({'reply': "Bạn im lặng thế, tâm sự với mình đi!"})
    ai_reply = get_gemini_response(user_msg)

    save_chat_log(user_msg, ai_reply)
    
    return jsonify({'reply': ai_reply})

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
        'details': getattr(camera_stream, 'current_emotions_dict', {}),
        'hrv': camera_stream.get_hrv_metrics()
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