window.SKILL_HTML = window.SKILL_HTML || {};
window.SKILL_HTML.ocr = `
<div class="ocr-container" style="border:none !important; padding:0; margin:0;">
  <!-- Tùy chọn 1: Chọn File ảnh -->
  <div style="display:flex; gap:8px; margin-bottom:10px;">
    <input type="file" id="ocr-file-input" accept="image/*" style="display:none;" />
    <button id="ocr-browse-btn" class="action-btn primary" style="flex:1; padding:12px; background:linear-gradient(135deg,#3498db,#2980b9); margin-bottom:0; justify-content:center;">
      <span style="font-size:16px; margin-right:6px;">📁</span>
      <span style="font-size:13px; font-weight:700;">Chọn file ảnh</span>
    </button>
  </div>

  <!-- Trạng thái xử lý -->
  <div id="ocr-status" style="display:none; text-align:center; padding:8px; background:#fff3e0; border-radius:var(--radius-sm); margin-bottom:10px; font-size:12px; color:#e65100; font-weight:600;">
    ⏳ Đang quét chữ... <span id="ocr-progress">0%</span>
  </div>

  <!-- Kết quả hiển thị -->
  <div class="form-group" id="ocr-result-area" style="margin-bottom:8px; display:none;">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
      <label style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin:0;">
        <span>✨</span> Kết quả quét:
      </label>
      <button id="ocr-copy-btn" class="action-btn secondary" style="padding:4px 8px; font-size:11px; margin:0; width:auto; border-radius:4px;">📋 Copy Text</button>
    </div>
    <textarea id="ocr-output" rows="6" readonly placeholder="Kết quả chữ sẽ xuất hiện ở đây..." style="background:#f8f9fa; cursor:default; width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:13px; resize:vertical; line-height:1.6;"></textarea>
  </div>

  <div id="ocr-hint" style="text-align:center; padding:16px; color:var(--text-muted); font-size:12px;">
    <div style="font-size:28px; margin-bottom:8px; opacity:0.5;">🖼️</div>
    <div>Chọn file ảnh từ máy tính hoặc bấm <strong>Ctrl+V</strong> để dán</div>
    <div style="margin-top:4px; font-size:11px;">Hoặc kéo thả file ảnh vào đây</div>
  </div>
</div>
`;

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
  const statusEl = document.getElementById('ocr-status');
  const progressEl = document.getElementById('ocr-progress');
  const resultArea = document.getElementById('ocr-result-area');
  const outputEl = document.getElementById('ocr-output');
  const hintEl = document.getElementById('ocr-hint');
  const copyBtn = document.getElementById('ocr-copy-btn');

  if (!browseBtn || !fileInput) return;

  async function runOCR(imageSource) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = '⏳ Đang khởi tạo bộ quét chữ...';
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
          script.onerror = () => reject(new Error('Không thể tải file libs/tesseract.min.js'));
        });
      }

      if (statusEl) statusEl.innerHTML = '⏳ Đang phân tích hình ảnh... <span id="ocr-progress">0%</span>';

      const worker = await Tesseract.createWorker('vie', 1, {
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

      const ret = await worker.recognize(imageSource);
      await worker.terminate();

      let extractedText = ret && ret.data && ret.data.text ? ret.data.text.trim() : '';

      if (extractedText) {
        extractedText = extractedText.replace(/-\n/g, '');
        extractedText = extractedText.replace(/\r\n/g, '\n');
        extractedText = extractedText.replace(/\n{2,}/g, '___PARAGRAPH___');
        extractedText = extractedText.replace(/\n/g, ' ');
        extractedText = extractedText.replace(/___PARAGRAPH___/g, '\n\n');
        extractedText = extractedText.replace(/[ \t]+/g, ' ').trim();
      }

      if (!extractedText) {
        if (statusEl) statusEl.style.display = 'none';
        if (typeof showToast === 'function') showToast('⚠️ Không tìm thấy chữ trong ảnh!', 'warning');
        if (hintEl) hintEl.style.display = 'block';
        return;
      }

      if (statusEl) statusEl.style.display = 'none';
      if (resultArea) resultArea.style.display = 'block';
      if (outputEl) outputEl.value = extractedText;

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
      
      const errMsg = (err && err.message) ? err.message : String(err || 'Không rõ nguyên nhân');
      if (typeof showToast === 'function') {
        showToast('❌ Lỗi: ' + (errMsg.includes('Fetch') ? 'Cần kết nối mạng để nạp dữ liệu OCR lần đầu' : 'Không đọc được file ảnh này'), 'error');
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
          if (typeof showToast === 'function') showToast('❌ Lỗi đọc file ảnh!', 'error');
        }
      } else {
        if (typeof showToast === 'function') showToast('⚠️ Hãy chọn file ảnh hợp lệ!', 'warning');
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
              if (typeof showToast === 'function') showToast('❌ Lỗi đọc ảnh từ clipboard!', 'error');
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

  copyBtn?.addEventListener('click', function() {
    if (!outputEl || !outputEl.value) return;
    outputEl.select();
    navigator.clipboard.writeText(outputEl.value).then(() => {
      if (typeof showToast === 'function') showToast('📋 Đã copy kết quả!', 'success');
    });
  });

  outputEl?.addEventListener('dblclick', function() {
    if (!this.value) return;
    this.select();
    navigator.clipboard.writeText(this.value).then(() => {
      if (typeof showToast === 'function') showToast('📋 Đã copy kết quả!', 'success');
    });
  });
}

window.PAGES = window.PAGES || {};
window.PAGES['ocr'] = {
  render: function() {
    return window.SKILL_HTML.ocr;
  },
  attachEvents: attachOcrEvents,
  title: '🖼️ Quét chữ từ ảnh'
};
