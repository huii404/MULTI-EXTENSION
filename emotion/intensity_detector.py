# -*- coding: utf-8 -*-
from .keyword_dictionary import LOW_INTENSIFIERS, HIGH_INTENSIFIERS

def detect_intensity(normalized_text):
    """
    Phát hiện mức độ cường độ của cảm xúc trong câu dựa vào phó từ mức độ.
    Trả về:
    - has_low (bool): Có phó từ giảm nhẹ (hơi, một chút...) hay không.
    - has_high (bool): Có phó từ tăng cường (rất, cực kỳ...) hay không.
    - signals (list): Danh sách tín hiệu cường độ phát hiện được.
    """
    has_low = False
    has_high = False
    signals = []

    padded = f" {normalized_text} "

    # Kiểm tra phó từ mức độ thấp
    for low in LOW_INTENSIFIERS:
        if f" {low} " in padded:
            has_low = True
            signals.append("intensity_low")
            break

    # Kiểm tra phó từ mức độ cao
    for high in HIGH_INTENSIFIERS:
        if f" {high} " in padded:
            has_high = True
            signals.append("intensity_high")
            break

    return has_low, has_high, signals
