# YÊU CẦU TÍCH HỢP BỘ PHÂN TÍCH CẢM XÚC VÀO DỰ ÁN HIỆN TẠI

## 1. Bối cảnh

Tôi đã có một **dự án hiện tại** với giao diện, chatbot và các chức năng
đang hoạt động.

**Không xây dựng lại dự án từ đầu.**

Hãy đọc, phân tích và hiểu **codebase hiện tại** trước khi thực hiện
thay đổi.

Mục tiêu là **mở rộng dự án hiện tại**, bổ sung:

1.  Chức năng **chat với chatbot bằng giọng nói**.
2.  Chức năng **Speech-to-Text (STT)** để chuyển giọng nói của người
    dùng thành văn bản.
3.  Chức năng **phân tích cảm xúc từ nội dung STT**.
4.  Kết hợp kết quả phân tích cảm xúc với lịch sử hội thoại để theo dõi
    trạng thái cảm xúc của người dùng theo thời gian.

Không làm ảnh hưởng hoặc phá vỡ các chức năng hiện có.

------------------------------------------------------------------------

# 2. CHỨC NĂNG CHAT BẰNG GIỌNG NÓI

Trong giao diện chatbot hiện tại, bổ sung một nút hoặc cơ chế để người
dùng có thể **nói chuyện trực tiếp với chatbot**.

Luồng hoạt động:

``` text
Người dùng nhấn nút Microphone
        ↓
Hệ thống bắt đầu ghi âm
        ↓
Người dùng nói
        ↓
Speech-to-Text
        ↓
Chuyển giọng nói → Text
        ↓
Hiển thị text trong khung chat
        ↓
Text được gửi cho Chatbot
        ↓
Chatbot xử lý và trả lời
        ↓
Hiển thị câu trả lời
```

STT phải là **một phần của chức năng Voice Chat**, không phải một chức
năng tách rời mà người dùng phải thao tác thủ công.

------------------------------------------------------------------------

# 3. GIAO DIỆN VOICE CHAT

Trong giao diện chatbot hiện tại, thêm nút microphone.

Ví dụ:

``` text
┌──────────────────────────────────────────┐
│              CHATBOT                     │
│                                          │
│  Bot: Hôm nay bạn cảm thấy thế nào?      │
│                                          │
│  User: Tôi hơi lo về bài kiểm tra...     │
│                                          │
├──────────────────────────────────────────┤
│ Nhập tin nhắn...                  🎤  ➤ │
└──────────────────────────────────────────┘
```

Khi người dùng nhấn microphone:

``` text
🎤 → 🔴 Recording...
```

Sau khi người dùng dừng nói:

``` text
Recording
   ↓
STT
   ↓
"Ừm... tôi hơi lo về bài kiểm tra ngày mai."
```

Text phải được đưa vào ô chat hoặc gửi trực tiếp theo thiết kế hiện tại.

------------------------------------------------------------------------

# 4. YÊU CẦU ĐỐI VỚI STT

Hệ thống phải:

-   Nhận giọng nói của người dùng.
-   Chuyển giọng nói thành tiếng Việt.
-   Hỗ trợ tiếng Việt có dấu.
-   Xử lý được cách nói tự nhiên.
-   Giữ lại càng nhiều càng tốt các dấu hiệu quan trọng trong lời nói.
-   Không tự ý làm mất các từ đệm hoặc sự lặp từ nếu những thông tin này
    có thể được dùng cho phân tích cảm xúc.

Ví dụ, nếu người dùng nói:

``` text
"Ừm... tôi... tôi không biết nữa."
```

STT nên cố gắng giữ transcript gần với:

``` text
"Ừm... tôi... tôi không biết nữa."
```

thay vì biến thành:

``` text
"Tôi không biết nữa."
```

vì sự ngập ngừng và lặp từ là tín hiệu quan trọng để phân tích
**ANXIETY**.

------------------------------------------------------------------------

# 5. TÍCH HỢP EMOTION ANALYZER

Sau khi STT tạo ra text:

