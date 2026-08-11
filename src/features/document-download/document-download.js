// DOCUMENT DOWNLOAD - MENU CHÍNH (NHÚNG HTML TRỰC TIẾP)

const DOC_DOWNLOAD_HTML = `
<div class="doc-download-container">
  <!-- Studocu -->
  <button class="doc-skill-btn" data-skill="studocu" style="border-left: 4px solid #FF6B00;">
    <div class="doc-skill-icon" style="background: linear-gradient(135deg, #FF6B00, #FFB000);">
      📚
    </div>
    <div class="doc-skill-info">
      <span class="doc-skill-title">Studocu Tools</span>
      <span class="doc-skill-desc">Tải PDF, xóa watermark, lưu ảnh</span>
    </div>
    <span class="doc-skill-arrow">›</span>
  </button>

  <!-- Thêm container hiển thị nội dung skill con -->
  <div id="doc-skill-content" style="display:none; margin-top:12px; padding-top:12px;">
    <div id="doc-skill-body"></div>
  </div>
</div>
`;

// DANH SÁCH SKILL CON

const DOC_SKILLS = {
  studocu: {
    id: 'studocu',
    title: 'Studocu Tools',
    desc: 'Tải PDF, xóa watermark, lưu ảnh',
    icon: '📚',
    color: 'linear-gradient(135deg, #FF6B00, #FFB000)',
    pageName: 'studocu',
  },
};


// POPUP PAGE

PAGES['document-download'] = {
  render: function() {
    return DOC_DOWNLOAD_HTML;
  },

  attachEvents: function() {
    const container = document.getElementById('doc-skill-content');
    const body = document.getElementById('doc-skill-body');

    if (!container || !body) {
      console.error('[Document Download] DOM elements not found');
      return;
    }

    // ===== CLICK VÀO SKILL CON =====
    document.querySelectorAll('.doc-skill-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const skillId = this.dataset.skill;
        const skill = DOC_SKILLS[skillId];
        
        if (!skill) return;

        // Ẩn danh sách, hiển thị content
        document.querySelectorAll('.doc-skill-btn').forEach(el => el.style.display = 'none');
        container.style.display = 'block';
        
        // Reset body trước khi render
        body.innerHTML = '';
        body.style.border = 'none';

        // Lấy page từ PAGES đã đăng ký
        const page = PAGES[skill.pageName];
        
        if (page) {
          body.innerHTML = page.render();
          if (page.attachEvents) {
            setTimeout(() => page.attachEvents(), 50);
          }
        } else {
          body.innerHTML = `
            <div class="form-group">
              <p style="color: var(--text-muted);">⚠️ Không thể tải ${skill.title}.</p>
              <button class="action-btn secondary" style="margin-top:8px;" onclick="
                document.querySelectorAll('.doc-skill-btn').forEach(el => el.style.display = 'flex');
                document.getElementById('doc-skill-content').style.display = 'none';
                document.getElementById('doc-skill-body').innerHTML = '';
              ">
                🔄 Quay lại danh sách
              </button>
            </div>
          `;
        }
      });
    });
  },

  title: '📚 Tải tài liệu'
};

console.log('[Document Download] Module loaded (HTML embedded)');