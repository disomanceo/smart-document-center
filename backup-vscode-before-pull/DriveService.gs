/**
 * Smart Document Center (SDC)
 * DriveService.gs
 * จัดการ Google Drive และโฟลเดอร์จัดเก็บเอกสาร
 */

/**
 * เปิด Root Folder หลัก
 */
function getRootFolder_() {
  return DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
}

/**
 * ดึงหรือสร้างโฟลเดอร์ย่อย
 */
function getOrCreateFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(folderName);
}

/**
 * ดึงปี พ.ศ. ปัจจุบัน
 */
function getCurrentYearBE_() {
  return new Date().getFullYear() + 543;
}

/**
 * ทำชื่อไฟล์/โฟลเดอร์ให้ปลอดภัย
 */
function sanitizeName_(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * สร้างหรือดึงโฟลเดอร์ปี พ.ศ.
 */
function getYearFolder(yearBE) {
  const rootFolder = getRootFolder_();
  const yearName = String(yearBE || getCurrentYearBE_());

  return getOrCreateFolder_(rootFolder, yearName);
}

/**
 * สร้างหรือดึงโฟลเดอร์หมวดหมู่ในปีนั้น
 */
function getCategoryFolder(yearBE, category) {
  const yearFolder = getYearFolder(yearBE);
  const safeCategory = sanitizeName_(category || 'อื่น ๆ');

  return getOrCreateFolder_(yearFolder, safeCategory);
}

/**
 * เตรียมโฟลเดอร์จัดเก็บไฟล์
 */
function prepareStorageFolder(yearBE, category) {
  const folder = getCategoryFolder(yearBE, category);

  return {
    success: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl(),
    folderPath: String(yearBE || getCurrentYearBE_()) + '/' + String(category || 'อื่น ๆ')
  };
}

/**
 * บันทึก Blob เป็นไฟล์ใน Drive
 * ใช้รองรับ Upload จาก Web หรือ LINE ในอนาคต
 */
function saveBlobToDrive(blob, options) {
  options = options || {};

  const yearBE = options.yearBE || getCurrentYearBE_();
  const category = options.category || 'อื่น ๆ';
  const folder = getCategoryFolder(yearBE, category);

  let fileName = options.fileName || blob.getName() || 'เอกสารไม่ระบุชื่อ';
  fileName = sanitizeName_(fileName);

  const file = folder.createFile(blob).setName(fileName);

  const result = {
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    folderId: folder.getId(),
    folderPath: String(yearBE) + '/' + String(category),
    yearBE: String(yearBE),
    category: String(category)
  };

  saveLog('SAVE_FILE_DRIVE', 'บันทึกไฟล์ลง Drive: ' + fileName, 'SUCCESS');

  return result;
}

/**
 * ย้ายไฟล์ไปยังโฟลเดอร์ ปี/หมวดหมู่
 */
function moveFileToCategory(fileId, yearBE, category) {
  const file = DriveApp.getFileById(fileId);
  const targetFolder = getCategoryFolder(yearBE, category);

  targetFolder.addFile(file);

  const parents = file.getParents();
  while (parents.hasNext()) {
    const parent = parents.next();

    if (parent.getId() !== targetFolder.getId()) {
      parent.removeFile(file);
    }
  }

  saveLog(
    'MOVE_FILE',
    'ย้ายไฟล์ ' + file.getName() + ' ไปยัง ' + yearBE + '/' + category,
    'SUCCESS'
  );

  return {
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    folderId: targetFolder.getId(),
    folderPath: String(yearBE) + '/' + String(category)
  };
}

/**
 * ดึงข้อมูลไฟล์จาก Drive
 */
function getDriveFileInfo(fileId) {
  const file = DriveApp.getFileById(fileId);

  return {
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    createdAt: file.getDateCreated(),
    updatedAt: file.getLastUpdated()
  };
}

/**
 * สร้างโครงโฟลเดอร์ตามหมวดหมู่ทั้งหมดของระบบในปีที่ระบุ
 */
function createYearCategoryFolders(yearBE) {
  const year = yearBE || getCurrentYearBE_();
  const categoriesResult = getCategories();
  const categories = categoriesResult.data || [];

  const created = [];

  categories.forEach(function(category) {
    const categoryName = category['ชื่อหมวดหมู่'];
    const folder = getCategoryFolder(year, categoryName);

    created.push({
      category: categoryName,
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
      folderPath: String(year) + '/' + categoryName
    });
  });

  saveLog(
    'CREATE_YEAR_FOLDERS',
    'สร้างโฟลเดอร์ปี ' + year + ' จำนวน ' + created.length + ' หมวดหมู่',
    'SUCCESS'
  );

  return {
    success: true,
    yearBE: String(year),
    count: created.length,
    data: created
  };
}

/**
 * ทดสอบสร้างโฟลเดอร์ปีปัจจุบันและหมวดหมู่ทั้งหมด
 */
function testCreateYearFolders() {
  return createYearCategoryFolders(getCurrentYearBE_());
}

/**
 * ทดสอบเตรียมโฟลเดอร์
 */
function testPrepareStorageFolder() {
  return prepareStorageFolder('2569', 'คำสั่งโรงเรียน');
}

/**
 * ทดสอบสร้างไฟล์ข้อความลง Drive
 */
function testSaveTextFileToDrive() {
  const content = 'ทดสอบระบบ Smart Document Center\nโรงเรียนวัดไผ่มุ้ง\n' + new Date();
  const blob = Utilities.newBlob(content, 'text/plain', 'test-smart-document-center.txt');

  const driveResult = saveBlobToDrive(blob, {
    fileName: 'ทดสอบบันทึกไฟล์ SDC.txt',
    yearBE: '2569',
    category: 'อื่น ๆ'
  });

  addFileRecord({
    fileName: driveResult.fileName,
    category: driveResult.category,
    yearBE: driveResult.yearBE,
    subject: 'ทดสอบบันทึกไฟล์ลง Drive',
    owner: CONFIG.SCHOOL_NAME,
    driveFileId: driveResult.fileId,
    driveUrl: driveResult.fileUrl,
    folderId: driveResult.folderId,
    folderPath: driveResult.folderPath,
    keywords: 'ทดสอบ, SDC, Drive',
    aiConfidence: '',
    status: CONFIG.FILE_STATUS.CONFIRMED,
    source: 'TEST',
    note: 'ไฟล์ทดสอบจาก DriveService.gs'
  });

  return driveResult;
}