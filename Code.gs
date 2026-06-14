/**
 * Smart Document Center (SDC)
 * Code.gs
 * ประตูหลักของ Web App และ API กลาง
 */

/**
 * เปิดหน้า Web App
 */
function doGet(e) {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * include ไฟล์ HTML ย่อย เช่น Style.html / Script.html
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ส่งข้อมูลเริ่มต้นให้หน้าเว็บ
 */
function getAppInitData() {
  return {
    success: true,
    appName: CONFIG.APP_NAME,
    appShortName: CONFIG.APP_SHORT_NAME,
    schoolName: CONFIG.SCHOOL_NAME,
    categories: getCategories().data,
    dashboard: getDashboardSummary()
  };
}

/**
 * สรุปข้อมูลหน้า Dashboard
 */
function getDashboardSummary() {
  const filesResult = getFiles();
  const files = filesResult.data || [];

  const currentYearBE = String(new Date().getFullYear() + 543);
  const thisYearFiles = files.filter(function(file) {
    return String(file['ปี พ.ศ.']) === currentYearBE;
  });

  const pendingFiles = files.filter(function(file) {
    return String(file['สถานะ']) === CONFIG.FILE_STATUS.PENDING ||
           String(file['สถานะ']) === CONFIG.FILE_STATUS.NEED_REVIEW;
  });

  const categoryMap = {};
  files.forEach(function(file) {
    const category = file['ประเภท'] || 'ไม่ระบุ';
    categoryMap[category] = (categoryMap[category] || 0) + 1;
  });

  return {
    totalFiles: files.length,
    currentYearBE: currentYearBE,
    thisYearFiles: thisYearFiles.length,
    pendingFiles: pendingFiles.length,
    categorySummary: categoryMap,
    recentFiles: files.slice(-10).reverse()
  };
}

/**
 * API: วิเคราะห์ชื่อไฟล์จากหน้าเว็บ
 */
function apiAnalyzeFileName(fileName) {
  return analyzeFileName(fileName);
}

/**
 * API: ค้นหาไฟล์จากหน้าเว็บ
 */
function apiSearchFiles(query) {
  return searchFiles(query || {});
}

/**
 * API: ดึงไฟล์ทั้งหมด
 */
function apiGetFiles() {
  return getFiles();
}

/**
 * API: ดึง Dashboard ใหม่
 */
function apiGetDashboardSummary() {
  return {
    success: true,
    data: getDashboardSummary()
  };
}

/**
 * API: เพิ่มข้อมูลไฟล์แบบกรอกเอง/จำลองก่อน
 * ใช้ทดสอบหน้าเว็บก่อนทำ upload จริง
 */
function apiAddManualFile(fileData) {
  fileData = fileData || {};

  return addFileRecord({
    fileName: fileData.fileName || '',
    category: fileData.category || 'อื่น ๆ',
    yearBE: fileData.yearBE || String(new Date().getFullYear() + 543),
    subject: fileData.subject || '',
    owner: fileData.owner || CONFIG.SCHOOL_NAME,
    documentDate: fileData.documentDate || '',
    driveFileId: fileData.driveFileId || '',
    driveUrl: fileData.driveUrl || '',
    folderId: fileData.folderId || '',
    folderPath: fileData.folderPath || '',
    keywords: fileData.keywords || '',
    aiConfidence: fileData.aiConfidence || '',
    status: fileData.status || CONFIG.FILE_STATUS.PENDING,
    source: 'WEB_MANUAL',
    note: fileData.note || ''
  });
}

/**
 * ทดสอบ Web App API
 */
function testGetAppInitData() {
  return getAppInitData();
}