``` text
Speech
↓
STT
↓
Transcript
↓
Emotion Analyzer
↓
Emotion Result
↓
Chatbot
```

Emotion Analyzer phải phân tích **chính transcript mà người dùng vừa
nói**.

Không yêu cầu người dùng nhập thêm thông tin cảm xúc thủ công.

------------------------------------------------------------------------

# 6. 4 NHÓM CẢM XÚC CHÍNH

Phân tích:

``` text
STRESS    = Căng thẳng / Bực bội
ANXIETY   = Lo lắng / Hồi hộp
SADNESS   = Buồn bã
HAPPY     = Vui vẻ
```

Có thêm:

``` text
NEUTRAL   = Bình thường / Không đủ dấu hiệu
```

Không ép mọi câu nói phải thuộc một trong bốn cảm xúc.

------------------------------------------------------------------------

# 7. MỤC TIÊU CỦA EMOTION ANALYZER

Không được chỉ sử dụng keyword matching đơn giản.

Không làm kiểu:

``` python
if "buồn" in text:
    emotion = "SADNESS"
```

Thay vào đó phải phân tích nhiều tín hiệu:

-   Từ khóa cảm xúc.
-   Cụm từ cảm xúc.
-   Ngữ cảnh.
-   Từ phủ định.
-   Mức độ/cường độ.
-   Sự ngập ngừng.
-   Lặp từ.
-   Câu bị bỏ dở.
-   Từ thể hiện sự không chắc chắn.
-   Câu hỏi mang tính lo lắng.
-   Câu cảm thán.
-   Từ tích cực/tiêu cực.
-   Xu hướng cảm xúc qua nhiều lượt nói.

------------------------------------------------------------------------

# 8. KIẾN TRÚC EMOTION ANALYZER

Thiết kế theo pipeline:

``` text
Speech
    ↓
Speech-to-Text
    ↓
Transcript
    ↓
Text Preprocessing
    ↓
Feature Extraction
    ├── Keyword Detection
    ├── Context Detection
    ├── Negation Detection
    ├── Hesitation Detection
    ├── Repetition Detection
    ├── Intensity Detection
    ├── Uncertainty Detection
    └── Sentence Pattern Detection
    ↓
Emotion Scoring
    ↓
Confidence Calculation
    ↓
Emotion Classification
    ↓
Emotion History
    ↓
Trend Analysis
```

------------------------------------------------------------------------

# 9. CÁC SCORE

Tạo 4 score độc lập:

``` text
STRESS_SCORE
ANXIETY_SCORE
SADNESS_SCORE
HAPPY_SCORE
```

Sau đó xác định cảm xúc nổi bật nhất.

Nếu tất cả score đều thấp:

``` text
NEUTRAL
```

------------------------------------------------------------------------

# 10. STRESS / CĂNG THẲNG / BỰC BỘI

## Từ khóa

``` text
bực
bực mình
tức
tức giận
khó chịu
ức chế
cáu
cáu gắt
điên
phát điên
mệt mỏi
phiền
phiền phức
không chịu nổi
chịu không nổi
quá đáng
vô lý
ức
stress
áp lực
căng thẳng
mệt quá
ngán
ngán ngẩm
```

## Biểu hiện gián tiếp

``` text
Sao cứ như vậy hoài vậy?
Tôi nói bao nhiêu lần rồi?
Làm gì mà lâu vậy?
Nhanh lên được không?
Thật sự chịu không nổi.
Tôi mệt với chuyện này rồi.
Bao giờ mới xong?
Cứ phải làm đi làm lại.
Tại sao chuyện đơn giản như vậy cũng không làm được?
```

Các dấu hiệu này phải làm tăng `STRESS_SCORE`.

------------------------------------------------------------------------

# 11. ANXIETY / LO LẮNG / HỒI HỘP

## Từ khóa

``` text
lo
lo lắng
sợ
sợ rằng
e là
không biết
không chắc
không biết phải làm sao
hồi hộp
bất an
bồn chồn
run
sợ quá
tôi sợ
tôi lo
liệu
không biết có được không
nhỡ
lỡ
hay là
có khi
chắc không
```

