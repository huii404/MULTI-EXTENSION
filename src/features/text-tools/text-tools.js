// TEXT TOOLS - MAIN MODULE

// Đảm bảo PAGES toàn cục luôn tồn tại
if (typeof window.PAGES === 'undefined') {
  window.PAGES = {};
}

// Cấu hình danh sách các Skill
const TEXT_TOOLS_SKILLS = {
  cleaner: {
    id: 'cleaner',
    title: 'Làm sạch văn bản',
    desc: 'Xóa HTML, Markdown, định dạng ẩn',
    icon: '🧹',
    color: 'linear-gradient(135deg, #3498db, #2980b9)',
    pageName: 'cleaner'
  },
  comparator: {
    id: 'comparator',
    title: 'So sánh văn bản',
    desc: 'So sánh 2 văn bản, tìm từ thêm/bớt',
    icon: '🆚',
    color: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
    pageName: 'comparator'
  },
  ocr: {
    id: 'ocr',
    title: 'Quét chữ từ ảnh',
    desc: 'Trích xuất văn bản từ ảnh hoặc Clipboard',
    icon: '🖼️',
    color: 'linear-gradient(135deg, #e67e22, #d35400)',
    pageName: 'ocr'
  }
};


// HTML TEMPLATES

const SKILL_HTML = {
  cleaner: `
<div class="cleaner-container" style="border:none !important; padding:0; margin:0;">
  <button id="cleaner-paste-btn" class="action-btn primary" style="width:100%; padding:14px 12px; background:linear-gradient(135deg,#2ECC71,#27AE60); margin-bottom:10px; border:none !important; justify-content:center;">
    <span style="font-size:20px; margin-right:10px;">📋</span>
    <span style="font-size:14px; font-weight:700;">Dán từ clipboard &amp; làm sạch</span>
    <span style="margin-left:auto; font-size:11px; opacity:0.7; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:10px;">Ctrl+V</span>
  </button>
  <div style="display:flex; gap:8px; margin-bottom:10px;">
    <select id="cleaner-level" style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:13px; background:var(--surface); color:var(--text); cursor:pointer;">
      <option value="BASIC">🔰 Cơ bản</option>
      <option value="STANDARD" selected>⭐ Tiêu chuẩn</option>
      <option value="ADVANCED">🚀 Nâng cao</option>
    </select>
    <button id="cleaner-clean-btn" class="action-btn primary" style="flex:1; padding:8px 12px; background:linear-gradient(135deg,#3498db,#2980b9); margin-bottom:0; border:none !important; justify-content:center;">
      <span style="font-size:14px; margin-right:6px;">🧹</span>
      <span style="font-size:13px; font-weight:600;">Làm sạch lại</span>
    </button>
  </div>
  <div class="form-group" id="cleaner-result-area" style="margin-bottom:8px; display:none;">
    <label style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
      <span>✨</span> Kết quả: <span id="cleaner-stats" style="font-weight:600; color:var(--dtu-red); margin-left:4px;"></span>
      <span style="margin-left:auto; font-size:10px; color:#999;">(Double-click để copy)</span>
    </label>
    <textarea id="cleaner-output" rows="6" readonly placeholder="Kết quả sẽ hiển thị ở đây..." style="background:#f8f9fa; cursor:default; width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:13px; resize:vertical; line-height:1.6;"></textarea>
  </div>
  <div id="cleaner-hint" style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">
    <div style="font-size:28px; margin-bottom:8px; opacity:0.5;">📋</div>
    <div>Nhấn nút bên trên hoặc <strong>Ctrl+V</strong> để dán văn bản</div>
    <div style="margin-top:4px; font-size:11px;">Hoặc kéo thả file văn bản vào đây</div>
  </div>
</div>
  `,

  comparator: `
<div class="comparator-container" style="border:none !important; padding:0; margin:0;">
  <!-- Ô nhập Văn bản 1 -->
  <div class="form-group" style="margin-bottom:8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <label style="font-size:12px; font-weight:700; color:#e65100; margin:0;">📄 Văn bản 1:</label>
      <button id="comp-paste-1" class="action-btn secondary" style="padding:2px 8px; font-size:11px; margin:0; width:auto;">📋 Dán từ Clipboard</button>
    </div>
    <textarea id="comp-input-1" rows="3" placeholder="Nhập hoặc dán văn bản 1 vào đây..." style="width:100%; padding:8px; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px; resize:vertical;"></textarea>
  </div>

  <!-- Nút Đảo vị trí -->
  <div style="text-align:center; margin:-4px 0 4px 0;">
    <button id="comp-swap-btn" title="Đảo 2 văn bản" style="background:var(--surface); border:1px solid var(--border); border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; justify-content:center;">⇅</button>
  </div>

  <!-- Ô nhập Văn bản 2 -->
  <div class="form-group" style="margin-bottom:10px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <label style="font-size:12px; font-weight:700; color:#2e7d32; margin:0;">📄 Văn bản 2:</label>
      <button id="comp-paste-2" class="action-btn secondary" style="padding:2px 8px; font-size:11px; margin:0; width:auto;">📋 Dán từ Clipboard</button>
    </div>
    <textarea id="comp-input-2" rows="3" placeholder="Nhập hoặc dán văn bản 2 vào đây..." style="width:100%; padding:8px; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px; resize:vertical;"></textarea>
  </div>

  <!-- Status & Nút so sánh -->
  <div id="comp-status" style="text-align:center; padding:6px; background:#f5f5f5; border-radius:var(--radius-sm); margin-bottom:8px; font-size:11px; color:var(--text-muted);">
    👆 Nhập hoặc dán 2 văn bản để so sánh
  </div>

  <button id="comp-compare-btn" class="action-btn primary" style="width:100%; margin-bottom:10px; background:linear-gradient(135deg,#7C3AED,#A78BFA); border:none !important; justify-content:center;">
    <span style="font-size:14px; margin-right:6px;">🆚</span>
    <span style="font-size:13px; font-weight:700;">So sánh ngay</span>
  </button>

  <div id="comp-result" style="display:none;"></div>
</div>
  `,
  ocr: `
<div class="ocr-container" style="border:none !important; padding:0; margin:0;">
  <!-- Tùy chọn 1: Chọn File ảnh -->
  <div style="display:flex; gap:8px; margin-bottom:10px;">
    <input type="file" id="ocr-file-input" accept="image/*" style="display:none;" />
    <button id="ocr-browse-btn" class="action-btn primary" style="flex:1; padding:12px; background:linear-gradient(135deg,#3498db,#2980b9); margin-bottom:0; justify-content:center;">
      <span style="font-size:16px; margin-right:6px;">📁</span>
      <span style="font-size:13px; font-weight:700;">Chọn file ảnh</span>
    </button>
    <button id="ocr-paste-btn" class="action-btn secondary" style="flex:1; padding:12px; margin-bottom:0; justify-content:center;">
      <span style="font-size:16px; margin-right:6px;">📋</span>
      <span style="font-size:13px; font-weight:700;">Dán Clipboard</span>
    </button>
  </div>

  <!-- Trạng thái xử lý -->
  <div id="ocr-status" style="display:none; text-align:center; padding:8px; background:#fff3e0; border-radius:var(--radius-sm); margin-bottom:10px; font-size:12px; color:#e65100; font-weight:600;">
    ⏳ Đang quét chữ... <span id="ocr-progress">0%</span>
  </div>

  <!-- Kết quả hiển thị -->
  <div class="form-group" id="ocr-result-area" style="margin-bottom:8px; display:none;">
    <label style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
      <span>✨</span> Kết quả quét:
      <span style="margin-left:auto; font-size:10px; color:#999;">(Double-click để copy)</span>
    </label>
    <textarea id="ocr-output" rows="6" readonly placeholder="Kết quả chữ sẽ xuất hiện ở đây..." style="background:#f8f9fa; cursor:default; width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:13px; resize:vertical; line-height:1.6;"></textarea>
  </div>

  <div id="ocr-hint" style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">
    <div style="font-size:28px; margin-bottom:8px; opacity:0.5;">🖼️</div>
    <div>Chọn file ảnh, bấm dán từ <strong>Clipboard</strong></div>
    <div style="margin-top:4px; font-size:11px;">Hoặc kéo thả file ảnh vào đây</div>
  </div>
</div>
  `
};

