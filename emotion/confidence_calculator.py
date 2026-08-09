# -*- coding: utf-8 -*-

def calculate_confidence(scores, dominant_emotion):
    """
    Tính toán độ tin cậy (confidence) từ 0.0 đến 1.0 của cảm xúc được phân loại.
    Độ tin cậy cao nếu sự chênh lệch giữa cảm xúc đứng đầu và cảm xúc đứng thứ hai lớn,
    và tổng điểm của tín hiệu đủ lớn.
    """
    if dominant_emotion == "NEUTRAL":
        return 0.85  # Mặc định là 85% cho trạng thái Trung tính

    s_list = sorted(scores.values(), reverse=True)
    s1 = s_list[0]
    s2 = s_list[1]
    
    total = sum(scores.values())
    if total == 0:
        return 0.85
        
    # Tính mức độ chênh lệch giữa vị trí thứ nhất và thứ hai
    ratio = (s1 - s2) / (s1 + 0.01)
    
    # Điều chỉnh độ tin cậy dựa trên cường độ tín hiệu (nếu tổng điểm nhỏ hơn 2.0, giảm độ tin cậy)
    strength_mult = min(1.0, total / 2.0)
    
    # Chuẩn hóa kết quả nằm trong dải [0.2, 0.98] cho thực tế
    confidence = 0.2 + 0.78 * ratio * strength_mult
    
    return round(max(0.1, min(0.99, confidence)), 2)
