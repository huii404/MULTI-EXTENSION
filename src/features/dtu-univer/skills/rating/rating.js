// DTU RATING SKILL MODULE

export function attachEvents() {
  const confirmBtn = document.getElementById('dtu-confirm-btn') || document.getElementById('confirmButton');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleConfirm);
  }
}

// Hàm bổ trợ lấy Tab hiện tại
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Hàm bổ trợ gửi tín hiệu sang Content Script
function sendToContent(message) {
  return new Promise(async (resolve, reject) => {
    try {
      const tab = await getCurrentTab();
      if (!tab || !tab.id) {
        reject(new Error('Không tìm thấy tab hiện tại'));
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            'src/features/dtu-univer/skills/rating/rating-content.js',
            'src/features/dtu-univer/dtu-content.js'
          ]
        });
      } catch (e) {}

      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

// Hàm hiển thị thông báo
function notify(message, type = 'info') {
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    alert((type === 'error' ? '❌ ' : '✅ ') + message);
  }
}
async function handleConfirm() {
  try {
    const tab = await getCurrentTab();

    if (!tab || !tab.url || !tab.url.includes('mydtu.duytan.edu.vn/sites/index.aspx?p=home_ratingform')) {
      notify('Vui lòng mở trang đánh giá DTU để sử dụng tiện ích', 'error');
      return;
    }

    const ratingSelect = document.getElementById('dtu-rating-select') || document.getElementById('rating');
    const ratingValue = ratingSelect ? ratingSelect.value : '1';
    const optionMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F' };
    const optionChar = optionMap[ratingValue] || 'A';

    const customTextEl = document.getElementById('dtu-custom-text') || document.getElementById('customText');
    const customText = customTextEl ? customTextEl.value.trim() : '';

    const defaultTexts = {
      '1': "Giảng viên xuất sắc, nhiệt tình, phương pháp giảng dạy hiệu quả",
      '2': "Giảng viên rất tốt, truyền đạt kiến thức rõ ràng",
      '3': "Giảng viên dạy tốt, có kiến thức chuyên môn",
      '4': "Giảng viên dạy bình thường, đạt yêu cầu cơ bản",
      '5': "Giảng viên cần cải thiện phương pháp giảng dạy",
      '6': "Giảng viên cần nâng cao chất lượng giảng dạy"
    };

    const finalText = customText !== '' ? customText : (defaultTexts[ratingValue] || "Giảng viên dạy tốt");

    // LẤY GIÁ TRỊ CÂU 53 TỪ POPUP UI
    const cau53El = document.getElementById('dtu-cau53-select') || document.getElementById('cau53Select');
    const cau53Value = cau53El ? cau53El.value : '4';

    const response = await sendToContent({
      action: 'autoRate',
      optionChar: optionChar,
      text: finalText,
      cau53Value: cau53Value
    });

    if (response && response.success) {
      notify('Đánh giá thành công! Vui lòng nhập CAPTCHA để xác nhận', 'success');
    } else {
      notify('Đánh giá không thành công. Vui lòng thử lại.', 'error');
    }
  } catch (err) {
    console.error('[Rating Error]', err);
    notify('Lỗi: ' + err.message, 'error');
  }
}