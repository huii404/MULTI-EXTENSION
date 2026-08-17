// DTU SCHEDULE CONTENT SCRIPT - ROBUST TIMETABLE PARSER & EXPORTER
// Module cào dữ liệu lịch học Tuần / Tháng MyDTU chuẩn xác và xuất file Excel (.xls), .ics, .pdf

(function() {
  window.handleDTUScheduleProcess = async function(rangeMode, formatType) {
    // 1. Tự động click vào các nút Ngày/Tuần/Tháng tương ứng trên MyDTU
    const textsToFind = {
      'MONTH': ['Tháng', 'Month'],
      'WEEK': ['Tuần', 'Week'],
      'SEMESTER': ['Học kỳ', 'Semester', 'Năm học']
    }[rangeMode] || [];

    if (textsToFind.length > 0) {
      const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], .btn, .nav-link');
      for (const btn of buttons) {
        const text = (btn.innerText || btn.value || '').trim();
        if (textsToFind.some(t => text.toLowerCase() === t.toLowerCase())) {
          btn.click();
          break;
        }
      }
    }

    // 2. Tiến hành cào dữ liệu (Polling để chờ bảng load xong)
    let courses = [];
    for (let i = 0; i < 10; i++) {
      courses = parseExactCourseBlocks(rangeMode);
      if (courses && courses.length > 0) {
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!courses || courses.length === 0) {
      alert('⚠️ Không tìm thấy môn học nào trên màn hình! Có thể tuần này/tháng này bạn không có lịch.');
      return { success: false, error: 'Không tìm thấy môn học' };
    }

    if (formatType === 'CSV') {
      exportExactCSV(courses, rangeMode);
    } else if (formatType === 'ICS') {
      exportExactICS(courses, rangeMode);
    } else if (formatType === 'PDF') {
      exportExactPDF(courses, rangeMode);
    }

    return { success: true, count: courses.length };
  };

  function getDisplayedMonthAndYear() {
    const pageText = document.body.innerText || '';
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();

    // Quét tìm "Thg8, 2026", "Thg 8, 2026", "Tháng 8, 2026", "Tháng 08/2026", "Thg8/2026"
    const matchThg = pageText.match(/Thg\s*(\d{1,2})[\s\/,\-]+(\d{4})/i) ||
                     pageText.match(/Tháng\s*(\d{1,2})[\s\/,\-]+(\d{4})/i) ||
                     pageText.match(/(\d{1,2})\/(\d{4})/);
    if (matchThg) {
      month = parseInt(matchThg[1], 10);
      year = parseInt(matchThg[2], 10);
    } else {
      const matchMonthOnly = pageText.match(/Thg\s*(\d{1,2})/i) || pageText.match(/Tháng\s*(\d{1,2})/i);
      if (matchMonthOnly) {
        month = parseInt(matchMonthOnly[1], 10);
      }
    }

    return { month, year };
  }

  function detectDayFromText(text) {
    const norm = (text || '').toLowerCase();
    if (norm.match(/\[?\s*thứ\s*hai\b/i) || norm.match(/\[?\s*thứ\s*2\b/i) || norm.match(/\bt2\b/i) || norm.match(/\bmonday\b/i) || norm.match(/\bmon\b/i)) return 'Thứ 2';
    if (norm.match(/\[?\s*thứ\s*ba\b/i) || norm.match(/\[?\s*thứ\s*3\b/i) || norm.match(/\bt3\b/i) || norm.match(/\btuesday\b/i) || norm.match(/\btue\b/i)) return 'Thứ 3';
    if (norm.match(/\[?\s*thứ\s*tư\b/i) || norm.match(/\[?\s*thứ\s*bốn\b/i) || norm.match(/\[?\s*thứ\s*4\b/i) || norm.match(/\bt4\b/i) || norm.match(/\bwednesday\b/i) || norm.match(/\bwed\b/i)) return 'Thứ 4';
    if (norm.match(/\[?\s*thứ\s*năm\b/i) || norm.match(/\[?\s*thứ\s*5\b/i) || norm.match(/\bt5\b/i) || norm.match(/\bthursday\b/i) || norm.match(/\bthu\b/i)) return 'Thứ 5';
    if (norm.match(/\[?\s*thứ\s*sáu\b/i) || norm.match(/\[?\s*thứ\s*6\b/i) || norm.match(/\bt6\b/i) || norm.match(/\bfriday\b/i) || norm.match(/\bfri\b/i)) return 'Thứ 6';
    if (norm.match(/\[?\s*thứ\s*bảy\b/i) || norm.match(/\[?\s*thứ\s*7\b/i) || norm.match(/\bt7\b/i) || norm.match(/\bsaturday\b/i) || norm.match(/\bsat\b/i)) return 'Thứ 7';
    if (norm.match(/\[?\s*chủ\s*nhật\b/i) || norm.match(/\bcn\b/i) || norm.match(/\bsunday\b/i) || norm.match(/\bsun\b/i)) return 'Chủ Nhật';
    return null;
  }

  function parseExactCourseBlocks(rangeMode) {
    const courseList = [];
    const { month: baseMonth, year: baseYear } = getDisplayedMonthAndYear();
    const standardDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const daysMapFromSunday = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    // 1. Quét tất cả các ô chứa ngày trong lịch
    // Tìm các ô td trong lịch FullCalendar / MyDTU Calendar
    const calendarCells = Array.from(document.querySelectorAll('.fc-day, .fc-day-grid td, .table-responsive td, .calendar td, #tb_LichHoc td, table td'));
    
    // Gom nhóm các hàng để xác định thứ tự hàng
    const rows = Array.from(document.querySelectorAll('.fc-day-grid tr, .fc-week, .table-responsive tr, table tr')).filter(r => r.querySelectorAll('td').length >= 7);
    const totalRows = rows.length || 6;

    calendarCells.forEach((cell) => {
      // 1. TRÍCH XUẤT NGÀY & THÁNG CHÍNH XÁC
      let dayNum = 0;
      let cellMonth = baseMonth;
      let cellYear = baseYear;
      let dateFormatted = '';
      let isoDateStr = '';

      // Cách 1: Thuộc tính data-date (VD: "2026-08-17")
      const dataDate = cell.getAttribute('data-date') || cell.closest('[data-date]')?.getAttribute('data-date');
      if (dataDate && dataDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dataDate.split('-').map(Number);
        cellYear = y;
        cellMonth = m;
        dayNum = d;
        dateFormatted = `${dayNum.toString().padStart(2, '0')}/${cellMonth.toString().padStart(2, '0')}`;
        isoDateStr = dataDate;
      }

      // Cách 2: Phần tử số ngày hiển thị trong ô (.fc-day-number, .day-number, ...)
      if (!dayNum) {
        const dayNumberEl = cell.querySelector('.fc-day-number, .day-number, .date, [class*="day-number"]');
        const numberText = dayNumberEl ? dayNumberEl.innerText.trim() : '';
        
        // Kiểm tra định dạng có chữ tháng (VD: "01 Thg8", "01 Thg9", "01/08")
        const thgMatch = (numberText || cell.innerText || '').match(/(\d{1,2})\s*Thg\s*(\d{1,2})/i);
        if (thgMatch) {
          dayNum = parseInt(thgMatch[1], 10);
          cellMonth = parseInt(thgMatch[2], 10);
        } else {
          // Bóc tách số ngày ở đầu ô
          const rawMatch = numberText.match(/^(\d{1,2})\b/) || cell.innerText.trim().match(/^(\d{1,2})\b/);
          if (rawMatch) {
            dayNum = parseInt(rawMatch[1], 10);
          }
        }

        if (dayNum > 0) {
          // Xác định vị trí hàng của ô để tính tháng giao nhau
          const parentRow = cell.closest('tr');
          const rIdx = rows.indexOf(parentRow);

          if (rIdx === 0 && dayNum > 20) {
            // Hàng 1 mà ngày > 20 -> Thuộc tháng trước
            cellMonth = baseMonth === 1 ? 12 : baseMonth - 1;
            if (cellMonth === 12) cellYear--;
          } else if (rIdx >= Math.max(3, totalRows - 2) && dayNum < 15) {
            // Hàng cuối mà ngày < 15 -> Thuộc tháng sau
            cellMonth = baseMonth === 12 ? 1 : baseMonth + 1;
            if (cellMonth === 1) cellYear++;
          }

          const dd = dayNum.toString().padStart(2, '0');
          const mm = cellMonth.toString().padStart(2, '0');
          dateFormatted = `${dd}/${mm}`;
          isoDateStr = `${cellYear}-${mm}-${dd}`;
        }
      }

      // 2. XÁC ĐỊNH THỨ TRONG TUẦN (Thứ 2 -> Chủ Nhật)
      let cellDay = '';

      // Ưu tiên 1: Tính toán từ ngày ISO
      if (isoDateStr && dayNum > 0) {
        const jsDate = new Date(cellYear, cellMonth - 1, dayNum);
        cellDay = daysMapFromSunday[jsDate.getDay()];
      }

      // Ưu tiên 2: Xác định từ class của cell (fc-mon, fc-tue, ...)
      if (!cellDay) {
        const classStr = cell.className.toLowerCase();
        if (classStr.includes('fc-mon') || classStr.includes('mon')) cellDay = 'Thứ 2';
        else if (classStr.includes('fc-tue') || classStr.includes('tue')) cellDay = 'Thứ 3';
        else if (classStr.includes('fc-wed') || classStr.includes('wed')) cellDay = 'Thứ 4';
        else if (classStr.includes('fc-thu') || classStr.includes('thu')) cellDay = 'Thứ 5';
        else if (classStr.includes('fc-fri') || classStr.includes('fri')) cellDay = 'Thứ 6';
        else if (classStr.includes('fc-sat') || classStr.includes('sat')) cellDay = 'Thứ 7';
        else if (classStr.includes('fc-sun') || classStr.includes('sun')) cellDay = 'Chủ Nhật';
      }

      // Ưu tiên 3: Xác định từ cellIndex (0 -> 6 tương ứng Thứ 2 -> Chủ Nhật)
      if (!cellDay && cell.cellIndex !== undefined && cell.cellIndex >= 0 && cell.cellIndex < 7) {
        cellDay = standardDays[cell.cellIndex];
      }

      // 3. QUÉT CÁC KHỐI MÔN HỌC TRONG Ô
      const eventElements = Array.from(cell.querySelectorAll('.fc-event, a.fc-event, .course-item, div[class*="event"], div[title]'));

      if (eventElements.length > 0) {
        eventElements.forEach(evEl => {
          const titleAttr = evEl.getAttribute('title') || evEl.getAttribute('data-original-title') || evEl.getAttribute('data-content') || '';
          const innerText = (evEl.innerText || '').trim();
          const fullInfo = (titleAttr + ' ' + innerText).trim();

          processCourseString(fullInfo, cellDay, dateFormatted, isoDateStr, courseList);
        });
      } else {
        // Fallback quét văn bản nếu không tìm thấy thẻ event con
        const rawCellText = cell.innerText || '';
        if (rawCellText.includes('|') || rawCellText.match(/[A-Z]{2,4}\s*\d{3}/)) {
          const rawBlocks = rawCellText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
          rawBlocks.forEach(block => {
            // Bỏ qua dòng chỉ chứa số ngày
            if (block.match(/^(\d{1,2}|\d{1,2}\s*Thg\s*\d{1,2})$/i)) return;
            processCourseString(block, cellDay, dateFormatted, isoDateStr, courseList);
          });
        }
      }
    });

    return courseList;
  }

  function processCourseString(rawText, defaultDay, dateFormatted, isoDateStr, courseList) {
    if (!rawText) return;
    const cleanRaw = rawText.replace(/\s+/g, ' ').trim();

    // Phân tách chuỗi môn học theo dấu | hoặc ký tự ngăn cách
    let parts = cleanRaw.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    // 1. Nhận diện thứ nếu có trong văn bản
    const blockDay = detectDayFromText(cleanRaw) || defaultDay || 'Không rõ thứ';

    // 2. Trích xuất thời gian (VD: 07:00-09:00, 09:15-11:15)
    let timeStr = 'Theo lịch';
    const rawTimeSegment = parts.find(p => p.includes(':') && p.match(/\d{1,2}:\d{2}/)) || cleanRaw;
    const timeMatch = rawTimeSegment.match(/(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
    if (timeMatch) {
      timeStr = timeMatch[1].replace(/\s+/g, '');
    }

    // 3. Trích xuất địa điểm / Phòng học
    let locStr = parts.find(p => p.includes('P.') || p.includes('Phòng') || p.includes('Online')) || '';
    if (!locStr) {
      const locMatch = cleanRaw.match(/(?:P\.\s*\d+[A-Z0-9\s,]*|Phòng\s*\d+[A-Z0-9\s,]*|Online\s*\d*|Hòa Khánh|Quang Trung|Phan Văn Trị)/i);
      locStr = locMatch ? locMatch[0].trim() : 'MyDTU';
    }

    // 4. Chuẩn hóa tên môn học
    let subjectName = parts[0];
    // Xóa tiền tố thứ (VD: "[Thứ hai]:", "[Thứ 2]:", "Thứ ba: ")
    subjectName = subjectName.replace(/^\[?\s*Thứ\s*(hai|ba|tư|bốn|năm|sáu|bảy|chủ\s*nhật|[2-7])\s*\]?\s*[:\-\s]*/i, '');
    subjectName = subjectName.replace(/^\[?\s*CN\s*\]?\s*[:\-\s]*/i, '');
    
    // Xóa tiền tố số ngày (VD: "10 ENG 219" -> "ENG 219")
    const datePrefixMatch = subjectName.match(/^(\d{1,2})\s*([A-Z].*)/);
    if (datePrefixMatch) {
      subjectName = datePrefixMatch[2].trim();
    }

    if (parts[1] && parts[1] !== rawTimeSegment && parts[1] !== locStr) {
      subjectName += ' - ' + parts[1];
    }
    subjectName = subjectName.replace(/\s+/g, ' ').trim();

    // Bỏ qua nếu không phải môn học hợp lệ
    if (!subjectName || subjectName.length < 3) return;

    // Khóa duy nhất chuẩn hóa chống trùng lặp
    const uniqueKey = `${subjectName.toLowerCase()}|${isoDateStr || dateFormatted || 'nodate'}|${blockDay}|${timeStr}|${locStr.toLowerCase()}`;

    if (!courseList.some(c => c.key === uniqueKey)) {
      courseList.push({
        key: uniqueKey,
        rawText: cleanRaw,
        subject: subjectName,
        location: locStr.trim(),
        time: timeStr.trim(),
        day: blockDay,
        dateObj: dateFormatted || 'Theo lịch',
        isoDate: isoDateStr || '9999-99-99'
      });
    }
  }

  function exportExactCSV(courses, rangeMode) {
    let html = '';

    if (rangeMode === 'MONTH') {
      // 1. Gom nhóm danh sách theo Môn Học
      const subjectMap = new Map();
      courses.forEach(c => {
        const key = c.subject;
        if (!subjectMap.has(key)) subjectMap.set(key, []);
        subjectMap.get(key).push(c);
      });

      html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 11pt; margin: 20px; }
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
        sessionList.sort((a, b) => {
          if (a.isoDate && b.isoDate) return a.isoDate.localeCompare(b.isoDate);
          return 0;
        });

        return sessionList.map((sess, sessIdx) => `
          <tr>
            ${sessIdx === 0 ? `<td rowspan="${sessionList.length}" style="text-align:center; font-weight:bold; background:#fafafa;">${sIdx + 1}</td>` : ''}
            ${sessIdx === 0 ? `<td rowspan="${sessionList.length}" class="subject-title" style="background:#fafafa;">${subjectName.replace(/</g, '&lt;')}</td>` : ''}
            <td class="session-num">Lần ${sessIdx + 1}</td>
            <td style="text-align:center;"><span style="color:#2980b9; font-weight:bold;">${sess.day}</span> &nbsp;--&nbsp; <span class="date-val">${sess.dateObj || 'Theo lịch'}</span> &nbsp;--&nbsp; <span class="time-val">${sess.time}</span></td>
            <td class="location-val">${sess.location}</td>
          </tr>
        `).join('');
      }).join('')}
    </tbody>
  </table>
</body>
</html>`;

    } else {
      // 2. Lịch Tuần (WEEK) -> Bảng 2D Grid Thứ 2 -> Chủ Nhật
      const daysOrder = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
      const ySet = new Set();
      courses.forEach(c => {
        if (c.time && c.time !== 'Theo lịch') ySet.add(c.time);
      });

      const times = Array.from(ySet).sort((a, b) => {
        const getMinutes = (tStr) => {
          const m = tStr.match(/(\d{1,2}):(\d{2})/);
          return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 9999;
        };
        return getMinutes(a) - getMinutes(b);
      });

      if (times.length === 0 || courses.some(c => c.time === 'Theo lịch')) {
        times.push('Theo lịch');
      }

      html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; font-size: 11pt; margin: 15px; }
    .title { font-size: 16pt; font-weight: bold; color: #1a5276; margin-bottom: 15px; text-align: center; }
    table { font-family: "Segoe UI", Tahoma, Arial, sans-serif; border-collapse: collapse; width: 100%; }
    th { background-color: #2980b9; color: #ffffff; font-weight: bold; border: 1px solid #1f618d; text-align: center; vertical-align: middle; padding: 10px; font-size: 11pt; }
    .time-header { background-color: #ebf5fb; color: #2c3e50; font-weight: bold; width: 120px; text-align: center; border: 1px solid #bdc3c7; }
    td { border: 1px solid #bdc3c7; padding: 8px; vertical-align: top; width: 160px; text-align: left; font-size: 10pt; background: #ffffff; }
    .course-card { margin-bottom: 6px; padding: 6px; border-left: 3px solid #3498db; background: #fdfefe; }
    .course-card:not(:last-child) { border-bottom: 1px dashed #d5dbdb; padding-bottom: 8px; margin-bottom: 8px; }
    .date-tag { color: #d35400; font-weight: bold; font-size: 9pt; }
    .subject { font-weight: bold; color: #1a5276; font-size: 10.5pt; display: block; margin-top: 2px; }
    .location { color: #8e44ad; font-style: italic; font-size: 9.5pt; display: block; margin-top: 2px; }
    .time-badge { color: #27ae60; font-weight: bold; font-size: 9pt; display: block; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="title">📅 THỜI KHÓA BIỂU HỌC TẬP (LỊCH TUẦN)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 120px;">Ca / Giờ Học</th>
        ${daysOrder.map(d => `<th style="width: 160px;">${d}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${times.map(t => `
        <tr>
          <td class="time-header">${t}</td>
          ${daysOrder.map(d => {
            const cellCourses = courses.filter(c => c.time === t && c.day === d);
            if (cellCourses.length > 0) {
              const cellHtml = cellCourses.map(c => `
                <div class="course-card">
                  ${c.dateObj && c.dateObj !== 'Theo lịch' ? `<span class="date-tag">🗓️ ${c.dateObj}</span>` : ''}
                  <span class="subject">${c.subject.replace(/</g, '&lt;')}</span>
                  <span class="location">📍 ${c.location.replace(/</g, '&lt;')}</span>
                  <span class="time-badge">⏰ ${c.time.replace(/</g, '&lt;')}</span>
                </div>
              `).join('');
              return `<td>${cellHtml}</td>`;
            } else {
              return `<td style="background:#fafafa;"></td>`;
            }
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
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
      ics.push(`DESCRIPTION:${item.day} | ${item.dateObj} | ${item.time}`);
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

  function exportExactPDF(courses, rangeMode) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('⚠️ Vui lòng cho phép Pop-up để mở giao diện in PDF!');
      return;
    }

    const daysOrder = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const ySet = new Set();
    courses.forEach(c => {
      if (c.time && c.time !== 'Theo lịch') ySet.add(c.time);
    });

    const times = Array.from(ySet).sort((a, b) => {
      const getMinutes = (tStr) => {
        const m = tStr.match(/(\d{1,2}):(\d{2})/);
        return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 9999;
      };
      return getMinutes(a) - getMinutes(b);
    });
    if (times.length === 0 || courses.some(c => c.time === 'Theo lịch')) times.push('Theo lịch');

    const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lịch Học MyDTU - In PDF</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 15px; font-size: 11pt; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { margin: 0 0 5px; color: #1a5276; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #2980b9; color: #fff; text-align: center; }
    .time-col { font-weight: bold; background: #eaeded; text-align: center; width: 110px; }
    .course-item { margin-bottom: 6px; padding: 4px; border-left: 3px solid #2980b9; }
    .subject { font-weight: bold; color: #1a5276; font-size: 10pt; }
    .loc { color: #555; font-size: 9pt; }
    .time-slot { color: #27ae60; font-size: 9pt; font-weight: bold; }
    @media print {
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>📅 THỜI KHÓA BIỂU MYDTU</h2>
    <p>Chế độ: ${rangeMode === 'WEEK' ? 'Lịch học Tuần' : 'Lịch học Tháng'}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th class="time-col">Giờ / Thứ</th>
        ${daysOrder.map(d => `<th>${d}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${times.map(t => `
        <tr>
          <td class="time-col">${t}</td>
          ${daysOrder.map(d => {
            const cellCourses = courses.filter(c => c.time === t && c.day === d);
            if (cellCourses.length > 0) {
              return `<td>${cellCourses.map(c => `
                <div class="course-item">
                  <div class="subject">${c.subject}</div>
                  <div class="loc">📍 ${c.location}</div>
                  <div class="time-slot">⏰ ${c.time}</div>
                </div>
              `).join('')}</td>`;
            }
            return `<td></td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  }
})();
