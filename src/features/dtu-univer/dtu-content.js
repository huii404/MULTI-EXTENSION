// DTU MASTER CONTENT SCRIPT ROUTER & DISPATCHER
// Điều phối các skill: Đánh giá giảng viên, Xuất lịch học, Đăng ký môn học

if (!window.dtuMasterInjected) {
  window.dtuMasterInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. SKILL: ĐÁNH GIÁ GIẢNG VIÊN
    if (request.action === 'autoRate' || request.action === 'AUTO_RATING_DTU') {
      try {
        if (typeof window.handleDTUAutoRate === 'function') {
          const res = window.handleDTUAutoRate(request);
          sendResponse(res || { success: true });
        } else {
          sendResponse({ success: false, error: 'Rating module chưa được khởi tạo!' });
        }
      } catch (error) {
        console.error('[DTU Router] Lỗi Rating:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    // 2. SKILL: XUẤT LỊCH HỌC MYDTU
    if (request.action === 'EXPORT_DTU_SMART_SCHEDULE') {
      (async () => {
        try {
          if (typeof window.handleDTUScheduleProcess === 'function') {
            const res = await window.handleDTUScheduleProcess(request.rangeMode, request.formatType);
            sendResponse(res || { success: true });
          } else {
            sendResponse({ success: false, error: 'Schedule module chưa được khởi tạo!' });
          }
        } catch (err) {
          console.error('[DTU Router] Lỗi Schedule:', err);
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    // 3. SKILL: ĐĂNG KÝ MÔN HỌC TỰ ĐỘNG
    if (request.action === 'START_DTU_AUTO_REGISTER') {
      try {
        if (typeof window.startDTUCourseRegistration === 'function') {
          window.startDTUCourseRegistration(request);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Course register module chưa được khởi tạo!' });
        }
      } catch (err) {
        console.error('[DTU Router] Lỗi Start Register:', err);
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (request.action === 'STOP_DTU_AUTO_REGISTER') {
      if (typeof window.stopDTUCourseRegistration === 'function') {
        window.stopDTUCourseRegistration();
      }
      sendResponse({ success: true });
      return true;
    }
  });
}