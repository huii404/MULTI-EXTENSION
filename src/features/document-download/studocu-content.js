
const CONFIG_STU = {
  AUTO_PDF_PARAM: 'banhmi_auto_pdf=1',
  SCROLL_STEP: 800,
  SCROLL_INTERVAL: 600,
  SAME_COUNT_THRESHOLD: 3,
  SCALE_FACTOR: 4,
  HEIGHT_SCALE_DIVISOR: 4
};

// ---------- Auto-PDF via URL Param ----------
// CHỈ chạy khi có param, KHÔNG có else
if (window.location.href.includes(CONFIG_STU.AUTO_PDF_PARAM)) {
  console.log('[Studocu Content] Auto-PDF triggered via URL param');
  
  // Xóa param khỏi URL để không bị trigger lại nếu F5
  const newUrl = window.location.href
    .replace(/([&?])banhmi_auto_pdf=1&?/, '$1')
    .replace(/[&?]$/, '');
  window.history.replaceState({}, document.title, newUrl);

  // Chờ 1s cho trang load cơ bản
  setTimeout(startAutoPDFProcess, 1000);
}

function startAutoPDFProcess() {
  console.log('[Studocu Content] Starting auto PDF process');
  
  // Inject viewer styles
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('styles/viewer-styles.css');
  document.head.appendChild(link);

  // Status overlay
  const overlay = document.createElement('div');
  overlay.id = 'banhmi-overlay-status';
  overlay.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: #FF6B00; color: white;
    padding: 15px 25px; border-radius: 10px;
    font-family: sans-serif; font-weight: bold;
    z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: opacity 0.3s ease;
  `;
  overlay.innerText = '🚀 Đang tự động load toàn trang để tạo PDF...';
  document.body.appendChild(overlay);

  let oldScrollY = -1;
  let sameCount = 0;

  const scrollInterval = setInterval(() => {
    window.scrollBy(0, CONFIG_STU.SCROLL_STEP);

    if (window.scrollY === oldScrollY) {
      sameCount++;
      if (sameCount >= CONFIG_STU.SAME_COUNT_THRESHOLD) {
        clearInterval(scrollInterval);
        overlay.innerText = '✅ Đã tải xong! Đang chuẩn bị PDF...';
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 300);
          runCleanViewer();
        }, 1000);
      }
    } else {
      sameCount = 0;
      oldScrollY = window.scrollY;
    }
  }, CONFIG_STU.SCROLL_INTERVAL);
}

// ---------- Clean Viewer + Print ----------
function runCleanViewer() {
  console.log('[Studocu Content] Running clean viewer');
  
  const pages = document.querySelectorAll('div[data-page-index]');
  if (pages.length === 0) {
    alert('⚠️ Không tìm thấy trang nào.');
    return;
  }

  const SCALE_FACTOR = CONFIG_STU.SCALE_FACTOR;
  const HEIGHT_SCALE_DIVISOR = CONFIG_STU.HEIGHT_SCALE_DIVISOR;

  function copyComputedStyle(source, target, scaleFactor, shouldScaleHeight, shouldScaleWidth, heightScaleDivisor, widthScaleDivisor, shouldScaleMargin, marginScaleDivisor) {
    const computedStyle = window.getComputedStyle(source);
    const normalProps = [
      'position', 'left', 'top', 'bottom', 'right',
      'font-family', 'font-weight', 'font-style',
      'color', 'background-color',
      'text-align', 'white-space',
      'display', 'visibility', 'opacity', 'z-index',
      'text-shadow', 'unicode-bidi', 'font-feature-settings', 'padding'
    ];
    const scaleProps = ['font-size', 'line-height'];
    let styleString = '';

    normalProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
        styleString += `${prop}: ${value} !important; `;
      }
    });

    const widthValue = computedStyle.getPropertyValue('width');
    if (widthValue && widthValue !== 'none' && widthValue !== 'auto') {
      if (shouldScaleWidth) {
        const numValue = parseFloat(widthValue);
        if (!isNaN(numValue) && numValue > 0) {
          const unit = widthValue.replace(numValue.toString(), '');
          styleString += `width: ${numValue / widthScaleDivisor}${unit} !important; `;
        } else {
          styleString += `width: ${widthValue} !important; `;
        }
      } else {
        styleString += `width: ${widthValue} !important; `;
      }
    }

    const heightValue = computedStyle.getPropertyValue('height');
    if (heightValue && heightValue !== 'none' && heightValue !== 'auto') {
      if (shouldScaleHeight) {
        const numValue = parseFloat(heightValue);
        if (!isNaN(numValue) && numValue > 0) {
          const unit = heightValue.replace(numValue.toString(), '');
          styleString += `height: ${numValue / heightScaleDivisor}${unit} !important; `;
        } else {
          styleString += `height: ${heightValue} !important; `;
        }
      } else {
        styleString += `height: ${heightValue} !important; `;
      }
    }

    ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'].forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'auto') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (shouldScaleMargin && numValue !== 0) {
            const unit = value.replace(numValue.toString(), '');
            styleString += `${prop}: ${numValue / marginScaleDivisor}${unit} !important; `;
          } else {
            styleString += `${prop}: ${value} !important; `;
          }
        }
      }
    });

    scaleProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue !== 0) {
          const unit = value.replace(numValue.toString(), '');
          styleString += `${prop}: ${numValue / scaleFactor}${unit} !important; `;
        } else {
          styleString += `${prop}: ${value} !important; `;
        }
      }
    });

    let transformOrigin = computedStyle.getPropertyValue('transform-origin');
    if (transformOrigin) {
      styleString += `transform-origin: ${transformOrigin} !important; -webkit-transform-origin: ${transformOrigin} !important; `;
    }

    styleString += 'overflow: visible !important; max-width: none !important; max-height: none !important; clip: auto !important; clip-path: none !important; ';
    target.style.cssText += styleString;
  }

  function deepCloneWithStyles(element, scaleFactor, heightScaleDivisor) {
    const clone = element.cloneNode(false);
    const hasTextClass = element.classList && element.classList.contains('t');
    const hasUnderscoreClass = element.classList && element.classList.contains('_');

    const shouldScaleMargin = element.tagName === 'SPAN' &&
      element.classList &&
      element.classList.contains('_') &&
      Array.from(element.classList).some(cls => /^_(?:\d+[a-z]*|[a-z]+\d*)$/i.test(cls));

    copyComputedStyle(element, clone, scaleFactor, hasTextClass, hasUnderscoreClass, heightScaleDivisor, 4, shouldScaleMargin, scaleFactor);

    if (element.classList && element.classList.contains('pc')) {
      clone.style.setProperty('transform', 'none', 'important');
      clone.style.setProperty('-webkit-transform', 'none', 'important');
      clone.style.setProperty('overflow', 'visible', 'important');
      clone.style.setProperty('max-width', 'none', 'important');
      clone.style.setProperty('max-height', 'none', 'important');
    }

    if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
      clone.textContent = element.textContent;
    } else {
      element.childNodes.forEach(child => {
        if (child.nodeType === 1) {
          clone.appendChild(deepCloneWithStyles(child, scaleFactor, heightScaleDivisor));
        } else if (child.nodeType === 3) {
          clone.appendChild(child.cloneNode(true));
        }
      });
    }
    return clone;
  }

  const viewerContainer = document.createElement('div');
  viewerContainer.id = 'clean-viewer-container';

  pages.forEach((page, index) => {
    const pc = page.querySelector('.pc');
    let width = 595.3;
    let height = 841.9;

    if (pc) {
      const pcStyle = window.getComputedStyle(pc);
      const pcWidth = parseFloat(pcStyle.width);
      const pcHeight = parseFloat(pcStyle.height);
      if (!isNaN(pcWidth) && pcWidth > 0 && !isNaN(pcHeight) && pcHeight > 0) {
        width = pcWidth;
        height = pcHeight;
      } else {
        const rect = pc.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) {
          width = rect.width;
          height = rect.height;
        }
      }
    }

    const newPage = document.createElement('div');
    newPage.className = 'std-page';
    newPage.id = `page-${index + 1}`;
    newPage.setAttribute('data-page-number', index + 1);
    newPage.style.width = width + 'px';
    newPage.style.height = height + 'px';

    const originalImg = page.querySelector('img.bi') || page.querySelector('img');
    if (originalImg) {
      const bgLayer = document.createElement('div');
      bgLayer.className = 'layer-bg';
      const imgClone = originalImg.cloneNode(true);
      imgClone.style.cssText = 'width: 100%; height: 100%; object-fit: cover; object-position: top center';
      bgLayer.appendChild(imgClone);
      newPage.appendChild(bgLayer);
    }

    const originalPc = page.querySelector('.pc');
    if (originalPc) {
      const textLayer = document.createElement('div');
      textLayer.className = 'layer-text';
      const pcClone = deepCloneWithStyles(originalPc, SCALE_FACTOR, HEIGHT_SCALE_DIVISOR);
      pcClone.querySelectorAll('img').forEach(img => img.style.display = 'none');
      pcClone.querySelectorAll('*').forEach(el => {
        el.style.filter = 'none';
        el.style.webkitFilter = 'none';
        el.style.opacity = '1';
        if (el.classList) {
          el.classList.remove('blurred', 'blur');
        }
      });
      textLayer.appendChild(pcClone);
      newPage.appendChild(textLayer);
    }

    viewerContainer.appendChild(newPage);
  });

  document.body.appendChild(viewerContainer);

  setTimeout(() => {
    window.print();
  }, 1000);
}