## Biểu hiện không chắc chắn

``` text
không biết...
hình như...
có lẽ...
có khi...
có vẻ...
liệu...
hay là...
chắc không...
tôi không chắc...
```

Các tín hiệu này phải làm tăng `ANXIETY_SCORE`.

------------------------------------------------------------------------

# 12. PHÁT HIỆN NGẬP NGỪNG

Đây là một trong những feature quan trọng nhất đối với voice chat.

Ví dụ STT:

``` text
Ừm... tôi... tôi không biết nữa.
```

Phải phát hiện:

-   Ờ
-   Ừ
-   Ừm
-   Ờm
-   À
-   Hmm
-   Um
-   Umm
-   Kiểu
-   Kiểu như
-   Nói chung là
-   Thật ra là
-   `...`

Tạo:

``` text
HESITATION_SCORE
```

Scoring ban đầu:

``` text
1 từ đệm       = +1
2 từ đệm       = +2
3+ từ đệm      = +3
"..."          = +1
lặp từ         = +2
"tôi... tôi"   = +3
câu bỏ dở      = +2
sửa câu        = +2
```

`HESITATION_SCORE` chủ yếu đóng góp vào `ANXIETY_SCORE`.

Không được coi một từ "ờ" đơn lẻ là bằng chứng chắc chắn của lo lắng.

Ví dụ:

``` text
Ờ, hôm nay trời đẹp.
```

Không nên tự động phân loại thành ANXIETY.

Nhưng:

``` text
Ờm... tôi... tôi không biết phải nói sao.
```

phải có ANXIETY cao.

------------------------------------------------------------------------

# 13. PHÁT HIỆN LẶP TỪ

Ví dụ:

``` text
tôi... tôi...
không... không biết...
ừm... tôi...
có... có lẽ...
```

→ tăng `ANXIETY_SCORE`.

Nhưng phải phân biệt với:

``` text
không! không! không!
tôi nói rồi!
đã bảo rồi!
không được! không được!
```

→ có thể là `STRESS`.

------------------------------------------------------------------------

# 14. SADNESS / BUỒN BÃ

## Từ khóa

``` text
buồn
buồn quá
thất vọng
chán
chán nản
cô đơn
mệt mỏi
tuyệt vọng
đau lòng
tổn thương
không vui
không còn muốn
nản
nản lòng
thất bại
mất
nhớ
nhớ ai đó
không còn
vô vọng
```

## Biểu hiện gián tiếp

``` text
Dạo này tôi chẳng muốn làm gì cả.
Mọi thứ hình như chẳng còn ý nghĩa.
Tôi không còn hứng thú với những thứ trước đây.
Tôi cảm thấy mình không làm được gì.
Chẳng ai hiểu tôi cả.
Tôi chỉ muốn ở một mình.
Hôm nay thật sự là một ngày tệ.
```

------------------------------------------------------------------------

# 15. HAPPY / VUI VẺ

## Từ khóa

``` text
vui
vui quá
vui vẻ
hạnh phúc
tuyệt
tuyệt vời
thích
thích quá
hào hứng
phấn khích
may quá
tốt quá
đỉnh
quá tuyệt
thành công
chiến thắng
yêu
haha
hahaha
hehe
hihi
```

## Biểu hiện gián tiếp

``` text
Cuối cùng cũng làm xong rồi!
Tôi qua môn rồi!
May quá!
Tuyệt quá!
Hôm nay thật tuyệt!
```

------------------------------------------------------------------------

# 16. TIẾNG CƯỜI

Nhận diện:

``` text
haha
hahaha
hehe
hihi
ha ha
```

Có thể:

``` text
HAPPY_SCORE +2
```

Nhưng không coi đây là bằng chứng tuyệt đối.

Ví dụ:

``` text
Haha, mày làm gì vậy?
```

không nhất thiết là HAPPY.

------------------------------------------------------------------------

# 17. NEGATION / PHỦ ĐỊNH

Phải có module xử lý phủ định.

Các từ:

``` text
không
chẳng
chả
chưa
không còn
không muốn
chẳng muốn
không thích
```

