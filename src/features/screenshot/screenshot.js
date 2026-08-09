
// SCREENSHOT MODULE - TỐI ƯU TỐC ĐỘ (NATIVE + WEBP)

const SCREENSHOT_CONFIG = {
  defaultFormat: 'webp',    // Chuyển sang webp để sinh file nhanh & nhẹ hơn
  jpegQuality: 0.9,         // Chất lượng WebP/JPEG
  maxDimension: 3000,       // Giới hạn kích thước tối đa
  scale: 1.5,               // Scale vừa đủ nét, tối ưu bộ nhớ
};

PAGES.screenshot = {
  render: function() {
    return `
      <div class="screenshot-options">
        <div class="form-group">
          <label>
            <span class="icon">📐</span> Chọn chế độ chụp:
          </label>
          <select id="ss-mode">
            <option value="viewport" selected>📱 Khung nhìn hiện tại (Cực nhanh)</option>
            <option value="fullpage">📄 Toàn bộ trang</option>
            <option value="element">🎯 Chọn phần tử (click chọn)</option>
          </select>
        </div>

        <button id="ss-capture-btn" class="action-btn primary" style="background: linear-gradient(135deg, #7C3AED, #A78BFA);">
          <div class="icon-circle">📸</div>
          <div class="btn-info">
            <span class="btn-heading">Chụp ảnh</span>
            <span class="btn-sub">Tốc độ cao, tối ưu bộ nhớ</span>
          </div>
        </button>

        <div id="ss-preview" style="display:none; margin-top:12px;">
          <img id="ss-preview-img" style="width:100%; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button id="ss-download-btn" class="action-btn secondary" style="flex:1; padding:8px; font-size:12px; text-align:center;">
              💾 Tải xuống
            </button>
          </div>
        </div>
      </div>  
    `;
  },

  attachEvents: function() {
    // === NÚT CHỤP ===
    document.getElementById('ss-capture-btn').addEventListener('click', async function() {
      const tab = await getCurrentTab();
      const statusText = document.getElementById('ss-status-text');
      const statusDot = document.getElementById('ss-status-dot');
      
      if (!tab) {
        showToast('Không tìm thấy tab', 'error');
        return;
      }

      // Kiểm tra URL - KHÔNG CHỤP TRANG HỆ THỐNG
      const blockedSchemes = ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'devtools://', 'view-source:'];
      const isBlocked = blockedSchemes.some(scheme => tab.url.startsWith(scheme));
      
      if (isBlocked || !tab.url || tab.url === 'about:blank') {
        const msg = '❌ Không thể chụp trang hệ thống hoặc trang trống';
        showToast(msg, 'error');
        if (statusText) {
          statusText.textContent = msg;
          statusText.style.color = '#e74c3c';
        }
        if (statusDot) statusDot.style.background = '#e74c3c';
        return;
      }

      const mode = document.getElementById('ss-mode').value;
      const btn = this;
      const originalHeading = btn.querySelector('.btn-heading').innerText;
      
      btn.querySelector('.btn-heading').innerText = '⏳ Đang chụp...';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';

      if (statusText) {
        statusText.textContent = '⏳ Đang xử lý...';
        statusText.style.color = '#f39c12';
      }
      if (statusDot) statusDot.style.background = '#f39c12';

      const startTime = performance.now();

      try {
        let imageData = null;

        // TỐI ƯU 1: Nếu chụp VIEWPORT -> Dùng API gốc của Chrome (Siêu nhanh, ~50ms)
        if (mode === 'viewport') {
          const dataUrl = await new Promise((resolve, reject) => {
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, (url) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(url);
            });
          });

          imageData = {
            dataUrl: dataUrl,
            filename: `viewport_${Date.now()}.png`,
            width: window.innerWidth,
            height: window.innerHeight
          };
        } 
        // Nếu chụp FULLPAGE hoặc ELEMENT -> Dùng Injection html2canvas
        else {
          // Kiểm tra xem html2canvas đã inject chưa
          let hasLibrary = false;
          try {
            const res = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => typeof html2canvas !== 'undefined'
            });
            hasLibrary = res && res[0] && res[0].result;
          } catch (e) {
            hasLibrary = false;
          }

          if (!hasLibrary) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['libs/html2canvas/html2canvas.min.js']
            });
          }

          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: captureWebContentFullOptimized,
            args: [mode, SCREENSHOT_CONFIG.defaultFormat, SCREENSHOT_CONFIG.jpegQuality, SCREENSHOT_CONFIG.scale, SCREENSHOT_CONFIG.maxDimension]
          });

          if (result && result[0] && result[0].result) {
            imageData = result[0].result;
          }
        }

        const elapsed = (performance.now() - startTime).toFixed(0);

        if (imageData && !imageData.error) {
          const preview = document.getElementById('ss-preview');
          const img = document.getElementById('ss-preview-img');
          img.src = imageData.dataUrl;
          preview.style.display = 'block';
          preview.dataset.dataUrl = imageData.dataUrl;
          preview.dataset.filename = imageData.filename;
          
          const sizeKB = (imageData.dataUrl.length * 3 / 4 / 1024).toFixed(1);
          showToast(`✅ Đã chụp (${elapsed}ms, ${sizeKB}KB)`, 'success');
          
          if (statusText) {
            statusText.textContent = `✅ ${imageData.width || ''}×${imageData.height || ''} - ${elapsed}ms`;
            statusText.style.color = '#27ae60';
          }
          if (statusDot) statusDot.style.background = '#27ae60';
        } else {
          const err = imageData?.error || 'Lỗi chụp ảnh';
          showToast('❌ ' + err, 'error');
          if (statusText) {
            statusText.textContent = '❌ ' + err;
            statusText.style.color = '#e74c3c';
          }
          if (statusDot) statusDot.style.background = '#e74c3c';
        }

      } catch (err) {
        console.error('[Screenshot] Error:', err);
        showToast('❌ ' + err.message, 'error');
      } finally {
        btn.querySelector('.btn-heading').innerText = originalHeading;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });

    // === TẢI XUỐNG ===
    document.getElementById('ss-download-btn')?.addEventListener('click', function() {
      const preview = document.getElementById('ss-preview');
      const dataUrl = preview.dataset.dataUrl;
      const filename = preview.dataset.filename || 'screenshot.webp';
      
      if (dataUrl) {
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: true
        }, function() {
          if (chrome.runtime.lastError) {
            showToast('❌ Lỗi tải xuống: ' + chrome.runtime.lastError.message, 'error');
          } else {
            showToast('📥 Đang tải xuống...', 'success');
          }
        });
      }
    });

  },

  title: '📸 Chụp ảnh Web'
};

