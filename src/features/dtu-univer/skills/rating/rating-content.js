// DTU RATING CONTENT SCRIPT - HANDLE Q1-Q53 & AUTO RATE
// Module tự động đánh giá giảng viên trên MyDTU

(function() {
  window.handleDTUAutoRate = function(request) {
    const optionChar = request.optionChar || 'A';
    const finalText = request.text || 'Giảng viên dạy tốt';
    const cau53Val = request.cau53Value || '4'; // Mặc định chọn mức 4 (Hài lòng)

    // 1. Tick Radio chọn xếp loại (Câu 1 -> 48: R0A -> R47A)
    for (let i = 0; i <= 47; i++) {
      const radioId = `R${i}${optionChar}`;
      const radio = document.getElementById(radioId);
      if (radio) {
        radio.checked = true;
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 2. Điền Textarea nhận xét (Câu 49 -> 52: R48 -> R51)
    for (let j = 48; j <= 51; j++) {
      const textareaId = `R${j}`;
      const textarea = document.getElementById(textareaId);
      if (textarea) {
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 3. XỬ LÝ CÂU 53 (Mức độ hài lòng: 1 -> 5)
    const getOptionLetter = (val) => {
      const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
      return map[val] || 'D';
    };

    const possible53Ids = [
      `R52${cau53Val}`, 
      `R53${cau53Val}`, 
      `R52${getOptionLetter(cau53Val)}`, 
      `R53${getOptionLetter(cau53Val)}`
    ];
    let q53Handled = false;

    for (const id of possible53Ids) {
      const r = document.getElementById(id);
      if (r) {
        r.checked = true;
        r.click();
        r.dispatchEvent(new Event('change', { bubbles: true }));
        q53Handled = true;
        break;
      }
    }

    // Fallback chọn radio câu 53 nếu ID thay đổi
    if (!q53Handled) {
      const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
      const q53Radios = allRadios.filter(r => !r.id || (!r.id.match(/^R([0-3]?[0-9]|4[0-7])[A-Z0-9]/)));
      const targetIndex = parseInt(cau53Val, 10) - 1;
      if (q53Radios[targetIndex]) {
        q53Radios[targetIndex].checked = true;
        q53Radios[targetIndex].click();
        q53Radios[targetIndex].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 4. Cuộn mượt xuống ngay ô CAPTCHA
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });

    return { success: true };
  };
})();
