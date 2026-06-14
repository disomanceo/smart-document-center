/**
 * Smart Document Center (SDC)
 * Database.gs
 * จัดการข้อมูลใน Google Sheets
 */

/**
 * เปิด Spreadsheet หลัก
 */
function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * เปิด Sheet ตามชื่อ
 */
function getSheet_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('ไม่พบ Sheet: ' + sheetName + ' กรุณารัน setupSystem() ก่อน');
  }

  return sheet;
}

/**
 * ดึง Header ของ Sheet
 */
function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/**
 * แปลง Row เป็น Object
 */
function rowToObject_(headers, row) {
  const obj = {};

  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });

  return obj;
}

/**
 * แปลงข้อมูลทั้งหมดใน Sheet เป็น Object Array
 */
function getSheetDataAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const headers = getHeaders_(sheet);
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return values.map(function(row) {
    return rowToObject_(headers, row);
  });
}

/**
 * สร้าง ID เอกสาร
 */
function generateFileId_() {
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMddHHmmss'
  );

  const random = Math.floor(Math.random() * 9000) + 1000;

  return 'SDC-' + timestamp + '-' + random;
}

/**
 * บันทึกข้อมูลไฟล์ลง Sheet FILES
 */
function addFileRecord(fileData) {
  const sheet = getSheet_(CONFIG.SHEETS.FILES);
  const now = new Date();

  const id = fileData.id || generateFileId_();

  const row = [
    id,
    fileData.fileName || '',
    fileData.category || '',
    fileData.yearBE || '',
    fileData.subject || '',
    fileData.owner || '',
    fileData.documentDate || '',
    fileData.uploadedAt || now,
    fileData.driveFileId || '',
    fileData.driveUrl || '',
    fileData.folderId || '',
    fileData.folderPath || '',
    fileData.keywords || '',
    fileData.aiConfidence || '',
    fileData.status || CONFIG.FILE_STATUS.PENDING,
    fileData.source || 'WEB',
    fileData.uploadedBy || Session.getActiveUser().getEmail() || '',
    fileData.note || '',
    now,
    now
  ];

  sheet.appendRow(row);

  saveLog('ADD_FILE', 'เพิ่มข้อมูลไฟล์: ' + fileData.fileName, 'SUCCESS');

  return {
    success: true,
    id: id,
    message: 'บันทึกข้อมูลไฟล์สำเร็จ'
  };
}

/**
 * ดึงไฟล์ทั้งหมด
 */
function getFiles() {
  const files = getSheetDataAsObjects_(CONFIG.SHEETS.FILES);

  return {
    success: true,
    data: files
  };
}

/**
 * ค้นหาไฟล์จาก keyword, ปี, ประเภท
 */
function searchFiles(query) {
  const keyword = (query && query.keyword ? String(query.keyword) : '').toLowerCase().trim();
  const yearBE = query && query.yearBE ? String(query.yearBE).trim() : '';
  const category = query && query.category ? String(query.category).trim() : '';

  const files = getSheetDataAsObjects_(CONFIG.SHEETS.FILES);

  const results = files.filter(function(file) {
    const text = [
      file['ชื่อไฟล์'],
      file['ประเภท'],
      file['ปี พ.ศ.'],
      file['เรื่อง'],
      file['หน่วยงาน/เจ้าของเรื่อง'],
      file['Keywords'],
      file['หมายเหตุ']
    ].join(' ').toLowerCase();

    const matchKeyword = !keyword || text.indexOf(keyword) !== -1;
    const matchYear = !yearBE || String(file['ปี พ.ศ.']) === yearBE;
    const matchCategory = !category || String(file['ประเภท']) === category;

    return matchKeyword && matchYear && matchCategory;
  });

  return {
    success: true,
    count: results.length,
    data: results
  };
}

/**
 * อัปเดตข้อมูลไฟล์ตาม ID
 */
function updateFileRecord(id, updates) {
  const sheet = getSheet_(CONFIG.SHEETS.FILES);
  const headers = getHeaders_(sheet);
  const values = sheet.getDataRange().getValues();

  const idColIndex = headers.indexOf('ID');

  if (idColIndex === -1) {
    throw new Error('ไม่พบคอลัมน์ ID ใน Sheet FILES');
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColIndex]) === String(id)) {
      Object.keys(updates).forEach(function(key) {
        const colIndex = headers.indexOf(key);

        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
        }
      });

      const updatedAtIndex = headers.indexOf('Updated At');
      if (updatedAtIndex !== -1) {
        sheet.getRange(i + 1, updatedAtIndex + 1).setValue(new Date());
      }

      saveLog('UPDATE_FILE', 'แก้ไขข้อมูลไฟล์ ID: ' + id, 'SUCCESS');

      return {
        success: true,
        message: 'อัปเดตข้อมูลสำเร็จ'
      };
    }
  }

  return {
    success: false,
    message: 'ไม่พบข้อมูลไฟล์ ID: ' + id
  };
}

/**
 * ดึงหมวดหมู่ทั้งหมด
 */
function getCategories() {
  const categories = getSheetDataAsObjects_(CONFIG.SHEETS.CATEGORIES);

  return {
    success: true,
    data: categories.filter(function(item) {
      return item['สถานะ'] === 'เปิดใช้งาน';
    })
  };
}

/**
 * บันทึก Log
 */
function saveLog(action, detail, status) {
  const sheet = getSheet_(CONFIG.SHEETS.LOGS);

  sheet.appendRow([
    new Date(),
    action || '',
    detail || '',
    Session.getActiveUser().getEmail() || '',
    status || ''
  ]);
}

/**
 * ทดสอบเพิ่มข้อมูลตัวอย่าง
 */
function testAddFileRecord() {
  return addFileRecord({
    fileName: 'คำสั่งแต่งตั้งคณะกรรมการกีฬา.pdf',
    category: 'คำสั่งโรงเรียน',
    yearBE: '2569',
    subject: 'แต่งตั้งคณะกรรมการกีฬา',
    owner: 'โรงเรียนวัดไผ่มุ้ง',
    driveFileId: 'TEST_FILE_ID',
    driveUrl: 'https://drive.google.com/test',
    folderId: 'TEST_FOLDER_ID',
    folderPath: '2569/คำสั่งโรงเรียน',
    keywords: 'คำสั่ง, แต่งตั้ง, กีฬา',
    aiConfidence: 85,
    status: CONFIG.FILE_STATUS.PENDING,
    source: 'TEST',
    note: 'ข้อมูลทดสอบ'
  });
}

/**
 * ทดสอบค้นหา
 */
function testSearchFiles() {
  return searchFiles({
    keyword: 'กีฬา',
    yearBE: '2569',
    category: 'คำสั่งโรงเรียน'
  });
}