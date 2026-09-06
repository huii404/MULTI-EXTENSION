// DOCUMENT DOWNLOAD MODULE - MULTI-SKILL (STUDOCU & SCRIBD)

let currentDocSkill = null; // null: hiện danh sách skill, 'studocu' | 'scribd'

// ==========================================
// 1. GIAO DIỆN HTML
// ==========================================

// Danh sách các skill
function renderSkillsListHTML(activeTabUrl = '') {
  const isStudocu = activeTabUrl && activeTabUrl.includes('studocu');
  const isScribd = activeTabUrl && activeTabUrl.includes('scribd.com');

  return `
    <div class="doc-skills-list">
      <!-- Skill 1: Studocu -->
      <button class="doc-skill-card studocu" data-skill="studocu">
        <div class="skill-icon">📚</div>
        <div class="skill-info">
          <span class="skill-title">
            Studocu Downloader
            ${isStudocu ? '<span style="font-size:10px; color:var(--stu-orange); background:rgba(255,107,0,0.1); padding:2px 6px; border-radius:4px;">Đang mở</span>' : ''}
          </span>
          <span class="skill-desc">Tải PDF, xóa watermark & cookie</span>
        </div>
        <span class="skill-arrow">›</span>
      </button>

      <!-- Skill 2: Scribd -->
      <button class="doc-skill-card scribd" data-skill="scribd">
        <div class="skill-icon">📖</div>
        <div class="skill-info">
          <span class="skill-title">
            Scribd Downloader
            ${isScribd ? '<span style="font-size:10px; color:#008272; background:rgba(0,130,114,0.1); padding:2px 6px; border-radius:4px;">Đang mở</span>' : ''}
          </span>
          <span class="skill-desc">Tải PDF, xóa cookie tránh che chữ</span>
        </div>
        <span class="skill-arrow">›</span>
      </button>
    </div>
  `;
}

// Giao diện Skill Studocu
function renderStudocuViewHTML() {
  return `
    <div class="doc-skill-view">
      <div class="doc-sub-header">
        <button id="doc-back-btn" class="doc-sub-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Danh sách Skill
        </button>
        <span class="doc-sub-title">📚 Studocu</span>
      </div>

      <div class="doc-download-container">
        <button id="stu-pdf-btn" class="action-btn primary">
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

        <button id="stu-clear-btn" class="action-btn secondary">
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

        <button id="stu-capture-btn" class="action-btn secondary">
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
    </div>
  `;
}

// Giao diện Skill Scribd (Tối giản: Tải PDF, Xóa cookie tránh bị che chữ, Mở Embed)
function renderScribdViewHTML() {
  return `
    <div class="doc-skill-view">
      <div class="doc-sub-header">
        <button id="doc-back-btn" class="doc-sub-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Danh sách Skill
        </button>
        <span class="doc-sub-title">📖 Scribd</span>
      </div>

      <div class="doc-download-container">
        <!-- 1. Mẹo sửa link sang Embed (Xem Full không bị chặn) -->
        <button id="scribd-embed-btn" class="action-btn scribd-primary">
          <div class="icon-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" x2="14" y1="14" y2="10"/>
            </svg>
          </div>
          <div class="btn-info">
            <span class="btn-heading">Đổi Link Sang Embed (Xem Không Bị Chặn)</span>
            <span class="btn-sub">Mẹo đổi URL sang Embed để xem full không bị mờ/đòi tiền</span>
          </div>
        </button>

        <!-- 2. Tải File PDF Sạch -->
        <button id="scribd-pdf-btn" class="action-btn scribd-secondary">
          <div class="icon-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </div>
          <div class="btn-info">
            <span class="btn-heading">Tải File PDF</span>
            <span class="btn-sub">Tự chuyển Embed, nạp hết các trang & in PDF sạch</span>
          </div>
        </button>

        <!-- 3. Xem file & Xóa Cookie (Tránh bị che chữ) -->
        <button id="scribd-clear-btn" class="action-btn scribd-secondary">
          <div class="icon-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="btn-info">
            <span class="btn-heading">Xóa Cookie (Tránh Bị Che Chữ)</span>
            <span class="btn-sub">Xóa cookie giới hạn lượt đọc và reload lại trang</span>
          </div>
        </button>
      </div>
    </div>
  `;
}