Ví dụ:

``` text
Tôi không vui.
```

Không được chỉ tìm thấy "vui" rồi cộng HAPPY.

Phải hiểu:

``` text
HAPPY_SCORE giảm
SADNESS_SCORE tăng
```

Tương tự:

``` text
Tôi không lo.
```

không được phân loại thành ANXIETY chỉ vì có từ "lo".

------------------------------------------------------------------------

# 18. INTENSITY / CƯỜNG ĐỘ

## Mức thấp

``` text
hơi
một chút
có chút
khá
```

## Mức cao

``` text
rất
cực kỳ
vô cùng
quá
thật sự
không chịu nổi
```

Ví dụ:

``` text
Tôi hơi lo.
```

→ ANXIETY thấp.

``` text
Tôi cực kỳ lo lắng.
```

→ ANXIETY cao.

------------------------------------------------------------------------

# 19. CÂU HỎI MANG TÍNH LO LẮNG

Nhận diện:

``` text
Liệu...
Không biết...
Có ... không?
Nếu... thì sao?
Nhỡ...
Lỡ...
Hay là...
Có nên...?
Mình phải làm sao?
```

Ví dụ:

``` text
Nếu tôi thi không đạt thì sao?
```

→ ANXIETY tăng mạnh.

------------------------------------------------------------------------

# 20. PHÂN BIỆT CÁC CẢM XÚC DỄ NHẦM

### Anxiety

``` text
Tôi không biết ngày mai sẽ thế nào.
```

→ Không chắc chắn / lo lắng.

### Sadness

``` text
Tôi thất vọng vì mọi thứ không như mình mong muốn.
```

→ Thất vọng / buồn.

### Stress

``` text
Tôi đã nói bao nhiêu lần rồi? Sao vẫn không chịu nghe?
```

→ Bực tức / mất kiên nhẫn.

------------------------------------------------------------------------

# 21. BẢNG TRỌNG SỐ BAN ĐẦU

  Feature                   STRESS   ANXIETY   SADNESS   HAPPY
  ----------------------- -------- --------- --------- -------
  Từ tức giận                   +3         0         0       0
  Từ khó chịu                   +2         0        +1       0
  Từ áp lực                     +3        +2         0       0
  Từ lo lắng                     0        +3         0       0
  Từ sợ                          0        +3        +1       0
  Ngập ngừng                     0        +2         0       0
  Lặp từ do hồi hộp              0        +2         0       0
  Không chắc chắn                0        +2         0       0
  Thất vọng                      0        +1        +3       0
  Cô đơn                         0        +1        +3       0
  Buồn                           0         0        +3       0
  Hạnh phúc                      0         0         0      +3
  Hào hứng                       0         0         0      +3
  Tiếng cười                     0         0         0      +2
  Từ tích cực                    0         0         0      +1
  Không + từ tích cực            0         0        +2      -2
  Câu hỏi bất an                 0        +2         0       0
  Câu cảm thán tích cực          0         0         0      +2
  Câu cảm thán tiêu cực         +2        +1        +1       0

Đây chỉ là **initial weights**.

Thiết kế code để dễ dàng thay đổi trọng số.

------------------------------------------------------------------------

# 22. CONFIDENCE

Tính:

``` text
CONFIDENCE
```

Ví dụ:

``` text
ANXIETY = 9
STRESS = 2
SADNESS = 0
HAPPY = 0
```

→ Confidence cao.

Nhưng:

``` text
ANXIETY = 4
STRESS = 4
SADNESS = 3
HAPPY = 0
```

→ Confidence thấp.

Confidence phải phản ánh mức độ chênh lệch giữa cảm xúc đứng đầu và các
cảm xúc còn lại.

------------------------------------------------------------------------

# 23. INTENSITY

Chuẩn hóa thành:

``` text
0 - 100
```

Phân loại:

``` text
0-20    = Very Low
21-40   = Low
41-60   = Medium
61-80   = High
81-100  = Very High
```

------------------------------------------------------------------------

# 24. EMOTION HISTORY

