/**
 * FEATURES: TAO & QUET MA QR (QR CODE SUITE)
 */

// CẤU HÌNH MẶC ĐỊNH
const QR_CONFIG = {
  defaultSize: 256,
  defaultColor: '#000000',
  maxLength: 200,
  maxChars: 200,
};

// QR CODE GENERATOR ENGINE
const QREngine = {
  API_URL: 'https://api.qrserver.com/v1/create-qr-code/',
  _currentDataUrl: null,
  _currentText: '',

  generate: function(text, size = QR_CONFIG.defaultSize, color = QR_CONFIG.defaultColor) {
    if (!text || !text.trim()) {
      return { error: 'Vui lòng nhập nội dung' };
    }
    if (text.length > QR_CONFIG.maxLength) {
      return { 
        error: `⚠️ Nội dung quá dài (${text.length} ký tự).\nGiới hạn tối đa ${QR_CONFIG.maxLength} ký tự.`,
        isOverLimit: true,
        currentLength: text.length,
        maxLength: QR_CONFIG.maxLength
      };
    }
    const encodedText = encodeURIComponent(text.trim());
    const url = `${this.API_URL}?size=${size}x${size}&data=${encodedText}&color=${color.replace('#', '')}&bgcolor=ffffff&margin=10`;
    
    this._currentText = text.trim();
    this._currentDataUrl = url;
    
    return { 
      success: true, 
      url: url,
      text: text.trim(),
      size: size,
      color: color,
      charCount: text.length
    };
  },

  getCurrentData: function() {
    return { dataUrl: this._currentDataUrl, text: this._currentText };
  },

  reset: function() {
    this._currentDataUrl = null;
    this._currentText = '';
  }
};

// QR CODE DECODER ENGINE
const QRDecoderEngine = {
  decodeFromDataUrl: function(dataUrl, callback) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      let decodedText = null;
      if (typeof jsQR !== 'undefined' && typeof jsQR.decodeCanvas === 'function') {
        const result = jsQR.decodeCanvas(canvas);
        if (result && result.data) {
          decodedText = result.data;
        }
      }

      if (decodedText) {
        callback({ success: true, text: decodedText });
      } else {
        // Fallback to online QR Reader API for maximum precision
        QRDecoderEngine.decodeViaApi(dataUrl, callback);
      }
    };
    img.onerror = function() {
      callback({ error: 'Không thể đọc dữ liệu hình ảnh' });
    };
    img.src = dataUrl;
  },

  decodeViaApi: function(dataUrl, callback) {
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const formData = new FormData();
        formData.append('file', blob, 'qrcode.png');
        return fetch('https://api.qrserver.com/v1/read-qr-code/', {
          method: 'POST',
          body: formData
        });
      })
      .then(res => res.json())
      .then(data => {
        if (data && data[0] && data[0].symbol && data[0].symbol[0] && data[0].symbol[0].data) {
          const qrText = data[0].symbol[0].data;
          const errorMsg = data[0].symbol[0].error;
          if (qrText && !errorMsg) {
            callback({ success: true, text: qrText });
          } else {
            callback({ error: 'Không tìm thấy mã QR hợp lệ trong ảnh' });
          }
        } else {
          callback({ error: 'Không tìm thấy mã QR hợp lệ trong ảnh' });
        }
      })
      .catch(err => {
        console.error('Lỗi khi đọc QR qua API:', err);
        callback({ error: 'Không thể quét mã QR từ hình ảnh này' });
      });
  }
};

// LOAD HTML TEMPLATE
let qrCodeHTML = '';
async function loadQRCodeHTML() {
  try {
    const response = await fetch(chrome.runtime.getURL('src/features/qrcode/qrcode.html'));
    qrCodeHTML = await response.text();
  } catch (e) {
    console.error('Không thể load qrcode.html:', e);
  }
}

