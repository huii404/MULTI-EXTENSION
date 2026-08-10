# -*- coding: utf-8 -*-

def analyze_trend(history, current_emotion):
    """
    Phân tích xu hướng cảm xúc dựa trên lịch sử phiên trò chuyện.
    Trả về một trong bốn xu hướng: INCREASING (Tăng), DECREASING (Giảm), STABLE (Ổn định), FLUCTUATING (Biến động).
    """
    if current_emotion == "NEUTRAL":
        return "STABLE"
        
    emotion_key_map = {
        "STRESS": "stress",
        "ANXIETY": "anxiety",
        "SADNESS": "sadness",
        "HAPPY": "happy"
    }
    
    score_key = emotion_key_map.get(current_emotion)
    if not score_key:
        return "STABLE"
        
    # Trích xuất điểm số của cảm xúc hiện tại qua các lượt
    vals = []
    for entry in history:
        # Ưu tiên sử dụng raw scores
        if "scores" in entry and score_key in entry["scores"]:
            vals.append(entry["scores"][score_key])
        # Nếu không có scores thì dùng intensity
        elif "intensity" in entry and entry.get("emotion") == current_emotion:
            vals.append(entry["intensity"])
            
    if len(vals) < 2:
        return "STABLE"
        
    # Phân tích xu hướng dựa trên tối đa 5 lượt hội thoại gần nhất
    recent_vals = vals[-5:]
    diffs = [recent_vals[i] - recent_vals[i-1] for i in range(1, len(recent_vals))]
    
    # Định nghĩa các ngưỡng thay đổi nhỏ (để tránh nhiễu float)
    threshold = 0.05
    pos = sum(1 for d in diffs if d > threshold)
    neg = sum(1 for d in diffs if d < -threshold)
    
    if pos > 0 and neg == 0:
        return "INCREASING"
    elif neg > 0 and pos == 0:
        return "DECREASING"
    elif pos == 0 and neg == 0:
        return "STABLE"
    else:
        return "FLUCTUATING"
