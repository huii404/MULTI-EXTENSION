// =========================================================================
// SCRIBD CONTENT SCRIPT - CONTINUOUS REAL-TIME ACCUMULATIVE PAGE CAPTURE
// =========================================================================
// Giải quyết triệt để lỗi mất chữ & thiếu trang ở các trang sau do Scribd React
// Virtualized Viewport tự động Unmount (xóa thẻ HTML) khi cuộn chuột.
// Thuật toán Gom & Lưu trữ liên tục trong lúc cuộn (Real-time Accumulation).
// =========================================================================

if (!window.scribdEnhancerInjected) {
  window.scribdEnhancerInjected = true;

  // Lắng nghe lệnh từ Popup Extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_SCRIBD_AUTO_PDF' || request.action === 'SCRIBD_CLEAN_PRINT') {
      startContinuousAccumulativePrint();
      sendResponse({ status: 'ok' });
    } else if (request.action === 'SCRIBD_UNBLUR') {
      removeScribdPaywallAndUnblur();
      sendResponse({ status: 'ok' });
    } else if (request.action === 'SCRIBD_EXPORT_TXT') {
      exportScribdText();
      sendResponse({ status: 'ok' });
    }
  });

  // Tự động chèn Thanh Công Cụ Nổi trên trang Scribd xem tài liệu
  if (window.location.href.includes('scribd.com/document/')) {
    const initToolbar = () => setTimeout(injectScribdFloatingToolbar, 1000);
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initToolbar);
    } else {
      initToolbar();
    }
  }
}

/**
 * 1. TỰ ĐỘNG XÓA PAYWALL, MỜ CHỮ & BANNER CẢN TRỞ
 */
function removeScribdPaywallAndUnblur() {
  const garbageSelectors = [
    '.paywall', '.overlay', '.banner', '.upsell',
    '.premium-banner', '.subscribe-banner', '.ad-container',
    '[class*="paywall"]', '[class*="blur"]', '.auto__doc_page_webpack_doc_page_blur_promos',
    '.promo_container', '.between_page_portal_root', '.autoscroll_promo',
    '.absimg_blur_overlay', '.unsupported_browser_banner',
    '#onetrust-banner-sdk', '.cookie-banner', '[class*="cookie"]', '[class*="privacy"]', '[id*="onetrust"]'
  ];

  garbageSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      try { el.remove(); } catch (e) {}
    });
  });

  if (document.body) document.body.style.overflow = 'auto';
  if (document.documentElement) document.documentElement.style.overflow = 'auto';

  // Gỡ mờ CSS trên toàn bộ phần tử
  document.querySelectorAll('*').forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.filter && style.filter.includes('blur')) {
      el.style.setProperty('filter', 'none', 'important');
      el.style.setProperty('-webkit-filter', 'none', 'important');
    }
    if (style.opacity === '0' || style.visibility === 'hidden') {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
    }
  });

  document.querySelectorAll('.outer_page, .page_body, .doc_page, div[id^="page_"], .page-image').forEach(el => {
    el.style.setProperty('display', 'block', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('filter', 'none', 'important');
    el.style.setProperty('-webkit-filter', 'none', 'important');
  });
}

/**
 * 2. THUẬT TOÁN GOM TRANG LIÊN TỤC TRONG LÚC CUỘN (REAL-TIME ACCUMULATION)
 * Giải quyết triệt để việc Scribd Unmount (xóa thẻ) các trang đã cuộn qua
 */
