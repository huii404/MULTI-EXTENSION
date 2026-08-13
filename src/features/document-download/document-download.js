// DOCUMENT DOWNLOAD MODULE - STUDOCU (SINGLE FOLDER FEATURE)

const DOC_DOWNLOAD_HTML = `
<div class="doc-download-container">
  <button id="stu-pdf-btn" class="action-btn primary" style="margin-bottom: 8px;">
    <div class="icon-circle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" x2="12" y1="15" y2="3"/>
      </svg>
    </div>
    <div class="btn-info">
      <span class="btn-heading">Tải File PDF</span>
      <span class="btn-sub">Tự động xóa watermark & dàn trang in sạch</span>
    </div>
  </button>

  <button id="stu-clear-btn" class="action-btn secondary" style="margin-bottom: 8px;">
    <div class="icon-circle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
    <div class="btn-info">
      <span class="btn-heading">Xem file & Xóa Watermark</span>
      <span class="btn-sub">Xóa cookie và reload trang</span>
    </div>
  </button>

  <button id="stu-capture-btn" class="action-btn secondary" style="margin-bottom: 0;">
    <div class="icon-circle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </div>
    <div class="btn-info">
      <span class="btn-heading">Lưu thành Ảnh</span>
      <span class="btn-sub">Tải trang đang hiển thị (.PNG)</span>
    </div>
  </button>
</div>
`;

// HÀM CHUNG: Xóa toàn bộ Cookie & Watermark của Studocu
async function clearStudocuCookies() {
  const allCookies = await chrome.cookies.getAll({});
  let deletedCount = 0;
  for (const cookie of allCookies) {
    if (cookie.domain && cookie.domain.includes('studocu')) {
      try {
        let cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        const protocol = cookie.secure ? 'https:' : 'http:';
        const url = `${protocol}//${cleanDomain}${cookie.path || '/'}`;
        await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
        deletedCount++;
      } catch (e) {
        console.warn('[Studocu] Không xóa được cookie:', cookie.name, e);
      }
    }
  }
  console.log(`[Studocu] Đã xóa ${deletedCount} cookie`);
  return deletedCount;
}

// POPUP PAGE - DOCUMENT DOWNLOAD (STUDOCU)

