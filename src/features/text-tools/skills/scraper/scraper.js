/**
 * SKILL: CÀO TEXT & BẰNG CHỨNG NGẦM (DEEP MULTI-PLATFORM CRAWLER & EVIDENCE VAULT)
 */

(function () {
  'use strict';

  const STORAGE_VAULT_KEY = 'scraper_evidence_vault';

  let currentVault = [];
  let isScrapingActive = false;
  let isScrapingPaused = false;

  // ===== 1. STORAGE HELPERS =====
  function loadVault(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_VAULT_KEY], (res) => {
        currentVault = res[STORAGE_VAULT_KEY] || [];
        if (callback) callback(currentVault);
      });
    } else {
      try {
        const local = localStorage.getItem(STORAGE_VAULT_KEY);
        currentVault = local ? JSON.parse(local) : [];
      } catch (e) {
        currentVault = [];
      }
      if (callback) callback(currentVault);
    }
  }

  function saveVault(vault, callback) {
    currentVault = vault;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_VAULT_KEY]: vault }, () => {
        if (callback) callback(vault);
      });
    } else {
      try {
        localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(vault));
      } catch (e) {}
      if (callback) callback(vault);
    }
  }

  function appendRecord(record, callback) {
    loadVault((vault) => {
      const exists = vault.some(r => r.url === record.url && r.snippet === record.snippet);
      if (!exists) {
        vault.unshift(record);
        saveVault(vault, callback);
      } else if (callback) {
        callback(vault);
      }
    });
  }

  // ===== 2. KEYWORD CONTEXT EXTRACTION =====
  function extractKeywordContext(fullText, keyword) {
    if (!fullText || !keyword) return null;
    const lowerText = fullText.toLowerCase();
    const lowerKey = keyword.toLowerCase().trim();
    const idx = lowerText.indexOf(lowerKey);

    if (idx === -1) return null;

    let start = Math.max(0, idx - 150);
    let end = Math.min(fullText.length, idx + keyword.length + 250);

    if (start > 0) {
      const prevDot = fullText.lastIndexOf('.', start);
      const prevNL = fullText.lastIndexOf('\n', start);
      const boundary = Math.max(prevDot, prevNL);
      if (boundary !== -1 && boundary > start - 80) {
        start = boundary + 1;
      }
    }

    if (end < fullText.length) {
      const nextDot = fullText.indexOf('.', end);
      const nextNL = fullText.indexOf('\n', end);
      let boundary = -1;
      if (nextDot !== -1 && nextNL !== -1) boundary = Math.min(nextDot, nextNL);
      else if (nextDot !== -1) boundary = nextDot;
      else if (nextNL !== -1) boundary = nextNL;

      if (boundary !== -1 && boundary < end + 80) {
        end = boundary + 1;
      }
    }

    let snippet = fullText.substring(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';

    return snippet;
  }

  // ===== 3. DEEP TARGET LINK RESOLVER =====
  function resolveDeepTargetUrl(linkUrl, callback) {
    if (!linkUrl.includes('google.com') && !linkUrl.includes('duckduckgo.com') && !linkUrl.includes('bing.com')) {
      callback(linkUrl);
      return;
    }

    fetch(linkUrl, { redirect: 'follow' })
      .then(res => {
        if (res.url && !res.url.includes('google.com') && !res.url.includes('duckduckgo.com') && !res.url.includes('bing.com')) {
          return callback(res.url);
        }
        return res.text();
      })
      .then(html => {
        if (typeof html === 'string') {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const meta = doc.querySelector('meta[http-equiv="refresh"]');
          if (meta) {
            const content = meta.getAttribute('content') || '';
            const match = content.match(/url=(.+)/i);
            if (match && match[1]) return callback(match[1].trim());
          }
          const a = doc.querySelector('a[href^="http"]');
          if (a && a.href && !a.href.includes('google.com') && !a.href.includes('bing.com')) {
            return callback(a.href);
          }
        }
        callback(linkUrl);
      })
      .catch(() => callback(linkUrl));
  }

  // ===== 4. DEEP PAGE SCRAPER ENGINE (VÀO SÂU TRANG WEB MỤC TIÊU) =====
  function fetchAndExtractDeepPage(targetUrl, keyword, pageTitleHint, callback) {
    resolveDeepTargetUrl(targetUrl, (realUrl) => {
      fetch(realUrl, { redirect: 'follow' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then(htmlText => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');

          // Remove noise tags
          const noise = doc.querySelectorAll('script, style, nav, header, footer, aside, iframe, noscript');
          noise.forEach(el => el.remove());

          const pageTitle = doc.title ? doc.title.trim() : (pageTitleHint || realUrl);

          // Search text nodes in content containers
          const contentContainers = doc.querySelectorAll('article, main, .content, #content, p, h1, h2, h3, h4, li, blockquote, section');
          let snippets = [];

          contentContainers.forEach(container => {
            const text = container.textContent || '';
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
              const context = extractKeywordContext(text, keyword);
              if (context && !snippets.includes(context) && context.length > 20) {
                snippets.push(context);
              }
            }
          });

          if (snippets.length === 0 && doc.body) {
            const bodyText = doc.body.textContent || '';
            const context = extractKeywordContext(bodyText, keyword);
            if (context) snippets.push(context);
          }

          if (snippets.length > 0) {
            const records = snippets.slice(0, 2).map(snippet => ({
              id: 'evd_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
              keyword: keyword,
              title: pageTitle,
              url: realUrl,
              timestamp: new Date().toLocaleString('vi-VN'),
              snippet: snippet
            }));
            callback({ success: true, records: records });
          } else {
            callback({ success: false, reason: 'Không tìm thấy ngữ cảnh từ khóa trong trang mục tiêu' });
          }
        })
        .catch(err => {
          callback({ success: false, reason: err.message });
        });
    });
  }

  // ===== 5. MULTI-PLATFORM AUTOMATED SEARCH ENGINE DISCOVERY (GOOGLE, BING, DUCKDUCKGO, WIKIPEDIA) =====
  function fetchMultiPlatformUrls(keyword, limit, callback) {
    const encodedKey = encodeURIComponent(keyword);
    let allTargetUrls = [];

    // Platform 1: Google News RSS
    const p1 = fetch(`https://news.google.com/rss/search?q=${encodedKey}&hl=vi&gl=VN&ceid=VN:vi`)
      .then(res => res.text())
      .then(xmlText => {
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        doc.querySelectorAll('item').forEach(item => {
          const link = item.querySelector('link')?.textContent || '';
          const title = item.querySelector('title')?.textContent || '';
          if (link) allTargetUrls.push({ title: title, url: link });
        });
      }).catch(() => {});

    // Platform 2: DuckDuckGo HTML Search
    const p2 = fetch(`https://html.duckduckgo.com/html/?q=${encodedKey}`)
      .then(res => res.text())
      .then(htmlText => {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        doc.querySelectorAll('.result__a').forEach(a => {
          let href = a.getAttribute('href') || '';
          if (href.includes('uddg=')) {
            const match = href.match(/uddg=([^&]+)/);
            if (match && match[1]) href = decodeURIComponent(match[1]);
          }
          if (href.startsWith('http') && !href.includes('duckduckgo.com')) {
            allTargetUrls.push({ title: a.textContent.trim() || href, url: href });
          }
        });
      }).catch(() => {});

    // Platform 3: Wikipedia Vietnamese Search API
    const p3 = fetch(`https://vi.wikipedia.org/w/api.php?action=opensearch&search=${encodedKey}&limit=5&format=json`)
      .then(res => res.json())
      .then(data => {
        if (data && data[1] && data[3]) {
          data[1].forEach((title, i) => {
            const link = data[3][i];
            if (link) allTargetUrls.push({ title: title, url: link });
          });
        }
      }).catch(() => {});

    // Platform 4: Bing Search HTML
    const p4 = fetch(`https://www.bing.com/search?q=${encodedKey}`)
      .then(res => res.text())
      .then(htmlText => {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        doc.querySelectorAll('h2 a').forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href.startsWith('http') && !href.includes('bing.com') && !href.includes('microsoft.com')) {
            allTargetUrls.push({ title: a.textContent.trim() || href, url: href });
          }
        });
      }).catch(() => {});

    Promise.allSettled([p1, p2, p3, p4]).then(() => {
      // Deduplicate URLs
      const uniqueMap = new Map();
      allTargetUrls.forEach(item => {
        if (item.url && !uniqueMap.has(item.url)) {
          uniqueMap.set(item.url, item);
        }
      });

      const uniqueResults = Array.from(uniqueMap.values()).slice(0, limit);
      if (uniqueResults.length > 0) {
        callback({ success: true, items: uniqueResults });
      } else {
        callback({ success: false, reason: 'Không tìm thấy kết quả từ các search engines' });
      }
    });
  }

  // ===== 6. EXPORT ENGINE (TXT, EXCEL, WORD) =====

  function exportToTxt(vault) {
    if (!vault || vault.length === 0) {
      if (typeof showToast === 'function') showToast('Kho dữ liệu trống!', 'warning');
      return;
    }

    let txt = `================================================================================\n`;
    txt += `📑 BÁO CÁO THU THẬP BẰNG CHỨNG & VĂN BẢN (TEXT EVIDENCE VAULT)\n`;
    txt += `• Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
    txt += `• Tổng số bản ghi bằng chứng: ${vault.length}\n`;
    txt += `================================================================================\n\n`;

    vault.forEach((rec, idx) => {
      txt += `================================================================================\n`;
      txt += `📌 BẰNG CHỨNG #${idx + 1} | Từ khóa: "${rec.keyword}"\n`;
      txt += `================================================================================\n`;
      txt += `• Tiêu đề trang: ${rec.title}\n`;
      txt += `• Nguồn URL: ${rec.url}\n`;
      txt += `• Thời gian cào: ${rec.timestamp}\n`;
      txt += `--------------------------------------------------------------------------------\n`;
      txt += `💬 NỘI DUNG VĂN BẢN TRÍCH XUẤT SÂU:\n`;
      txt += `${rec.snippet}\n`;
      txt += `================================================================================\n\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `BangChung_Text_${Date.now()}.txt`);
  }

  function exportToExcel(vault) {
    if (!vault || vault.length === 0) {
      if (typeof showToast === 'function') showToast('Kho dữ liệu trống!', 'warning');
      return;
    }

    let html = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>BangChung_Text</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  th { background-color: #10b981; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 10px; font-family: Arial, sans-serif; font-size: 11pt; }
  td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; font-family: Arial, sans-serif; font-size: 10pt; white-space: normal; word-wrap: break-word; mso-number-format: "\\@"; }
  .center { text-align: center; }
</style>
</head>
<body>
  <h2>📑 BÁO CÁO THU THẬP BẰNG CHỨNG & VĂN BẢN (EVIDENCE VAULT)</h2>
  <p><b>Thời gian xuất:</b> ${new Date().toLocaleString('vi-VN')} | <b>Tổng số bản ghi:</b> ${vault.length}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">STT</th>
        <th style="width: 140px;">Từ khóa</th>
        <th style="width: 250px;">Tiêu đề bài viết</th>
        <th style="width: 550px;">Nội dung văn bản trích xuất</th>
        <th style="width: 280px;">Nguồn URL</th>
        <th style="width: 160px;">Thời gian cào</th>
      </tr>
    </thead>
    <tbody>`;

    vault.forEach((rec, idx) => {
      html += `
      <tr>
        <td class="center">${idx + 1}</td>
        <td><b>${escapeHtml(rec.keyword)}</b></td>
        <td>${escapeHtml(rec.title)}</td>
        <td style="white-space: normal; word-wrap: break-word;">${escapeHtml(rec.snippet)}</td>
        <td><a href="${rec.url}" target="_blank">${escapeHtml(rec.url)}</a></td>
        <td class="center">${escapeHtml(rec.timestamp)}</td>
      </tr>`;
    });

    html += `
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    downloadBlob(blob, `BangChung_Excel_${Date.now()}.xls`);
  }

  function exportToWord(vault) {
    if (!vault || vault.length === 0) {
      if (typeof showToast === 'function') showToast('Kho dữ liệu trống!', 'warning');
      return;
    }

    let html = `\uFEFF<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Báo Cáo Bằng Chứng Văn Bản</title>
<style>
  body { font-family: 'Times New Roman', serif; line-height: 1.5; font-size: 12pt; color: #1e293b; margin: 30px; }
  h1 { color: #047857; text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; font-size: 18pt; }
  .summary-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 11pt; }
  .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 18px; background: #ffffff; page-break-inside: avoid; }
  .card-header { font-size: 13pt; font-weight: bold; color: #047857; margin-bottom: 6px; }
  .card-meta { font-size: 10pt; color: #64748b; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; }
  .card-content { font-size: 11.5pt; line-height: 1.6; background: #f8fafc; padding: 12px; border-left: 4px solid #10b981; border-radius: 4px; }
  .highlight { background-color: #fef08a; font-weight: bold; }
</style>
</head>
<body>
  <h1>📑 BÁO CÁO TỔNG HỢP BẰNG CHỨNG VĂN BẢN</h1>
  <div class="summary-box">
    <b>Thời gian lập báo cáo:</b> ${new Date().toLocaleString('vi-VN')}<br>
    <b>Tổng số bản ghi bằng chứng:</b> ${vault.length} bản ghi
  </div>`;

    vault.forEach((rec, idx) => {
      let highlightedSnippet = escapeHtml(rec.snippet);
      if (rec.keyword) {
        const reg = new RegExp(`(${escapeRegExp(rec.keyword)})`, 'gi');
        highlightedSnippet = highlightedSnippet.replace(reg, '<span class="highlight">$1</span>');
      }

      html += `
  <div class="card">
    <div class="card-header">📌 Bằng Chứng #${idx + 1} | Từ khóa: "${escapeHtml(rec.keyword)}"</div>
    <div class="card-meta">
      <b>Tiêu đề:</b> ${escapeHtml(rec.title)}<br>
      <b>Nguồn URL:</b> <a href="${rec.url}">${escapeHtml(rec.url)}</a> | <b>Thời gian:</b> ${escapeHtml(rec.timestamp)}
    </div>
    <div class="card-content">
      <b>Nội dung trích xuất:</b><br>
      ${highlightedSnippet}
    </div>
  </div>`;
    });

    html += `
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    downloadBlob(blob, `BangChung_Word_${Date.now()}.doc`);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, () => {
        if (typeof showToast === 'function') showToast(`Đã xuất file ${filename}! 🚀`, 'success');
      });
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (typeof showToast === 'function') showToast(`Đã tải xuống ${filename}! 🚀`, 'success');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ===== 7. UI RENDER & EVENT BINDINGS =====
  function renderVaultUI(vault) {
    const vaultCountEl = document.getElementById('scraper-vault-count');
    const listContainer = document.getElementById('scraper-evidence-list');

    if (vaultCountEl) vaultCountEl.textContent = vault.length;

    if (!listContainer) return;

    if (!vault || vault.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 11px;">
          💡 Nhập từ khóa và chọn chế độ cào ngầm để tự động đi vào cào sâu dữ liệu.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = vault.map(rec => {
      let highlightedSnippet = escapeHtml(rec.snippet);
      if (rec.keyword) {
        const reg = new RegExp(`(${escapeRegExp(rec.keyword)})`, 'gi');
        highlightedSnippet = highlightedSnippet.replace(reg, '<span class="evidence-highlight">$1</span>');
      }

      return `
        <div class="evidence-card" data-id="${rec.id}">
          <div class="evidence-card-header">
            <span class="evidence-card-title" title="${escapeHtml(rec.title)}">${escapeHtml(rec.title)}</span>
            <span class="evidence-keyword-badge">${escapeHtml(rec.keyword)}</span>
          </div>
          <div class="evidence-card-meta">
            <a href="${rec.url}" target="_blank" class="evidence-source-link" title="${rec.url}">🔗 ${escapeHtml(rec.url)}</a>
            <span>⏱️ ${escapeHtml(rec.timestamp)}</span>
          </div>
          <div class="evidence-card-snippet">
            ${highlightedSnippet}
          </div>
        </div>
      `;
    }).join('');
  }

  window.attachScraperEvents = function () {
    console.log('[Scraper] Initializing events');

    const modeSelect = document.getElementById('scraper-mode');
    const keywordInput = document.getElementById('scraper-keyword');
    const urlsGroup = document.getElementById('scraper-urls-group');
    const urlsInput = document.getElementById('scraper-urls-input');
    const limitGroup = document.getElementById('scraper-limit-group');
    const limitSelect = document.getElementById('scraper-limit');

    const startBtn = document.getElementById('scraper-start-btn');
    const pauseBtn = document.getElementById('scraper-pause-btn');
    const clearBtn = document.getElementById('scraper-clear-btn');

    const statusBar = document.getElementById('scraper-status-bar');
    const statusText = document.getElementById('scraper-status-text');
    const progressCount = document.getElementById('scraper-progress-count');
    const progressFill = document.getElementById('scraper-progress-fill');

    const exportTxtBtn = document.getElementById('scraper-export-txt-btn');
    const exportExcelBtn = document.getElementById('scraper-export-excel-btn');
    const exportWordBtn = document.getElementById('scraper-export-word-btn');

    loadVault((vault) => {
      renderVaultUI(vault);
    });

    if (modeSelect) {
      modeSelect.addEventListener('change', () => {
        const mode = modeSelect.value;
        if (urlsGroup) urlsGroup.style.display = (mode === 'batch-urls') ? 'block' : 'none';
        if (limitGroup) limitGroup.style.display = (mode === 'multi-platform') ? 'block' : 'none';
      });
    }

    if (startBtn && keywordInput) {
      startBtn.addEventListener('click', () => {
        const keyword = keywordInput.value.trim();
        if (!keyword) {
          if (typeof showToast === 'function') showToast('Vui lòng nhập từ khóa cần tìm!', 'warning');
          return;
        }

        const mode = modeSelect ? modeSelect.value : 'multi-platform';
        const limit = limitSelect ? parseInt(limitSelect.value, 10) : 10;

        if (mode === 'batch-urls' && (!urlsInput || !urlsInput.value.trim())) {
          if (typeof showToast === 'function') showToast('Vui lòng nhập danh sách URL!', 'warning');
          return;
        }

        isScrapingActive = true;
        isScrapingPaused = false;

        startBtn.style.opacity = '0.5';
        startBtn.style.pointerEvents = 'none';
        if (pauseBtn) {
          pauseBtn.style.opacity = '1';
          pauseBtn.style.pointerEvents = 'auto';
        }

        if (statusBar) statusBar.style.display = 'block';
        if (statusText) statusText.textContent = '⏳ Đang tự tìm kiếm trên Google, Bing, DuckDuckGo & Wikipedia...';

        if (mode === 'multi-platform') {
          fetchMultiPlatformUrls(keyword, limit, (res) => {
            if (!res.success || !res.items || res.items.length === 0) {
              if (statusText) statusText.textContent = '❌ Không tìm thấy trang web phù hợp';
              resetScrapeButtons();
              return;
            }

            executeUrlBatchScrape(res.items, keyword);
          });
        } else if (mode === 'batch-urls') {
          const rawUrls = urlsInput.value.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
          if (rawUrls.length === 0) {
            if (statusText) statusText.textContent = '❌ Không tìm thấy URL hợp lệ';
            resetScrapeButtons();
            return;
          }
          const items = rawUrls.map(url => ({ title: url, url: url }));
          executeUrlBatchScrape(items, keyword);
        } else if (mode === 'open-tabs') {
          if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
            chrome.tabs.query({ currentWindow: true }, (tabs) => {
              const items = tabs.filter(t => t.url && t.url.startsWith('http')).map(t => ({ title: t.title || t.url, url: t.url }));
              if (items.length === 0) {
                if (statusText) statusText.textContent = '❌ Không có tab phù hợp';
                resetScrapeButtons();
                return;
              }
              executeUrlBatchScrape(items, keyword);
            });
          }
        }
      });
    }

    function resetScrapeButtons() {
      isScrapingActive = false;
      if (startBtn) {
        startBtn.style.opacity = '1';
        startBtn.style.pointerEvents = 'auto';
      }
      if (pauseBtn) {
        pauseBtn.style.opacity = '0.5';
        pauseBtn.style.pointerEvents = 'none';
      }
    }

    function executeUrlBatchScrape(items, keyword) {
      let total = items.length;
      let completed = 0;
      let newFoundCount = 0;

      function updateProgress() {
        const percent = Math.round((completed / total) * 100);
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressCount) progressCount.textContent = `${completed}/${total}`;
        if (statusText) statusText.textContent = `⏳ Đang đi sâu vào cào trang mục tiêu... (${completed}/${total}) - Thu thập ${newFoundCount} bằng chứng`;
      }

      updateProgress();

      let index = 0;

      function processNext() {
        if (!isScrapingActive || index >= total) {
          if (statusText) statusText.textContent = `✅ Đã đi sâu cào hoàn tất! Thêm ${newFoundCount} bản ghi vào Vault.`;
          if (typeof showToast === 'function') showToast(`Đã cào đa nền tảng hoàn tất! Thêm ${newFoundCount} bằng chứng 🎉`, 'success');
          resetScrapeButtons();
          return;
        }

        if (isScrapingPaused) {
          setTimeout(processNext, 1000);
          return;
        }

        const item = items[index];
        index++;

        fetchAndExtractDeepPage(item.url, keyword, item.title, (res) => {
          completed++;
          if (res.success && res.records && res.records.length > 0) {
            res.records.forEach(rec => {
              newFoundCount++;
              appendRecord(rec, (updatedVault) => {
                renderVaultUI(updatedVault);
              });
            });
          }
          updateProgress();
          setTimeout(processNext, 800);
        });
      }

      processNext();
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        isScrapingPaused = !isScrapingPaused;
        pauseBtn.querySelector('span').textContent = isScrapingPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
        if (statusText) statusText.textContent = isScrapingPaused ? '⏸️ Đã tạm dừng cào sâu ngầm' : '⏳ Đang tiếp tục cào sâu...';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        saveVault([], (updatedVault) => {
          renderVaultUI(updatedVault);
          if (typeof showToast === 'function') showToast('Đã xóa kho dữ liệu bằng chứng!', 'success');
        });
      });
    }

    if (exportTxtBtn) exportTxtBtn.addEventListener('click', () => exportToTxt(currentVault));
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => exportToExcel(currentVault));
    if (exportWordBtn) exportWordBtn.addEventListener('click', () => exportToWord(currentVault));
  };
})();
