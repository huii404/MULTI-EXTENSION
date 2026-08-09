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
    title: 'Quét chữ từ ảnh (OCR)',
    desc: 'Trích xuất văn bản từ ảnh hoặc Clipboard',
    icon: '🖼️',
    color: 'linear-gradient(135deg, #e67e22, #d35400)',
    pageName: 'ocr'
  }
};


// HTML TEMPLATES

window.SKILL_HTML = window.SKILL_HTML || {};
Object.assign(window.SKILL_HTML, {
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
  `
});

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


// LOGIC LỌC THÔNG MINH MỚI (CONTEXT-AWARE OCR & TEXT CLEANER - BENCHMARK PRO)

function smartCleanText(text, level = 'STANDARD') {
  if (!text) return '';

  // 1. Chuẩn hóa bảng mã Unicode sang NFC (Việt Nam -> Việt Nam)
  let cleaned = typeof text.normalize === 'function' ? text.normalize('NFC') : text;

  // 2. Xóa ký tự điều khiển ẩn và khoảng trắng đặc biệt (Zero-width space, Non-breaking space)
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // 3. SỬA LỖI OCR TÁCH CHỮ VÀ DẤU THANH (VD: "nhi ễu" -> "nhiễu", "h ôm" -> "hôm", "ti ến" -> "tiến")
  cleaned = cleaned.replace(/([a-zA-ZÀ-ỹ])\s+([áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ])/g, '$1$2');
  cleaned = cleaned.replace(/([áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ])\s+([a-zA-ZÀ-ỹ])/g, '$1$2');

  // 4. XỬ LÝ LỖI NỐI DÒNG BỊ NGẮT TỪ OCR (VD: "nhiễ\nu" -> "nhiễu")
  cleaned = cleaned.replace(/([a-zA-ZÀ-ỹ]+)[\r\n]+([a-zàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]{1,3}\b)/g, '$1$2');

  // 5. XỬ LÝ KÝ TỰ RÁC DÍNH TRONG TỪ (VD: "H|ôm" -> "Hôm", "t~iên" -> "tiên")
  // Chỉ xóa rác OCR chèn dính giữa chữ: | ~ ` ^ § ¤ ¦ ° ¢ £ ¥ (KHÔNG xóa - _ / : . @ # $ % + * = ' ")
  cleaned = cleaned.replace(/([a-zA-Z0-9À-ỹ])[\|\~`\^§¤¦°¢£¥]+([a-zA-Z0-9À-ỹ])/g, '$1$2');

  // 6. DỌN CHÙM RÁC LẶP VÔ NGHĨA (VD: |||||, ~~~~~, #####) - Giữ lại ellipsis (...)
  cleaned = cleaned.replace(/(?<!\.)(\.{2,})(?!\.)/g, '___ELLIPSIS___');
  cleaned = cleaned.replace(/([\|\~`\^§¤¦°#%&*+=\\<>{}[\]]{4,})/g, ' ');
  cleaned = cleaned.replace(/___ELLIPSIS___/g, '...');

  // Chế độ BASIC: Chỉ dọn rác OCR thô, giữ nguyên 100% ký tự đặc biệt & format
  if (level === 'BASIC') {
    return cleaned
      .split('\n')
      .map(line => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n')
      .trim();
  }

  // 7. XỬ LÝ TỪNG DÒNG VỚI QUY TẮC BẢO TOÀN FORM & HÀM Ý (STANDARD & ADVANCED)
  const lines = cleaned.split('\n').map(line => {
    let l = line.replace(/[ \t]+/g, ' ').trim();
    if (!l) return '';

    // Dọn dẹp rác ở ĐẦU dòng (giữ lại Headers #, List bullets 1., a), -, +, *, >, |, URLs, Path, Quotes, Emojis)
    const isValidStart = /^(?:\s*)(?:#+|\d+[\.\)]|[a-zA-Z][\.\)]|[-+*•–—>|✓✗⚠️]|https?:\/\/|[a-zA-Z]:\\|["'“‘(])/i.test(l);
    if (!isValidStart) {
      l = l.replace(/^[^a-zA-Z0-9À-ỹ\s\(\[\{\"'“‘✓✗⚠️#\+\-\*\•\–\—\>\|]+/g, '');
    }

    // Dọn dẹp rác ở CUỐI dòng (giữ lại dấu câu ., ?, !, :, ;, %, ), ], }, ", ', `, toán tử, unicode symbols)
    l = l.replace(/[^a-zA-Z0-9À-ỹ\s\.\?\!\:\;\%\)\}\]\'\"\`\+\-\|✓✗⚠️]+$/g, '');

    // ADVANCED LEVEL: Tự động bổ sung dấu chấm câu cho văn xuôi tự do dài
    if (level === 'ADVANCED') {
      const words = l.split(' ');
      if (
        l.length > 20 &&
        words.length >= 4 &&
        !/^https?:\/\//i.test(l) &&
        !/^[a-zA-Z0-9_\-\.\/\\:]+$/.test(l) &&
        !/^[#\+\-\*\•\–\—\d\w\.\)\>\|]/.test(l) &&
        /[a-zA-Z0-9À-ỹ]$/.test(l)
      ) {
        l += '.';
      }
    }

    return l;
  });

  return lines
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n')
    .trim();
}

async function processText(text) {
  if (!text || !text.trim()) {
    if (typeof showToast === 'function') showToast('📝 Không có dữ liệu', 'info');
    return;
  }

  rawText = text;

  const levelSelect = document.getElementById('cleaner-level');
  const level = levelSelect ? levelSelect.value : 'STANDARD';

  // Gọi hàm lọc thông minh theo cấp độ
  const result = smartCleanText(text, level);

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
          const page = window.PAGES ? window.PAGES[skill.pageName] : null;
          if (page && typeof page.attachEvents === 'function') {
            console.log('[Text Tools] Calling attachEvents via PAGES for', skillId);
            page.attachEvents();
          } else {
            console.warn('[Text Tools] Fallback attachEvents for', skillId);
            if (skillId === 'cleaner') attachCleanerEvents();
            else if (skillId === 'comparator') attachComparatorEvents();
            else if (skillId === 'ocr' && typeof attachOcrEvents === 'function') attachOcrEvents();
          }
        }, 50);
      });
    });
  },
  title: '🧹 Text Tools'
};



window.PAGES = window.PAGES || {};
window.PAGES['cleaner'] = { render: function () { return window.SKILL_HTML.cleaner; }, attachEvents: attachCleanerEvents, title: '🧹 Làm sạch văn bản' };
window.PAGES['comparator'] = { render: function () { return window.SKILL_HTML.comparator; }, attachEvents: attachComparatorEvents, title: '🆚 So sánh văn bản' };
console.log('[Text Tools] Module fully loaded and PAGES registered');