// POPUP PAGE
PAGES.qrcode = {
  render: function() {
    return qrCodeHTML || '<p>Đang tải...</p>';
  },

  attachEvents: function() {
    // 1. TAB SWITCHING LOGIC
    const tabBtns = document.querySelectorAll('.qr-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabTarget = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.qr-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        const targetContent = document.getElementById(`qr-tab-${tabTarget}`);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    // 2. GENERATE QR EVENTS
    const input = document.getElementById('qr-input');
    const preview = document.getElementById('qr-preview');
    const image = document.getElementById('qr-image');
    const info = document.getElementById('qr-info');
    const charCounter = document.getElementById('qr-char-counter');
    
    const generateBtn = document.getElementById('qr-generate-btn');
    const downloadBtn = document.getElementById('qr-download-btn');
    const resetBtn = document.getElementById('qr-reset-btn');
    const getCurrentUrlBtn = document.getElementById('qr-get-current-url-btn');

    // Quick get current tab URL
    if (getCurrentUrlBtn && input) {
      getCurrentUrlBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].url) {
              input.value = tabs[0].url;
              updateCharCounter();
              if (typeof showToast === 'function') {
                showToast('Đã chèn URL trang hiện tại! 🔗', 'success');
              }
            }
          });
        }
      });
    }

    function updateCharCounter() {
      if (!input || !charCounter) return;
      const text = input.value;
      const length = text.length;
      const max = QR_CONFIG.maxLength;
      
      let color = 'var(--text-muted)';
      let textContent = `${length} / ${max}`;
      
      if (length > max) {
        color = '#e74c3c';
        textContent = `⚠️ ${length} / ${max} (vượt giới hạn)`;
      } else if (length > max * 0.8) {
        color = '#f39c12';
      } else {
        color = '#27ae60';
      }
      
      charCounter.textContent = textContent;
      charCounter.style.color = color;
    }

    function showQR(result) {
      if (!image || !preview) return;
      image.src = result.url;
      preview.style.display = 'block';
      if (info) info.textContent = `📝 ${result.charCount} ký tự • 📐 ${result.size}px`;
      
      if (downloadBtn) {
        downloadBtn.style.opacity = '1';
        downloadBtn.style.pointerEvents = 'auto';
      }
      if (resetBtn) {
        resetBtn.style.opacity = '1';
        resetBtn.style.pointerEvents = 'auto';
      }
    }

    function hideQR() {
      if (preview) preview.style.display = 'none';
      if (image) image.src = '';
      if (info) info.textContent = '';
      if (downloadBtn) {
        downloadBtn.style.opacity = '0.5';
        downloadBtn.style.pointerEvents = 'none';
      }
      if (resetBtn) {
        resetBtn.style.opacity = '0.5';
        resetBtn.style.pointerEvents = 'none';
      }
    }

    if (generateBtn && input) {
      generateBtn.addEventListener('click', function() {
        const text = input.value;
        if (!text || !text.trim()) {
          if (typeof showToast === 'function') showToast('Vui lòng nhập nội dung!', 'warning');
          hideQR();
          return;
        }

        if (text.length > QR_CONFIG.maxLength) {
          hideQR();
          if (typeof showToast === 'function') showToast(`Nội dung vượt quá giới hạn ${QR_CONFIG.maxLength} ký tự!`, 'error');
          return;
        }

        const result = QREngine.generate(text, QR_CONFIG.defaultSize, QR_CONFIG.defaultColor);
        if (result.error) {
          hideQR();
          if (typeof showToast === 'function') showToast(result.error, 'error');
        } else {
          showQR(result);
          if (typeof showToast === 'function') showToast('Tạo QR Code thành công! 🎉', 'success');
        }
      });
    }

    downloadBtn?.addEventListener('click', function() {
      const data = QREngine.getCurrentData();
      if (!data.dataUrl) return;
      if (typeof chrome !== 'undefined' && chrome.downloads) {
        chrome.downloads.download({
          url: data.dataUrl,
          filename: `QR_${Date.now()}.png`,
          saveAs: true
        });
      }
    });

    resetBtn?.addEventListener('click', function() {
      if (input) input.value = '';
      QREngine.reset();
      hideQR();
      updateCharCounter();
    });

    if (input) {
      input.addEventListener('input', updateCharCounter);
      updateCharCounter();
    }

    // 3. DECODE QR EVENTS
    const dropzone = document.getElementById('qr-dropzone');
    const fileInput = document.getElementById('qr-file-input');
    const scanScreenBtn = document.getElementById('qr-scan-screen-btn');
    const decodeImgContainer = document.getElementById('qr-decode-img-container');
    const previewImg = document.getElementById('qr-decode-preview-img');
    const decodeStatus = document.getElementById('qr-decode-status');
    const decodeResultBox = document.getElementById('qr-decode-result');
    const decodeOutput = document.getElementById('qr-decode-output');
    const copyResultBtn = document.getElementById('qr-copy-result-btn');
    const openUrlBtn = document.getElementById('qr-open-url-btn');

    let currentDecodedText = '';

    function processImageForDecoding(dataUrl) {
      if (previewImg && decodeImgContainer) {
        previewImg.src = dataUrl;
        decodeImgContainer.style.display = 'block';
      }

      if (decodeStatus) {
        decodeStatus.textContent = '⏳ Đang quét và giải mã...';
        decodeStatus.style.display = 'block';
        decodeStatus.style.color = 'var(--text-muted)';
      }
      if (decodeResultBox) decodeResultBox.style.display = 'none';

      QRDecoderEngine.decodeFromDataUrl(dataUrl, (res) => {
        if (decodeStatus) decodeStatus.style.display = 'none';

        if (res.success && res.text) {
          currentDecodedText = res.text;
          if (decodeOutput) decodeOutput.textContent = res.text;
          if (decodeResultBox) decodeResultBox.style.display = 'block';

          // Check if result is a valid URL
          const isUrl = /^https?:\/\/[^\s]+$/i.test(res.text.trim());
          if (openUrlBtn) {
            openUrlBtn.style.display = isUrl ? 'block' : 'none';
          }

          if (typeof showToast === 'function') {
            showToast('Giải mã QR thành công! 🎉', 'success');
          }
        } else {
          if (decodeStatus) {
            decodeStatus.textContent = `❌ ${res.error || 'Không tìm thấy mã QR hợp lệ trong ảnh'}`;
            decodeStatus.style.display = 'block';
            decodeStatus.style.color = '#e74c3c';
          }
          if (typeof showToast === 'function') {
            showToast('Không tìm thấy mã QR trong ảnh!', 'error');
          }
        }
      });
    }

    function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        if (typeof showToast === 'function') showToast('Vui lòng chọn file hình ảnh!', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        processImageForDecoding(e.target.result);
      };
      reader.readAsDataURL(file);
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Screen scan button
    if (scanScreenBtn) {
      scanScreenBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.captureVisibleTab) {
          if (decodeStatus) {
            decodeStatus.textContent = '⏳ Đang chụp màn hình & quét...';
            decodeStatus.style.display = 'block';
          }
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
              if (decodeStatus) {
                decodeStatus.textContent = '❌ Không thể chụp màn hình trang hiện tại';
                decodeStatus.style.color = '#e74c3c';
              }
              return;
            }
            processImageForDecoding(dataUrl);
          });
        } else {
          if (typeof showToast === 'function') showToast('Tính năng chỉ chạy trong Chrome Extension!', 'warning');
        }
      });
    }

    // Paste event (Ctrl+V) listener
    window.addEventListener('paste', (e) => {
      const activeTab = document.querySelector('.qr-tab-btn.active');
      if (activeTab && activeTab.getAttribute('data-tab') === 'decode') {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            handleFile(blob);
            break;
          }
        }
      }
    });

    // Copy result button
    if (copyResultBtn) {
      copyResultBtn.addEventListener('click', () => {
        if (currentDecodedText) {
          navigator.clipboard.writeText(currentDecodedText).then(() => {
            if (typeof showToast === 'function') showToast('Đã copy nội dung QR vào clipboard! 📋', 'success');
          });
        }
      });
    }

    // Open URL button
    if (openUrlBtn) {
      openUrlBtn.addEventListener('click', () => {
        if (currentDecodedText && /^https?:\/\//i.test(currentDecodedText.trim())) {
          if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: currentDecodedText.trim() });
          } else {
            window.open(currentDecodedText.trim(), '_blank');
          }
        }
      });
    }
  },

  title: '📱 Tạo & Quét mã QR'
};

loadQRCodeHTML();