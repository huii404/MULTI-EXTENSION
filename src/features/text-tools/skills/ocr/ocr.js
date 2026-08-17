// ==============================================================
// SKILL: OCR - Quet chu tu anh (Tesseract.js)
// ==============================================================

// 1. HTML TEMPLATE
window.SKILL_HTML = window.SKILL_HTML || {};
window.SKILL_HTML.ocr = `
<div class="ocr-container" style="border:none !important; padding:0; margin:0;">
  <div style="display:flex; gap:8px; margin-bottom:10px;">
    <input type="file" id="ocr-file-input" accept="image/*" style="display:none;" />
    <button id="ocr-browse-btn" class="action-btn primary" style="flex:1; padding:12px; background:linear-gradient(135deg,#3498db,#2980b9); margin-bottom:0; justify-content:center;">
      <span style="font-size:16px; margin-right:6px;">&#128444;&#65039;</span>
      <span style="font-size:13px; font-weight:700;">Chon file anh de quet</span>
    </button>
  </div>

  <div id="ocr-status" style="display:none; text-align:center; padding:8px; background:#fff3e0; border-radius:var(--radius-sm); margin-bottom:10px; font-size:12px; color:#e65100; font-weight:600;">
    &#9203; Dang quet chu... <span id="ocr-progress">0%</span>
  </div>

  <div class="form-group" id="ocr-result-area" style="margin-bottom:8px; display:none;">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
      <label style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin:0;">
        <span>&#128196;</span> Ket qua quet:
      </label>
      <div style="display:flex; gap:6px;">
        <button id="ocr-reset-btn" class="action-btn secondary" style="padding:4px 10px; font-size:11px; margin:0; width:auto; border-radius:4px;" title="Xoa ket qua va Quet anh moi">&#128260; Reset</button>
        <button id="ocr-copy-btn" class="action-btn primary" style="padding:4px 10px; font-size:11px; margin:0; width:auto; border-radius:4px;">&#128203; Copy Text</button>
      </div>
    </div>
    <textarea id="ocr-output" rows="8" placeholder="Ket qua chu se xuat hien o day..." style="background:#f8f9fa; cursor:text; width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:13px; resize:vertical; line-height:1.6;"></textarea>
  </div>

  <div id="ocr-hint" style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">
    <div style="font-size:28px; margin-bottom:8px; opacity:0.5;">&#128269;</div>
    <div>Chon file anh tu may tinh hoac bam <strong>Ctrl+V</strong> de dan</div>
    <div style="margin-top:4px; opacity:0.7;">Ho tro: JPG, PNG, WebP, BMP &mdash; Tieng Viet &amp; Tieng Anh</div>
  </div>
</div>
`;

// ==============================================================
// 2. TIEN XU LY ANH
// ==============================================================
function fastPreprocessImage(imageSource, maxWidth = 2000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Upscale anh nho de Tesseract nhan dien dau tieng Viet tot hon
        const minWidth = 800;
        if (width < minWidth) {
          const scale = Math.min(minWidth / width, 3);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // Downscale anh qua lon
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Grayscale + tang tuong phan nhe (giu gradient net dau)
        for (let i = 0; i < data.length; i += 4) {
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          gray = 255 / (1 + Math.exp(-0.05 * (gray - 128)));
          data[i] = data[i + 1] = data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(imageSource);
      }
    };
    img.onerror = () => resolve(imageSource);
    img.src = imageSource;
  });
}