const TEXT_TOOLS_HTML = `
<div class="text-tools-container">

  <button class="tt-skill-btn" data-skill="cleaner" style="border-left:4px solid #3498db;">
    <div class="tt-skill-icon" style="background:linear-gradient(135deg,#3498db,#2980b9);">🧹</div>
    <div class="tt-skill-info">
      <span class="tt-skill-title">Làm sạch văn bản</span>
      <span class="tt-skill-desc">Xóa HTML, Markdown, định dạng ẩn</span>
    </div>
    <span class="tt-skill-arrow">›</span>
  </button>

  <button class="tt-skill-btn" data-skill="comparator" style="border-left:4px solid #7C3AED;">
    <div class="tt-skill-icon" style="background:linear-gradient(135deg,#7C3AED,#A78BFA);">🆚</div>
    <div class="tt-skill-info">
      <span class="tt-skill-title">So sánh văn bản</span>
      <span class="tt-skill-desc">So sánh 2 văn bản, tìm từ thêm/bớt</span>
    </div>
    <span class="tt-skill-arrow">›</span>
  </button>


  <button class="tt-skill-btn" data-skill="ocr" style="border-left:4px solid #e67e22;">
    <div class="tt-skill-icon" style="background:linear-gradient(135deg,#e67e22,#d35400);">🖼️</div>
    <div class="tt-skill-info">
      <span class="tt-skill-title">Quét chữ từ ảnh (OCR)</span>
      <span class="tt-skill-desc">Trích xuất văn bản từ ảnh hoặc Clipboard</span>
    </div>
    <span class="tt-skill-arrow">›</span>
  </button>


  <div id="tt-skill-content" style="display:none;">
    <div id="tt-skill-body"></div>
  </div>
</div>
`;

