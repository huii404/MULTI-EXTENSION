# -*- coding: utf-8 -*-
from .keyword_dictionary import NEGATION_WORDS

def detect_negations(normalized_text):
    """
    Phát hiện các từ bị phủ định trong câu bằng phương pháp cửa sổ (window search).
    Ví dụ: "không vui" -> "vui" bị phủ định.
    Trả về danh sách các từ nằm ngay sau từ phủ định (trong khoảng 2 từ).
    """
    tokens = [t.strip() for t in normalized_text.split() if t.strip()]
    negated_words = []
    
    i = 0
    while i < len(tokens):
        matched_negation = None
        # Kiểm tra các cụm từ phủ định trước (sắp xếp theo độ dài giảm dần)
        for neg in sorted(NEGATION_WORDS, key=len, reverse=True):
            neg_tokens = neg.split()
            n_len = len(neg_tokens)
            if i + n_len <= len(tokens) and tokens[i:i+n_len] == neg_tokens:
                matched_negation = neg
                i += n_len
                break
                
        if matched_negation:
            # Phủ định tối đa 2 từ tiếp theo trong câu
            for w_idx in range(i, min(i + 2, len(tokens))):
                negated_words.append(tokens[w_idx])
        else:
            i += 1
            
    return negated_words