// HÀM CAPTURE TRÊN PAGE (Injected Script)

function captureWebContentFullOptimized(mode, format, quality, scale, maxDim) {
  return new Promise((resolve) => {
    try {
      if (typeof html2canvas === 'undefined') {
        resolve({ error: 'Chưa nạp được thư viện html2canvas' });
        return;
      }

      const doRender = (element, filenamePrefix) => {
        const s = Math.min(window.devicePixelRatio || 1.5, scale);
        const maxD = maxDim;

        const options = {
          scale: s,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: Math.min(element.scrollWidth || element.clientWidth, maxD / s),
          height: Math.min(element.scrollHeight || element.clientHeight, maxD / s),
          ignoreElements: (el) => {
            return el.classList && (
              el.classList.contains('ad') ||
              el.classList.contains('advertisement') ||
              el.tagName === 'SCRIPT' ||
              el.tagName === 'STYLE'
            );
          }
        };

        html2canvas(element, options)
          .then((canvas) => {
            const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
            const ext = format === 'webp' ? 'webp' : 'png';
            const dataUrl = canvas.toDataURL(mimeType, quality);

            resolve({
              dataUrl: dataUrl,
              filename: `${filenamePrefix}_${Date.now()}.${ext}`,
              width: canvas.width,
              height: canvas.height
            });
          })
          .catch((err) => resolve({ error: 'Lỗi render: ' + err.message }));
      };

      if (mode === 'fullpage') {
        doRender(document.documentElement, 'fullpage');
      } else if (mode === 'element') {
        let selected = null;
        let isActive = true;

        const highlight = (el) => {
          if (selected) selected.style.outline = 'none';
          selected = el;
          if (el) el.style.outline = '2px solid #7C3AED';
        };

        const mouseMoveHandler = (e) => {
          if (!isActive) return;
          const el = document.elementFromPoint(e.clientX, e.clientY);
          if (el && el !== document.body && el !== document.documentElement) {
            highlight(el);
          }
        };

        const clickHandler = (e) => {
          if (!isActive) return;
          e.stopPropagation();
          e.preventDefault();

          const el = document.elementFromPoint(e.clientX, e.clientY);
          if (el && el !== document.body && el !== document.documentElement) {
            cleanup();
            doRender(el, 'element');
          }
        };

        const keyHandler = (e) => {
          if (e.key === 'Escape') {
            cleanup();
            resolve({ error: 'Đã hủy chọn phần tử' });
          }
        };

        const cleanup = () => {
          isActive = false;
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('click', clickHandler, true);
          document.removeEventListener('keydown', keyHandler);
          highlight(null);
          const hint = document.getElementById('ss-element-hint');
          if (hint) hint.remove();
        };

        const div = document.createElement('div');
        div.id = 'ss-element-hint';
        div.style.cssText = `
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(124, 58, 237, 0.95); color: white; padding: 8px 16px;
          border-radius: 8px; font-size: 13px; z-index: 999999; pointer-events: none;
        `;
        div.innerHTML = '🖱️ Click chọn phần tử | ESC hủy';
        document.body.appendChild(div);

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keyHandler);
      } else {
        doRender(document.documentElement, 'viewport');
      }
    } catch (err) {
      resolve({ error: err.message });
    }
  });
}