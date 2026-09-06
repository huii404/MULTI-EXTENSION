// DANH SÁCH SKILL CỦA DTU

const DTU_SKILLS = {
  rating: {
    id: 'rating',
    title: 'Đánh giá giảng viên',
    desc: 'Tự động điền form khảo sát giảng viên (câu 1-53)',
    icon: '⭐',
    color: 'linear-gradient(135deg, #d52b1e, #ff6b6b)',
    htmlFile: 'skills/rating/rating.html',
    jsFile: 'skills/rating/rating.js',
  },
  schedule: {
    id: 'schedule',
    title: 'Xuất lịch học MyDTU',
    desc: 'Tải lịch học kỳ/tháng/tuần dạng .ICS, .CSV, .PDF',
    icon: '📅',
    color: 'linear-gradient(135deg, #27ae60, #2ecc71)',
    htmlFile: 'skills/schedule/schedule.html',
    jsFile: 'skills/schedule/schedule.js',
  },
  'course-register': {
    id: 'course-register',
    title: 'Tự động đăng ký môn học',
    desc: 'Săn tín chỉ & tự động điền mã đăng ký MyDTU',
    icon: '📝',
    color: 'linear-gradient(135deg, #2980b9, #3498db)',
    htmlFile: 'skills/course-register/course-register.html',
    jsFile: 'skills/course-register/course-register.js',
  }
};

// Cache HTML của các skill
const skillHTMLCache = {};


// LOAD SKILL HTML

async function loadSkillHTML(skillId) {
  if (skillHTMLCache[skillId]) return skillHTMLCache[skillId];
  
  const skill = DTU_SKILLS[skillId];
  if (!skill) return null;
  
  try {
    const url = chrome.runtime.getURL(`src/features/dtu-univer/${skill.htmlFile}`);
    const response = await fetch(url);
    const html = await response.text();
    skillHTMLCache[skillId] = html;
    return html;
  } catch (e) {
    console.warn(`[DTU Hub] Không thể load ${skill.htmlFile}:`, e);
    return null;
  }
}


// LOAD SKILL JS

async function loadSkillJS(skillId) {
  const skill = DTU_SKILLS[skillId];
  if (!skill) return null;
  
  try {
    const url = chrome.runtime.getURL(`src/features/dtu-univer/${skill.jsFile}`);
    const module = await import(url);
    return module;
  } catch (e) {
    console.warn(`[DTU Hub] Không thể load ${skill.jsFile}:`, e);
    return null;
  }
}


// LOAD HUB HTML

let dtuHubHTML = '';

async function loadDTUHubHTML() {
  try {
    const response = await fetch(chrome.runtime.getURL('src/features/dtu-univer/dtu-univer.html'));
    dtuHubHTML = await response.text();
  } catch (e) {
    console.error('Không thể load dtu-univer.html:', e);
    dtuHubHTML = `
      <div class="dtu-hub">
        <div id="dtu-skill-list">
          <button class="dtu-skill-btn" data-skill="rating" style="border-left: 4px solid #d52b1e;">
            <div class="dtu-skill-icon" style="background: linear-gradient(135deg, #d52b1e, #ff6b6b);">⭐</div>
            <div class="dtu-skill-info">
              <span class="dtu-skill-title">Đánh giá giảng viên</span>
              <span class="dtu-skill-desc">Tự động điền form khảo sát giảng viên (câu 1-53)</span>
            </div>
            <span class="dtu-skill-arrow">›</span>
          </button>
        </div>
        <div class="status-bar" style="margin-top:12px;">
          <span class="dot"></span>
          <span>Sẵn sàng hoạt động</span>
        </div>
        <div id="dtu-skill-content" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
          <div id="dtu-skill-body"></div>
        </div>
      </div>
    `;
  }
}


// POPUP PAGE - DTU STUDENT HUB

PAGES.dtu = {
  render: function() {
    return dtuHubHTML || '<p>Đang tải...</p>';
  },

  attachEvents: function() {
    const container = document.getElementById('dtu-skill-content');
    const body = document.getElementById('dtu-skill-body');

    // Kiểm tra element tồn tại
    if (!container || !body) {
      console.error('[DTU Hub] DOM elements not found');
      return;
    }

    // ===== CLICK VÀO SKILL =====
    document.querySelectorAll('.dtu-skill-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const skillId = this.dataset.skill;
        const skill = DTU_SKILLS[skillId];
        
        if (!skill) return;

        // Ẩn danh sách, hiển thị content
        document.querySelectorAll('.dtu-skill-btn').forEach(el => el.style.display = 'none');
        const statusBar = document.querySelector('.status-bar');
        if (statusBar) statusBar.style.display = 'none';
        container.style.display = 'block';

        // Load HTML và JS của skill
        const html = await loadSkillHTML(skillId);
        const module = await loadSkillJS(skillId);

        if (html) {
          body.innerHTML = html;
        } else {
          body.innerHTML = `<div class="form-group"><p style="color:var(--text-muted);">⚠️ Không thể tải skill</p></div>`;
        }

        // Gọi attachEvents nếu có
        if (module && module.attachEvents) {
          setTimeout(() => module.attachEvents(), 50);
        }
      });
    });

  },

  onBack: function() {
    const container = document.getElementById('dtu-skill-content');
    const body = document.getElementById('dtu-skill-body');
    if (container && container.style.display !== 'none') {
      document.querySelectorAll('.dtu-skill-btn').forEach(el => el.style.display = 'flex');
      const statusBar = document.querySelector('.status-bar');
      if (statusBar) statusBar.style.display = 'flex';
      container.style.display = 'none';
      if (body) body.innerHTML = '';
      return true; // Quay lại danh sách skill
    }
    return false; // Thoát ra trang home
  },

  title: '🏛️ SINHVIEN DTU'
};


// LOAD HTML KHI KHỞI ĐỘNG

loadDTUHubHTML();