Không chỉ phân tích từng câu riêng lẻ.

Mỗi lượt nói phải lưu:

``` text
timestamp
text
stress_score
anxiety_score
sadness_score
happy_score
dominant_emotion
confidence
intensity
```

Ví dụ:

``` text
14:30  ANXIETY  40
14:31  ANXIETY  50
14:32  ANXIETY  65
14:33  ANXIETY  72
14:34  ANXIETY  80
```

Hệ thống phải phát hiện:

``` text
TREND = INCREASING
```

------------------------------------------------------------------------

# 25. TREND

Hỗ trợ:

``` text
INCREASING
DECREASING
STABLE
FLUCTUATING
```

Ví dụ:

``` text
ANXIETY:
40 → 50 → 60 → 70
```

→ `INCREASING`

``` text
ANXIETY:
80 → 65 → 45 → 30
```

→ `DECREASING`

------------------------------------------------------------------------

# 26. TÍCH HỢP VỚI CHATBOT

Mỗi tin nhắn của người dùng phải có thể chứa:

``` text
{
    "text": "...",
    "source": "text" | "voice",
    "emotion": "...",
    "emotion_score": {...},
    "confidence": ...,
    "intensity": ...,
    "timestamp": "..."
}
```

Ví dụ người dùng nói:

``` text
"Ừm... tôi hơi lo về bài kiểm tra ngày mai."
```

Hệ thống:

``` text
STT
↓
"Ừm... tôi hơi lo về bài kiểm tra ngày mai."
↓
Emotion Analyzer
↓
ANXIETY
↓
Chatbot
```

Chatbot vẫn phải nhận **text bình thường** để xử lý câu hỏi.

Emotion Analyzer là một lớp bổ sung, không được làm thay đổi logic
chatbot hiện tại nếu không cần thiết.

------------------------------------------------------------------------

# 27. CHATBOT CÓ THỂ SỬ DỤNG EMOTION RESULT

Nếu hệ thống chatbot hiện tại có logic tạo phản hồi dựa trên trạng thái
người dùng, hãy cho phép chatbot nhận thêm:

``` text
current_emotion
emotion_intensity
emotion_confidence
emotion_trend
```

Ví dụ:

``` text
User:
"Ừm... tôi... tôi sợ mình không làm được."

Emotion:
ANXIETY
Intensity:
82
Trend:
INCREASING
```

Chatbot có thể phản hồi theo ngữ cảnh phù hợp.

Tuy nhiên **không được để Emotion Analyzer tự động chẩn đoán bệnh hoặc
vấn đề tâm lý**.

------------------------------------------------------------------------

# 28. OUTPUT FORMAT

Emotion Analyzer nên trả về:

``` json
{
  "emotion": "ANXIETY",
  "intensity": 78,
  "confidence": 0.86,
  "trend": "INCREASING",
  "scores": {
    "stress": 5,
    "anxiety": 9,
    "sadness": 1,
    "happy": 0
  },
  "signals": [
    "hesitation",
    "word_repetition",
    "uncertainty",
    "fear_expression"
  ],
  "source": "voice",
  "text": "Ừm... tôi... tôi không biết nữa. Mai tôi phải thuyết trình mà tôi sợ mình làm không tốt."
}
```

------------------------------------------------------------------------

# 29. MODULE / FOLDER STRUCTURE

Không hard-code tất cả vào một file.

Có thể tổ chức tương tự:

``` text
project/
│
├── chatbot/
│   ├── ...
│
├── speech/
│   ├── speech_to_text
│   └── ...
│
├── emotion/
│   ├── emotion_analyzer
│   ├── keyword_dictionary
│   ├── feature_extractor
│   ├── hesitation_detector
│   ├── repetition_detector
│   ├── negation_detector
│   ├── intensity_detector
│   ├── emotion_scorer
│   ├── confidence_calculator
│   └── trend_analyzer
│
└── ...
```

**Không bắt buộc phải dùng chính xác cấu trúc này.**

Hãy ưu tiên cấu trúc phù hợp với codebase hiện tại.

------------------------------------------------------------------------

