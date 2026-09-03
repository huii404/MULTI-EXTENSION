// ============================================================================
// SCRIBD PDF DOWNLOADER & UNBLUR ENGINE (OPTIMIZED & MERGED)
// ============================================================================

let originalStyles = [];
let overlay = null;

function safeSendMessage(message) {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage(message);
    }
  } catch (error) {
    // Context invalidated, ignore
  }
}

// ==========================================
// 1. UNBLUR & CLEANER LOGIC
// ==========================================
function injectUnblurStyles() {
  if (document.getElementById('banhmi-scribd-unblur-style')) return;

  const style = document.createElement('style');
  style.id = 'banhmi-scribd-unblur-style';
  style.textContent = `
    .blurred_page, .blur, [class*="blurred"] {
      filter: none !important;
      -webkit-filter: none !important;
      opacity: 1 !important;
    }
    .blurred_page *, .blur * {
      filter: none !important;
      -webkit-filter: none !important;
      opacity: 1 !important;
    }

    .page-blur-promo,
    .autogen_class_views_read2_page_blur_promo,
    .between_page_ads,
    .between_page_portal_root,
    .between_page_module,
    .page_missing_explanation_action,
    .doc_missing_page_cta,
    .promo_banner,
    .ad_wrapper {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .text_layer, .text_layer * {
      color: #000000 !important;
      text-shadow: none !important;
      opacity: 1 !important;
      user-select: text !important;
      -webkit-user-select: text !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function runUnblurDOM() {
  injectUnblurStyles();

  const blurredElements = document.querySelectorAll('.blurred_page, .blur, [class*="blurred"]');
  blurredElements.forEach(el => {
    el.classList.remove('blurred_page', 'blur');
    el.style.filter = 'none';
    el.style.webkitFilter = 'none';
    el.style.opacity = '1';
  });

  const promos = document.querySelectorAll(`
    .page-blur-promo,
    .autogen_class_views_read2_page_blur_promo,
    .between_page_ads,
    .between_page_portal_root,
    .between_page_module,
    .page_missing_explanation_action,
    .doc_missing_page_cta
  `);
  promos.forEach(promo => promo.remove());

  const textLayers = document.querySelectorAll('.text_layer');
  textLayers.forEach(tl => {
    tl.style.color = '#000000';
    tl.style.textShadow = 'none';
    tl.style.filter = 'none';
    tl.style.webkitFilter = 'none';
    tl.style.opacity = '1';
    tl.style.userSelect = 'text';
  });
}

injectUnblurStyles();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runUnblurDOM);
} else {
  runUnblurDOM();
}

// ==========================================
// 2. SKILL QUÉT & TẢI PDF CHUYÊN NGHIỆP
// ==========================================

// Nhận lệnh tải từ Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_DOWNLOAD" || request.action === "scribd_auto_pdf") {
    runDownloader(request.scrollDelay || 150);
    sendResponse({ started: true });
  }
  if (request.action === "scribd_unblur") {
    runUnblurDOM();
    sendResponse({ success: true });
  }
  return true;
});

async function runDownloader(scrollDelayMs) {
  try {
    updateOverlay("Đang khởi tạo...", "Kết nối với công cụ kết xuất trang tài liệu...", 0, 100, false);

    // 1. Tự động đo kích thước trang chuẩn của tài liệu
    const paperSize = detectDocumentPaperSize();

    // 2. Quét cuộn từng trang để kích hoạt Lazy Loading đầy đủ
    const totalPages = await scrollThroughPages(scrollDelayMs);
    if (totalPages === 0) {
      removeOverlay();
      return;
    }

    // 3. Chuẩn bị dàn trang in sạch với kích thước đã đo
    updateOverlay("Đang định dạng trang...", "Xóa bỏ các khung quảng cáo và căn chỉnh tỷ lệ chuẩn.", 100, 100, false);
    prepareForPrint(paperSize);

    // 4. Chờ đồ họa độ phân giải cao và font tải ổn định
    updateOverlay("Đang kết xuất nội dung...", "Chờ hình ảnh chất lượng cao và công thức toán ổn định.", 100, 100, false);
    await new Promise(resolve => setTimeout(resolve, 1800));

    // Cuộn về đầu trang để bắt đầu in từ trang 1
    window.scrollTo(0, 0);

    // 5. Mở hộp thoại In của trình duyệt
    updateOverlay("Đang mở hộp thoại in...", "Vui lòng chọn 'Lưu dưới dạng PDF' ở mục Máy in đích.", 100, 100, false);
    safeSendMessage({ action: "PROGRESS", status: "printing" });

    setTimeout(() => {
      const titleParam = new URLSearchParams(window.location.search).get('doc_title');
      if (titleParam) {
        document.title = decodeURIComponent(titleParam);
      }
      window.print();

      // 6. Khôi phục lại giao diện trang
      restorePage();
      safeSendMessage({ action: "PROGRESS", status: "completed" });

      // 7. Hiển thị hoàn tất và nút quay lại trang tài liệu gốc
      const urlParams = new URLSearchParams(window.location.search);
      const originalUrl = urlParams.get('original_url');
      if (originalUrl) {
        updateOverlay("Đã hoàn tất!", "Tạo file PDF thành công. Bấm bên dưới để quay lại tài liệu gốc.");
        const btnContainer = document.getElementById('sd-btn-container');
        if (btnContainer && btnContainer.children.length === 0) {
          const backBtn = document.createElement("button");
          backBtn.innerText = "Quay lại trang tài liệu gốc";
          backBtn.style.cssText = `
            margin-top: 18px;
            width: 100%;
            background: linear-gradient(135deg, #008272 0%, #002B49 100%);
            border: none;
            border-radius: 8px;
            color: #ffffff;
            padding: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 130, 114, 0.3);
          `;
          backBtn.onclick = () => {
            removeOverlay();
            window.location.href = decodeURIComponent(originalUrl);
          };
          btnContainer.appendChild(backBtn);
        }
      } else {
        updateOverlay("Đã hoàn tất!", "Tạo file PDF thành công. Đang khôi phục trang...");
        setTimeout(() => {
          removeOverlay();
        }, 3000);
      }
    }, 500);

  } catch (error) {
    console.error('[Scribd Downloader] Error:', error);
    safeSendMessage({ action: "ERROR", message: error.message });
    showOverlayError(error.message);
  }
}

function getPageSelector() {
  if (document.querySelector('.outer_page')) return '.outer_page';
  if (document.querySelector('.newpage')) return '.newpage';
  if (document.querySelector('.outer_page_container')) return '.outer_page_container';
  return "[class*='page']";
}

async function scrollThroughPages(scrollDelayMs) {
  let scrolledCount = 0;
  let stableRounds = 0;
  let lastTotalPages = -1;
  const pageSelector = getPageSelector();

  while (stableRounds < 2) {
    const pageElements = document.querySelectorAll(pageSelector);
    const totalPages = pageElements.length;

    if (totalPages === 0) {
      throw new Error("Không phát hiện trang tài liệu nào. Bạn đã mở đúng tài liệu Scribd chưa?");
    }

    if (totalPages === lastTotalPages) {
      stableRounds++;
    } else {
      stableRounds = 0;
      lastTotalPages = totalPages;
    }

    updateOverlay(
      "Đang tải các trang...",
      "Tự động cuộn để nạp hình ảnh và văn bản (Lazy Loading)...",
      scrolledCount,
      totalPages
    );
    safeSendMessage({ action: "PROGRESS", status: "scrolling", current: scrolledCount, total: totalPages });

    for (let i = scrolledCount; i < totalPages; i++) {
      pageElements[i].scrollIntoView({ behavior: 'instant', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, scrollDelayMs));

      if ((i + 1) % 5 === 0 || i === totalPages - 1) {
        updateOverlay(
          "Đang nạp các trang...",
          "Đang cuộn tải dữ liệu chất lượng cao...",
          i + 1,
          totalPages
        );
        safeSendMessage({ action: "PROGRESS", status: "scrolling", current: i + 1, total: totalPages });
      }
    }

    scrolledCount = totalPages;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return scrolledCount;
}

// Tự động đo kích thước trang chuẩn (Inches)
function detectDocumentPaperSize() {
  const candidates = [
    '.outer_page',
    '.newpage',
    '.outer_page_container',
    "[class*='page']"
  ];

  for (const selector of candidates) {
    const element = document.querySelector(selector);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        widthInches: rect.width / 96,
        heightInches: (rect.height / 96) + 0.04,
        selector
      };
    }
  }
  return null;
}

// Dọn dẹp DOM và inject style in PDF chuẩn
function prepareForPrint(paperSize) {
  originalStyles = [];

  const toolbars = document.querySelectorAll('.toolbar_top, .toolbar_bottom');
  toolbars.forEach(el => {
    originalStyles.push({ element: el, display: el.style.display });
    el.style.display = 'none';
  });

  const scrollers = document.querySelectorAll('.document_scroller, .autogen_class_views_embed_doc, #document_scroller');
  scrollers.forEach(element => {
    originalStyles.push({
      element,
      position: element.style.position,
      top: element.style.top,
      bottom: element.style.bottom,
      left: element.style.left,
      right: element.style.right,
      overflow: element.style.overflow,
      maxHeight: element.style.maxHeight,
      height: element.style.height,
      margin: element.style.margin,
      padding: element.style.padding
    });

    element.setAttribute('data-scribd-print-root', 'true');
    element.style.position = 'static';
    element.style.top = 'auto';
    element.style.bottom = 'auto';
    element.style.left = 'auto';
    element.style.right = 'auto';
    element.style.overflow = 'visible';
    element.style.maxHeight = 'none';
    element.style.height = 'auto';
    element.style.margin = '0';
    element.style.padding = '0';
  });

  const existing = document.getElementById('scribd-print-styles');
  if (existing) existing.remove();

  const widthVal = paperSize ? `${paperSize.widthInches.toFixed(3)}in` : 'auto';
  const heightVal = paperSize ? `${paperSize.heightInches.toFixed(3)}in` : 'auto';

  const style = document.createElement('style');
  style.id = 'scribd-print-styles';
  style.textContent = `
    [class*="cookie"], [class*="Cookie"], [class*="consent"],
    [class*="Consent"], [class*="gdpr"], [class*="privacy-notice"],
    [class*="notice-banner"], [id*="cookie"], [id*="consent"],
    [class*="osano-cm"], [id*="osano"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }

    [data-scribd-print-root="true"],
    .document_scroller {
      position: static !important;
      top: auto !important;
      right: auto !important;
      bottom: auto !important;
      left: auto !important;
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    @media print {
      #scribd-downloader-overlay {
        display: none !important;
      }

      @page {
        size: ${widthVal} ${heightVal};
        margin: 0;
      }

      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #ffffff !important;
      }

      .toolbar_top,
      .toolbar_bottom,
      .header,
      .footer,
      .ad,
      [class*="ad_"] {
        display: none !important;
      }

      [data-scribd-print-root="true"],
      .document_scroller {
        position: static !important;
        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        left: auto !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .outer_page_container,
      .newpage_container {
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        min-height: 0 !important;
      }

      .outer_page_container > *:not(.outer_page),
      .newpage_container > *:not(.newpage) {
        display: none !important;
      }

      .outer_page {
        margin: 0 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        break-after: page !important;
        page-break-after: always !important;
      }

      .outer_page:last-of-type,
      .outer_page:last-child,
      .newpage:last-of-type,
      .newpage:last-child {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }

      mjx-container,
      .MathJax,
      .katex,
      math,
      svg {
        visibility: visible !important;
        overflow: visible !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function restorePage() {
  const existing = document.getElementById('scribd-print-styles');
  if (existing) existing.remove();

  originalStyles.forEach(item => {
    const el = item.element;
    if (!el) return;

    if (item.display !== undefined) {
      el.style.display = item.display;
    } else {
      el.removeAttribute('data-scribd-print-root');
      el.style.position = item.position;
      el.style.top = item.top;
      el.style.bottom = item.bottom;
      el.style.left = item.left;
      el.style.right = item.right;
      el.style.overflow = item.overflow;
      el.style.maxHeight = item.maxHeight;
      el.style.height = item.height;
      el.style.margin = item.margin;
      el.style.padding = item.padding;
    }
  });
  originalStyles = [];
}

// ==========================================
// 3. TIẾN TRÌNH OVERLAY HIỆN ĐẠI
// ==========================================
function createOverlay() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'scribd-downloader-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.95);
    z-index: 9999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #f8fafc;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: rgba(30, 41, 59, 0.92); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; width: 360px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; text-align: center; backdrop-filter: blur(12px);">
      <!-- Progress Icon -->
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #008272, #002B49); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 0 15px rgba(0, 130, 114, 0.5);">
        <svg style="width: 24px; height: 24px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; background: linear-gradient(135deg, #22c55e, #008272); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Scribd PDF Downloader</div>
      <div id="sd-overlay-status" style="font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #f8fafc;">Đang chuẩn bị...</div>
      <div id="sd-overlay-detail" style="font-size: 11px; color: #94a3b8; margin-bottom: 20px; line-height: 1.4;">Khởi tạo thông số tài liệu...</div>
      
      <!-- Progress Bar -->
      <div style="width: 100%; height: 8px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
        <div id="sd-overlay-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #008272, #22c55e); border-radius: 4px; transition: width 0.2s; box-shadow: 0 0 8px rgba(0, 130, 114, 0.4);"></div>
      </div>
      <div style="width: 100%; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: 500;">
        <span id="sd-overlay-percent">0%</span>
        <span id="sd-overlay-count">0 / 0 trang</span>
      </div>
      <div id="sd-btn-container" style="width: 100%;"></div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function updateOverlay(status, detail, current, total, showPageCount = true) {
  createOverlay();
  const statusEl = document.getElementById('sd-overlay-status');
  const detailEl = document.getElementById('sd-overlay-detail');
  const fillEl = document.getElementById('sd-overlay-fill');
  const percentEl = document.getElementById('sd-overlay-percent');
  const countEl = document.getElementById('sd-overlay-count');

  if (status) statusEl.innerText = status;
  if (detail) detailEl.innerText = detail;

  if (current !== undefined && total !== undefined) {
    const percent = Math.round((current / total) * 100) || 0;
    fillEl.style.width = `${percent}%`;
    percentEl.innerText = `${percent}%`;
    if (showPageCount) {
      countEl.innerText = `Trang ${current} / ${total}`;
    } else {
      countEl.innerText = "";
    }
  }
}

function showOverlayError(errMessage) {
  createOverlay();
  const statusEl = document.getElementById('sd-overlay-status');
  const detailEl = document.getElementById('sd-overlay-detail');
  const fillEl = document.getElementById('sd-overlay-fill');
  const btnContainer = document.getElementById('sd-btn-container');

  statusEl.innerText = "Gặp sự cố";
  detailEl.innerText = errMessage || "Đã xảy ra lỗi ngoài ý muốn.";
  fillEl.style.backgroundColor = "#ef4444";

  if (btnContainer && btnContainer.children.length === 0) {
    const backBtn = document.createElement("button");
    backBtn.innerText = "Quay lại trang tài liệu";
    backBtn.style.cssText = `
      margin-top: 18px;
      width: 100%;
      background: linear-gradient(135deg, #008272 0%, #002B49 100%);
      border: none;
      border-radius: 8px;
      color: #ffffff;
      padding: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    `;
    backBtn.onclick = () => {
      removeOverlay();
      const urlParams = new URLSearchParams(window.location.search);
      const originalUrl = urlParams.get('original_url');
      if (originalUrl) {
        window.location.href = decodeURIComponent(originalUrl);
      }
    };
    btnContainer.appendChild(backBtn);
  }
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

// ==========================================
// 4. TỰ ĐỘNG KÍCH HOẠT KHI TẢI TRANG EMBED
// ==========================================
(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('start_download') === 'true' || urlParams.get('banhmi_scribd_auto_pdf') === '1') {
    const scrollDelay = parseInt(urlParams.get('scroll_delay'), 10) || 150;
    setTimeout(() => {
      runDownloader(scrollDelay);
    }, 1000);
  }
})();
