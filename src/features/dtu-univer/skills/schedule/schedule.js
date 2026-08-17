export function attachEvents() {
  const confirmBtn = document.getElementById('dtu-schedule-confirm-btn');
  if (confirmBtn) {
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    document.getElementById('dtu-schedule-confirm-btn').addEventListener('click', async () => {
      const range = document.getElementById('dtu-schedule-range')?.value || 'MONTH';
      const format = document.getElementById('dtu-schedule-format')?.value || 'CSV';

      // ĐƯỜNG DẪN CHUẨN TRANG LỊCH HỌC MYDTU
      const timetableUrl = 'https://mydtu.duytan.edu.vn/sites/index.aspx?p=home_timetable&functionid=13';
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url || !tab.url.includes('mydtu.duytan.edu.vn')) {
        if (typeof showToast === 'function') showToast('⚠️ Hãy mở và đăng nhập MyDTU trước!', 'warning');
        return;
      }

      let targetTabId = tab.id;

      // Nếu không đúng trang Lịch học -> Chuyển về đúng trang Lịch học
      if (!tab.url.includes('p=home_timetable')) {
        await chrome.tabs.update(tab.id, { url: timetableUrl });
        await new Promise(r => setTimeout(r, 2000));
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          files: [
            'src/features/dtu-univer/skills/schedule/schedule-content.js',
            'src/features/dtu-univer/dtu-content.js'
          ]
        });

        chrome.tabs.sendMessage(targetTabId, {
          action: 'EXPORT_DTU_SMART_SCHEDULE',
          rangeMode: range,
          formatType: format
        });

        if (typeof showToast === 'function') showToast('🚀 Đang cào dữ liệu từ Lịch Học...', 'success');
      } catch (err) {
        console.error('[DTU Schedule] Error:', err);
        if (typeof showToast === 'function') showToast('❌ Lỗi: ' + err.message, 'error');
      }
    });
  }
}