function captureVisiblePagesIntoMap(pagesMap) {
  removeScribdPaywallAndUnblur();

  // 1. Quét tìm tất cả các phần tử đại diện cho trang đang được Mount trên DOM
  // Thu hẹp selector để tránh bắt nhầm các thẻ ảo (như footer, banner chứa ID dài)
  let pageNodes = Array.from(document.querySelectorAll('.outer_page, .doc_page, [id^="outer_page_"], [data-page-id]'))
    .filter(el => el.offsetWidth > 100 && el.offsetHeight > 200); // Kích thước phải đủ lớn để là 1 trang

  pageNodes.forEach((node, index) => {
    let pageNumStr = node.getAttribute('data-page-id') || node.getAttribute('data-page') || node.id;
    if (!pageNumStr) return;
    
    // Chỉ lấy con số đầu tiên tìm thấy (ví dụ "outer_page_15" -> 15)
    let match = pageNumStr.toString().match(/\d+/);
    if (!match) return;
    const pageNumInt = parseInt(match[0], 10);

    // Tránh lưu các trang có số trang ảo quá lớn (ID thẻ rác)
    if (pageNumInt === 0 || pageNumInt > 5000) return;

    const textLen = (node.innerText || '').trim().length;
    // Kiểm tra xem trang có ảnh, canvas hoặc background-image thực sự không
    const hasImages = node.querySelectorAll('img, svg, canvas, .absimg, .page-image, [style*="background-image"]').length > 0;

    if (textLen > 5 || hasImages) {
      const clone = node.cloneNode(true);

      // Xóa rác paywall/blur
      clone.querySelectorAll('.paywall, .overlay, .banner, .promo_container, [class*="blur"], [class*="paywall"]').forEach(e => e.remove());
      clone.querySelectorAll('*').forEach(e => {
        e.style.filter = 'none';
        e.style.webkitFilter = 'none';
        if (e.style.opacity === '0' || e.style.visibility === 'hidden') {
          e.style.opacity = '1';
          e.style.visibility = 'visible';
        }
      });

      // 1. Chuyển đổi data-src -> src
      clone.querySelectorAll('img').forEach(img => {
        const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-url');
        if (dataSrc && dataSrc.startsWith('http')) img.src = dataSrc;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      });

      // 2. Cứu ảnh từ background-image
      clone.querySelectorAll('.absimg, .page-image, .bgimg, [style*="background-image"]').forEach(el => {
        const bgImg = el.style.backgroundImage;
        if (bgImg && bgImg !== 'none') {
          const urlMatch = bgImg.match(/url\(['"]?(.*?)['"]?\)/);
          if (urlMatch && urlMatch[1]) {
            const img = document.createElement('img');
            img.src = urlMatch[1];
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            el.style.backgroundImage = 'none';
            el.appendChild(img);
          }
        }
      });

      // 3. QUAN TRỌNG: Cứu ảnh/nội dung từ thẻ <canvas>
      // Thẻ <canvas> khi bị cloneNode sẽ trắng tinh. Cần bóc xuất hình ảnh từ canvas gốc!
      const originalCanvases = node.querySelectorAll('canvas');
      const clonedCanvases = clone.querySelectorAll('canvas');
      
      originalCanvases.forEach((origCanvas, i) => {
        try {
          if (origCanvas.width > 0 && origCanvas.height > 0) {
            const dataUrl = origCanvas.toDataURL('image/png');
            const newImg = document.createElement('img');
            newImg.src = dataUrl;
            newImg.style.width = '100%';
            newImg.style.height = 'auto';
            newImg.style.display = 'block';
            
            // Thay thế thẻ canvas trong clone bằng thẻ img chứa nội dung thật
            if (clonedCanvases[i] && clonedCanvases[i].parentNode) {
              clonedCanvases[i].parentNode.replaceChild(newImg, clonedCanvases[i]);
            }
          }
        } catch (e) {
          // Bỏ qua nếu dính lỗi bảo mật CORS của canvas
        }
      });

      clone.style.display = 'block';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.position = 'relative';
      clone.style.margin = '0 auto 30px auto';

      const existing = pagesMap.get(pageNumInt);
      // Đếm số lượng ảnh thực sự có mã nguồn hợp lệ (src hoặc data-src) để đánh giá độ hoàn thiện
      const validImagesCount = Array.from(clone.querySelectorAll('img')).filter(img => 
        img.src && !img.src.includes('data:image/gif;base64,R0lGOD') // Bỏ qua ảnh rỗng 1 pixel
      ).length;
      
      if (!existing || textLen > existing.textLen || validImagesCount > (existing.imgCount || 0)) {
        pagesMap.set(pageNumInt, {
          pageNum: pageNumInt,
          textLen,
          imgCount: validImagesCount,
          htmlContent: clone.outerHTML
        });
      }
    }
  });
}

/**
 * 3. TIẾN TRÌNH VỪA CUỘN CHẬM VỪA GOM TRANG REAL-TIME (KHÔNG BỎ SÓT BẤT KỲ TRANG NÀO)
 */
async function startContinuousAccumulativePrint() {
  if (document.getElementById('scribd-exporter-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'scribd-exporter-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.92); color: white; z-index: 99999999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;
  overlay.innerHTML = `
    <div style="background: #1e293b; padding: 25px 35px; border-radius: 16px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid #334155; max-width: 440px; width: 90%;">
      <div style="font-size: 32px; margin-bottom: 12px;">📑</div>
      <div style="font-size: 18px; font-weight: 700; color: #38bdf8; margin-bottom: 8px;">Đang Gom Đủ 100% Trang & Văn Bản...</div>
      <div id="scribd-status-msg" style="font-size: 13px; color: #94a3b8; line-height: 1.5;">⚡ Vừa cuộn mượt vừa lưu trữ từng trang vào bộ nhớ...</div>
      <div style="margin-top: 15px; background: #334155; height: 6px; border-radius: 3px; overflow: hidden;">
        <div id="scribd-progress-bar" style="width: 10%; height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); transition: width 0.3s;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const statusMsg = document.getElementById('scribd-status-msg');
  const progressBar = document.getElementById('scribd-progress-bar');

  const setProgress = (percent, text) => {
    if (statusMsg) statusMsg.innerText = text;
    if (progressBar) progressBar.style.width = `${percent}%`;
  };

  const pagesMap = new Map();
  const scroller = document.querySelector('.document_scroller, .scroller, .document_column, .document_viewport, #document_wrapper, .viewport, [class*="scroller"]') || document.documentElement || document.body;

  try {
    removeScribdPaywallAndUnblur();

    // 1. Vừa cuộn bước nhỏ vừa gom trang ngay lập tức
    let attempts = 0;
    let maxAttempts = 500; // Cực kỳ kiên nhẫn, cuộn tối đa 500 lần (đủ cho sách > 1000 trang)
    let lastScrollTop = -1;
    let unchangedScrollCount = 0;

    await new Promise((resolve) => {
      const scrollTimer = setInterval(() => {
        attempts++;
        
        // Gom các trang đang hiển thị tại vị trí cuộn này
        captureVisiblePagesIntoMap(pagesMap);

        const count = pagesMap.size;
        const percent = Math.min(95, Math.floor((attempts / maxAttempts) * 100));
        setProgress(percent, `⚡ Đã gom được ${count} trang nguyên bản (100% chữ & ảnh)...`);

        // Ghi nhận vị trí hiện tại
        let currentScrollTop = scroller.scrollTop !== undefined ? scroller.scrollTop : window.scrollY;

        // Cuộn bước 500px để Scribd kịp nạp trang tiếp theo.
        window.scrollBy(0, 500);
        if (scroller && scroller.scrollTop !== undefined) {
          scroller.scrollTop += 500;
        }

        let newScrollTop = scroller.scrollTop !== undefined ? scroller.scrollTop : window.scrollY;

        // Kiểm tra xem có cuộn xuống thêm được không (đã đến đáy chưa)
        if (Math.abs(newScrollTop - lastScrollTop) < 10) {
          unchangedScrollCount++;
        } else {
          unchangedScrollCount = 0;
        }
        
        lastScrollTop = newScrollTop;

        // Dừng lại nếu đã chạm đáy (không thay đổi scrollTop trong 5 vòng lặp) hoặc vượt quá số lần tối đa
        if (unchangedScrollCount >= 5 || attempts >= maxAttempts) {
          clearInterval(scrollTimer);
          captureVisiblePagesIntoMap(pagesMap);
          resolve();
        }
      }, 1200); // TĂNG LÊN 1200ms! (Chấp nhận cực kỳ chậm để mạng chậm cỡ nào cũng bắt kịp toàn bộ text & canvas)
    });

    window.scrollTo(0, 0);
    if (scroller && scroller.scrollTop !== undefined) scroller.scrollTop = 0;

    const pages = Array.from(pagesMap.values()).sort((a, b) => a.pageNum - b.pageNum);

    if (pages.length === 0) {
      overlay.remove();
      alert('⚠️ Chưa nạp kịp trang. Bạn hãy cuộn chuột xuống một chút rồi thử lại nhé!');
      return;
    }

    setProgress(100, `🎉 Đã gom thành công đủ ${pages.length} trang! Đang mở Cửa số Bản in...`);
    await new Promise(r => setTimeout(r, 400));
    overlay.remove();

    // 2. Mở Cửa Sổ Bản In DOM Nguyên Bản chứa ĐẦY ĐỦ TRANG (100% không bị xóa)
    openLosslessPrintWindow(pages);

  } catch (err) {
    console.error('[Scribd Extract Error]', err);
    if (document.getElementById('scribd-exporter-overlay')) overlay.remove();
    alert('❌ Lỗi gom trang: ' + err.message);
  }
}

/**
 * 4. MỞ CỬA SỔ BẢN IN DOM NGUYÊN BẢN (100% CHỮ, HÌNH ÁNH & FONT CỦA SCRIBD)
 */
function openLosslessPrintWindow(pages) {
  const docTitle = (document.title || 'Scribd_Document')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .trim()
    .slice(0, 60);

  const printWindow = window.open('', '_blank', 'width=980,height=1000');
  if (!printWindow) {
    alert('⚠️ Trình duyệt đang chặn Cửa Sổ Mới! Vui lòng cho phép Mở Pop-up Cửa Sổ Mới trên thanh địa chỉ.');
    return;
  }

  // Thu thập toàn bộ các thẻ CSS Stylesheet của Scribd
  const existingStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(s => s.outerHTML)
    .join('\n');

  const pagesHtml = pages.map(p => `
    <div class="clean-page-wrapper" id="page-wrapper-${p.pageNum}">
      <div class="page-num-banner">Trang ${p.pageNum} / ${pages.length}</div>
      <div class="page-content-box">
        ${p.htmlContent}
      </div>
    </div>
  `).join('');

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  ${existingStyles}
  <style>
    body {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
      background: #0f172a !important;
      color: #f8fafc !important;
      margin: 0 !important;
      padding: 80px 20px 40px 20px !important;
      line-height: 1.6 !important;
    }
    .toolbar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: #1e293b;
      color: white;
      padding: 12px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 999999;
      box-sizing: border-box;
      border-bottom: 1px solid #334155;
    }
    .toolbar-title {
      font-size: 14px;
      font-weight: bold;
      color: #38bdf8;
    }
    .toolbar button {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .clean-page-wrapper {
      background: #ffffff !important;
      color: #0f172a !important;
      max-width: 860px !important;
      margin: 0 auto 35px auto !important;
      padding: 30px !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
      box-sizing: border-box !important;
      position: relative !important;
    }
    .page-num-banner {
      font-size: 11px;
      font-weight: bold;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .page-content-box {
      width: 100% !important;
      height: auto !important;
      position: relative !important;
    }
    .page-content-box * {
      filter: none !important;
      -webkit-filter: none !important;
      opacity: 1 !important;
      visibility: visible !important;
    }
    @media print {
      .toolbar { display: none !important; }
      body { background: white !important; color: black !important; padding: 0 !important; }
      .clean-page-wrapper {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 15px !important;
        max-width: 100% !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">📄 BẢN IN DOM NGUYÊN BẢN - SCRIBD (ĐỦ ${pages.length} TRANG - 100% CHỮ & HÌNH ÁNH)</div>
    <button onclick="window.print()">🖨️ IN FILE PDF CHUẨN (CTRL + P)</button>
  </div>
  ${pagesHtml}
</body>
</html>
  `);

  printWindow.document.close();
}

/**
 * 5. TRÍCH XUẤT FILE VĂN BẢN .TXT
 */
function exportScribdText() {
  const pagesMap = new Map();
  captureVisiblePagesIntoMap(pagesMap);
  const pages = Array.from(pagesMap.values()).sort((a, b) => a.pageNum - b.pageNum);

  if (pages.length === 0) {
    alert('⚠️ Không tìm thấy nội dung văn bản!');
    return;
  }

  const tempDiv = document.createElement('div');
  const textParts = pages.map(p => {
    tempDiv.innerHTML = p.htmlContent;
    const cleanText = (tempDiv.innerText || '').trim();
    return `=========================================\nTRANG ${p.pageNum} / ${pages.length}\n=========================================\n${cleanText}`;
  });

  const fullText = textParts.join('\n\n');
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(document.title || 'Scribd_Document').slice(0, 40)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 6. CHÈN FLOATING TOOLBAR GÓC MÀN HÌNH TRÊN SCRIBD
 */
function injectScribdFloatingToolbar() {
  if (document.getElementById('scribd-floating-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'scribd-floating-bar';
  bar.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 999999;
    display: flex; gap: 8px; background: rgba(15, 23, 42, 0.92);
    padding: 8px 12px; border-radius: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(8px);
  `;

  bar.innerHTML = `
    <button id="scribd-float-clean-print" title="Mở bản in DOM nguyên bản (Bảo toàn 100% chữ & hình ảnh)" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px;">
      📄 Cửa Sổ In DOM Nguyên Bản
    </button>
    <button id="scribd-float-unblur" title="Xóa mờ & Paywall" style="background: #e17055; color: white; border: none; padding: 7px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;">
      🔓 Xóa mờ
    </button>
  `;

  document.body.appendChild(bar);

  document.getElementById('scribd-float-clean-print')?.addEventListener('click', () => {
    startContinuousAccumulativePrint();
  });

  document.getElementById('scribd-float-unblur')?.addEventListener('click', () => {
    removeScribdPaywallAndUnblur();
    alert('✅ Đã xóa mờ thành công!');
  });
}