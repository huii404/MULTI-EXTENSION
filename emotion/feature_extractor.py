# -*- coding: utf-8 -*-
import re
from .keyword_dictionary import (
    STRESS_KEYWORDS, ANXIETY_KEYWORDS, SADNESS_KEYWORDS, HAPPY_KEYWORDS,
    LAUGHTER_WORDS, INDIRECT_EXPRESSIONS
)
from .hesitation_detector import detect_hesitation
from .negation_detector import detect_negations
from .intensity_detector import detect_intensity

def preprocess_text(text):
    """
    Chuẩn hóa văn bản đầu vào: chuyển viết thường, loại bỏ ký tự đặc biệt
    nhưng giữ lại các dấu quan trọng như '...', '?', '!' và xử lý khoảng trắng.
    """
    if not text:
        return ""
    # Chuyển thành chữ thường
    t = text.lower()
    # Chuẩn hóa nhiều dấu chấm liên tiếp thành duy nhất 1 cụm "..."
    t = re.sub(r'\.{3,}', '...', t)
    # Tạm thời hoán đổi "..." để không bị loại bỏ dấu chấm đơn
    t = t.replace('...', ' ___DOTS___ ')
    # Loại bỏ các dấu câu thông thường khác (bao gồm cả dấu chấm đơn)
    t = re.sub(r'[,;:\'\"\-()\[\]{}\\/\.]', ' ', t)
    # Trả lại "..."
    t = t.replace('___DOTS___', '...')
    # Chuẩn hóa khoảng trắng
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def extract_features(text):
    """
    Phân tích toàn bộ văn bản đầu vào và trích xuất các đặc trưng cảm xúc.
    """
    normalized = preprocess_text(text)
    
    # 1. Phát hiện phủ định
    negated_words = detect_negations(normalized)
    
    # 2. Phát hiện mức độ (intensifiers)
    has_low, has_high, intensity_signals = detect_intensity(normalized)
    
    # 3. Phát hiện ngập ngừng và lặp từ
    hesitation_score, hesitation_signals = detect_hesitation(text, normalized)
    
    # Cấu trúc lưu trữ các đặc trưng tìm thấy
    matched_features = {
        "STRESS": [],
        "ANXIETY": [],
        "SADNESS": [],
        "HAPPY": [],
        "NEGATED": [],  # Cặp (Category, Keyword) bị phủ định
        "INDIRECT": [], # Cặp (Category, Expression) gián tiếp
        "LAUGHTER": False,
        "QUESTION": False,
        "EXCLAMATION": False
    }
    
    signals = []
    signals.extend(intensity_signals)
    signals.extend(hesitation_signals)
    
    padded = f" {normalized} "
    
    # 4. Phát hiện tiếng cười
    for laugh in LAUGHTER_WORDS:
        if f" {laugh} " in padded:
            matched_features["LAUGHTER"] = True
            signals.append("laughter")
            break
            
    # 5. Phát hiện dấu hỏi chấm (?) và dấu chấm than (!) từ văn bản gốc
    if "?" in text:
        matched_features["QUESTION"] = True
        signals.append("question")
    if "!" in text:
        matched_features["EXCLAMATION"] = True
        signals.append("exclamation")
        
    # 6. Phát hiện biểu hiện gián tiếp
    for emotion_key, expr_list in INDIRECT_EXPRESSIONS.items():
        for expr in expr_list:
            if expr in normalized:
                matched_features["INDIRECT"].append((emotion_key, expr))
                signals.append(f"indirect_{emotion_key.lower()}")
                
    # 7. Phát hiện từ khóa trực tiếp (có kiểm tra phủ định)
    categories = {
        "STRESS": STRESS_KEYWORDS,
        "ANXIETY": ANXIETY_KEYWORDS,
        "SADNESS": SADNESS_KEYWORDS,
        "HAPPY": HAPPY_KEYWORDS
    }
    
    temp_padded = padded
    for cat_name, kw_list in categories.items():
        # Sắp xếp từ khóa có độ dài lớn trước để ưu tiên trùng khớp cụm từ dài
        sorted_kws = sorted(kw_list, key=len, reverse=True)
        for kw in sorted_kws:
            pattern = f" {kw} "
            if pattern in temp_padded:
                # Kiểm tra xem từ khóa này có bị phủ định hay không
                kw_words = kw.split()
                is_neg = any(w in negated_words for w in kw_words)
                
                if is_neg:
                    matched_features["NEGATED"].append((cat_name, kw))
                    signals.append("negation")
                else:
                    matched_features[cat_name].append(kw)
                
                # Thay thế từ khóa đã khớp để tránh trùng khớp lồng nhau
                temp_padded = temp_padded.replace(pattern, " [matched_kw] ")
                
    return {
        "text": text,
        "normalized": normalized,
        "matched_features": matched_features,
        "hesitation_score": hesitation_score,
        "has_low": has_low,
        "has_high": has_high,
        "signals": list(set(signals))
    }