// ATTACH EVENTS & EVENT LOGIC
function attachCleanerEvents() {
  console.log('[Cleaner] Initializing events');
  const output = document.getElementById('cleaner-output');
  const stats = document.getElementById('cleaner-stats');
  const levelSelect = document.getElementById('cleaner-level');
  const pasteBtn = document.getElementById('cleaner-paste-btn');
  const cleanBtn = document.getElementById('cleaner-clean-btn');
  const resultArea = document.getElementById('cleaner-result-area');
  const hint = document.getElementById('cleaner-hint');

  if (!pasteBtn) {
    console.error('[Cleaner] Required DOM elements not found');
    return;
  }

  let rawText = '';


// LOGIC LỌC THÔNG MINH MỚI

function smartCleanText(text) {
  if (!text) return '';

  let cleaned = text;

  // =========================================================================
  // BƯỚC 1: XỬ LÝ KÝ TỰ RÁC Ở GIỮA CHỮ (VD: h|ôm -> hôm, h_ôm -> hôm)
  // =========================================================================
  // Nếu ký tự rác chèn dính liền giữa 2 chữ cái (không có khoảng trắng xung quanh): XÓA HẲN (thành '')
  cleaned = cleaned.replace(/([a-zA-Z0-9À-ỹ])[\^\/~`|_+=#%&*<>{}[\]\\]+([a-zA-Z0-9À-ỹ])/g, '$1$2');

  // =========================================================================
  // BƯỚC 2: XÓA RÁC VÀ NGOẶC THỪA GIỮA CÁC TỪ (VD: Hôm ++ nay, (( sớm )))
  // =========================================================================
  // 2.1. Xóa chùm ký tự lặp 2 lần trở lên giữa các từ thành 1 khoảng trắng
  cleaned = cleaned.replace(/(?<!\d)[^\w\s\nÀ-ỹáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]{2,}(?!\d)/gi, ' ');

  // 2.2. Xóa các ký tự dị dính liền dính xung quanh từ, bảo toàn toán tử hợp lệ (1 + 1, a = b)
  cleaned = cleaned.replace(/([\(\[\{<~^#%&@*+\-\/\\>!?:;|='"])+/g, (match, p1, offset, string) => {
    const prevChar = string[offset - 1] || '';
    const nextChar = string[offset + match.length] || '';
    if (/[\d\s\w]/.test(prevChar) && /[\d\s\w]/.test(nextChar) && /^[\+\-\*\/\=\<\>]$/.test(match)) {
      return match; // Giữ toán tử chuẩn
    }
    return ' ';
  });

  // BƯỚC 3: SMART TRIM ĐẦU - CUỐI CHO TỪNG DÒNG

  return cleaned
    .split('\n')
    .map(line => {
      // 3.1 Gộp khoảng trắng lặp
      let l = line.replace(/[ \t]+/g, ' ').trim();
      if (!l) return '';

      // 3.2 Xóa rác ĐẦU dòng (VD: "+) a" -> "a", "--> ab" -> "ab")
      // Giữ lại dấu âm/dương cho số toán học (-5, +10)
      l = l.replace(/^(?!\s*[\+\-]\d)[^\w\sÀ-ỹáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\(\{\[]+/gi, '');

      // 3.3 Xóa rác CUỐI dòng (VD: "ab==" -> "ab", "ab.." -> "ab.", "trời!!!" -> "trời.")
      l = l.replace(/[^\w\sÀ-ỹáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ\)\}\]]+$/gi, (match) => {
        if (match.includes('?')) return '?';
        if (match.includes('!')) return '!';
        if (match.includes('.')) return '.';
        return '';
      });

      // 3.4 Tự động thêm dấu chấm nếu câu kết thúc bằng chữ/số
      if (l.length > 0 && /[a-zA-Z0-9À-ỹ]$/.test(l)) {
        l += '.';
      }

      return l;
    })
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n\n')
    .trim();
}

// HÀM PROCESSTEXT ĐƯỢC CẬP NHẬT

async function processText(text) {
  if (!text || !text.trim()) {
    if (typeof showToast === 'function') showToast('📝 Không có dữ liệu', 'info');
    return;
  }

  // Gọi hàm lọc thông minh
  const result = smartCleanText(text);

  // Hiển thị ra giao diện
  const output = document.getElementById('cleaner-output');
  const resultArea = document.getElementById('cleaner-result-area');
  const hint = document.getElementById('cleaner-hint');
  const stats = document.getElementById('cleaner-stats');

  if (output) output.value = result;
  if (resultArea) resultArea.style.display = 'block';
  if (hint) hint.style.display = 'none';

  if (stats) {
    const reduction = text.length > 0 ? ((1 - result.length / text.length) * 100).toFixed(1) : 0;
    stats.textContent = `${text.length} → ${result.length} ký tự (giảm ${reduction}%)`;
  }

  // Tự động sao chép kết quả sạch vào Clipboard
  try {
    await navigator.clipboard.writeText(result);
    if (typeof showToast === 'function') showToast('✅ Đã làm sạch & copy!', 'success');
  } catch (_) {
    if (typeof showToast === 'function') showToast('✅ Đã làm sạch!', 'success');
  }
}

  pasteBtn.addEventListener('click', async function () {
    const orig = this.innerHTML;
    this.innerHTML = '<span style="font-size:16px;margin-right:8px;">⏳</span><span>Đang đọc...</span>';
    this.style.opacity = '0.6';
    this.style.pointerEvents = 'none';

    try {
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch (_) {
        const tmp = document.createElement('textarea');
        tmp.style.cssText = 'position:fixed;opacity:0;pointer-events:none;z-index:-1;';
        document.body.appendChild(tmp);
        tmp.focus();
        document.execCommand('paste');
        text = tmp.value;
        document.body.removeChild(tmp);
      }
      await processText(text);
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Lỗi đọc clipboard', 'error');
    } finally {
      this.innerHTML = orig;
      this.style.opacity = '1';
      this.style.pointerEvents = 'auto';
    }
  });

  cleanBtn?.addEventListener('click', function () {
    if (!rawText) {
      if (typeof showToast === 'function') showToast('⚠️ Chưa có dữ liệu', 'warning');
      return;
    }
    processText(rawText);
  });

  levelSelect?.addEventListener('change', function () {
    if (rawText) processText(rawText);
  });

  output?.addEventListener('dblclick', function () {
    if (!this.value) return;
    this.select();
    navigator.clipboard.writeText(this.value).then(() => {
      if (typeof showToast === 'function') showToast('📋 Đã copy!', 'success');
    }).catch(() => {
      document.execCommand('copy');
      if (typeof showToast === 'function') showToast('📋 Đã copy!', 'success');
    });
  });

  const container = document.querySelector('.cleaner-container') || document.body;
  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (/\.(txt|md|html|htm|json|csv)$/i.test(file.name)) {
        try {
          await processText(await file.text());
          if (typeof showToast === 'function') showToast('✅ ' + file.name, 'success');
        } catch {
          if (typeof showToast === 'function') showToast('❌ Không đọc được file', 'error');
        }
      } else {
        if (typeof showToast === 'function') showToast('⚠️ Chỉ hỗ trợ file văn bản', 'warning');
      }
    }
  });
}

function attachComparatorEvents() {
  console.log('[Comparator] Initializing events with Input Textareas');
  
  const input1 = document.getElementById('comp-input-1');
  const input2 = document.getElementById('comp-input-2');
  const paste1Btn = document.getElementById('comp-paste-1');
  const paste2Btn = document.getElementById('comp-paste-2');
  const compareBtn = document.getElementById('comp-compare-btn');
  const swapBtn = document.getElementById('comp-swap-btn');
  const resultDiv = document.getElementById('comp-result');
  const statusEl = document.getElementById('comp-status');

  if (!input1 || !input2) return;

  function tokenize(text) {
    if (!text) return [];
    return text.toLowerCase().replace(/\s+/g, ' ').trim().match(/[\wÀ-ỹ]+/g) || [];
  }

  function updateStatus() {
    if (!statusEl) return;
    const w1 = tokenize(input1.value).length;
    const w2 = tokenize(input2.value).length;

    if (!input1.value.trim() && !input2.value.trim()) {
      statusEl.textContent = '👆 Nhập hoặc dán 2 văn bản để so sánh';
    } else if (!input1.value.trim() || !input2.value.trim()) {
      statusEl.textContent = `⏳ Đã có ${w1 || w2} từ · Hãy nhập thêm văn bản thứ 2`;
    } else if (input1.value.trim() === input2.value.trim()) {
      statusEl.textContent = '⚠️ Hai văn bản đang có nội dung trùng hệt nhau!';
      statusEl.style.color = '#e65100';
      return;
    } else {
      statusEl.textContent = `✅ Sẵn sàng · VB1: ${w1} từ · VB2: ${w2} từ`;
    }
    statusEl.style.color = 'var(--text-muted)';
  }

  // Lấy nội dung từ Clipboard có kiểm tra TRÚNG DATA
  async function pasteFromClipboard(targetInput, isSecondInput = false) {
    try {
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch (_) {
        const tmp = document.createElement('textarea');
        tmp.style.cssText = 'position:fixed;opacity:0;pointer-events:none;z-index:-1;';
        document.body.appendChild(tmp);
        tmp.focus();
        document.execCommand('paste');
        text = tmp.value;
        document.body.removeChild(tmp);
      }

      if (!text || !text.trim()) {
        if (typeof showToast === 'function') showToast('📝 Clipboard đang trống!', 'info');
        return;
      }

      // KIỂM TRA CHỐNG DÁN TRÙNG
      const otherInputText = isSecondInput ? input1.value : input2.value;
      if (otherInputText && text.trim() === otherInputText.trim()) {
        if (typeof showToast === 'function') {
          showToast('⚠️ Clipboard bị trùng với văn bản kia! Vui lòng copy nội dung khác.', 'warning');
        }
        return;
      }

      targetInput.value = text;
      updateStatus();
      if (typeof showToast === 'function') showToast('✅ Đã dán!', 'success');
      
      // Tự động so sánh nếu cả 2 ô đều đã có dữ liệu
      if (input1.value.trim() && input2.value.trim()) {
        doCompare();
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Không thể đọc Clipboard', 'error');
    }
  }

  function doCompare() {
    const text1 = input1.value;
    const text2 = input2.value;

    if (!text1.trim() || !text2.trim()) {
      if (typeof showToast === 'function') showToast('⚠️ Vui lòng nhập đủ 2 văn bản!', 'warning');
      return;
    }

    const words1 = tokenize(text1);
    const words2 = tokenize(text2);
    const freq1 = new Map(), freq2 = new Map();
    words1.forEach(w => freq1.set(w, (freq1.get(w) || 0) + 1));
    words2.forEach(w => freq2.set(w, (freq2.get(w) || 0) + 1));

    const all = new Set([...freq1.keys(), ...freq2.keys()]);
    const added = [], removed = [], common = [];

    all.forEach(w => {
      const c1 = freq1.get(w) || 0, c2 = freq2.get(w) || 0;
      if (c1 === 0 && c2 > 0) added.push({ word: w, count: c2 });
      else if (c1 > 0 && c2 === 0) removed.push({ word: w, count: c1 });
      else common.push(w);
    });

    const similarity = all.size > 0 ? Math.round((common.length / all.size) * 100) : 0;

    let html = '<div style="background:#f0f4ff;padding:12px;border-radius:8px;margin-top:10px;">';
    html += `<div style="margin-bottom:8px;"><span style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">📊 ${similarity}% giống nhau</span></div>`;
    
    if (added.length) {
      html += `<div style="background:#e8f5e9;padding:8px;border-radius:6px;margin-bottom:6px;"><div style="font-weight:700;color:#2e7d32;margin-bottom:4px;font-size:11px;">➕ Từ có ở VB2 nhưng không có ở VB1 (${added.length}):</div><div style="font-size:11px;line-height:1.6;">`;
      added.forEach(w => html += `<span style="display:inline-block;background:#c8e6c9;color:#1b5e20;padding:1px 6px;border-radius:10px;margin:1px;">${w.word} (${w.count})</span>`);
      html += '</div></div>';
    }

    if (removed.length) {
      html += `<div style="background:#ffebee;padding:8px;border-radius:6px;margin-bottom:6px;"><div style="font-weight:700;color:#c62828;margin-bottom:4px;font-size:11px;">➖ Từ bị mất ở VB2 (${removed.length}):</div><div style="font-size:11px;line-height:1.6;">`;
      removed.forEach(w => html += `<span style="display:inline-block;background:#ffcdd2;color:#b71c1c;padding:1px 6px;border-radius:10px;margin:1px;">${w.word} (${w.count})</span>`);
      html += '</div></div>';
    }

    if (!added.length && !removed.length) {
      html += '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px;">✅ Hai văn bản giống nhau hoàn toàn!</div>';
    }
    html += '</div>';

    if (resultDiv) {
      resultDiv.innerHTML = html;
      resultDiv.style.display = 'block';
    }
  }

  // Lắng nghe sự kiện
  paste1Btn?.addEventListener('click', () => pasteFromClipboard(input1, false));
  paste2Btn?.addEventListener('click', () => pasteFromClipboard(input2, true));
  
  input1.addEventListener('input', updateStatus);
  input2.addEventListener('input', updateStatus);

  compareBtn?.addEventListener('click', doCompare);

  swapBtn?.addEventListener('click', () => {
    const tmp = input1.value;
    input1.value = input2.value;
    input2.value = tmp;
    updateStatus();
    if (input1.value.trim() && input2.value.trim()) doCompare();
  });

  updateStatus();
}


// BẮT BUỘC: ĐĂNG KÝ CÁC TRANG VÀO PAGES

PAGES['text-tools'] = {
  render: function () {
    return TEXT_TOOLS_HTML;
  },
  attachEvents: function () {
    console.log('[Text Tools] Main attachEvents called');
    const container = document.getElementById('tt-skill-content');
    const body = document.getElementById('tt-skill-body');

    if (!container || !body) {
      console.error('[Text Tools] Container elements not found');
      return;
    }

    document.querySelectorAll('.tt-skill-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const skillId = this.dataset.skill;
        const skill = TEXT_TOOLS_SKILLS[skillId];
        if (!skill) return;

        console.log('[Text Tools] Opening sub-skill:', skillId);

        document.querySelectorAll('.tt-skill-btn').forEach(el => el.style.display = 'none');
        container.style.display = 'block';
        body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">⏳ Đang tải...</div>';

        const html = SKILL_HTML[skillId];
        if (!html) {
          body.innerHTML = '<div class="form-group"><p style="color:var(--text-muted);">⚠️ Không tìm thấy giao diện.</p></div>';
          return;
        }

        body.innerHTML = html;

        setTimeout(() => {
          const page = PAGES[skill.pageName];
          if (page && typeof page.attachEvents === 'function') {
            console.log('[Text Tools] Calling attachEvents via PAGES for', skillId);
            page.attachEvents();
          } else {
            console.warn('[Text Tools] Fallback attachEvents for', skillId);
            if (skillId === 'cleaner') attachCleanerEvents();
            else if (skillId === 'comparator') attachComparatorEvents();
          }
        }, 50);
      });
    });
  },
  title: '🧹 Text Tools'
};


