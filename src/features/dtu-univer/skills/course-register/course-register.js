// DTU COURSE REGISTER SKILL MODULE
// Hỗ trợ lưu danh sách môn học, kích hoạt đăng ký tự động và quản lý tiến trình đăng ký

export function attachEvents() {
  const textarea = document.getElementById('dtu-course-list');
  const saveBtn = document.getElementById('dtu-save-courses-btn');
  const startBtn = document.getElementById('dtu-start-register-btn');
  const stopBtn = document.getElementById('dtu-stop-register-btn');
  const statusBox = document.getElementById('dtu-register-status');
  const logText = document.getElementById('dtu-register-log-text');

  // Load danh sách môn đã lưu trước đó từ Storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['dtu_saved_courses'], (result) => {
      if (result.dtu_saved_courses && textarea) {
        textarea.value = result.dtu_saved_courses;
      }
    });
  }

  // Nút 1: Lưu danh sách môn học
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const val = textarea ? textarea.value.trim() : '';
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ dtu_saved_courses: val }, () => {
          notify('Đã lưu danh sách môn học vào bộ nhớ!', 'success');
        });
      }
    });
  }

  // Nút 2: Bắt đầu đăng ký
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      const rawText = textarea ? textarea.value.trim() : '';
      if (!rawText) {
        notify('Vui lòng nhập ít nhất 1 mã lớp / mã môn học!', 'error');
        return;
      }

      // Tách mã môn theo từng dòng hoặc dấu phẩy
      const courseList = rawText
        .split(/[\n,]+/)
        .map(c => c.trim())
        .filter(Boolean);

      if (courseList.length === 0) {
        notify('Danh sách mã môn học không hợp lệ!', 'error');
        return;
      }

      const registerMode = document.getElementById('dtu-register-mode')?.value || 'DIRECT_API';
      const delayMs = parseInt(document.getElementById('dtu-register-delay')?.value || '1000', 10);
      const maxRetry = parseInt(document.getElementById('dtu-register-max-retry')?.value || '30', 10);
      const autoFocusCaptcha = document.getElementById('dtu-auto-focus-captcha')?.checked ?? true;
      const autoCheckAll = document.getElementById('dtu-auto-check-all')?.checked ?? true;

      // Lấy tab active
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('mydtu.duytan.edu.vn')) {
        notify('⚠️ Vui lòng mở và đăng nhập trang MyDTU trước khi bấm Đăng ký!', 'error');
        return;
      }

      // Chuyển UI sang trạng thái Đang đăng ký
      startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'block';
      if (statusBox) statusBox.style.display = 'block';
      appendLog(`🚀 Khởi tạo chế độ [${registerMode}] cho ${courseList.length} môn/lớp...`);

      try {
        // Inject content script nếu chưa có
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            'src/features/dtu-univer/skills/course-register/course-register-content.js',
            'src/features/dtu-univer/dtu-content.js'
          ]
        });

        // Gửi tin nhắn kích hoạt đăng ký tự động
        chrome.tabs.sendMessage(tab.id, {
          action: 'START_DTU_AUTO_REGISTER',
          registerMode: registerMode,
          courseList: courseList,
          delayMs: delayMs,
          maxRetry: maxRetry,
          autoFocusCaptcha: autoFocusCaptcha,
          autoCheckAll: autoCheckAll
        }, (response) => {
          if (chrome.runtime.lastError) {
            appendLog(`❌ Lỗi kết nối: ${chrome.runtime.lastError.message}`);
            resetBtnState();
          } else if (response && response.success) {
            appendLog(`✅ Đã gửi lệnh thành công sang MyDTU tab!`);
          }
        });

      } catch (err) {
        appendLog(`❌ Lỗi: ${err.message}`);
        resetBtnState();
      }
    });
  }

  // Nút 3: Dừng đăng ký
  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'STOP_DTU_AUTO_REGISTER' });
      }
      appendLog(`⏹️ Đã gửi yêu cầu dừng tiến trình.`);
      resetBtnState();
    });
  }

  // Lắng nghe log phản hồi từ Content Script
  const messageListener = (request) => {
    if (request.action === 'DTU_REGISTER_LOG') {
      appendLog(request.message);
      if (request.isFinished) {
        resetBtnState();
      }
    }
  };
  chrome.runtime.onMessage.addListener(messageListener);

  // Thêm log vào hộp log
  function appendLog(msg) {
    if (!logText) return;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    logText.innerText += `[${timeStr}] ${msg}\n`;
    if (statusBox) statusBox.scrollTop = statusBox.scrollHeight;
  }

  function resetBtnState() {
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
  }
}

// Hàm bổ trợ hiển thị thông báo toast/alert
function notify(message, type = 'info') {
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    alert((type === 'error' ? '❌ ' : '✅ ') + message);
  }
}
