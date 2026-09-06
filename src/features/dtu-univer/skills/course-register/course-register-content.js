// DTU COURSE REGISTER CONTENT SCRIPT - STABLE DOM AUTOMATION & ANTI-SPAM ENGINE
// Cơ chế thông minh: Tự động quét & chọn lớp theo mã, tự cuộn & focus Captcha, chống spam ASP.NET

(function () {
  if (window.__dtuCourseRegisterInitialized) return;
  window.__dtuCourseRegisterInitialized = true;

  let isRunning = false;
  let huntTimer = null;
  let targetCourses = [];

  function sendStatus(message, color = '#3b82f6', isFinished = false, isSuccess = false) {
    console.log(`[DTU Course Register] ${message}`);
    try {
      chrome.runtime.sendMessage({
        action: 'DTU_REGISTER_STATUS',
        message: message,
        color: color,
        isFinished: isFinished,
        isSuccess: isSuccess
      });
    } catch (e) {}
  }

  // Phát âm thanh thông báo nhẹ khi chọn thành công
  function playSuccessSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  // Kiểm tra xem ASP.NET UpdatePanel có đang bận xử lý request cũ không
  function isServerBusy() {
    try {
      if (window.Sys && Sys.WebForms && Sys.WebForms.PageRequestManager) {
        const prm = Sys.WebForms.PageRequestManager.getInstance();
        if (prm && prm.get_isInAsyncPostBack && prm.get_isInAsyncPostBack()) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  // Tự động tìm và focus ô Captcha
  function focusCaptchaInput() {
    const captchaSelectors = [
      'input[id*="txtCaptcha" i]',
      'input[id*="Captcha" i]',
      'input[name*="captcha" i]',
      'input[placeholder*="captcha" i]',
      '#txtCaptcha'
    ];

    let captchaInput = null;
    for (const sel of captchaSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        captchaInput = el;
        break;
      }
    }

    if (captchaInput) {
      captchaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      captchaInput.focus();
      captchaInput.style.outline = '3px solid #2980b9';
      captchaInput.style.boxShadow = '0 0 12px rgba(41, 128, 185, 0.4)';
      return true;
    }
    return false;
  }

  // Thực hiện quét bảng và tích chọn lớp
  function scanAndSelectCourses(codes) {
    if (isServerBusy()) {
      sendStatus('⏳ Server MyDTU đang xử lý tải dữ liệu, chờ giây lát...', '#f59e0b');
      return { checkedCount: 0, pendingCodes: codes };
    }

    let checkedCount = 0;
    const matchedCodes = new Set();

    // Quét tất cả hàng trong các bảng dữ liệu
    const rows = document.querySelectorAll('table tr, .table-responsive tr, [id*="grv"] tr');

    rows.forEach(row => {
      const text = (row.innerText || '').toUpperCase();
      
      for (const code of codes) {
        const normCode = code.toUpperCase();
        if (text.includes(normCode)) {
          const checkbox = row.querySelector('input[type="checkbox"], input[type="radio"]');
          if (checkbox && !checkbox.disabled) {
            if (!checkbox.checked) {
              checkbox.checked = true;
              checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              checkbox.dispatchEvent(new Event('click', { bubbles: true }));
            }
            // Đổi màu nền hàng để sinh viên dễ thấy
            row.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
            row.style.transition = 'background-color 0.3s ease';
            checkedCount++;
            matchedCodes.add(code);
          }
        }
      }
    });

    const pendingCodes = codes.filter(c => !matchedCodes.has(c));
    return { checkedCount, pendingCodes };
  }

  // Thử điền vào ô tìm kiếm nếu có
  function trySearchBox(code) {
    if (isServerBusy()) return false;

    const searchInputSelectors = [
      'input[id*="txtMaMon" i]',
      'input[id*="txtSubjectCode" i]',
      'input[id*="txtMaLop" i]',
      'input[name*="SearchText" i]',
      'input[id*="txtSearch" i]',
      'input[placeholder*="mã môn" i]',
      'input[placeholder*="mã lớp" i]'
    ];

    let searchInput = null;
    for (const sel of searchInputSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        searchInput = el;
        break;
      }
    }

    if (searchInput) {
      searchInput.value = code;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));

      const searchBtnSelectors = [
        'button[id*="btnSearch" i]',
        'input[id*="btnSearch" i]',
        'button[id*="btnTimKiem" i]',
        'input[id*="btnTimKiem" i]',
        'input[value*="Tìm" i]'
      ];

      for (const btnSel of searchBtnSelectors) {
        const btn = document.querySelector(btnSel);
        if (btn && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
      }
    }
    return false;
  }

  // Chu trình thực thi chính
  function executeProcess(huntMode) {
    if (!isRunning) return;

    const { checkedCount, pendingCodes } = scanAndSelectCourses(targetCourses);

    if (checkedCount > 0 && pendingCodes.length === 0) {
      // Đã chọn đủ tất cả các lớp
      playSuccessSound();
      focusCaptchaInput();
      sendStatus(`🎉 Đã chọn xong ${checkedCount} lớp! Hãy nhập Captcha và Lưu.`, '#10b981', true, true);
      isRunning = false;
      return;
    }

    if (checkedCount > 0 && pendingCodes.length > 0) {
      // Đã chọn được một phần
      playSuccessSound();
      focusCaptchaInput();
      if (!huntMode) {
        sendStatus(`✅ Đã chọn ${checkedCount} lớp (còn thiếu: ${pendingCodes.join(', ')}). Hãy gõ Captcha!`, '#10b981', true, true);
        isRunning = false;
        return;
      }
    }

    // Nếu chưa đủ và bật chế độ Săn môn
    if (huntMode) {
      sendStatus(`🔄 Đang săn slot cho: ${pendingCodes.join(', ')} (chu kỳ an toàn 3.5s)...`, '#3b82f6');
      
      // Nếu có ô tìm kiếm, thử tìm mã đầu tiên còn thiếu
      if (pendingCodes.length > 0) {
        trySearchBox(pendingCodes[0]);
      }

      // Đặt lịch lặp với khoảng cách 3500ms an toàn (tránh bị hệ thống đánh dấu spam)
      clearTimeout(huntTimer);
      huntTimer = setTimeout(() => {
        if (isRunning) executeProcess(true);
      }, 3500);
    } else {
      if (checkedCount === 0) {
        // Thử tìm kiếm 1 lần nếu có ô search
        if (pendingCodes.length > 0 && trySearchBox(pendingCodes[0])) {
          sendStatus(`🔍 Đã tra cứu mã ${pendingCodes[0]}, đang quét lại bảng...`, '#3b82f6');
          setTimeout(() => {
            const res = scanAndSelectCourses(targetCourses);
            if (res.checkedCount > 0) {
              playSuccessSound();
              focusCaptchaInput();
              sendStatus(`🎉 Đã chọn được ${res.checkedCount} lớp! Hãy nhập Captcha.`, '#10b981', true, true);
            } else {
              focusCaptchaInput();
              sendStatus(`⚠️ Không tìm thấy lớp hợp lệ cho: ${targetCourses.join(', ')}`, '#ef4444', true, false);
            }
            isRunning = false;
          }, 1200);
          return;
        }
        focusCaptchaInput();
        sendStatus(`⚠️ Không tìm thấy lớp phù hợp cho: ${targetCourses.join(', ')}`, '#ef4444', true, false);
      }
      isRunning = false;
    }
  }

  // Lắng nghe message từ popup extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_DTU_REGISTER') {
      clearTimeout(huntTimer);
      isRunning = true;
      targetCourses = request.courseList || [];

      sendStatus('🚀 Bắt đầu quét bảng lớp học phần trên MyDTU...', '#3b82f6');
      executeProcess(request.huntMode);

      sendResponse({ success: true, message: 'Đã nhận lệnh đăng ký.' });
      return true;
    }

    if (request.action === 'STOP_DTU_REGISTER') {
      isRunning = false;
      clearTimeout(huntTimer);
      sendStatus('⏹️ Đã dừng tiến trình.', '#94a3b8', true, false);
      sendResponse({ success: true });
      return true;
    }
  });
})();