# 30. API

Tạo module có API tương tự:

``` python
result = analyzer.analyze(text)
```

Kết quả cần có:

``` python
result.emotion
result.intensity
result.confidence
result.trend
result.scores
result.signals
```

Nếu dự án hiện tại dùng ngôn ngữ/framework khác, hãy tích hợp theo kiến
trúc hiện có thay vì ép dự án chuyển sang Python.

------------------------------------------------------------------------

# 31. YÊU CẦU QUAN TRỌNG VỀ CODEBASE HIỆN TẠI

Trước khi sửa code:

1.  Đọc cấu trúc project.
2.  Xác định frontend.
3.  Xác định backend.
4.  Xác định chatbot implementation.
5.  Xác định STT hiện tại nếu đã có.
6.  Xác định cách chatbot nhận và gửi message.
7.  Xác định nơi phù hợp để tích hợp Emotion Analyzer.
8.  Kiểm tra các dependency hiện tại.

**Không tạo một project mới độc lập.**

**Không xóa hoặc thay thế các chức năng hiện tại nếu không cần thiết.**

Hãy tích hợp vào kiến trúc hiện có.

------------------------------------------------------------------------

# 32. NẾU DỰ ÁN ĐÃ CÓ STT

Nếu project hiện tại đã có Speech-to-Text:

-   Tái sử dụng STT hiện tại.
-   Không tạo thêm một STT engine khác nếu không cần thiết.
-   Chỉ bổ sung các hook/API cần thiết để lấy transcript.
-   Đưa transcript vào Emotion Analyzer.

Luồng:

``` text
Existing STT
    ↓
Transcript
    ├──→ Existing Chatbot
    │
    └──→ Emotion Analyzer
              ↓
        Emotion Result
```

------------------------------------------------------------------------

# 33. NẾU DỰ ÁN CHƯA CÓ STT

Nếu project chưa có STT:

1.  Chọn giải pháp STT phù hợp với kiến trúc hiện tại.
2.  Ưu tiên tiếng Việt.
3.  Tích hợp vào giao diện chatbot.
4.  Có trạng thái recording rõ ràng.
5.  Có xử lý lỗi microphone.
6.  Có xử lý trường hợp không nhận diện được giọng nói.
7.  Không làm ảnh hưởng đến chat bằng text.

Luồng:

``` text
Text Chat
   └──→ Chatbot

Voice Chat
   ↓
Microphone
   ↓
STT
   ├──→ Chatbot
   └──→ Emotion Analyzer
```

------------------------------------------------------------------------

# 34. TEST CASES

Tạo ít nhất 20 test cases tiếng Việt.

Phải bao gồm:

-   5 câu STRESS.
-   5 câu ANXIETY.
-   5 câu SADNESS.
-   5 câu HAPPY.

Đặc biệt phải có:

-   Câu có ngập ngừng.
-   Câu có lặp từ.
-   Câu phủ định.
-   Câu không có keyword trực tiếp.
-   Câu có nhiều cảm xúc cùng lúc.
-   Câu trung tính.
-   Câu có lỗi nhỏ từ STT.
-   Câu có tiếng cười.
-   Câu có dấu `...`.

Ví dụ:

``` text
"Ừm... tôi... tôi không biết nữa."
```

``` text
"Tôi nói bao nhiêu lần rồi mà bạn vẫn làm sai."
```

``` text
"Tôi không còn hứng thú với chuyện này nữa."
```

``` text
"Cuối cùng cũng xong rồi! Hahaha!"
```

------------------------------------------------------------------------

# 35. YÊU CẦU TEST

Sau khi triển khai:

1.  Chạy test Emotion Analyzer.
2.  Hiển thị input.
3.  Hiển thị predicted emotion.
4.  Hiển thị score.
5.  Hiển thị confidence.
6.  Hiển thị signals.
7.  Chỉ ra những trường hợp phân loại không chắc chắn.
8.  Điều chỉnh rule/weight nếu cần.

------------------------------------------------------------------------

# 36. YÊU CẦU GIAO DIỆN

