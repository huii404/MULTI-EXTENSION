// DTU COURSE REGISTER CONTENT SCRIPT - DIRECT API ENGINE & STEP-BY-STEP DOM AUTOMATION
// Module tự động đăng ký môn học và săn tín chỉ MyDTU

(function() {
  if (!window.dtuRegisterState) {
    window.dtuRegisterState = {
      isRunning: false,
      retryCount: 0,
      timerId: null
    };
  }

  function sendDTURegisterLog(message, isFinished = false) {
    console.log(`[DTU Auto Register] ${message}`);
    try {
      chrome.runtime.sendMessage({
        action: 'DTU_REGISTER_LOG',
        message: message,
        isFinished: isFinished
      });
    } catch (e) {}
  }

  window.startDTUCourseRegistration = function(params) {
    if (window.dtuRegisterState.isRunning) {
      sendDTURegisterLog('⚠️ Tiến trình đăng ký đang chạy!');
      return;
    }

    window.dtuRegisterState.isRunning = true;
    window.dtuRegisterState.retryCount = 0;

    sendDTURegisterLog('🚀 Khởi chạy module Tự động Đăng ký môn học DTU...');
    runDTURegistrationLoop(params);
  };

  window.stopDTUCourseRegistration = function() {
    window.dtuRegisterState.isRunning = false;
    if (window.dtuRegisterState.timerId) {
      clearTimeout(window.dtuRegisterState.timerId);
      window.dtuRegisterState.timerId = null;
    }
    sendDTURegisterLog('⏹️ Đã dừng tiến trình đăng ký môn học.', true);
  };

  async function runDTURegistrationLoop(params) {
    if (!window.dtuRegisterState.isRunning) return;

    const maxRetry = params.maxRetry || 30;
    const delayMs = params.delayMs || 1000;
    const registerMode = params.registerMode || 'DIRECT_API';

    window.dtuRegisterState.retryCount++;
    sendDTURegisterLog(`🔄 Lần thử ${window.dtuRegisterState.retryCount}/${maxRetry} [Chế độ: ${registerMode}]...`);

    let isCompleted = false;

    if (registerMode === 'DIRECT_API') {
      isCompleted = await executeDTUDirectAPIRegistration(params);
    } else {
      isCompleted = await executeDTUDirectAPIRegistration(params);
      if (!isCompleted) {
        isCompleted = executeDTUCourseRegistrationStepByStep(params);
      }
    }

    if (isCompleted) {
      sendDTURegisterLog('🎉 Đã hoàn tất xử lý danh sách môn học!', true);
      window.dtuRegisterState.isRunning = false;
      return;
    }

    if (window.dtuRegisterState.retryCount >= maxRetry) {
      sendDTURegisterLog(`⚠️ Đã đạt số lần thử lại tối đa (${maxRetry} lần). Tự động dừng.`, true);
      window.dtuRegisterState.isRunning = false;
      return;
    }

    window.dtuRegisterState.timerId = setTimeout(() => {
      runDTURegistrationLoop(params);
    }, delayMs);
  }

  async function executeDTUDirectAPIRegistration(params) {
    const courseList = params.courseList || [];
    sendDTURegisterLog('⚡ [Direct API] BƯỚC 1: Trích xuất ASP.NET State Tokens từ kết nối...');

    const viewState = document.getElementById('__VIEWSTATE')?.value || '';
    const viewStateGen = document.getElementById('__VIEWSTATEGENERATOR')?.value || '';
    const eventValidation = document.getElementById('__EVENTVALIDATION')?.value || '';
    const captchaInput = document.querySelector('input[id*="txtCaptcha"], input[name*="captcha" i]')?.value || '';

    const bodyParams = new URLSearchParams();
    if (viewState) bodyParams.append('__VIEWSTATE', viewState);
    if (viewStateGen) bodyParams.append('__VIEWSTATEGENERATOR', viewStateGen);
    if (eventValidation) bodyParams.append('__EVENTVALIDATION', eventValidation);
    if (captchaInput) bodyParams.append('txtCaptcha', captchaInput);

    courseList.forEach((code, idx) => {
      bodyParams.append(`course_${idx}`, code);
    });

    document.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked').forEach(chk => {
      if (chk.name) {
        bodyParams.append(chk.name, chk.value || 'on');
      }
    });

    sendDTURegisterLog('⚡ [Direct API] BƯỚC 2: Đóng gói HTTP POST Payload trực tiếp...');

    try {
      sendDTURegisterLog('⚡ [Direct API] BƯỚC 3: Gửi HTTP POST Request trực tiếp tới MyDTU Server (Bypass UI)...');
      
      const targetUrl = window.location.href;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        sendDTURegisterLog(`⚠️ [Direct API] Server quá tải (HTTP ${response.status} ${response.statusText}). Tự động gửi lại Payload trực tiếp...`);
        return false;
      }

      const resText = await response.text();
      sendDTURegisterLog('⚡ [Direct API] BƯỚC 4: Nhận phản hồi HTTP 200 OK từ Server. Đang phân tích kết quả...');

      if (resText.includes('Đăng ký thành công') || resText.includes('Đã lưu dữ liệu thành công')) {
        sendDTURegisterLog('🎉 [Direct API] Thông báo từ Server: ĐĂNG KÝ MÔN HỌC THÀNH CÔNG!');
        return true;
      }

      if (resText.includes('Không còn chỗ') || resText.includes('Lớp đã đầy')) {
        sendDTURegisterLog('⚠️ [Direct API] Server báo: Lớp đã đầy hoặc hết slot. Đang săn tiếp...');
      }

      return false;

    } catch (err) {
      sendDTURegisterLog(`❌ [Direct API] Lỗi kết nối mạng: ${err.message}. Tự động thử lại...`);
      return false;
    }
  }

  function executeDTUCourseRegistrationStepByStep(params) {
    const courseList = params.courseList || [];
    const autoFocusCaptcha = params.autoFocusCaptcha !== false;
    const autoCheckAll = params.autoCheckAll !== false;

    const currentUrl = window.location.href;
    sendDTURegisterLog('📌 BƯỚC 1: Kiểm tra trang MyDTU hiện tại...');

    if (!currentUrl.includes('mydtu.duytan.edu.vn')) {
      sendDTURegisterLog('❌ Trang web hiện tại không phải MyDTU!');
      return true;
    }

    sendDTURegisterLog('📌 BƯỚC 2: Quét ô nhập mã môn / mã lớp trên giao diện...');
    const searchInputSelectors = [
      'input[id*="txtMaMon"]',
      'input[id*="txtSubjectCode"]',
      'input[id*="txtMaLop"]',
      'input[name*="SearchText"]',
      'input[id*="txtSearch"]',
      'input[placeholder*="mã môn" i]',
      'input[placeholder*="mã lớp" i]',
      '.form-control[type="text"]'
    ];

    let searchInput = null;
    for (const selector of searchInputSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        searchInput = el;
        break;
      }
    }

    if (searchInput && courseList.length > 0) {
      const targetCourse = courseList[0];
      sendDTURegisterLog(`📌 BƯỚC 3: Điền mã môn "${targetCourse}" vào ô tìm kiếm...`);
      searchInput.value = targetCourse;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    } else {
      sendDTURegisterLog('ℹ️ Không tìm thấy ô nhập mã riêng lẻ, tiến hành quét trực tiếp bảng lớp học phần...');
    }

    sendDTURegisterLog('📌 BƯỚC 4: Tìm nút Tra cứu / Tìm kiếm...');
    const searchButtonSelectors = [
      'button[id*="btnSearch"]',
      'input[id*="btnSearch"]',
      'button[id*="btnTimKiem"]',
      'input[id*="btnTimKiem"]',
      'input[value*="Tìm"]',
      'input[value*="Tra cứu"]'
    ];

    for (const selector of searchButtonSelectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        sendDTURegisterLog('👉 Click nút Tìm kiếm!');
        btn.click();
        break;
      }
    }

    sendDTURegisterLog('📌 BƯỚC 5: Quét danh sách các hàng trong bảng môn học...');
    let checkedCount = 0;
    const rows = document.querySelectorAll('table tr, .grid-row, .table-responsive tr');

    rows.forEach((row) => {
      const rowText = (row.innerText || '').toUpperCase();
      const isMatched = courseList.some(code => rowText.includes(code.toUpperCase()));

      if (isMatched || autoCheckAll) {
        const checkEl = row.querySelector('input[type="checkbox"], input[type="radio"]');
        if (checkEl && !checkEl.checked && !checkEl.disabled) {
          checkEl.checked = true;
          checkEl.click();
          checkEl.dispatchEvent(new Event('change', { bubbles: true }));
          checkedCount++;
          sendDTURegisterLog(`✅ Đã tích chọn lớp: ${rowText.slice(0, 40)}...`);
        }
      }
    });

    if (checkedCount > 0) {
      sendDTURegisterLog(`🎯 Đã tự động tích chọn thành công ${checkedCount} lớp môn học!`);
    }

    sendDTURegisterLog('📌 BƯỚC 6: Tìm nút "Đăng ký môn" / "Lưu kết quả"...');
    const submitButtonSelectors = [
      'input[id*="btnDangKy"]',
      'button[id*="btnDangKy"]',
      'input[id*="btnSave"]',
      'button[id*="btnSave"]',
      'input[value*="Đăng ký"]',
      'input[type="submit"][value*="Lưu"]'
    ];

    let submitClicked = false;
    for (const selector of submitButtonSelectors) {
      const btn = document.querySelector(selector);
      if (btn && !btn.disabled) {
        sendDTURegisterLog('🚀 Kích hoạt nút Lưu / Đăng ký môn học!');
        btn.click();
        submitClicked = true;
        break;
      }
    }

    if (autoFocusCaptcha) {
      sendDTURegisterLog('📌 BƯỚC 7: Tự động phát hiện và Focus ô Captcha...');
      const captchaInputSelectors = [
        'input[id*="txtCaptcha"]',
        'input[id*="Captcha"]',
        'input[name*="captcha" i]',
        'input[placeholder*="captcha" i]'
      ];

      let captchaEl = null;
      for (const selector of captchaInputSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          captchaEl = el;
          break;
        }
      }

      if (captchaEl) {
        captchaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        captchaEl.focus();
        captchaEl.style.border = '2px solid #e74c3c';
        captchaEl.style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.5)';
        sendDTURegisterLog('🎯 Đã focus vào ô Captcha! Vui lòng gõ Captcha và bấm Enter để hoàn tất.');
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }

    sendDTURegisterLog('📌 BƯỚC 8: Kiểm tra thông báo kết quả đăng ký từ MyDTU...');
    const pageText = document.body.innerText || '';
    if (pageText.includes('Đăng ký thành công') || pageText.includes('Đã lưu dữ liệu thành công')) {
      sendDTURegisterLog('🎉 Thông báo MyDTU: ĐĂNG KÝ MÔN HỌC THÀNH CÔNG!');
      return true;
    }

    if (submitClicked) {
      sendDTURegisterLog('⌛ Đã kích hoạt Đăng ký, chờ phản hồi hệ thống...');
    }

    return false;
  }
})();
