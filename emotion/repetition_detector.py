# -*- coding: utf-8 -*-
import re

def detect_repetition(text):
    """
    Phát hiện lặp từ trong văn bản.
    Trả về:
    - has_repetition (bool): Có lặp từ hay không
    - count (int): Số lượng từ lặp
    - has_toi_toi (bool): Có lặp cụm "tôi... tôi" hay không
    - details (list): Danh sách các từ bị lặp
    """
    has_repetition = False
    count = 0
    has_toi_toi = False
    details = []

    # 1. Phát hiện "tôi... tôi" (hoặc tôi tôi)
    tôi_pattern = r'\btôi\b\s*(?:\.\.\.|\s+)\s*\btôi\b'
    if re.search(tôi_pattern, text, re.IGNORECASE):
        has_toi_toi = True
        has_repetition = True
        count += 1
        details.append("tôi")

    # 2. Phát hiện các từ lặp đứng cạnh nhau hoặc cách nhau bởi "..." (Bỏ qua tiếng cười như 'k k', 'ha ha')
    laughter_tokens = ["k", "kk", "kkk", "kkkk", "haha", "hehe", "hihi", "kaka", "ha"]
    words = re.findall(r'\b(\w+)\b\s*(?:\.\.\.|\s+)\b\1\b', text, re.IGNORECASE)
    for w in words:
        w_lower = w.lower()
        if w_lower != "tôi" and w_lower not in laughter_tokens:
            has_repetition = True
            count += 1
            if w_lower not in details:
                details.append(w_lower)

    return has_repetition, count, has_toi_toi, details
