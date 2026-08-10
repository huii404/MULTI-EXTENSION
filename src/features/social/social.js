/**
 * FEATURES: THEO DÕI KÊNH & TÁC GIẢ (MINIMALIST SOCIAL PAGE)
 */

window.PAGES = window.PAGES || {};

window.PAGES.social = {
  title: 'Theo dõi & Ủng hộ Kênh',

  render: function() {
    return `
      <div class="social-page-container">
        <!-- AUTHOR PROFILE CARD -->
        <div class="author-profile-card">
          <div class="profile-header">
            <div class="avatar-container">
              <div class="avatar-icon">👨‍💻</div>
              <span class="online-indicator" title="Sẵn sàng hỗ trợ"></span>
            </div>
            <div class="profile-info">
              <div class="profile-name-row">
                <span class="profile-name">huii404</span>
                <span class="verified-badge" title="Tác giả chính thức">✓</span>
              </div>
              <span class="profile-tagline">Multi Tool Hub • Creator & Developer</span>
            </div>
          </div>
        </div>

        <!-- SECTION TITLE -->
        <div class="social-section-header">
          <span>📢 Kênh Truyền Thông</span>
          <span class="header-subtext">Nhấp để truy cập</span>
        </div>

        <!-- SOCIAL CHANNELS LIST (4 OFFICIAL CARDS) -->
        <div class="social-list">
          <!-- 1. YOUTUBE -->
          <div class="social-card-fancy youtube" data-url="https://www.youtube.com/@huiitapcode" data-name="YouTube @huiitapcode">
            <div class="social-card-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div class="social-card-info">
              <span class="social-card-name">YouTube</span>
              <span class="social-card-desc">@huiitapcode • Học lập trình & mẹo hữu ích</span>
            </div>
            <span class="social-card-badge">Đăng ký ↗</span>
          </div>

          <!-- 2. TIKTOK -->
          <div class="social-card-fancy tiktok" data-url="https://www.tiktok.com/@babysharkkk____________" data-name="TikTok @babysharkkk____________">
            <div class="social-card-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.29-2.5.62-5.05 2.45-6.76 1.44-1.37 3.41-2.1 5.37-2.1.33 0 .66.02.99.07v4.06c-.57-.14-1.18-.18-1.76-.08-1.04.14-2.02.77-2.57 1.66-.62.97-.73 2.21-.36 3.28.36 1.09 1.25 1.93 2.37 2.23 1.13.31 2.37.04 3.28-.68.74-.58 1.22-1.46 1.34-2.4.08-1.14.04-2.29.04-3.43V.02z"/>
              </svg>
            </div>
            <div class="social-card-info">
              <span class="social-card-name">TikTok</span>
              <span class="social-card-desc">@babysharkkk... • Video ngắn IT & mẹo hay</span>
            </div>
            <span class="social-card-badge">Follow ↗</span>
          </div>

          <!-- 3. GITHUB -->
          <div class="social-card-fancy github" data-url="https://github.com/huii404" data-name="GitHub @huii404">
            <div class="social-card-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </div>
            <div class="social-card-info">
              <span class="social-card-name">GitHub</span>
              <span class="social-card-desc">@huii404 • Mã nguồn & dự án mã nguồn mở</span>
            </div>
            <span class="social-card-badge">Star ↗</span>
          </div>

          <!-- 4. LOCKET -->
          <div class="social-card-fancy locket" data-url="https://locket.cam/nhuii.3" data-name="Locket App @nhuii.3">
            <div class="social-card-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div class="social-card-info">
              <span class="social-card-name">Locket App</span>
              <span class="social-card-desc">@nhuii.3 • Kết nối & chia sẻ khoảnh khắc</span>
            </div>
            <span class="social-card-badge">Kết nối ↗</span>
          </div>
        </div>

        <!-- FOOTER GRATITUDE CARD -->
        <div class="gratitude-card">
          <p class="gratitude-quote">"Mỗi lượt theo dõi của bạn là động lực lớn nhất để tác giả tiếp tục phát triển công cụ hữu ích!"</p>
          <span class="gratitude-author">💖 Trân trọng cảm ơn bạn</span>
        </div>
      </div>
    `;
  },

  attachEvents: function() {
    // Xử lý chuyển hướng mở link 4 kênh MXH
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
          if (typeof showToast === 'function') {
            showToast(`Đang chuyển hướng tới ${name}... 🚀`, 'success', 2000);
          }
        }
      });
    });
  }
};
