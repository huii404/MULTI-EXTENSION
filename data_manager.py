import json
import os
from datetime import datetime, timedelta

DATA_FILE = 'real_stress_history.json'

def init_file():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)

def save_real_data(stress_level, emotion):
    init_file()
    
    if stress_level > 0:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            history = json.load(f)
            
        new_record = {
            "timestamp": datetime.now().isoformat(),
            "stress": round(stress_level, 2),
            "emotion": emotion
        }
        history.append(new_record)
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2)
        print(f"--> Đã lưu dữ liệu thật: Stress {stress_level}% | Emotion {emotion}")

def get_dashboard_stats():
    init_file()
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        history = json.load(f)

    if not history:
        return {
            "summary": {"total_scans": 0, "avg_stress": 0, "high_risk_cases": 0},
            "distribution": {"low": 0, "medium": 0, "high": 0},
            "trend": {"labels": [], "data": []}
        }

    total_scans = len(history)
    total_stress = sum(item['stress'] for item in history)
    avg_stress = total_stress / total_scans

    low_count = 0
    medium_count = 0
    high_count = 0

    trend_data = {}
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)

    for item in history:
        stress = item['stress']
        
        if stress < 40: low_count += 1
        elif stress <= 75: medium_count += 1
        else: high_count += 1
        
        item_date = datetime.fromisoformat(item['timestamp'])
        if item_date > seven_days_ago:
            date_str = item_date.strftime('%d/%m')
            if date_str not in trend_data:
                trend_data[date_str] = []
            trend_data[date_str].append(stress)

    trend_labels = []
    trend_values = []
    for date_key in sorted(trend_data.keys()):
        daily_avg = sum(trend_data[date_key]) / len(trend_data[date_key])
        trend_labels.append(date_key)
        trend_values.append(round(daily_avg, 1))

    return {
        "summary": {
            "total_scans": total_scans,
            "avg_stress": round(avg_stress, 1),
            "high_risk_cases": high_count
        },
        "distribution": {
            "low": low_count,
            "medium": medium_count,
            "high": high_count
        },
        "trend": {
            "labels": trend_labels,
            "data": trend_values
        }
    }


def get_alerts():
    init_file()
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        history = json.load(f)
        
    alerts = []
    for item in history:
        if item['stress'] > 75:
            alert_id = item.get('id', item['timestamp']) 
            status = item.get('status', 'pending')      
            
            alerts.append({
                "id": alert_id,
                "timestamp": item['timestamp'],
                "stress": item['stress'],
                "emotion": item['emotion'],
                "status": status
            })
            
    alerts.sort(key=lambda x: x['timestamp'], reverse=True)
    return alerts

def resolve_alert(alert_id):
    init_file()
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        history = json.load(f)
        
    found = False
    for item in history:
        if item.get('id', item['timestamp']) == alert_id:
            item['status'] = 'resolved'
            item['id'] = alert_id 
            found = True
            break
            
    if found:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2)
        return True
    return False


CHAT_LOG_FILE = 'chat_logs.json'

def init_chat_file():
    if not os.path.exists(CHAT_LOG_FILE):
        with open(CHAT_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)

def save_chat_log(user_msg, ai_reply):
    init_chat_file()
    with open(CHAT_LOG_FILE, 'r', encoding='utf-8') as f:
        logs = json.load(f)
        
    logs.append({
        "timestamp": datetime.now().isoformat(),
        "user_msg": user_msg,
        "ai_reply": ai_reply
    })
    
    with open(CHAT_LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(logs, f, indent=2)

def get_chat_logs():
    init_chat_file()
    with open(CHAT_LOG_FILE, 'r', encoding='utf-8') as f:
        logs = json.load(f)
        
    logs.sort(key=lambda x: x['timestamp'], reverse=True)
    return logs

# ==========================================
# QUẢN LÝ DỮ LIỆU HRV & BASELINE 7 NGÀY
# ==========================================
HRV_FILE = 'hrv_history.json'

def init_hrv_file():
    if not os.path.exists(HRV_FILE):
        with open(HRV_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)

def save_hrv_data(hrv_metrics: dict):
    init_hrv_file()
    if not hrv_metrics:
        return
        
    with open(HRV_FILE, 'r', encoding='utf-8') as f:
        history = json.load(f)
        
    record = {
        "timestamp": datetime.now().isoformat(),
        **hrv_metrics
    }
    history.append(record)
    
    with open(HRV_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2)
    print(f"--> Đã lưu dữ liệu HRV: RMSSD={hrv_metrics.get('RMSSD', 0)}ms | Z-Score={hrv_metrics.get('z_score', 0)}")

def get_hrv_history(limit: int = 50):
    init_hrv_file()
    with open(HRV_FILE, 'r', encoding='utf-8') as f:
        history = json.load(f)
    return history[-limit:]

def get_hrv_baseline_7days():
    init_hrv_file()
    with open(HRV_FILE, 'r', encoding='utf-8') as f:
        history = json.load(f)
        
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    
    recent = []
    for item in history:
        ts = datetime.fromisoformat(item['timestamp'])
        if ts >= seven_days_ago:
            recent.append(item)
    return recent