// ==========================================
// 2. CÁC HÀM XỬ LÝ COOKIE
// ==========================================

// Xóa Cookie Studocu
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

// Xóa Cookie Scribd để tránh bị giới hạn lượt đọc & che mờ chữ
async function clearScribdCookies() {
  const allCookies = await chrome.cookies.getAll({});
  let deletedCount = 0;
  for (const cookie of allCookies) {
    if (cookie.domain && cookie.domain.includes('scribd')) {
      try {
        let cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        const protocol = cookie.secure ? 'https:' : 'http:';
        const url = `${protocol}//${cleanDomain}${cookie.path || '/'}`;
        await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
        deletedCount++;
      } catch (e) {
        console.warn('[Scribd] Không xóa được cookie:', cookie.name, e);
      }
    }
  }
  console.log(`[Scribd] Đã xóa ${deletedCount} cookie`);
  return deletedCount;
}

// Chụp ảnh Studocu
function captureVisiblePagesStudocu() {
  const visiblePages = [];
  const pages = document.querySelectorAll('div[data-page-index]');
  if (pages.length === 0) return [];

  pages.forEach(function(page, index) {
    const rect = page.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
      visiblePages.push({ element: page, index: index + 1 });
    }
  });

  if (visiblePages.length === 0) return [];

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

  return imagesToDownload;
}

// Trích xuất Document ID từ URL Scribd
function extractScribdDocId(url) {
  if (!url) return null;
  const match = url.match(/scribd\.com\/(?:document|doc|embeds)\/(\d+)/i);
  return (match && match[1]) ? match[1] : null;
}

// Tạo URL Embed từ Document ID
function buildScribdEmbedUrl(docId) {
  return `https://www.scribd.com/embeds/${docId}/content?start_page=1&view_mode=scroll&access_key=key-fFexxf7r1bzEfWu3HKwf`;
}


// ==========================================
// 3. ATTACH EVENTS THEO TỪNG VIEW
// ==========================================

function attachSkillListEvents() {
  document.querySelectorAll('.doc-skill-card').forEach(card => {
    card.addEventListener('click', function() {
      const skill = this.getAttribute('data-skill');
      currentDocSkill = skill;
      renderCurrentView();
    });
  });
}

function attachStudocuEvents() {
  document.getElementById('doc-back-btn')?.addEventListener('click', () => {
    currentDocSkill = null;
    renderCurrentView();
  });

  // 1. Tải File PDF
  document.getElementById('stu-pdf-btn')?.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('studocu')) {
        if (typeof showToast === 'function') showToast('⚠️ Hãy mở trang tài liệu Studocu trước!', 'warning');
        else alert('⚠️ Tính năng này chỉ hoạt động trên trang Studocu.');
        return;
      }

      const btn = this;
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = '⏳ Đang xóa cookie & mờ chữ...';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';

      await clearStudocuCookies();

      if (heading) heading.innerText = '⏳ Đang tải lại & xuất PDF...';
      const urlObj = new URL(tab.url);
      urlObj.searchParams.set('banhmi_auto_pdf', '1');
      await chrome.tabs.update(tab.id, { url: urlObj.toString() });

    } catch (err) {
      console.error('[Studocu] PDF error:', err);
      if (typeof showToast === 'function') showToast('❌ Lỗi: ' + err.message, 'error');
      else alert('❌ Lỗi: ' + err.message);
      const btn = this;
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = 'Tải File PDF';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  // 2. Xem file & Xóa Watermark
  document.getElementById('stu-clear-btn')?.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('studocu')) {
        if (typeof showToast === 'function') showToast('⚠️ Hãy mở trang tài liệu Studocu trước!', 'warning');
        else alert('⚠️ Tính năng này chỉ hoạt động trên trang Studocu.');
        return;
      }

      const btn = this;
      const originalText = btn.querySelector('.btn-heading')?.innerText || 'Xem file & Xóa Watermark';
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = '⏳ Đang xóa cookie...';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';

      await clearStudocuCookies();
      await chrome.tabs.reload(tab.id);

      if (heading) heading.innerText = originalText;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      if (typeof showToast === 'function') showToast('✅ Đã xóa cookie Studocu thành công!', 'success');
    } catch (err) {
      console.error('[Studocu] Clear error:', err);
      if (typeof showToast === 'function') showToast('❌ Lỗi: ' + err.message, 'error');
      else alert('❌ Lỗi: ' + err.message);
      const btn = this;
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = 'Xem file & Xóa Watermark';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  // 3. Lưu thành Ảnh
  document.getElementById('stu-capture-btn')?.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes('studocu')) {
        if (typeof showToast === 'function') showToast('⚠️ Hãy mở trang tài liệu Studocu trước!', 'warning');
        else alert('⚠️ Tính năng này chỉ hoạt động trên trang Studocu.');
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: captureVisiblePagesStudocu
      }, function(results) {
        if (chrome.runtime.lastError) {
          if (typeof showToast === 'function') showToast('❌ ' + chrome.runtime.lastError.message, 'error');
          else alert('❌ Lỗi: ' + chrome.runtime.lastError.message);
          return;
        }
        if (results && results[0] && results[0].result) {
          const images = results[0].result;
          if (images.length === 0) {
            if (typeof showToast === 'function') showToast('⚠️ Không tìm thấy ảnh trang nào trên màn hình!', 'warning');
            else alert('⚠️ Không tìm thấy trang nào trên màn hình.');
            return;
          }
          images.forEach(function(imgData) {
            chrome.downloads.download({
              url: imgData.src,
              filename: `Studocu_${imgData.name}`,
              saveAs: false
            });
          });
          if (typeof showToast === 'function') showToast(`✅ Đang tải ${images.length} ảnh trang...`, 'success');
        }
      });
    });
  });
}

