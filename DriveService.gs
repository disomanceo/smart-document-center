/**
 * Smart Document Center (SDC)
 * DriveService.gs
 * อัปโหลดไฟล์จริงเข้า Google Drive และบันทึกข้อมูลลง Sheet FILES
 */

/**
 * API: อัปโหลดไฟล์จากหน้าเว็บ
 * payload: {fileName, mimeType, base64, yearBE, category, subject, keywords, note}
 */
function apiUploadFile(payload) {
  payload = payload || {};

  if (!payload.fileName) {
    return { success: false, message: 'ไม่พบชื่อไฟล์' };
  }

  if (!payload.base64) {
    return { success: false, message: 'ไม่พบข้อมูลไฟล์สำหรับอัปโหลด' };
  }

  const fileName = String(payload.fileName).trim();
  const analysis = analyzeFileName(fileName);
  const suggested = analysis.suggested || {};

  const yearBE = String(payload.yearBE || suggested.yearBE || (new Date().getFullYear() + 543)).trim();
  const category = String(payload.category || suggested.category || 'อื่น ๆ').trim();
  const subject = String(payload.subject || suggested.subject || fileName).trim();
  const keywords = String(payload.keywords || suggested.keywords || '').trim();
  const note = String(payload.note || '').trim();

  const uploadResult = saveBase64FileToDrive_({
    fileName: fileName,
    mimeType: payload.mimeType || MimeType.PDF,
    base64: payload.base64,
    yearBE: yearBE,
    category: category
  });

  const recordResult = addFileRecord({
    fileName: fileName,
    category: category,
    yearBE: yearBE,
    subject: subject,
    owner: CONFIG.SCHOOL_NAME,
    documentDate: '',
    driveFileId: uploadResult.fileId,
    driveUrl: uploadResult.fileUrl,
    folderId: uploadResult.folderId,
    folderPath: uploadResult.folderPath,
    keywords: keywords,
    aiConfidence: suggested.aiConfidence || '',
    status: CONFIG.FILE_STATUS.CONFIRMED,
    source: 'WEB_UPLOAD',
    note: note
  });

  saveLog('UPLOAD_FILE', 'อัปโหลดไฟล์: ' + fileName, 'SUCCESS');

  return {
    success: true,
    id: recordResult.id,
    fileId: uploadResult.fileId,
    fileUrl: uploadResult.fileUrl,
    folderId: uploadResult.folderId,
    folderPath: uploadResult.folderPath,
    message: 'อัปโหลดและบันทึกเอกสารสำเร็จ'
  };
}

/**
 * บันทึก base64 เป็นไฟล์ใน Drive ตามโครงสร้าง ปี พ.ศ. / ประเภท
 */
function saveBase64FileToDrive_(data) {
  const rootFolder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const yearFolder = getOrCreateSubFolder_(rootFolder, sanitizeFolderName_(data.yearBE));
  const categoryFolder = getOrCreateSubFolder_(yearFolder, sanitizeFolderName_(data.category));

  const bytes = Utilities.base64Decode(data.base64);
  const blob = Utilities.newBlob(bytes, data.mimeType || MimeType.PDF, data.fileName);
  const file = categoryFolder.createFile(blob);

  return {
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    folderId: categoryFolder.getId(),
    folderPath: data.yearBE + '/' + data.category
  };
}

/**
 * สร้าง/ดึงโฟลเดอร์ย่อยตามชื่อ
 * ใช้ชื่อเดียวกับ helper ใน Setup.gs ได้ แต่แยกไว้เพื่อให้ DriveService ใช้งานได้แน่นอน
 */
function getOrCreateSubFolder_(parentFolder, folderName) {
  const safeName = sanitizeFolderName_(folderName || 'อื่น ๆ');
  const folders = parentFolder.getFoldersByName(safeName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(safeName);
}

/**
 * กันอักขระที่ไม่เหมาะกับชื่อโฟลเดอร์
 */
function sanitizeFolderName_(name) {
  return String(name || 'อื่น ๆ')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'อื่น ๆ';
}

function testApiUploadFileMissingPayload() {
  return apiUploadFile({});
}
