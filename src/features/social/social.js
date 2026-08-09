/**
 * FEATURES: THEO DÕI KÊNH & TÁC GIẢ (SUPER DECORATIVE SOCIAL PAGE)
 */

window.PAGES = window.PAGES || {};

// Số lượt tim khởi tạo
let heartCount = parseInt(localStorage.getItem('social_heart_count') || '1280', 10);

window.PAGES.social = {
  title: '✨ Theo dõi & Ủng hộ Kênh',

  render: function() {
    return `
      <div class="social-page-container">
        <!-- FLOATING DECORATIVE SPARKLES -->
        <div class="sparkle-particles">
          <span class="sparkle-particle" style="top:10%; left:15%; animation-delay:0s;">✨</span>
          <span class="sparkle-particle" style="top:40%; left:85%; animation-delay:2s;">💖</span>
          <span class="sparkle-particle" style="top:70%; left:20%; animation-delay:4s;">⭐</span>
          <span class="sparkle-particle" style="top:25%; left:70%; animation-delay:1.5s;">🚀</span>
        </div>

        <!-- HERO AUTHOR BANNER -->
        <div class="author-hero-banner">
          <div class="hero-main-content">
            <div class="hero-avatar-wrapper">
              <div class="hero-avatar-inner">👨‍💻</div>
              <span class="hero-online-badge" title="Sẵn sàng hỗ trợ"></span>
            </div>
            <div class="hero-author-details">
              <div class="hero-name-row">
                <span class="hero-by-tag">@by</span>
                <span class="hero-author-name">huii404</span>
                <span class="hero-verified" title="Tác giả đã xác minh">✓</span>
              </div>
              <span class="hero-author-bio">Multi Tool Hub • Sáng tạo & Kết nối ✨</span>
            </div>
          </div>

          <!-- HERO STATS BAR -->
          <div class="hero-stats-row">
            <div class="hero-stat-item">
              <span class="hero-stat-num">5.0 ⭐</span>
              <span class="hero-stat-label">Đánh giá</span>
            </div>
            <div class="hero-stat-item">
              <span class="hero-stat-num">10K+</span>
              <span class="hero-stat-label">Người dùng</span>
            </div>
            <div class="hero-stat-item">
              <span class="hero-stat-num">v1.0.0</span>
              <span class="hero-stat-label">Mới nhất</span>
            </div>
          </div>
        </div>

        <!-- HEART BURST INTERACTIVE BUTTON -->
        <div class="heart-burst-container">
          <button class="btn-heart-burst" id="btnHeartBurst">
            <span class="heart-icon">💖</span>
            <span>Thả tim tiếp thêm động lực</span>
            <span class="heart-count-badge" id="heartCountBadge">${heartCount}</span>
          </button>
        </div>

        <!-- SOCIAL CHANNELS TITLE -->
        <div class="social-channels-title">
          <span>📢 4 Kênh Mạng Xã Hội Chính Thức</span>
          <span style="font-size:10px; color:#888;">Nhấn để Follow</span>
        </div>

        <!-- SOCIAL CHANNELS GRID (EXACT 4 BUTTONS) -->
        <div class="social-grid-fancy">
          <!-- 1. YOUTUBE -->
          <div class="social-card-fancy youtube" data-url="https://www.youtube.com/@huiitapcode" data-name="YouTube @huiitapcode">
            <div class="social-card-icon-wrapper">📺</div>
            <div class="social-card-info">
              <div class="social-card-title-row">
                <span class="social-card-name">YouTube @huiitapcode</span>
              </div>
              <span class="social-card-desc">Học lập trình & Video hướng dẫn kĩ năng</span>
            </div>
            <span class="social-card-badge">
              <span>Đăng ký</span> ↗
            </span>
          </div>

          <!-- 2. TIKTOK -->
          <div class="social-card-fancy tiktok" data-url="https://www.tiktok.com/@babysharkkk____________" data-name="TikTok @babysharkkk____________">
            <div class="social-card-icon-wrapper">🎵</div>
            <div class="social-card-info">
              <div class="social-card-title-row">
                <span class="social-card-name">TikTok @babysharkkk...</span>
              </div>
              <span class="social-card-desc">Video ngắn IT & Mẹo công nghệ cực cuốn</span>
            </div>
            <span class="social-card-badge">
              <span>Follow</span> ↗
            </span>
          </div>

          <!-- 3. GITHUB -->
          <div class="social-card-fancy github" data-url="https://github.com/huii404" data-name="GitHub @huii404">
            <div class="social-card-icon-wrapper">🐙</div>
            <div class="social-card-info">
              <div class="social-card-title-row">
                <span class="social-card-name">GitHub @huii404</span>
              </div>
              <span class="social-card-desc">Mã nguồn tiện ích & Dự án Open-Source</span>
            </div>
            <span class="social-card-badge">
              <span>⭐ Follow</span> ↗
            </span>
          </div>

          <!-- 4. LOCKET WIDGET APP -->
          <div class="social-card-fancy locket" data-url="https://locket.cam/nhuii.3" data-name="Locket App @nhuii.3">
            <div class="social-card-icon-wrapper">💛</div>
            <div class="social-card-info">
              <div class="social-card-title-row">
                <span class="social-card-name">Locket App @nhuii.3</span>
              </div>
              <span class="social-card-desc">Ứng dụng Locket Widget & Chia sẻ ảnh tức thì 📸</span>
            </div>
            <span class="social-card-badge">
              <span>Kết nối</span> ↗
            </span>
          </div>

        </div>

        <!-- GRATITUDE WALL -->
        <div class="gratitude-card">
          <div class="gratitude-quote">
            "Mỗi lượt Follow & Đăng ký của bạn là nguồn cảm hứng lớn nhất giúp phát triển nhiều công cụ hữu ích hơn nữa!"
          </div>
          <div class="gratitude-author">💖 Trân trọng cảm ơn sự ủng hộ của bạn!</div>
        </div>
      </div>
    `;
  },

  attachEvents: function() {
    // 1. Xử lý Nút Thả Tim tương tác
    const heartBtn = document.getElementById('btnHeartBurst');
    const heartBadge = document.getElementById('heartCountBadge');

    if (heartBtn) {
      heartBtn.addEventListener('click', () => {
        heartCount++;
        localStorage.setItem('social_heart_count', heartCount.toString());
        if (heartBadge) heartBadge.textContent = heartCount;

        // Toast cảm ơn
        showToast('Cảm ơn bạn đã thả tim động lực! ❤️✨', 'success', 2500);

        // Hiệu ứng nảy nút
        heartBtn.style.transform = 'scale(1.08)';
        setTimeout(() => {
          heartBtn.style.transform = '';
        }, 150);
      });
    }

    // 2. Xử lý click mở link 4 kênh Social
    document.querySelectorAll('.social-card-fancy').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.getAttribute('data-url');
        const name = card.getAttribute('data-name') || 'Kênh Social';
        
        if (url) {
          if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: url });
          } else {
            window.open(url, '_blank');
          }
          showToast(`Đang chuyển hướng tới ${name}... 🚀`, 'success');
        }
      });
    });
  }
};
