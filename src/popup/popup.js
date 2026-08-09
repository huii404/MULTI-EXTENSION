
window.PAGES = window.PAGES || {};
window.PAGES.home = {
  render: renderHome,
  title: ''
};
const PAGES = window.PAGES;

let currentPage = 'home';
let previousPage = null; 

function navigateTo(pageName) {
  const container = document.getElementById('app-container');
  const page = PAGES[pageName];
  if (!page) {
    console.error('Page not found:', pageName);
    return;
  }

  // ✅ Lưu trang hiện tại thành trang trước đó
  if (currentPage !== pageName) {
    previousPage = currentPage;
  }

  currentPage = pageName;
  container.scrollTop = 0;

  if (pageName === 'home') {
    container.innerHTML = page.render();
    attachHomeEvents();
  } else {
    container.innerHTML = `
      <div class="page-enter">
        <div class="back-bar">
          <button id="backBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Quay lại
          </button>
          <span class="page-title">${page.title}</span>
        </div>
        ${page.render()}
      </div>
    `;
    
    // ✅ Xử lý nút back: quay về trang trước đó
    document.getElementById('backBtn').addEventListener('click', () => {
      if (previousPage && previousPage !== 'home') {
        // Nếu trang trước không phải home → quay về trang đó
        navigateTo(previousPage);
      } else {
        // Nếu không có trang trước → về home
        navigateTo('home');
      }
    });
    
    page.attachEvents && page.attachEvents();
  }
}

// ---------- HOME PAGE ----------
function renderHome() {
  return `
    <div class="page-enter">
      <!-- DTU Hub -->
      <button class="feature-card" data-page="dtu" style="border-left: 4px solid #d52b1e;">
        <div class="icon-box" style="background: linear-gradient(135deg, #d52b1e, #ff6b6b); color:white;">🏛️</div>
        <div class="info">
          <span class="title">SINHVIEN DTU</span>
          <span class="desc">Đánh giá giảng viên và các tiện ích sinh viên</span>
        </div>
        <span style="display:flex;align-items:center;gap:4px;">
          <span class="arrow">›</span>
        </span>
      </button>

      <!-- Document Download -->
      <button class="feature-card" data-page="document-download" style="border-left: 4px solid #FF6B00;">
        <div class="icon-box" style="background: linear-gradient(135deg, #FF6B00, #0077B5); color:white;">📚</div>
        <div class="info">
          <span class="title">Tải tài liệu</span>
          <span class="desc">Studocu & Scribd - Tải PDF, xóa watermark</span>
        </div>
        <span style="display:flex;align-items:center;gap:4px;">
          <span class="arrow">›</span>
        </span>
      </button>

      <!-- Screenshot -->
      <button class="feature-card" data-page="screenshot" style="border-left: 4px solid #7C3AED;">
        <div class="icon-box" style="background: linear-gradient(135deg, #7C3AED, #A78BFA); color:white;">📸</div>
        <div class="info">
          <span class="title">Chụp ảnh Web</span>
          <span class="desc">Chỉ nội dung trang, không UI trình duyệt</span>
        </div>
        <span style="display:flex;align-items:center;gap:4px;">
          <span class="arrow">›</span>
        </span>
      </button>

      <button class="feature-card" data-page="text-tools" style="border-left: 4px solid #2ECC71;">
        <div class="icon-box" style="background: linear-gradient(135deg, #2ECC71, #27AE60); color:white;">🧹</div>
        <div class="info">
          <span class="title">Text Tools</span>
          <span class="desc">Làm sạch, so sánh, phân tích văn bản</span>
        </div>
        <span class="arrow">›</span>
      </button>

      <!-- QR Code -->
      <button class="feature-card" data-page="qrcode" style="border-left: 4px solid #8e44ad;">
        <div class="icon-box" style="background: linear-gradient(135deg, #8e44ad, #9b59b6); color:white;">📱</div>
        <div class="info">
          <span class="title">Tạo mã QR</span>
          <span class="desc">Tạo QR Code từ văn bản, URL, số điện thoại...</span>
        </div>
        <span style="display:flex;align-items:center;gap:4px;">
          <span class="arrow">›</span>
        </span>
      </button>

      <!-- Social & Author Feature Card -->
      <button class="feature-card" data-page="social" style="border-left: 4px solid #FF007A;">
        <div class="icon-box" style="background: linear-gradient(135deg, #FF007A, #7928CA); color:white;">✨</div>
        <div class="info">
          <span class="title">Theo dõi Kênh & Tác giả</span>
          <span class="desc">YouTube • TikTok • GitHub • Locket</span>
        </div>
        <span style="display:flex;align-items:center;gap:4px;">
          <span class="arrow">›</span>
        </span>
      </button>

    </div>
  `;
}

function attachHomeEvents() {

  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
      const page = card.getAttribute('data-page');
      navigateTo(page);
    });
  });
}


// ---------- LIVE CLOCK ----------
function initLiveClock() {
  const clockElement = document.getElementById('clockTime');

  if (!clockElement) return;

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  navigateTo('home');
  initLiveClock();
});
