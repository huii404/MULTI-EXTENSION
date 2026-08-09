# -*- coding: utf-8 -*-
import sys
import os

# Thêm thư mục gốc của dự án vào sys.path để import được module emotion
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from emotion import EmotionAnalyzer

def run_tests():
    analyzer = EmotionAnalyzer()
    
    test_cases = [
        # --- STRESS (5) ---
        {
            "text": "Tôi nói bao nhiêu lần rồi mà bạn vẫn làm sai.",
            "expected": "STRESS",
            "desc": "Câu stress gián tiếp"
        },
        {
            "text": "Bực mình thật chứ! Cứ phải làm đi làm lại cái việc này hoài!",
            "expected": "STRESS",
            "desc": "Câu stress trực tiếp với từ khóa và cảm thán"
        },
        {
            "text": "Sao cứ như vậy hoài vậy? Tôi bực lắm rồi đấy!",
            "expected": "STRESS",
            "desc": "Câu bực bội gián tiếp kết hợp từ khóa mức độ"
        },
        {
            "text": "Cái này vô lý quá, làm ăn kiểu gì không biết nữa!",
            "expected": "STRESS",
            "desc": "Cáu gắt, vô lý quá"
        },
        {
            "text": "Tôi điên mất, áp lực công việc dạo này căng thẳng chịu không nổi!",
            "expected": "STRESS",
            "desc": "Căng thẳng cực độ, bộc lộ trực tiếp"
        },
        
        # --- ANXIETY (5) ---
        {
            "text": "Ừm... tôi... tôi không biết nữa. Mai tôi phải thuyết trình mà tôi sợ mình làm không tốt.",
            "expected": "ANXIETY",
            "desc": "Lo lắng với ngập ngừng, lặp từ, từ sợ hãi"
        },
        {
            "text": "Liệu... liệu có chuyện gì xảy ra không hả bạn? Tôi lo quá...",
            "expected": "ANXIETY",
            "desc": "Lo lắng với ngập ngừng lặp từ và dấu ba chấm"
        },
        {
            "text": "Không biết ngày mai thi cử thế nào nữa, run quá trời luôn.",
            "expected": "ANXIETY",
            "desc": "Lo lắng không chắc chắn kèm từ khóa run"
        },
        {
            "text": "Nếu như mình thi trượt đại học thì bố mẹ sẽ thất vọng lắm... phải làm sao đây?",
            "expected": "ANXIETY",
            "desc": "Câu hỏi bất an lo lắng"
        },
        {
            "text": "Hình như có cái gì đó bất an lắm, tôi cảm thấy bồn chồn trong người.",
            "expected": "ANXIETY",
            "desc": "Không chắc chắn, bồn chồn"
        },
        
        # --- SADNESS (5) ---
        {
            "text": "Tôi không vui chút nào, dạo này cô đơn và chán nản quá.",
            "expected": "SADNESS",
            "desc": "Phủ định tích cực (không vui) + buồn bã cô đơn"
        },
        {
            "text": "Dạo này tôi chẳng muốn làm gì cả, mọi thứ dường như không còn ý nghĩa...",
            "expected": "SADNESS",
            "desc": "Buồn bã biểu hiện gián tiếp"
        },
        {
            "text": "Tôi thấy đau lòng lắm, tôi nhớ người ấy nhiều...",
            "expected": "SADNESS",
            "desc": "Đau lòng, nhớ thương, buồn bã"
        },
        {
            "text": "Thất bại lần này làm mình nản lòng ghê gớm. Cảm thấy bản thân vô dụng ghê.",
            "expected": "SADNESS",
            "desc": "Thất bại chán nản"
        },
        {
            "text": "Hôm nay thật sự là một ngày tệ, tôi chỉ muốn ở một mình thoi...",
            "expected": "SADNESS",
            "desc": "Ngày tệ, muốn ở một mình"
        },
        
        # --- HAPPY (5) ---
        {
            "text": "Cuối cùng cũng xong rồi! Hahaha! Vui quá đi mất!",
            "expected": "HAPPY",
            "desc": "Vui vẻ có tiếng cười, từ khóa và dấu cảm thán"
        },
        {
            "text": "Tuyệt vời quá bạn ơi, mình được điểm mười môn Toán rồi! Yêu đời ghê!",
            "expected": "HAPPY",
            "desc": "Tuyệt vời, yêu đời"
        },
        {
            "text": "Hôm nay trời đẹp quá, mình cảm thấy rất hạnh phúc.",
            "expected": "HAPPY",
            "desc": "Hạnh phúc trời đẹp"
        },
        {
            "text": "May quá, cuối cùng cũng qua môn rồi! Cảm ơn bạn nhiều nhé.",
            "expected": "HAPPY",
            "desc": "Biểu hiện gián tiếp vui mừng"
        },
        {
            "text": "Hôm nay đi chơi với bạn bè vui vẻ cực kỳ luôn ấy.",
            "expected": "HAPPY",
            "desc": "Vui vẻ cực kỳ"
        },
        
        # --- MIXED & NEUTRAL (3) ---
        {
            "text": "Xin chào, hôm nay bạn có khỏe không?",
            "expected": "NEUTRAL",
            "desc": "Câu hỏi thăm trung tính"
        },
        {
            "text": "Tôi không lo lắng gì cả, mọi thứ vẫn ổn.",
            "expected": "NEUTRAL",
            "desc": "Phủ định lo lắng (không lo lắng)"
        },
        {
            "text": "Ừm... à... để tôi xem...",
            "expected": "NEUTRAL",
            "desc": "Chỉ có từ ngập ngừng đệm, không có nội dung cảm xúc"
        }
    ]
    
    print("=" * 80)
    print("CHẠY KIỂM THỬ BỘ PHÂN TÍCH CẢM XÚC EMOTION ANALYZER")
    print("=" * 80)
    
    history = []
    passed = 0
    
    for idx, tc in enumerate(test_cases, 1):
        text = tc["text"]
        expected = tc["expected"]
        desc = tc["desc"]
        
        # Chạy phân tích cảm xúc
        result = analyzer.analyze(text, history)
        
        # Thêm vào lịch sử để cập nhật trend ở lượt tiếp theo
        history.append({
            "emotion": result.emotion,
            "scores": result.scores,
            "intensity": result.intensity
        })
        
        is_pass = result.emotion == expected
        if is_pass:
            passed += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        print(f"\nTest #{idx}: {desc}")
        print(f"  - Input:      \"{text}\"")
        print(f"  - Expected:   {expected}")
        print(f"  - Predicted:  {result.emotion} (Confidence: {result.confidence * 100}%, Intensity: {result.intensity}/100, Trend: {result.trend})")
        print(f"  - Scores:     Stress={result.scores['stress']}, Anxiety={result.scores['anxiety']}, Sadness={result.scores['sadness']}, Happy={result.scores['happy']}")
        print(f"  - Signals:    {result.signals}")
        print(f"  - Status:     {status}")
        
        if not is_pass:
            print(f"  ⚠️ Cảnh báo: Phân loại không chính xác hoặc không chắc chắn!")
            
    print("\n" + "=" * 80)
    print(f"KẾT QUẢ KIỂM THỬ: Đã vượt qua {passed}/{len(test_cases)} test cases.")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