Nếu giao diện hiện tại có khu vực hiển thị trạng thái cảm xúc, hãy tích
hợp kết quả vào đó.

Ví dụ:

``` text
┌───────────────────────────────────┐
│      TRẠNG THÁI HIỆN TẠI         │
│                                   │
│       😰 LO LẮNG / HỒI HỘP       │
│                                   │
│       Mức độ: 78/100              │
│       Độ tin cậy: 86%             │
│                                   │
│       Xu hướng: ↑ Tăng            │
└───────────────────────────────────┘
```

Không cần hiển thị toàn bộ technical signals cho người dùng cuối nếu
giao diện không phù hợp.

Technical signals có thể dành cho developer/debug mode.

------------------------------------------------------------------------

# 37. KHẢ NĂNG MỞ RỘNG SAU NÀY

Thiết kế để sau này có thể kết hợp thêm:

``` text
Speech-to-Text
+
Voice Features
+
Text Emotion Analysis
+
Conversation Context
```

Voice Features trong tương lai có thể gồm:

-   Pitch.
-   Speech rate.
-   Pause duration.
-   Volume.
-   Trembling.
-   Voice energy.

Khi đó có thể xây dựng:

``` text
Multimodal Emotion Analysis
```

Nhưng **ở phiên bản hiện tại chỉ cần triển khai STT + Text Emotion
Analysis**.

------------------------------------------------------------------------

# 38. AN TOÀN VÀ CÁCH DIỄN ĐẠT

Đây là hệ thống **phân tích dấu hiệu cảm xúc từ ngôn ngữ**, không phải
hệ thống chẩn đoán tâm lý hoặc y tế.

Không được đưa ra kết luận:

``` text
Người dùng bị trầm cảm.
Người dùng mắc chứng lo âu.
Người dùng có vấn đề tâm lý.
```

Chỉ sử dụng:

``` text
Có dấu hiệu buồn bã.
Có dấu hiệu lo lắng/hồi hộp.
Có dấu hiệu căng thẳng/bực bội.
Có dấu hiệu tích cực/vui vẻ.
```

------------------------------------------------------------------------

# 39. YÊU CẦU CUỐI CÙNG CHO ANTIGRAVITY

Hãy thực hiện theo thứ tự:

### Bước 1

Phân tích codebase hiện tại.

### Bước 2

Giải thích ngắn gọn:

-   Chatbot hiện tại hoạt động thế nào.
-   STT hiện tại đã có hay chưa.
-   Vị trí phù hợp để tích hợp Voice Chat.
-   Vị trí phù hợp để tích hợp Emotion Analyzer.

### Bước 3

Thiết kế kiến trúc tích hợp mà **không phá vỡ code hiện tại**.

### Bước 4

Triển khai Voice Chat.

Nếu đã có STT:

``` text
Tái sử dụng STT hiện tại.
```

Nếu chưa có:

``` text
Tích hợp STT tiếng Việt phù hợp.
```

### Bước 5

Tích hợp transcript vào Emotion Analyzer.

### Bước 6

Xây dựng Emotion Analyzer theo toàn bộ rule ở trên.

### Bước 7

Tích hợp kết quả Emotion Analyzer vào chatbot/session history.

### Bước 8

Tạo Emotion History và Trend Analysis.

### Bước 9

Chạy ít nhất 20 test cases tiếng Việt.

### Bước 10

Kiểm tra toàn bộ chức năng cũ để đảm bảo không bị regression.

### Bước 11

Báo cáo rõ:

``` text
Files đã thay đổi
Files đã tạo
Dependencies đã thêm
Chức năng đã thêm
Cách chạy
Cách test
Các giới hạn hiện tại
```

**Ưu tiên hàng đầu: tận dụng và mở rộng dự án hiện tại, không xây dựng
lại từ đầu.**

**Voice Chat phải bao gồm STT.**

**Mỗi transcript từ Voice Chat phải được gửi đồng thời đến Chatbot và
Emotion Analyzer.**

**Emotion Analyzer phải là hệ thống nhiều tầng, không phải keyword
matching đơn giản.**
