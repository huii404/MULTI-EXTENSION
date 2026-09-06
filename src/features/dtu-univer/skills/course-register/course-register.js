// DTU COURSE REGISTER SKILL MODULE - MINIMALIST & STABLE
// Tự động lưu, điều khiển tiến trình chọn lớp & phản hồi trạng thái tinh gọn

export function attachEvents() {
  const textarea = document.getElementById('dtu-course-list');
  const startBtn = document.getElementById('dtu-start-register-btn');
  const stopBtn = document.getElementById('dtu-stop-register-btn');
  const huntCheckbox = document.getElementById('dtu-hunt-mode');
  const statusDot = document.getElementById('dtu-status-dot');
  const statusText = document.getElementById('dtu-status-text');
  const savedBadge = document.getElementById('dtu-saved-badge');

  let autoSaveTimeout = null;

  function updateStatus(text, color = '#94a3b8') {
    if (statusText) statusText.textContent = text;
    if (statusDot) statusDot.style.background = color;
  }

  // 1. Khôi phục danh sách môn đã lưu
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['dtu_saved_courses', 'dtu_hunt_mode'], (res) => {
      if (res.dtu_saved_courses && textarea) {
        textarea.value = res.dtu_saved_courses;
      }
      if (res.dtu_hunt_mode !== undefined && huntCheckbox) {
        huntCheckbox.checked = res.dtu_hunt_mode;
      }
    });
  }

  // 2. Tự động lưu khi gõ (Auto-save with debounce)
  if (textarea) {
    textarea.addEventListener('input', () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        const val = textarea.value.trim();
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ dtu_saved_courses: val }, () => {
            if (savedBadge) {
              savedBadge.style.opacity = '1';
              setTimeout(() => { savedBadge.style.opacity = '0'; }, 1500);
            }
          });
        }
      }, 400);
    });
  }

  if (huntCheckbox) {
    huntCheckbox.addEventListener('change', () => {
      chrome.storage?.local?.set({ dtu_hunt_mode: huntCheckbox.checked });
    });
  }

  // 3. Kiểm tra tab MyDTU hiện tại
  checkActiveTab();

  async function checkActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('mydtu.duytan.edu.vn')) {
      updateStatus('⚠️ Hãy mở trang Đăng ký tín chỉ trên MyDTU', '#f59e0b');
      return null;
    }
    updateStatus('🟢 Đã kết nối MyDTU. Sẵn sàng chọn lớp.', '#10b981');
    return tab;
  }

  // 4. Bắt đầu tự động chọn lớp & Focus Captcha
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      const rawText = textarea ? textarea.value.trim() : '';
      if (!rawText) {
        notify('Vui lòng nhập ít nhất 1 mã lớp hoặc mã môn học!', 'error');
        textarea?.focus();
        return;
      }

      const courseList = rawText
        .split(/[\n,;]+/)
        .map(c => c.trim())
        .filter(Boolean);

      if (courseList.length === 0) {
        notify('Danh sách mã môn học không hợp lệ!', 'error');
        return;
      }

      const tab = await checkActiveTab();
      if (!tab) {
        notify('Vui lòng mở tab MyDTU trước khi nhấn Bắt đầu!', 'error');
        return;
      }

      const isHuntMode = huntCheckbox?.checked || false;

      // Đổi trạng thái nút
      startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'flex';
      updateStatus(`⏳ Đang tìm và tích chọn ${courseList.length} lớp...`, '#3b82f6');

      try {
        // Nạp content script vào tab
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/features/dtu-univer/skills/course-register/course-register-content.js']
        });

        // Gửi lệnh xử lý
        chrome.tabs.sendMessage(tab.id, {
          action: 'START_DTU_REGISTER',
          courseList: courseList,
          huntMode: isHuntMode
        }, (response) => {
          if (chrome.runtime.lastError) {
            updateStatus('❌ Lỗi kết nối với trang MyDTU', '#ef4444');
            resetBtn();
          } else if (response && response.success) {
            updateStatus(response.message || 'Đang xử lý trên MyDTU...', '#3b82f6');
          }
        });

      } catch (err) {
        updateStatus(`❌ Lỗi: ${err.message}`, '#ef4444');
        resetBtn();
      }
    });
  }

  // 5. Nút Dừng
  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'STOP_DTU_REGISTER' });
      }
      updateStatus('⏹️ Đã dừng tìm kiếm.', '#94a3b8');
      resetBtn();
    });
  }

  // 6. Nhận log / kết quả từ MyDTU tab
  const onMessage = (req) => {
    if (req.action === 'DTU_REGISTER_STATUS') {
      updateStatus(req.message, req.color || '#3b82f6');
      if (req.isFinished) {
        resetBtn();
        if (req.isSuccess) {
          notify('🎯 ' + req.message, 'success');
        }
      }
    }
  };

  chrome.runtime.onMessage.addListener(onMessage);

  function resetBtn() {
    if (startBtn) startBtn.style.display = 'flex';
    if (stopBtn) stopBtn.style.display = 'none';
  }
}

function notify(message, type = 'info') {
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    alert(message);
  }
}
