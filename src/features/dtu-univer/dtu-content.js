// DTU CONTENT SCRIPT - HANDLE Q53 & AUTO RATE

if (!window.dtuMasterInjected) {
  window.dtuMasterInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoRate' || request.action === 'AUTO_RATING_DTU') {
      try {
        const optionChar = request.optionChar || 'A';
        const finalText = request.text || 'Giảng viên dạy tốt';
        const cau53Val = request.cau53Value || '4'; // Mặc định chọn mức 4 (Hài lòng)

        // 1. Tick Radio chọn xếp loại (Câu 1 -> 48: R0A -> R47A)
        for (let i = 0; i <= 47; i++) {
          const radioId = `R${i}${optionChar}`;
          const radio = document.getElementById(radioId);
          if (radio) {
            radio.checked = true;
            radio.click();
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // 2. Điền Textarea nhận xét (Câu 49 -> 52: R48 -> R51)
        for (let j = 48; j <= 51; j++) {
          const textareaId = `R${j}`;
          const textarea = document.getElementById(textareaId);
          if (textarea) {
            textarea.value = finalText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // 3. XỬ LÝ CÂU 53 (Mức độ hài lòng: 1 -> 5)
        const possible53Ids = [
          `R52${cau53Val}`, 
          `R53${cau53Val}`, 
          `R52${getOptionLetter(cau53Val)}`, 
          `R53${getOptionLetter(cau53Val)}`
        ];
        let q53Handled = false;

        for (const id of possible53Ids) {
          const r = document.getElementById(id);
          if (r) {
            r.checked = true;
            r.click();
            r.dispatchEvent(new Event('change', { bubbles: true }));
            q53Handled = true;
            break;
          }
        }

        // Fallback chọn radio câu 53 nếu ID thay đổi
        if (!q53Handled) {
          const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
          const q53Radios = allRadios.filter(r => !r.id || (!r.id.match(/^R([0-3]?[0-9]|4[0-7])[A-Z0-9]/)));
          const targetIndex = parseInt(cau53Val, 10) - 1;
          if (q53Radios[targetIndex]) {
            q53Radios[targetIndex].checked = true;
            q53Radios[targetIndex].click();
            q53Radios[targetIndex].dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // 4. Cuộn mượt xuống ngay ô CAPTCHA
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });

        sendResponse({ success: true });
      } catch (error) {
        console.error('Lỗi khi thực hiện autoRate:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    if (request.action === 'EXPORT_DTU_SMART_SCHEDULE') {
      try {
        handleDTUScheduleProcess(request.rangeMode, request.formatType);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (request.action === 'START_DTU_AUTO_REGISTER') {
      try {
        startDTUCourseRegistration(request);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (request.action === 'STOP_DTU_AUTO_REGISTER') {
      stopDTUCourseRegistration();
      sendResponse({ success: true });
      return true;
    }
  });
}

function getOptionLetter(val) {
  const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
  return map[val] || 'D';
}

// LOGIC XUẤT LỊCH HỌC
async function handleDTUScheduleProcess(rangeMode, formatType) {
  // 1. Tự động click vào các nút Ngày/Tuần/Tháng tương ứng trên MyDTU
  const textsToFind = {
    'MONTH': ['Tháng', 'Month'],
    'WEEK': ['Tuần', 'Week'],
    'SEMESTER': ['Học kỳ', 'Semester', 'Năm học']
  }[rangeMode] || [];

  if (textsToFind.length > 0) {
    let clicked = false;
    const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .btn, .nav-link');
    for (const btn of buttons) {
      const text = (btn.innerText || btn.value || '').trim();
      if (textsToFind.some(t => text.toLowerCase() === t.toLowerCase())) {
        btn.click();
        clicked = true;
        break;
      }
    }
  }

  // 2. Tiến hành cào dữ liệu (Polling để chờ bảng load xong)
  let courses = [];
  for (let i = 0; i < 10; i++) {
    courses = parseExactCourseBlocks();
    if (courses && courses.length > 0) {
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (!courses || courses.length === 0) {
    alert('⚠️ Không tìm thấy môn học nào trên màn hình! Có thể tuần này/tháng này bạn không có lịch.');
    return;
  }

  if (formatType === 'CSV') {
    exportExactCSV(courses, rangeMode);
  } else if (formatType === 'ICS') {
    exportExactICS(courses, rangeMode);
  }
}

function getDisplayedMonthAndYear() {
  const pageText = document.body.innerText || '';
  const now = new Date();
  let month = now.getMonth() + 1; // 1-12
  let year = now.getFullYear();   // VD: 2026

  // Quét tìm "Tháng M/YYYY" hoặc "Tháng M" trên DOM MyDTU
  const matchMonthYear = pageText.match(/Tháng\s*(\d{1,2})[\s\/,\-]+(\d{4})/i) || pageText.match(/(\d{1,2})\/(\d{4})/);
  if (matchMonthYear) {
    month = parseInt(matchMonthYear[1], 10);
    year = parseInt(matchMonthYear[2], 10);
  } else {
    const matchMonthOnly = pageText.match(/Tháng\s*(\d{1,2})/i);
    if (matchMonthOnly) {
      month = parseInt(matchMonthOnly[1], 10);
    }
  }

  return { month, year };
}

function parseExactCourseBlocks() {
  const courseList = [];
  const allDivs = document.querySelectorAll('.table-responsive td, .calendar td, #tb_LichHoc td, table td, div.course-item');
  const elementsToScan = allDivs.length > 0 ? allDivs : document.querySelectorAll('div, td');

  const { month: baseMonth, year: baseYear } = getDisplayedMonthAndYear();

  // Biến theo dõi sự chuyển tháng khi quét qua các ô lịch trong bảng
  let currentMonth = baseMonth;
  let currentYear = baseYear;
  let lastDayNum = 0;

  elementsToScan.forEach((el) => {
    // Bỏ qua cột 0 (cột chứa nhãn Thời gian/Ca học) để tránh cào nhầm rác thành "Không rõ ngày"
    if (el.cellIndex === 0) return;

    const rawText = el.innerText || '';
    if (!rawText.includes('|')) return;
    if (el.closest('nav') || el.closest('.menu') || el.closest('header')) return;

    // 1. Trích xuất số Ngày của ô lịch (VD: 11, 14, 18, 21, 25, 28, 04)
    let dayNum = 0;
    const parentTd = el.closest('td') || el;
    const parentText = (parentTd.innerText || '').trim();

    const dateNumMatch = parentText.match(/^(\d{1,2})\b/) || parentText.match(/\b(\d{1,2})\s+[A-Z]{2,4}\s+\d{3}/i);
    if (dateNumMatch) {
      dayNum = parseInt(dateNumMatch[1], 10);
    }

    // 2. Tự động tính toán Chuyển Tháng (Ví dụ từ Ngày 28, 29, 30, 31 nhảy sang Ngày 01, 02, 03, 04 tháng sau)
    let cellMonth = currentMonth;
    let cellYear = currentYear;

    if (dayNum > 0) {
      // Nếu số ngày đột ngột giảm mạnh (VD: từ ngày >20 xuống ngày <10), chứng tỏ đã sang Tháng Sau!
      if (lastDayNum > 20 && dayNum < 10) {
        currentMonth = currentMonth % 12 + 1;
        if (currentMonth === 1) currentYear++;
        cellMonth = currentMonth;
        cellYear = currentYear;
      }
      lastDayNum = dayNum;
    }

    const ddStr = dayNum > 0 ? dayNum.toString().padStart(2, '0') : '';
    const mmStr = cellMonth.toString().padStart(2, '0');
    
    // Định dạng Ngày/Tháng (VD: "11/08", "04/09")
    const dateFormatted = ddStr ? `${ddStr}/${mmStr}` : '';
    const isoDateStr = ddStr ? `${cellYear}-${mmStr}-${ddStr}` : '';

    // 3. Tách dòng văn bản và các khối môn học dính liền
    const rawBlocks = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const subBlocks = [];

    rawBlocks.forEach(b => {
      const splitByCourse = b.split(/(?=\b\d{1,2}\s+[A-Z]{2,4}\s+\d{3})/gi).map(s => s.trim()).filter(Boolean);
      subBlocks.push(...splitByCourse);
    });

    subBlocks.forEach((blockText) => {
      if (!blockText.includes('|')) return;

      const cleanRaw = blockText.replace(/\s+/g, ' ').trim();
      const parts = cleanRaw.split('|').map(p => p.trim()).filter(Boolean);

      if (parts.length >= 2) {
        let dayStr = 'Không rõ ngày';
        let code = parts[0];

        // Lấy thứ trong tuần (Thứ 2 - Chủ Nhật) từ cellIndex
        const cellIdx = parentTd.cellIndex !== undefined ? parentTd.cellIndex : el.cellIndex;
        if (cellIdx !== undefined) {
          const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
          if (cellIdx >= 1 && cellIdx <= 7) {
            dayStr = days[cellIdx - 1];
          }
        }

        // Lấy thời gian sạch dạng HH:MM-HH:MM
        let timeStr = 'Theo lịch';
        const rawTimeSegment = parts.find(p => p.includes(':')) || '';
        const timeMatch = rawTimeSegment.match(/(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
        if (timeMatch) {
          timeStr = timeMatch[1].replace(/\s+/g, '');
        }

        // Lấy địa điểm phòng học
        const locStr = parts.find(p => p.includes('P.') || p.includes('Phòng') || p.includes('Online')) || 'MyDTU';

        // Lấy tên môn
        let subjectName = code;
        const datePrefixMatch = code.match(/^(\d{1,2})\s*([A-Z].*)/);
        if (datePrefixMatch) {
          subjectName = datePrefixMatch[2].trim();
        }

        if (parts[1] && parts[1] !== rawTimeSegment && parts[1] !== locStr) {
          subjectName += ' - ' + parts[1];
        }

        // Đòn bẩy chống trùng lặp theo Khóa unique
        const uniqueKey = `${subjectName}_${isoDateStr || cleanRaw}_${timeStr}_${locStr}`;

        if (!courseList.some((c) => c.key === uniqueKey)) {
          courseList.push({
            key: uniqueKey,
            rawText: cleanRaw,
            subject: subjectName,
            location: locStr,
            time: timeStr,
            day: dayStr,
            dateObj: dateFormatted || 'Theo lịch',
            isoDate: isoDateStr || '9999-99-99'
          });
        }
      }
    });
  });

  return courseList;
}

function exportExactCSV(courses, rangeMode) {
  let html = '';

  // NẾU LÀ LỊCH THÁNG (MONTH) -> XUẤT THEO DẠNG DANH SÁCH MÔN HỌC & CÁC LẦN HỌC
  if (rangeMode === 'MONTH') {
    // 1. Gom nhóm danh sách theo Môn Học [Mã môn][Tên môn]
    const subjectMap = new Map();
    courses.forEach(c => {
      const key = c.subject;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, []);
      }
      subjectMap.get(key).push(c);
    });

    html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 13pt; margin: 20px; }
    .title { font-size: 16pt; font-weight: bold; color: #1a5276; margin-bottom: 15px; text-align: center; }
    table { font-family: "Segoe UI", Tahoma, Arial, sans-serif; border-collapse: collapse; width: 100%; margin-bottom: 25px; }
    th { background-color: #2980b9; color: #ffffff; font-weight: bold; border: 1px solid #1f618d; text-align: center; vertical-align: middle; padding: 10px; font-size: 11pt; }
    td { border: 1px solid #bdc3c7; padding: 8px 12px; vertical-align: middle; font-size: 11pt; text-align: left; }
    .subject-title { font-weight: bold; color: #1e88e5; font-size: 12pt; }
    .session-num { font-weight: bold; color: #e65100; text-align: center; }
    .date-val { font-weight: bold; color: #c0392b; }
    .time-val { color: #27ae60; font-weight: bold; }
    .location-val { color: #8e44ad; font-style: italic; }
  </style>
</head>
<body>
  <div class="title">📅 THỜI KHÓA BIỂU THEO MÔN HỌC (LỊCH THÁNG)</div>

  <!-- BẢNG CHI TIẾT CÁC BUỔI HỌC THEO MÔN -->
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">STT</th>
        <th style="width: 260px;">Môn Học [Mã Môn][Tên Môn]</th>
        <th style="width: 90px;">Buổi Học</th>
        <th style="width: 250px;">Thứ -- Ngày/Tháng -- Giờ</th>
        <th style="width: 180px;">Địa Điểm / Phòng</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from(subjectMap.entries()).map(([subjectName, sessionList], sIdx) => {
        // Sắp xếp các buổi học chuẩn theo Thời gian ISO (Ngày 11/08 -> 28/08 -> 04/09...)
        sessionList.sort((a, b) => {
          if (a.isoDate && b.isoDate) {
            return a.isoDate.localeCompare(b.isoDate);
          }
          return 0;
        });

        return sessionList.map((sess, sessIdx) => {
          return `
            <tr>
              ${sessIdx === 0 ? `<td rowspan="${sessionList.length}" style="text-align:center; font-weight:bold; background:#fafafa;">${sIdx + 1}</td>` : ''}
              ${sessIdx === 0 ? `<td rowspan="${sessionList.length}" class="subject-title" style="background:#fafafa;">${subjectName.replace(/</g, '&lt;')}</td>` : ''}
              <td class="session-num">Lần ${sessIdx + 1}</td>
              <td style="text-align:center;"><span style="color:#2980b9; font-weight:bold;">${sess.day}</span> &nbsp;--&nbsp; <span class="date-val">${sess.dateObj || 'Theo lịch'}</span> &nbsp;--&nbsp; <span class="time-val">${sess.time}</span></td>
              <td class="location-val">${sess.location}</td>
            </tr>
          `;
        }).join('');
      }).join('')}
    </tbody>
  </table>
</body>
</html>`;

  } else {
    // NẾU LÀ LỊCH TUẦN (WEEK) -> GIỮ NGUYÊN BỐ CỤC BẢNG 2D GRID (GIỜ \ NGÀY)
    const xSet = new Set();
    const ySet = new Set();
    
    courses.forEach(c => {
      xSet.add(c.day);
      ySet.add(c.time);
    });

    const times = Array.from(ySet).sort();
    const daysOrder = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const days = Array.from(xSet).sort((a, b) => {
      const ia = daysOrder.indexOf(a);
      const ib = daysOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.localeCompare(b);
    });

    html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    table { font-family: "Times New Roman", serif; font-size: 13pt; border-collapse: collapse; }
    th { background-color: #d9ead3; font-weight: bold; border: 1px solid #000; text-align: center; vertical-align: middle; padding: 10px; }
    td { border: 1px solid #000; padding: 8px; vertical-align: top; width: 180px; text-align: left; }
    .date-tag { color: #e65100; font-weight: bold; font-size: 11pt; }
    .subject { font-weight: bold; color: #1e88e5; }
    .location { color: #d32f2f; font-style: italic; }
    .time { color: #4CAF50; font-weight: bold; }
  </style>
</head>
<body>
  <table>
    <tr>
      <th>Giờ \\ Ngày</th>
      ${days.map(d => `<th>${d}</th>`).join('')}
    </tr>`;

    times.forEach(t => {
      html += `<tr><th>${t}</th>`;
      days.forEach(d => {
        const cellCourses = courses.filter(c => c.time === t && c.day === d);
        if (cellCourses.length > 0) {
          const cellHtml = cellCourses.map(c => {
            let block = '';
            if (c.dateObj) block += `<span class="date-tag">[${c.dateObj}]</span> `;
            block += `<span class="subject">${c.subject.replace(/</g, '&lt;')}</span><br>
                      <span class="location">${c.location.replace(/</g, '&lt;')}</span><br>
                      <span class="time">${c.time.replace(/</g, '&lt;')}</span>`;
            return block;
          }).join('<br><hr><br>');
          html += `<td>${cellHtml}</td>`;
        } else {
          html += `<td></td>`;
        }
      });
      html += `</tr>`;
    });

    html += `
  </table>
</body>
</html>`;
  }

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LichHoc_DTU_${rangeMode}_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportExactICS(courses, rangeMode) {
  let ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DTU//Timetable//VN', 'METHOD:PUBLISH'];
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  courses.forEach((item, idx) => {
    ics.push('BEGIN:VEVENT');
    ics.push(`UID:dtu-course-${idx}-${Date.now()}@mydtu`);
    ics.push(`SUMMARY:[DTU] ${item.subject}`);
    ics.push(`LOCATION:${item.location}`);
    ics.push(`DESCRIPTION:${item.time}`);
    ics.push(`DTSTART:${now}`);
    ics.push(`DTEND:${now}`);
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LichHoc_DTU_${rangeMode}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =========================================================================
 * MODULE SKILL: TỰ ĐỘNG ĐĂNG KÝ MÔN HỌC MYDTU (STEP BY STEP)
 * =========================================================================
 * Module này cung cấp giải pháp tự động hóa điền mã lớp, tìm môn, tích chọn
 * và kích hoạt nút đăng ký môn học trên MyDTU.
 * Toàn bộ quy trình được chia thành 8 BƯỚC rõ ràng với comment chi tiết.
 * =========================================================================
 */

// Đặt trạng thái toàn cục cho tiến trình đăng ký
if (!window.dtuRegisterState) {
  window.dtuRegisterState = {
    isRunning: false,
    retryCount: 0,
    timerId: null
  };
}

/**
 * Gửi nhật ký (Log) phản hồi về Popup Extension UI
 */
function sendDTURegisterLog(message, isFinished = false) {
  console.log(`[DTU Auto Register] ${message}`);
  try {
    chrome.runtime.sendMessage({
      action: 'DTU_REGISTER_LOG',
      message: message,
      isFinished: isFinished
    });
  } catch (e) {
    // Không bắn exception nếu Popup đang đóng
  }
}

/**
 * Bắt đầu tiến trình Đăng ký môn học MyDTU
 */
function startDTUCourseRegistration(params) {
  if (window.dtuRegisterState.isRunning) {
    sendDTURegisterLog('⚠️ Tiến trình đăng ký đang chạy!');
    return;
  }

  window.dtuRegisterState.isRunning = true;
  window.dtuRegisterState.retryCount = 0;

  sendDTURegisterLog('🚀 Khởi chạy module Tự động Đăng ký môn học DTU...');
  runDTURegistrationLoop(params);
}

/**
 * Dừng tiến trình Đăng ký môn học MyDTU
 */
function stopDTUCourseRegistration() {
  window.dtuRegisterState.isRunning = false;
  if (window.dtuRegisterState.timerId) {
    clearTimeout(window.dtuRegisterState.timerId);
    window.dtuRegisterState.timerId = null;
  }
  sendDTURegisterLog('⏹️ Đã dừng tiến trình đăng ký môn học.', true);
}

/**
 * Vòng lặp đăng ký môn (Hỗ trợ săn môn & thử lại tự động khi hệ thống quá tải)
 */
async function runDTURegistrationLoop(params) {
  if (!window.dtuRegisterState.isRunning) return;

  const maxRetry = params.maxRetry || 30;
  const delayMs = params.delayMs || 1000;
  const registerMode = params.registerMode || 'DIRECT_API';

  window.dtuRegisterState.retryCount++;
  sendDTURegisterLog(`🔄 Lần thử ${window.dtuRegisterState.retryCount}/${maxRetry} [Chế độ: ${registerMode}]...`);

  let isCompleted = false;

  // Nếu chọn chế độ Direct Network API (Bypass UI - Chống sập UI khi quá tải)
  if (registerMode === 'DIRECT_API') {
    isCompleted = await executeDTUDirectAPIRegistration(params);
  } else {
    // Chế độ Hybrid: Thử Direct API trước, nếu cần fallback DOM Automation
    isCompleted = await executeDTUDirectAPIRegistration(params);
    if (!isCompleted) {
      isCompleted = executeDTUCourseRegistrationStepByStep(params);
    }
  }

  if (isCompleted) {
    sendDTURegisterLog('🎉 Đã hoàn tất xử lý danh sách môn học!', true);
    window.dtuRegisterState.isRunning = false;
    return;
  }

  // Kiểm tra điều kiện thử lại
  if (window.dtuRegisterState.retryCount >= maxRetry) {
    sendDTURegisterLog(`⚠️ Đã đạt số lần thử lại tối đa (${maxRetry} lần). Tự động dừng.`, true);
    window.dtuRegisterState.isRunning = false;
    return;
  }

  // Đặt lịch cho lần thử lại tiếp theo
  window.dtuRegisterState.timerId = setTimeout(() => {
    runDTURegistrationLoop(params);
  }, delayMs);
}

/**
 * =========================================================================
 * CHI TIẾT CƠ CHẾ DIRECT NETWORK API ENGINE (BYPASS UI - TẦNG MẠNG HTTP)
 * =========================================================================
 * BƯỚC 1: Trích xuất Session Cookies & ASP.NET Tokens (__VIEWSTATE, __EVENTVALIDATION)
 * BƯỚC 2: Đóng gói HTTP Payload dạng URLSearchParams trực tiếp
 * BƯỚC 3: Gửi Direct fetch() POST đến Server MyDTU (Bypass hoàn toàn giao diện)
 * BƯỚC 4: Tự động Retry ngay lập tức khi Server bị quá tải (HTTP 500/502/503/504)
 * =========================================================================
 */
async function executeDTUDirectAPIRegistration(params) {
  const courseList = params.courseList || [];
  sendDTURegisterLog('⚡ [Direct API] BƯỚC 1: Trích xuất ASP.NET State Tokens từ kết nối...');

  // 1. Trích xuất hidden tokens của ASP.NET WebForms từ DOM hiện tại
  const viewState = document.getElementById('__VIEWSTATE')?.value || '';
  const viewStateGen = document.getElementById('__VIEWSTATEGENERATOR')?.value || '';
  const eventValidation = document.getElementById('__EVENTVALIDATION')?.value || '';
  const captchaInput = document.querySelector('input[id*="txtCaptcha"], input[name*="captcha" i]')?.value || '';

  // 2. Đóng gói tham số POST
  const bodyParams = new URLSearchParams();
  if (viewState) bodyParams.append('__VIEWSTATE', viewState);
  if (viewStateGen) bodyParams.append('__VIEWSTATEGENERATOR', viewStateGen);
  if (eventValidation) bodyParams.append('__EVENTVALIDATION', eventValidation);
  if (captchaInput) bodyParams.append('txtCaptcha', captchaInput);

  // Thêm thông tin mã môn / mã lớp
  courseList.forEach((code, idx) => {
    bodyParams.append(`course_${idx}`, code);
  });

  // Tự động quét và đưa tất cả các checkbox lớp đã được tick trên DOM vào payload
  document.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked').forEach(chk => {
    if (chk.name) {
      bodyParams.append(chk.name, chk.value || 'on');
    }
  });

  sendDTURegisterLog('⚡ [Direct API] BƯỚC 2: Đóng gói HTTP POST Payload trực tiếp...');

  try {
    sendDTURegisterLog('⚡ [Direct API] BƯỚC 3: Gửi HTTP POST Request trực tiếp tới MyDTU Server (Bypass UI)...');
    
    // Gửi Direct HTTP POST Request qua fetch API (Bypass UI rendering)
    const targetUrl = window.location.href;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: bodyParams.toString()
    });

    // 3. Xử lý lỗi quá tải máy chủ (HTTP 500, 502, 503, 504)
    if (!response.ok) {
      sendDTURegisterLog(`⚠️ [Direct API] Server quá tải (HTTP ${response.status} ${response.statusText}). Tự động gửi lại Payload trực tiếp...`);
      return false; // Tiếp tục vòng lặp retry
    }

    // 4. Phân tích kết quả phản hồi từ HTML text trả về
    const resText = await response.text();
    sendDTURegisterLog('⚡ [Direct API] BƯỚC 4: Nhận phản hồi HTTP 200 OK từ Server. Đang phân tích kết quả...');

    if (resText.includes('Đăng ký thành công') || resText.includes('Đã lưu dữ liệu thành công')) {
      sendDTURegisterLog('🎉 [Direct API] Thông báo từ Server: ĐĂNG KÝ MÔN HỌC THÀNH CÔNG!');
      return true;
    }

    if (resText.includes('Không còn chỗ') || resText.includes('Lớp đã đầy')) {
      sendDTURegisterLog('⚠️ [Direct API] Server báo: Lớp đã đầy hoặc hết slot. Đang săn tiếp...');
    }

    return false;

  } catch (err) {
    sendDTURegisterLog(`❌ [Direct API] Lỗi kết nối mạng: ${err.message}. Tự động thử lại...`);
    return false;
  }
}

/**
 * =========================================================================
 * CHI TIẾT CÁC BƯỚC THỰC THI THỦ CÔNG (STEP-BY-STEP DOM AUTOMATION)
 * =========================================================================
 */
function executeDTUCourseRegistrationStepByStep(params) {
  const courseList = params.courseList || [];
  const autoFocusCaptcha = params.autoFocusCaptcha !== false;
  const autoCheckAll = params.autoCheckAll !== false;

  // -------------------------------------------------------------------------
  // BƯỚC 1: KIỂM TRA ĐIỀU KIỆN TRANG WEB MYDTU
  // -------------------------------------------------------------------------
  // Đảm bảo tiện ích đang ở đúng trang thông tin MyDTU của Đại học Duy Tân
  const currentUrl = window.location.href;
  sendDTURegisterLog('📌 BƯỚC 1: Kiểm tra trang MyDTU hiện tại...');

  if (!currentUrl.includes('mydtu.duytan.edu.vn')) {
    sendDTURegisterLog('❌ Trang web hiện tại không phải MyDTU!');
    return true; // Dừng lại vì không đúng trang
  }

  // -------------------------------------------------------------------------
  // BƯỚC 2: TÌM KÍẾM CÁC Ô NHẬP MÃ MÔN HỌC / MÃ LỚP (SEARCH INPUTS)
  // -------------------------------------------------------------------------
  // Sử dụng danh sách các Fallback Selectors để khớp với cấu trúc DOM của MyDTU
  sendDTURegisterLog('📌 BƯỚC 2: Quét ô nhập mã môn / mã lớp trên giao diện...');

  const searchInputSelectors = [
    'input[id*="txtMaMon"]',
    'input[id*="txtSubjectCode"]',
    'input[id*="txtMaLop"]',
    'input[name*="SearchText"]',
    'input[id*="txtSearch"]',
    'input[placeholder*="mã môn" i]',
    'input[placeholder*="mã lớp" i]',
    '.form-control[type="text"]'
  ];

  let searchInput = null;
  for (const selector of searchInputSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      searchInput = el;
      break;
    }
  }

  // -------------------------------------------------------------------------
  // BƯỚC 3: TỰ ĐỘNG ĐIỀN MÃ MÔN VÀO Ô NHẬP LIỆU
  // -------------------------------------------------------------------------
  if (searchInput && courseList.length > 0) {
    // Lấy mã môn đầu tiên trong danh sách để tìm kiếm
    const targetCourse = courseList[0];
    sendDTURegisterLog(`📌 BƯỚC 3: Điền mã môn "${targetCourse}" vào ô tìm kiếm...`);
    
    searchInput.value = targetCourse;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  } else {
    sendDTURegisterLog('ℹ️ Không tìm thấy ô nhập mã riêng lẻ, tiến hành quét trực tiếp bảng lớp học phần...');
  }

  // -------------------------------------------------------------------------
  // BƯỚC 4: KÍCH HOẠT NÚT TÌM KIẾM / TRA CỨU MÔN HỌC
  // -------------------------------------------------------------------------
  sendDTURegisterLog('📌 BƯỚC 4: Tìm nút Tra cứu / Tìm kiếm...');

  const searchButtonSelectors = [
    'button[id*="btnSearch"]',
    'input[id*="btnSearch"]',
    'button[id*="btnTimKiem"]',
    'input[id*="btnTimKiem"]',
    'input[value*="Tìm"]',
    'input[value*="Tra cứu"]'
  ];

  for (const selector of searchButtonSelectors) {
    const btn = document.querySelector(selector);
    if (btn) {
      sendDTURegisterLog('👉 Click nút Tìm kiếm!');
      btn.click();
      break;
    }
  }

  // -------------------------------------------------------------------------
  // BƯỚC 5: TỰ ĐỘNG QUÉT VÀ TICK CHỌN CHECKBOX ĐĂNG KÝ CHO CÁC LỚP KHỚP MÃ
  // -------------------------------------------------------------------------
  sendDTURegisterLog('📌 BƯỚC 5: Quét danh sách các hàng (Rows) trong bảng môn học...');

  let checkedCount = 0;
  // Lấy tất cả các hàng trong bảng danh sách lớp
  const rows = document.querySelectorAll('table tr, .grid-row, .table-responsive tr');

  rows.forEach((row) => {
    const rowText = (row.innerText || '').toUpperCase();
    
    // Kiểm tra xem dòng này có chứa bất kỳ mã môn/lớp nào trong danh sách cần đăng ký hay không
    const isMatched = courseList.some(code => rowText.includes(code.toUpperCase()));

    if (isMatched || autoCheckAll) {
      // Tìm checkbox/radio chọn đăng ký trong dòng này
      const checkEl = row.querySelector('input[type="checkbox"], input[type="radio"]');
      if (checkEl && !checkEl.checked && !checkEl.disabled) {
        checkEl.checked = true;
        checkEl.click();
        checkEl.dispatchEvent(new Event('change', { bubbles: true }));
        checkedCount++;
        sendDTURegisterLog(`✅ Đã tích chọn lớp: ${rowText.slice(0, 40)}...`);
      }
    }
  });

  if (checkedCount > 0) {
    sendDTURegisterLog(`🎯 Đã tự động tích chọn thành công ${checkedCount} lớp môn học!`);
  }

  // -------------------------------------------------------------------------
  // BƯỚC 6: KÍCH HOẠT NÚT ĐĂNG KÝ / LƯU KẾT QUẢ ĐĂNG KÝ
  // -------------------------------------------------------------------------
  sendDTURegisterLog('📌 BƯỚC 6: Tìm nút "Đăng ký môn" / "Lưu kết quả"...');

  const submitButtonSelectors = [
    'input[id*="btnDangKy"]',
    'button[id*="btnDangKy"]',
    'input[id*="btnSave"]',
    'button[id*="btnSave"]',
    'input[value*="Đăng ký"]',
    'button:contains("Đăng ký")',
    'input[type="submit"][value*="Lưu"]'
  ];

  let submitClicked = false;
  for (const selector of submitButtonSelectors) {
    const btn = document.querySelector(selector);
    if (btn && !btn.disabled) {
      sendDTURegisterLog('🚀 Kích hoạt nút Lưu / Đăng ký môn học!');
      btn.click();
      submitClicked = true;
      break;
    }
  }

  // -------------------------------------------------------------------------
  // BƯỚC 7: XỬ LÝ CAPTCHA & CUỘN MƯỢT XUỐNG VỊ TRÍ XÁC NHẬN
  // -------------------------------------------------------------------------
  if (autoFocusCaptcha) {
    sendDTURegisterLog('📌 BƯỚC 7: Tự động phát hiện và Focus ô Captcha...');

    const captchaInputSelectors = [
      'input[id*="txtCaptcha"]',
      'input[id*="Captcha"]',
      'input[name*="captcha" i]',
      'input[placeholder*="captcha" i]'
    ];

    let captchaEl = null;
    for (const selector of captchaInputSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        captchaEl = el;
        break;
      }
    }

    if (captchaEl) {
      // Cuộn mượt đến vị trí ô Captcha
      captchaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      captchaEl.focus();
      // Thêm viền nổi bật để người dùng dễ nhận biết ô nhập Captcha
      captchaEl.style.border = '2px solid #e74c3c';
      captchaEl.style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.5)';
      sendDTURegisterLog('🎯 Đã focus vào ô Captcha! Vui lòng gõ Captcha và bấm Enter để hoàn tất.');
    } else {
      // Nếu không tìm thấy ô Captcha riêng, cuộn xuống cuối trang
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }

  // -------------------------------------------------------------------------
  // BƯỚC 8: ĐÁNH GIÁ KẾT QUẢ VÀ QUYẾT ĐỊNH KẾT THÚC HOẶC LẶP LẠI
  // -------------------------------------------------------------------------
  sendDTURegisterLog('📌 BƯỚC 8: Kiểm tra thông báo kết quả đăng ký từ MyDTU...');

  // Quét các thông báo thành công hoặc lỗi trên trang
  const pageText = document.body.innerText || '';
  if (pageText.includes('Đăng ký thành công') || pageText.includes('Đã lưu dữ liệu thành công')) {
    sendDTURegisterLog('🎉 Thông báo MyDTU: ĐĂNG KÝ MÔN HỌC THÀNH CÔNG!');
    return true; // Kết thúc vòng lặp thành công
  }

  if (submitClicked) {
    sendDTURegisterLog('⌛ Đã kích hoạt Đăng ký, chờ phản hồi hệ thống...');
  }

  // Trả về false để tiếp tục thử lại nếu chưa nhận được phản hồi thành công chính thức
  return false;
}