// Hàm phụ chuyển File/Blob sang Base64 chuẩn cho Tesseract
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}


function attachOcrEvents() {
  const browseBtn = document.getElementById('ocr-browse-btn');
  const fileInput = document.getElementById('ocr-file-input');
  const pasteBtn = document.getElementById('ocr-paste-btn');
  const statusEl = document.getElementById('ocr-status');
  const progressEl = document.getElementById('ocr-progress');
  const resultArea = document.getElementById('ocr-result-area');
  const outputEl = document.getElementById('ocr-output');
  const hintEl = document.getElementById('ocr-hint');

  if (!browseBtn || !fileInput) return;

  // Hàm core thực thi OCR từ Image Source
  // Hàm core thực thi OCR từ Image Source
  async function runOCR(imageSource) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = '⏳ Đang khởi tạo bộ quét chữ...';
    }
    if (resultArea) resultArea.style.display = 'none';
    if (hintEl) hintEl.style.display = 'none';

    try {
      // 1. Kiểm tra nạp thư viện Tesseract
      if (typeof Tesseract === 'undefined') {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('libs/tesseract.min.js');
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Không thể tải file libs/tesseract.min.js'));
        });
      }

      if (statusEl) statusEl.innerHTML = '⏳ Đang phân tích hình ảnh... <span id="ocr-progress">0%</span>';

      // 2. Cấu hình Tesseract Worker chạy mượt trong Extension
      // Cấu hình Tesseract cấm tự tải Worker qua Blob URL/CDN
      const worker = await Tesseract.createWorker('eng', 1, {
        workerPath: chrome.runtime.getURL('libs/tesseract/worker.min.js'),
        corePath: chrome.runtime.getURL('libs/tesseract/tesseract-core.wasm.js'),
        workerBlobURL: false,
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            const pEl = document.getElementById('ocr-progress');
            if (pEl) pEl.textContent = pct + '%';
          }
        }
      });

      // 3. Thực hiện quét chữ
      const ret = await worker.recognize(imageSource);
      await worker.terminate();

      const extractedText = ret && ret.data && ret.data.text ? ret.data.text.trim() : '';

      if (!extractedText) {
        if (statusEl) statusEl.style.display = 'none';
        if (typeof showToast === 'function') showToast('⚠️ Không tìm thấy chữ trong ảnh!', 'warning');
        if (hintEl) hintEl.style.display = 'block';
        return;
      }

      // 4. Hiển thị kết quả
      if (statusEl) statusEl.style.display = 'none';
      if (resultArea) resultArea.style.display = 'block';
      if (outputEl) outputEl.value = extractedText;

      // Tự động copy luôn vào Clipboard
      try {
        await navigator.clipboard.writeText(extractedText);
        if (typeof showToast === 'function') showToast('✅ Quét xong & đã tự động copy!', 'success');
      } catch (_) {
        if (typeof showToast === 'function') showToast('✅ Nhận diện xong!', 'success');
      }

    } catch (err) {
      console.error('[OCR Detail Error]:', err);
      if (statusEl) statusEl.style.display = 'none';
      if (hintEl) hintEl.style.display = 'block';
      
      // Kiểm tra an toàn biến err trước khi đọc .message
      const errMsg = (err && err.message) ? err.message : String(err || 'Không rõ nguyên nhân');
      if (typeof showToast === 'function') {
        showToast('❌ Lỗi: ' + (errMsg.includes('Fetch') ? 'Cần kết nối mạng để nạp dữ liệu OCR lần đầu' : 'Không đọc được file ảnh này'), 'error');
      }
    }
  }

  // 1. CHỌN FILE TỪ Ổ ĐĨA (Đã fix lỗi đọc ảnh)
  browseBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      if (file.type.startsWith('image/')) {
        try {
          const base64Image = await fileToBase64(file);
          runOCR(base64Image); // Truyền Base64 thay vì URL.createObjectURL
        } catch (e) {
          if (typeof showToast === 'function') showToast('❌ Lỗi đọc file ảnh!', 'error');
        }
      } else {
        if (typeof showToast === 'function') showToast('⚠️ Hãy chọn file ảnh hợp lệ!', 'warning');
      }
    }
  });

  // 2. DÁN TỪ CLIPBOARD (Đã fix lỗi đọc ảnh)
  pasteBtn?.addEventListener('click', async function() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          const base64Image = await fileToBase64(blob);
          runOCR(base64Image); // Truyền Base64
          return;
        }
      }
      if (typeof showToast === 'function') showToast('⚠️ Không tìm thấy ảnh trong Clipboard!', 'warning');
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Hãy cấp quyền truy cập Clipboard', 'error');
    }
  });

  // 3. KÉO THẢ ẢNH TRỰC TIẾP
  const container = document.querySelector('.ocr-container') || document.body;
  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const base64Image = await fileToBase64(file);
        runOCR(base64Image);
      }
    }
  });

  // Double click copy kết quả
  outputEl?.addEventListener('dblclick', function() {
    if (!this.value) return;
    this.select();
    navigator.clipboard.writeText(this.value).then(() => {
      if (typeof showToast === 'function') showToast('📋 Đã copy kết quả!', 'success');
    });
  });
}

PAGES['ocr'] = {
  render: function() {
    return SKILL_HTML.ocr;
  },
  attachEvents: attachOcrEvents,
  title: '🖼️ Quét chữ từ ảnh'
};

// Đăng ký trực tiếp Cleaner và Comparator vào PAGES để tránh lỗi "No attachEvents in PAGES"
PAGES['cleaner'] = {
  render: function () {
    return SKILL_HTML.cleaner;
  },
  attachEvents: attachCleanerEvents,
  title: '🧹 Làm sạch văn bản'
};

PAGES['comparator'] = {
  render: function () {
    return SKILL_HTML.comparator;
  },
  attachEvents: attachComparatorEvents,
  title: '🆚 So sánh văn bản'
};

// Đăng ký trang ocr vào PAGES
PAGES['ocr'] = {
  render: function () {
    return SKILL_HTML.ocr;
  },
  attachEvents: attachOcrEvents,
  title: '🖼️ Quét chữ từ ảnh'
};

console.log('[Text Tools] Module fully loaded and PAGES registered');