PAGES['document-download'] = {
  render: function() {
    return DOC_DOWNLOAD_HTML;
  },

  attachEvents: function() {
    // ========== 1. Tải File PDF (Tự động Xóa Cookie/Watermark trước khi tạo PDF) ==========
    document.getElementById('stu-pdf-btn')?.addEventListener('click', async function() {
      console.log('[Studocu] PDF button clicked - initiating clean workflow');
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url || !tab.url.includes('studocu')) {
          alert('⚠️ Tính năng này chỉ hoạt động trên trang Studocu.');
          return;
        }

        const btn = this;
        const originalText = btn.querySelector('.btn-heading')?.innerText || 'Tải File PDF';
        const heading = btn.querySelector('.btn-heading');
        if (heading) heading.innerText = '⏳ Đang xóa cookie & mờ chữ...';
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        // Bước 1: Xóa sạch cookie để gỡ rào cản mờ chữ & watermark
        await clearStudocuCookies();

        if (heading) heading.innerText = '⏳ Đang tải lại & xuất PDF...';

        // Bước 2: Thêm tham số banhmi_auto_pdf=1 vào URL để kích hoạt quy trình tự cuộn & in PDF sạch
        const urlObj = new URL(tab.url);
        urlObj.searchParams.set('banhmi_auto_pdf', '1');
        await chrome.tabs.update(tab.id, { url: urlObj.toString() });

      } catch (err) {
        console.error('[Studocu] PDF error:', err);
        alert('❌ Lỗi: ' + err.message);
        const btn = this;
        const heading = btn.querySelector('.btn-heading');
        if (heading) heading.innerText = 'Tải File PDF';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });

    // ========== 2. Xem file & Xóa Watermark ==========
    document.getElementById('stu-clear-btn')?.addEventListener('click', async function() {
      console.log('[Studocu] Clear button clicked');
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url || !tab.url.includes('studocu')) {
          alert('⚠️ Tính năng này chỉ hoạt động trên trang Studocu.');
          return;
        }

        const btn = this;
        const originalText = btn.querySelector('.btn-heading')?.innerText || 'Xem file & Xóa Watermark';
        const heading = btn.querySelector('.btn-heading');
        if (heading) heading.innerText = '⏳ Đang xóa cookie...';
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        // Gọi hàm xóa cookie chung
        await clearStudocuCookies();

        await chrome.tabs.reload(tab.id);
        if (heading) heading.innerText = originalText;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      } catch (err) {
        console.error('[Studocu] Clear error:', err);
        alert('❌ Lỗi: ' + err.message);
        const btn = this;
        const heading = btn.querySelector('.btn-heading');
        if (heading) heading.innerText = 'Xem file & Xóa Watermark';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });

    // ========== 3. Lưu thành Ảnh ==========
    document.getElementById('stu-capture-btn')?.addEventListener('click', function() {
      console.log('[Studocu] Capture button clicked');
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs[0];
        if (!tab || !tab.url || !tab.url.includes('studocu')) {
          alert('⚠️ Tính năng này chỉ hoạt động trên trang Studocu.');
          return;
        }

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: captureVisiblePages
        }, function(results) {
          if (chrome.runtime.lastError) {
            console.error('[Studocu] Capture error:', chrome.runtime.lastError);
            alert('❌ Lỗi: ' + chrome.runtime.lastError.message);
            return;
          }
          if (results && results[0] && results[0].result) {
            const images = results[0].result;
            if (images.length === 0) {
              alert('⚠️ Không tìm thấy trang nào trên màn hình.');
              return;
            }
            images.forEach(function(imgData) {
              chrome.downloads.download({
                url: imgData.src,
                filename: `Studocu_${imgData.name}`,
                saveAs: false
              }, function(downloadId) {
                if (chrome.runtime.lastError) {
                  console.error('[Studocu] Download error:', chrome.runtime.lastError);
                }
              });
            });
            alert(`✅ Đang tải ${images.length} ảnh...`);
          }
        });
      });
    });
  },

  title: '📚 Tải tài liệu Studocu'
};


// HÀM CHỤP ẢNH (injected vào trang)
function captureVisiblePages() {
  console.log('[Studocu] captureVisiblePages running');
  const visiblePages = [];
  const pages = document.querySelectorAll('div[data-page-index]');
  if (pages.length === 0) {
    console.warn('[Studocu] Không tìm thấy trang nào');
    return [];
  }

  pages.forEach(function(page, index) {
    const rect = page.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
      visiblePages.push({ element: page, index: index + 1 });
    }
  });

  if (visiblePages.length === 0) {
    alert('⚠️ Không tìm thấy trang nào trên màn hình. Hãy cuộn đến trang muốn chụp!');
    return [];
  }

  const imagesToDownload = [];
  visiblePages.forEach(function(item) {
    const img = item.element.querySelector('img.bi') || 
                item.element.querySelector('img') || 
                item.element.querySelector('img[src*="studocu"]');
    if (img && img.src) {
      let src = img.src;
      if (img.srcset) {
        const srcsetParts = img.srcset.split(',');
        if (srcsetParts.length > 0) {
          let maxSize = 0;
          let bestSrc = src;
          srcsetParts.forEach(function(part) {
            const match = part.trim().match(/^(.*?)\s+(\d+)w$/);
            if (match) {
              const size = parseInt(match[2]);
              if (size > maxSize) {
                maxSize = size;
                bestSrc = match[1];
              }
            }
          });
          if (bestSrc) src = bestSrc;
        }
      }
      imagesToDownload.push({ src: src, name: `page_${item.index}.png` });
    }
  });

  if (imagesToDownload.length === 0) {
    alert('⚠️ Không tìm thấy dữ liệu ảnh. Trang có thể chưa tải xong hoặc bị che mờ.');
  }
  return imagesToDownload;
}

console.log('[Document Download] Module loaded with integrated Cookie & Watermark Cleaner');