function attachScribdEvents() {
  document.getElementById('doc-back-btn')?.addEventListener('click', () => {
    currentDocSkill = null;
    renderCurrentView();
  });

  // 1. TẢI FILE PDF (Tự động xóa cookie, gỡ che chữ & xuất PDF sạch)
  document.getElementById('scribd-pdf-btn')?.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('scribd.com')) {
        if (typeof showToast === 'function') showToast('⚠️ Hãy mở trang tài liệu Scribd trước!', 'warning');
        else alert('⚠️ Tính năng này chỉ hoạt động trên trang Scribd.');
        return;
      }

      const btn = this;
      const originalText = btn.querySelector('.btn-heading')?.innerText || 'Tải File PDF';
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = '⏳ Đang xóa cookie & gỡ che...';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';

      // Xóa cookie Scribd để tránh bị giới hạn lượt đọc
      await clearScribdCookies();

      if (heading) heading.innerText = '⏳ Đang tải & chuẩn bị PDF...';

      const docId = extractScribdDocId(tab.url);

      if (tab.url.includes('/embeds/')) {
        // Đang ở trang Embed -> Gửi lệnh bắt đầu tải trực tiếp
        chrome.tabs.sendMessage(tab.id, { action: 'START_DOWNLOAD', scrollDelay: 150 }, () => {
          if (chrome.runtime.lastError) {
            const urlObj = new URL(tab.url);
            urlObj.searchParams.set('start_download', 'true');
            urlObj.searchParams.set('scroll_delay', '150');
            chrome.tabs.update(tab.id, { url: urlObj.toString() });
          }
        });
      } else if (docId) {
        // Đang ở trang document thông thường -> Chuyển sang link Embed với engine quét tải PDF tối ưu
        const embedPdfUrl = `https://www.scribd.com/embeds/${docId}/content?start_download=true&scroll_delay=150&original_url=${encodeURIComponent(tab.url)}&doc_title=${encodeURIComponent(tab.title || '')}`;
        await chrome.tabs.update(tab.id, { url: embedPdfUrl });
      } else {
        // Trang Scribd khác -> Gửi lệnh tải trực tiếp
        chrome.tabs.sendMessage(tab.id, { action: 'START_DOWNLOAD', scrollDelay: 150 }, () => {
          if (chrome.runtime.lastError) {
            const urlObj = new URL(tab.url);
            urlObj.searchParams.set('start_download', 'true');
            chrome.tabs.update(tab.id, { url: urlObj.toString() });
          }
        });
      }

    } catch (err) {
      console.error('[Scribd] PDF error:', err);
      if (typeof showToast === 'function') showToast('❌ Lỗi: ' + err.message, 'error');
      else alert('❌ Lỗi: ' + err.message);
      const btn = this;
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = 'Tải File PDF';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  // 2. XEM FILE & XÓA COOKIE (Tránh bị che chữ)
  document.getElementById('scribd-clear-btn')?.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('scribd.com')) {
        if (typeof showToast === 'function') showToast('⚠️ Hãy mở trang tài liệu Scribd trước!', 'warning');
        else alert('⚠️ Tính năng này chỉ hoạt động trên trang Scribd.');
        return;
      }

      const btn = this;
      const originalText = btn.querySelector('.btn-heading')?.innerText || 'Xem file & Xóa Cookie';
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = '⏳ Đang xóa cookie...';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';

      // Xóa toàn bộ Cookie của Scribd
      await clearScribdCookies();

      // Tải lại trang để áp dụng
      await chrome.tabs.reload(tab.id);

      if (heading) heading.innerText = originalText;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      if (typeof showToast === 'function') showToast('✅ Đã xóa cookie Scribd thành công! Trang đã được làm mới.', 'success');
    } catch (err) {
      console.error('[Scribd] Clear error:', err);
      if (typeof showToast === 'function') showToast('❌ Lỗi: ' + err.message, 'error');
      else alert('❌ Lỗi: ' + err.message);
      const btn = this;
      const heading = btn.querySelector('.btn-heading');
      if (heading) heading.innerText = 'Xem file & Xóa Cookie';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  // 1. ĐỔI LINK SANG EMBED (Xem không bị che)
  document.getElementById('scribd-embed-btn')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('scribd.com')) {
      if (typeof showToast === 'function') showToast('⚠️ Hãy mở trang tài liệu Scribd trước!', 'warning');
      else alert('⚠️ Hãy mở trang tài liệu Scribd trước!');
      return;
    }

    const docId = extractScribdDocId(tab.url);
    if (!docId) {
      if (typeof showToast === 'function') showToast('⚠️ Không tìm thấy mã tài liệu từ trang hiện tại!', 'warning');
      else alert('⚠️ Không tìm thấy mã tài liệu!');
      return;
    }

    // Xóa cookie trước để tránh bị dính giới hạn
    await clearScribdCookies();

    // Chuyển trực tiếp tab hiện tại sang link Embed sạch
    const embedUrl = buildScribdEmbedUrl(docId);
    await chrome.tabs.update(tab.id, { url: embedUrl });
    if (typeof showToast === 'function') showToast('🚀 Đã đổi link sang Embed! Toàn bộ trang đã được mở khóa.', 'success');
  });
}


