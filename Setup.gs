/**
 * Smart Document Center (SDC)
 * Setup.gs
 * ใช้สำหรับสร้างโครงสร้างชีตเริ่มต้นอัตโนมัติ
 */

function setupSystem() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  setupFilesSheet_(ss);
  setupSettingsSheet_(ss);
  setupCategoriesSheet_(ss);
  setupKeywordsSheet_(ss);
  setupLogsSheet_(ss);

  setupRootFolder_();

  return {
    success: true,
    message: 'ตั้งค่าระบบ Smart Document Center สำเร็จ'
  };
}

/**
 * สร้าง Sheet FILES
 */
function setupFilesSheet_(ss) {
  const sheetName = CONFIG.SHEETS.FILES;
  const headers = [
    'ID',
    'ชื่อไฟล์',
    'ประเภท',
    'ปี พ.ศ.',
    'เรื่อง',
    'หน่วยงาน/เจ้าของเรื่อง',
    'วันที่เอกสาร',
    'วันที่อัปโหลด',
    'Drive File ID',
    'Drive URL',
    'Folder ID',
    'Folder Path',
    'Keywords',
    'AI Confidence',
    'สถานะ',
    'แหล่งที่มา',
    'ผู้อัปโหลด',
    'หมายเหตุ',
    'Created At',
    'Updated At'
  ];

  const sheet = getOrCreateSheet_(ss, sheetName);
  setupHeader_(sheet, headers);
}

/**
 * สร้าง Sheet SETTINGS
 */
function setupSettingsSheet_(ss) {
  const sheetName = CONFIG.SHEETS.SETTINGS;
  const headers = [
    'Key',
    'Value',
    'Description',
    'Updated At'
  ];

  const sheet = getOrCreateSheet_(ss, sheetName);
  setupHeader_(sheet, headers);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    sheet.appendRow([
      'APP_NAME',
      CONFIG.APP_NAME,
      'ชื่อระบบ',
      new Date()
    ]);

    sheet.appendRow([
      'SCHOOL_NAME',
      CONFIG.SCHOOL_NAME,
      'ชื่อโรงเรียน',
      new Date()
    ]);

    sheet.appendRow([
      'ROOT_FOLDER_ID',
      CONFIG.ROOT_FOLDER_ID,
      'โฟลเดอร์หลักสำหรับจัดเก็บเอกสาร',
      new Date()
    ]);
  }
}

/**
 * สร้าง Sheet CATEGORIES
 */
function setupCategoriesSheet_(ss) {
  const sheetName = CONFIG.SHEETS.CATEGORIES;
  const headers = [
    'ID',
    'ชื่อหมวดหมู่',
    'คำอธิบาย',
    'สถานะ',
    'Created At',
    'Updated At'
  ];

  const sheet = getOrCreateSheet_(ss, sheetName);
  setupHeader_(sheet, headers);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    CONFIG.DEFAULT_CATEGORIES.forEach(function(category, index) {
      sheet.appendRow([
        'CAT-' + Utilities.formatString('%03d', index + 1),
        category,
        '',
        'เปิดใช้งาน',
        new Date(),
        new Date()
      ]);
    });
  }
}

/**
 * สร้าง Sheet KEYWORDS
 */
function setupKeywordsSheet_(ss) {
  const sheetName = CONFIG.SHEETS.KEYWORDS;
  const headers = [
    'ID',
    'Keyword',
    'ประเภทที่แนะนำ',
    'น้ำหนัก',
    'สถานะ',
    'Created At',
    'Updated At'
  ];

  const sheet = getOrCreateSheet_(ss, sheetName);
  setupHeader_(sheet, headers);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    const defaultKeywords = [
      ['คำสั่ง', 'คำสั่งโรงเรียน', 10],
      ['แต่งตั้ง', 'คำสั่งโรงเรียน', 8],
      ['ประชุม', 'ประชุม', 8],
      ['รายงาน', 'รายงาน', 8],
      ['งบประมาณ', 'การเงิน', 8],
      ['การเงิน', 'การเงิน', 10],
      ['พัสดุ', 'พัสดุ', 10],
      ['จัดซื้อ', 'พัสดุ', 8],
      ['บุคลากร', 'งานบุคคล', 8],
      ['ครู', 'งานบุคคล', 6],
      ['นักเรียน', 'งานวิชาการ', 6],
      ['โครงการ', 'แผนงาน/โครงการ', 8]
    ];

    defaultKeywords.forEach(function(item, index) {
      sheet.appendRow([
        'KEY-' + Utilities.formatString('%03d', index + 1),
        item[0],
        item[1],
        item[2],
        'เปิดใช้งาน',
        new Date(),
        new Date()
      ]);
    });
  }
}

/**
 * สร้าง Sheet LOGS
 */
function setupLogsSheet_(ss) {
  const sheetName = CONFIG.SHEETS.LOGS;
  const headers = [
    'Timestamp',
    'Action',
    'Detail',
    'User',
    'Status'
  ];

  const sheet = getOrCreateSheet_(ss, sheetName);
  setupHeader_(sheet, headers);
}

/**
 * ตรวจสอบ Root Folder
 */
function setupRootFolder_() {
  const folder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);

  // สร้างโฟลเดอร์ปีปัจจุบันไว้ล่วงหน้า
  const currentYearBE = new Date().getFullYear() + 543;
  getOrCreateSubFolder_(folder, String(currentYearBE));

  return folder;
}

/**
 * ดึง Sheet ถ้าไม่มีให้สร้างใหม่
 */
function getOrCreateSheet_(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}

/**
 * ตั้งค่าหัวตาราง
 */
function setupHeader_(sheet, headers) {
  sheet.clear();

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * สร้างโฟลเดอร์ย่อย ถ้ามีแล้วใช้ของเดิม
 */
function getOrCreateSubFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(folderName);
}

/**
 * ใช้สำหรับทดสอบว่า Config ใช้งานได้ไหม
 */
function testConfig() {
  return {
    appName: CONFIG.APP_NAME,
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    rootFolderId: CONFIG.ROOT_FOLDER_ID
  };
}