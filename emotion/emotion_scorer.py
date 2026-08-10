# -*- coding: utf-8 -*-

def score_emotion(features):
    """
    Tính toán điểm raw cho 4 nhóm cảm xúc dựa trên bảng trọng số và các đặc trưng trích xuất được.
    """
    matched = features["matched_features"]
    hes_score = features["hesitation_score"]
    has_low = features["has_low"]
    has_high = features["has_high"]
    signals = features["signals"]
    normalized = features["normalized"]
    
    scores = {
        "stress": 0.0,
        "anxiety": 0.0,
        "sadness": 0.0,
        "happy": 0.0
    }
    
    # Hàm hỗ trợ kiểm tra xem có chứa từ khóa con hay không
    def check_sub_list(kw, sub_list):
        return any(sub in kw.lower() for sub in sub_list)
        
    # --- 1. TÍNH ĐIỂM TỪ KHÓA TRỰC TIẾP ---
    # Stress Keywords
    for kw in matched["STRESS"]:
        stress_val = 0
        sadness_val = 0
        anxiety_val = 0
        if check_sub_list(kw, ["bực", "tức", "cáu", "điên", "ức", "phát điên"]):
            stress_val = 3
        elif check_sub_list(kw, ["khó chịu", "phiền", "ngán"]):
            stress_val = 2
            sadness_val = 1
        elif check_sub_list(kw, ["áp lực", "stress", "căng thẳng"]):
            stress_val = 3
            anxiety_val = 2
        elif check_sub_list(kw, ["mệt mỏi", "mệt quá"]):
            stress_val = 2
            sadness_val = 2
        else:
            stress_val = 2
            
        scores["stress"] += stress_val
        scores["sadness"] += sadness_val
        scores["anxiety"] += anxiety_val
        
    # Anxiety Keywords
    for kw in matched["ANXIETY"]:
        anxiety_val = 0
        sadness_val = 0
        if check_sub_list(kw, ["lo", "hồi hộp", "bất an", "bồn chồn", "run"]):
            anxiety_val = 3
        elif check_sub_list(kw, ["sợ", "e là"]):
            anxiety_val = 3
            sadness_val = 1
        elif check_sub_list(kw, ["không biết", "không chắc", "hình như", "có lẽ", "có vẻ", "liệu", "nhỡ", "lỡ", "hay là", "có khi", "chắc không"]):
            anxiety_val = 2
        else:
            anxiety_val = 2
            
        scores["anxiety"] += anxiety_val
        scores["sadness"] += sadness_val
        
    # Sadness Keywords
    for kw in matched["SADNESS"]:
        sadness_val = 0
        anxiety_val = 0
        if check_sub_list(kw, ["buồn", "đau lòng", "tổn thương", "không vui"]):
            sadness_val = 3
        elif check_sub_list(kw, ["thất vọng", "chán", "nản", "thất bại", "tuyệt vọng", "vô vọng"]):
            sadness_val = 3
            anxiety_val = 1
        elif check_sub_list(kw, ["cô đơn", "một mình", "nhớ"]):
            sadness_val = 3
            anxiety_val = 1
        else:
            sadness_val = 2
            
        scores["sadness"] += sadness_val
        scores["anxiety"] += anxiety_val
        
    # Happy Keywords
    for kw in matched["HAPPY"]:
        happy_val = 0
        if check_sub_list(kw, ["vui", "hạnh phúc", "tuyệt", "thích", "may quá", "tốt quá", "đỉnh", "yêu"]):
            happy_val = 3
        elif check_sub_list(kw, ["hào hứng", "phấn khích", "thành công", "chiến thắng"]):
            happy_val = 3
        else:
            happy_val = 2
            
        scores["happy"] += happy_val

    # --- 2. TIẾNG CƯỜI ---
    if matched["LAUGHTER"]:
        scores["happy"] += 2
        
    # --- 3. PHỦ ĐỊNH ---
    # matched["NEGATED"] là danh sách các cặp (Category, Keyword) bị phủ định
    for cat_name, kw in matched["NEGATED"]:
        if cat_name == "HAPPY":
            scores["sadness"] += 2
            scores["happy"] -= 2
        elif cat_name == "ANXIETY":
            scores["anxiety"] -= 2
        elif cat_name == "SADNESS":
            scores["sadness"] -= 2
        elif cat_name == "STRESS":
            scores["stress"] -= 2

    # --- 4. NGẬP NGỪNG & LẶP TỪ ---
    if "word_repetition" in signals:
        scores["anxiety"] += 2
    if "hesitation" in signals:
        scores["anxiety"] += 2

    # --- 5. BIỂU HIỆN GIÁN TIẾP ---
    for emotion_key, expr in matched["INDIRECT"]:
        if emotion_key == "STRESS":
            scores["stress"] += 2
        elif emotion_key == "ANXIETY":
            scores["anxiety"] += 2
        elif emotion_key == "SADNESS":
            scores["sadness"] += 2
        elif emotion_key == "HAPPY":
            scores["happy"] += 2

    # --- 6. CÂU HỎI / CÂU CẢM THÁN ---
    has_negative_sentiment = (scores["stress"] > 0 or scores["anxiety"] > 0 or scores["sadness"] > 0)
    has_positive_sentiment = (scores["happy"] > 0)
    
    # Câu cảm thán (!)
    if matched["EXCLAMATION"]:
        if has_positive_sentiment and not has_negative_sentiment:
            scores["happy"] += 2
        elif has_negative_sentiment:
            scores["stress"] += 2
            scores["anxiety"] += 1
            scores["sadness"] += 1
            
    # Câu hỏi (?) mang tính lo lắng
    if matched["QUESTION"]:
        if scores["anxiety"] > 0 or check_sub_list(normalized, ["liệu", "nếu", "nhỡ", "lỡ", "sao", "thế nào", "phải làm sao"]):
            scores["anxiety"] += 2

    # Lọc bỏ điểm lo âu nếu chỉ có ngập ngừng/lặp từ mà không có bất kỳ từ khóa lo âu hoặc câu hỏi lo âu nào khác
    has_anxiety_indicators = (
        len(matched["ANXIETY"]) > 0 or 
        any(emotion == "ANXIETY" for emotion, _ in matched["INDIRECT"]) or
        (matched["QUESTION"] and check_sub_list(normalized, ["liệu", "nếu", "nhỡ", "lỡ", "sao", "thế nào", "phải làm sao"]))
    )
    if scores["anxiety"] > 0 and not has_anxiety_indicators:
        scores["anxiety"] = 0.0

    # --- 7. NHÂN HỆ SỐ CƯỜNG ĐỘ (INTENSIFIERS) ---
    multiplier = 1.0
    if has_high:
        multiplier = 1.5
    elif has_low:
        multiplier = 0.5
        
    for k in scores:
        if scores[k] > 0:
            scores[k] = round(scores[k] * multiplier, 2)
        else:
            scores[k] = 0.0 # Đảm bảo không bị điểm âm
            
    return scores
