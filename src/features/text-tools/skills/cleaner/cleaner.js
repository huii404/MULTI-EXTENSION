// ============================================
// CLEANER SKILL MODULE
// ============================================

window.PAGES = window.PAGES || {};
window.SKILL_HTML = window.SKILL_HTML || {};

// Đảm bảo SKILL_HTML.cleaner tồn tại
if (!window.SKILL_HTML.cleaner) {
  window.SKILL_HTML.cleaner = `
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
  `;
}

console.log('[Cleaner] Module loaded');