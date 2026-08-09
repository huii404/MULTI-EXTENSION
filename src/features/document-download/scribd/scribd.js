// =========================================================================
// SCRIBD - POPUP LOGIC (DÙNG TRÍCH XUẤT DOM SẠCH & XÓA MỜ)
// =========================================================================

const SCRIBD_HTML = `
<div class="scribd-container" style="border: none !important; padding: 0; margin: 0;">
  <div class="form-group" style="margin-bottom: 12px;">
    <label style="font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 6px; display: block;">
      🔗 Link tài liệu Scribd:
    </label>
    <input type="text" id="scribd-url-input" placeholder="https://www.scribd.com/document/..." style="width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12px; background: var(--surface); color: var(--text);" />
  </div>

  <div style="display: flex; flex-direction: column; gap: 8px;">
    <!-- 1. Mở Cửa Sổ In DOM Sạch -->
    <button id="scribd-clean-print-btn" class="action-btn primary" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: none !important; justify-content: center; padding: 10px;">
      <span style="font-size: 18px; margin-right: 8px;">📄</span>
      <div style="text-align: left;">
        <span class="btn-heading" style="font-size: 13px; font-weight: 700; display: block;">Mở Cửa Sổ Bản In DOM Sạch</span>
        <span style="font-size: 10px; opacity: 0.9; font-weight: normal;">Lọc thẻ trùng, chống lặp trang & lặp chữ 100%</span>
      </div>
    </button>

    <!-- 2. Nút Xóa Mờ Nội Dung (Unblur) -->
    <button id="scribd-unblur-btn" class="action-btn" style="background: var(--surface-hover); color: var(--text); justify-content: center; border: 1px solid var(--border); padding: 8px;">
      <span style="font-size: 16px; margin-right: 6px;">🔓</span>
      <span style="font-size: 12px; font-weight: 600;">Mở Khóa & Xóa Mờ Nội Dung (Unblur)</span>
    </button>

    <!-- 3. Nút Trích Xuất File Text (.txt) -->
    <button id="scribd-export-txt-btn" class="action-btn" style="background: var(--surface-hover); color: var(--text); justify-content: center; border: 1px solid var(--border); padding: 8px;">
      <span style="font-size: 16px; margin-right: 6px;">📝</span>
      <span style="font-size: 12px; font-weight: 600;">Trích Xuất File Văn Bản (.txt)</span>
    </button>
  </div>
</div>
`;

PAGES.scribd = {
  render: function() {
    return SCRIBD_HTML;
  },
  attachEvents: function() {
    const input = document.getElementById('scribd-url-input');
    const cleanPrintBtn = document.getElementById('scribd-clean-print-btn');
    const unblurBtn = document.getElementById('scribd-unblur-btn');
    const exportTxtBtn = document.getElementById('scribd-export-txt-btn');

    // Tự động điền URL nếu tab hiện tại là Scribd
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('scribd.com/document/')) {
        if (input) input.value = tabs[0].url;
      }
    });

    // 1. Nút Mở Cửa Sổ In DOM Sạch
    cleanPrintBtn?.addEventListener('click', async function() {
      const tab = await getTargetScribdTab(input);
      if (!tab) return;

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/features/document-download/scribd/scribd-content.js']
        });

        chrome.tabs.sendMessage(tab.id, { action: 'SCRIBD_CLEAN_PRINT' });
        if (typeof showToast === 'function') showToast('📄 Đang mở Cửa sổ bản in DOM sạch...', 'success');
        setTimeout(() => window.close(), 500);
      } catch (e) {
        if (typeof showToast === 'function') showToast('❌ Lỗi: ' + e.message, 'error');
      }
    });

    // 2. Nút Xóa Mờ & Mở Khóa Nội Dung (Unblur)
    unblurBtn?.addEventListener('click', async function() {
      const tab = await getTargetScribdTab(input);
      if (!tab) return;

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/features/document-download/scribd/scribd-content.js']
        });

        chrome.tabs.sendMessage(tab.id, { action: 'SCRIBD_UNBLUR' });
        if (typeof showToast === 'function') showToast('🔓 Đã xóa mờ & mở khóa giao diện!', 'success');
      } catch (e) {
        if (typeof showToast === 'function') showToast('❌ Lỗi: ' + e.message, 'error');
      }
    });

    // 3. Nút Trích Xuất File Text (.txt)
    exportTxtBtn?.addEventListener('click', async function() {
      const tab = await getTargetScribdTab(input);
      if (!tab) return;

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/features/document-download/scribd/scribd-content.js']
        });

        chrome.tabs.sendMessage(tab.id, { action: 'SCRIBD_EXPORT_TXT' });
        if (typeof showToast === 'function') showToast('📝 Đang trích xuất file văn bản...', 'success');
        setTimeout(() => window.close(), 500);
      } catch (e) {
        if (typeof showToast === 'function') showToast('❌ Lỗi: ' + e.message, 'error');
      }
    });

    input?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') cleanPrintBtn?.click();
    });
  },
  title: '📄 Scribd Tools'
};

// Hàm bổ trợ lấy Tab Scribd hợp lệ
async function getTargetScribdTab(inputEl) {
  let urlValue = inputEl ? inputEl.value.trim() : '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.url && tab.url.includes('scribd.com/document/')) {
    return tab;
  }

  if (urlValue && urlValue.includes('scribd.com/document/')) {
    const newTab = await chrome.tabs.create({ url: urlValue, active: true });
    await new Promise(r => setTimeout(r, 2000));
    return newTab;
  }

  if (typeof showToast === 'function') showToast('⚠️ Vui lòng mở hoặc nhập link tài liệu Scribd!', 'warning');
  return null;
}