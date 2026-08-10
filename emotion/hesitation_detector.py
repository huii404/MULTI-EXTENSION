# -*- coding: utf-8 -*-
import re
from .keyword_dictionary import HESITATION_WORDS
from .repetition_detector import detect_repetition

def detect_hesitation(text, normalized_text):
    """
    Phát hiện dấu hiệu ngập ngừng và lặp từ trong câu nói.
    Trả về điểm ngập ngừng (HESITATION_SCORE) và danh sách tín hiệu phát hiện được.
    """
    score = 0
    signals = []
    
    # 1. Đếm số lần xuất hiện của "..." trong văn bản gốc
    dot_count = text.count("...")
    if dot_count > 0:
        score += dot_count
        signals.append("hesitation")
        
    # 2. Đếm các từ đệm ngập ngừng trong văn bản chuẩn hóa
    padded = f" {normalized_text} "
    hes_word_count = 0
    sorted_hes = sorted(HESITATION_WORDS, key=len, reverse=True)
    
    temp_padded = padded
    for word in sorted_hes:
        pattern = f" {word} "
        while pattern in temp_padded:
            hes_word_count += 1
            temp_padded = temp_padded.replace(pattern, " [matched] ", 1)
            
    if hes_word_count == 1:
        score += 1
        signals.append("hesitation")
    elif hes_word_count == 2:
        score += 2
        signals.append("hesitation")
    elif hes_word_count >= 3:
        score += 3
        signals.append("hesitation")
        
    # 3. Sử dụng repetition_detector để phát hiện lặp từ
    has_rep, count, has_toi_toi, details = detect_repetition(text)
    if has_rep:
        if has_toi_toi:
            score += 3
            signals.append("word_repetition")
        # Điểm cộng cho các lặp từ khác
        other_rep_count = count - (1 if has_toi_toi else 0)
        if other_rep_count > 0:
            score += 2 * other_rep_count
            signals.append("word_repetition")
        
    # 4. Câu bị bỏ dở (kết thúc bằng "..." hoặc từ đệm ngập ngừng)
    cleaned_end = text.strip()
    if cleaned_end.endswith("..."):
        score += 2
        signals.append("hesitation")
    else:
        tokens = [t.strip() for t in re.split(r'\s+', normalized_text) if t.strip()]
        if tokens and tokens[-1] in HESITATION_WORDS:
            score += 2
            signals.append("hesitation")
            
    # 5. Sửa đổi câu / chữa câu (ví dụ: "à không", "nhầm", "ý tôi là")
    correction_keywords = ["à không", "nhầm", "ý tôi là", "nói lộn", "thay vì"]
    if any(ck in normalized_text for ck in correction_keywords):
        score += 2
        signals.append("hesitation")
        
    # Loại bỏ tín hiệu trùng lặp trong list signals
    signals = list(set(signals))
    return score, signals