// ==========================================
// 4. QUẢN LÝ RENDER & ĐIỀU HƯỚNG
// ==========================================

async function renderCurrentView() {
  const container = document.getElementById('app-container');
  if (!container) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeUrl = tab ? tab.url : '';

  let htmlContent = '';
  if (currentDocSkill === 'studocu') {
    htmlContent = renderStudocuViewHTML();
  } else if (currentDocSkill === 'scribd') {
    htmlContent = renderScribdViewHTML();
  } else {
    htmlContent = renderSkillsListHTML(activeUrl);
  }

  const bodyEl = container.querySelector('.doc-download-body') || container;
  if (currentDocSkill) {
    bodyEl.innerHTML = htmlContent;
    if (currentDocSkill === 'studocu') attachStudocuEvents();
    if (currentDocSkill === 'scribd') attachScribdEvents();
  } else {
    bodyEl.innerHTML = htmlContent;
    attachSkillListEvents();
  }
}

// Đăng ký Page với Router Popup
PAGES['document-download'] = {
  render: function() {
    return `<div class="doc-download-body">${renderSkillsListHTML('')}</div>`;
  },

  attachEvents: function() {
    currentDocSkill = null;
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      const activeUrl = tab ? tab.url : '';
      const bodyEl = document.querySelector('.doc-download-body');
      if (bodyEl && !currentDocSkill) {
        bodyEl.innerHTML = renderSkillsListHTML(activeUrl);
        attachSkillListEvents();
      }
    });
  },

  onBack: function() {
    if (currentDocSkill) {
      currentDocSkill = null;
      renderCurrentView();
      return true;
    }
    return false;
  },

  title: '📚 Tải tài liệu (Studocu & Scribd)'
};

console.log('[Document Download] Module loaded with minimal Studocu & Scribd skills.');