// ==============================================================
// 3. LOC KY TU RAC OCR - GIU NGUYEN TIENG VIET & TIENG ANH
// ==============================================================
function autoCleanOcrText(text) {
  if (!text) return '';

  // Chi go control characters & zero-width (KHONG cham vao Unicode tieng Viet)
  let cleaned = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, '');

  const lines = cleaned.split('\n');
  const validLines = [];

  for (let line of lines) {
    let l = line.replace(/[ \t]+/g, ' ').trim();
    if (!l) continue;

    // Bo qua dong URL trinh duyet dinh vao anh
    if (/^https?:\/\//.test(l)) continue;

    // Bo dau gach noi cuoi dong (word wrap artifact)
    l = l.replace(/-\s*$/, '');

    // Ky tu hop le: ASCII in duoc + toan bo Unicode tu U+00C0 tro len
    // (bao gom Latin Extended, Viet \u1E00-\u1EFF, va cac Unicode khac)
    const validCount = (l.match(/[\u0020-\u007E\u00C0-\uFFFF]/g) || []).length;
    const ratio = l.length > 0 ? validCount / l.length : 1;

    // Chi bo dong khi ty le ky tu hien thi duoc < 30% (rac thuc su)
    if (l.length > 4 && ratio < 0.30) continue;

    // Xoa chuoi lap ky tu dac biet > 3 lien tiep (===, ---, ***)
    l = l.replace(/([=\-*#~_]{4,})/g, '').trim();

    if (l.length > 0) {
      validLines.push(l);
    }
  }

  let result = validLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

// ==============================================================
// 4. TESSERACT WORKER
// ==============================================================
let cachedOcrWorker = null;

async function getOcrWorker() {
  if (cachedOcrWorker) return cachedOcrWorker;

  cachedOcrWorker = await Tesseract.createWorker('vie+eng', 1, {
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

  await cachedOcrWorker.setParameters({
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: '1',
  });

  return cachedOcrWorker;
}

// ==============================================================
// 5. HAM PHU TRO
// ==============================================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// ==============================================================
// 6. SU KIEN OCR
// ==============================================================
function attachOcrEvents() {
  const browseBtn = document.getElementById('ocr-browse-btn');
  const fileInput = document.getElementById('ocr-file-input');
  const statusEl = document.getElementById('ocr-status');
  const resultArea = document.getElementById('ocr-result-area');
  const outputEl = document.getElementById('ocr-output');
  const hintEl = document.getElementById('ocr-hint');
  const copyBtn = document.getElementById('ocr-copy-btn');
  const resetBtn = document.getElementById('ocr-reset-btn');

  if (!browseBtn || !fileInput) return;

  async function runOCR(rawImageSource) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = '&#9203; Dang toi uu net anh...';
    }
    if (resultArea) resultArea.style.display = 'none';
    if (hintEl) hintEl.style.display = 'none';

    try {
      if (typeof Tesseract === 'undefined') {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('libs/tesseract.min.js');
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Khong the tai file libs/tesseract.min.js'));
        });
      }

      const processedImageSource = await fastPreprocessImage(rawImageSource);
      if (statusEl) statusEl.innerHTML = '&#9203; Dang quet chu (Song ngu)... <span id="ocr-progress">0%</span>';

      const worker = await getOcrWorker();
      const ret = await worker.recognize(processedImageSource);

      let extractedText = ret && ret.data && ret.data.text ? ret.data.text.trim() : '';

      if (extractedText) {
        extractedText = autoCleanOcrText(extractedText);
      }

      if (!extractedText) {
        if (statusEl) statusEl.style.display = 'none';
        if (typeof showToast === 'function') showToast('&#9888;&#65039; Khong tim thay chu trong anh!', 'warning');
        if (hintEl) hintEl.style.display = 'block';
        return;
      }

      if (statusEl) statusEl.style.display = 'none';
      if (resultArea) resultArea.style.display = 'block';
      if (outputEl) outputEl.value = extractedText;

      try {
        await navigator.clipboard.writeText(extractedText);
        if (typeof showToast === 'function') showToast('&#9989; Quet xong & da tu dong copy!', 'success');
      } catch (_) {
        if (typeof showToast === 'function') showToast('&#9989; Nhan dien xong!', 'success');
      }

    } catch (err) {
      console.error('[OCR Detail Error]:', err);
      if (statusEl) statusEl.style.display = 'none';
      if (hintEl) hintEl.style.display = 'block';
      cachedOcrWorker = null;

      const errMsg = (err && err.message) ? err.message : String(err || 'Unknown error');
      if (typeof showToast === 'function') {
        showToast('&#10060; Loi: ' + (errMsg.includes('Fetch') ? 'Can ket noi mang lan dau' : 'Khong doc duoc file anh nay'), 'error');
      }
    }
  }

  browseBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      if (file.type.startsWith('image/')) {
        try {
          const base64Image = await fileToBase64(file);
          runOCR(base64Image);
        } catch (e) {
          if (typeof showToast === 'function') showToast('&#10060; Loi doc file anh!', 'error');
        }
      } else {
        if (typeof showToast === 'function') showToast('&#9888;&#65039; Hay chon file anh hop le!', 'warning');
      }
    }
  });

  document.addEventListener('paste', async function(e) {
    const ocrContainer = document.querySelector('.ocr-container');
    if (!ocrContainer || ocrContainer.parentElement.parentElement.style.display === 'none') return;

    if (e.clipboardData && e.clipboardData.items) {
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            try {
              const base64Image = await fileToBase64(file);
              runOCR(base64Image);
            } catch (err) {
              if (typeof showToast === 'function') showToast('&#10060; Loi doc anh tu clipboard!', 'error');
            }
          }
          return;
        }
      }
    }
  });

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

  resetBtn?.addEventListener('click', function() {
    if (fileInput) fileInput.value = '';
    if (outputEl) outputEl.value = '';
    if (resultArea) resultArea.style.display = 'none';
    if (hintEl) hintEl.style.display = 'block';
    if (typeof showToast === 'function') showToast('&#128260; Da lam moi giao dien!', 'info');
  });

  copyBtn?.addEventListener('click', function() {
    if (!outputEl || !outputEl.value) return;
    outputEl.select();
    navigator.clipboard.writeText(outputEl.value).then(() => {
      if (typeof showToast === 'function') showToast('&#128203; Da copy ket qua!', 'success');
    });
  });

  outputEl?.addEventListener('dblclick', function() {
    if (!this.value) return;
    this.select();
    navigator.clipboard.writeText(this.value).then(() => {
      if (typeof showToast === 'function') showToast('&#128203; Da copy ket qua!', 'success');
    });
  });
}

// ==============================================================
// 7. DANG KY PAGE
// ==============================================================
window.PAGES = window.PAGES || {};
window.PAGES['ocr'] = {
  render: function() {
    return window.SKILL_HTML.ocr;
  },
  attachEvents: attachOcrEvents,
  title: '&#128269; Quet chu tu anh'
};
