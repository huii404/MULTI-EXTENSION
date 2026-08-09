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

function parseExactCourseBlocks() {
  const courseList = [];
  const allDivs = document.querySelectorAll('.table-responsive td, .calendar td, #tb_LichHoc td, table td, div.course-item');
  const elementsToScan = allDivs.length > 0 ? allDivs : document.querySelectorAll('div, td');

  elementsToScan.forEach((el) => {
    // Bỏ qua cột 0 (cột chứa nhãn Thời gian/Ca học) để tránh cào nhầm rác thành "Không rõ ngày"
    if (el.cellIndex === 0) return;

    const text = el.innerText || '';
    if (text.includes('|') && (text.includes('07:00') || text.includes('09:15') || text.includes('14:00') || text.includes('Online') || text.includes('P.'))) {
      if (el.closest('nav') || el.closest('.menu') || el.closest('header')) return;

      if (el.children.length <= 5) {
        // Gom text và tách bằng dấu '|' chuẩn xác hơn
        const cleanRaw = text.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
        const parts = cleanRaw.split('|').map(p => p.trim()).filter(Boolean);

        if (parts.length >= 2) {
          if (!courseList.some((c) => c.rawText === cleanRaw)) {
            let dayStr = 'Không rõ ngày';
            let dateStr = '';
            let code = parts[0];
            
            // Xử lý Lịch Tuần (Thứ 2 - CN) làm cột X
            if (el.cellIndex !== undefined) {
              const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
              if (el.cellIndex >= 1 && el.cellIndex <= 7) {
                dayStr = days[el.cellIndex - 1];
              }
            }
            
            // Xử lý Ngày bị dính liền Mã Môn (VD: "16 CS 417 I" hoặc "16CS 417 I")
            const datePrefixMatch = code.match(/^(\d{1,2})\s*([A-Z].*)/);
            if (datePrefixMatch) {
              dateStr = `Ngày ${datePrefixMatch[1].padStart(2, '0')}`; // VD: Ngày 16
              code = datePrefixMatch[2].trim();
            } 

            // Lấy thời gian và phòng học
            const timeStr = parts.find(p => p.includes(':')) || 'Theo lịch';
            const locStr = parts.find(p => p.includes('P.') || p.includes('Phòng') || p.includes('Online')) || 'MyDTU';
            
            // Lấy tên môn
            let subjectName = code;
            if (parts[1] && parts[1] !== timeStr && parts[1] !== locStr) {
              subjectName += ' - ' + parts[1];
            }

            courseList.push({
              rawText: cleanRaw,
              subject: subjectName,
              location: locStr,
              time: timeStr,
              day: dayStr,
              dateObj: dateStr // Lưu riêng Ngày 16 để render bên trong ô
            });
          }
        }
      }
    }
  });

  return courseList;
}

function exportExactCSV(courses, rangeMode) {
  // 1. Tạo danh sách các Ngày (X) và Giờ (Y)
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

  // 2. Build file HTML-Excel dạng Grid 2D
  let html = `
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
        // Mỗi thông tin 1 dòng bằng thẻ <br>
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