/**
 * Smart Document Center (SDC)
 * AnalyzeService.gs
 * วิเคราะห์ชื่อไฟล์ / ปี พ.ศ. / หมวดหมู่ / คำสำคัญเบื้องต้น
 */

/**
 * วิเคราะห์ไฟล์จากชื่อไฟล์
 */
function analyzeFileName(fileName) {
  const originalName = String(fileName || '').trim();
  const cleanName = removeFileExtension_(originalName);

  const yearBE = detectYearBE_(cleanName);
  const categoryResult = detectCategory_(cleanName);
  const subject = detectSubject_(cleanName);
  const keywords = extractKeywords_(cleanName);

  return {
    success: true,
    fileName: originalName,
    suggested: {
      yearBE: yearBE,
      category: categoryResult.category,
      subject: subject,
      keywords: keywords.join(', '),
      aiConfidence: categoryResult.confidence,
      status: categoryResult.confidence >= 70
        ? CONFIG.FILE_STATUS.PENDING
        : CONFIG.FILE_STATUS.NEED_REVIEW
    },
    message: 'วิเคราะห์ชื่อไฟล์สำเร็จ'
  };
}

/**
 * ตัดนามสกุลไฟล์ออก
 */
function removeFileExtension_(fileName) {
  return String(fileName || '').replace(/\.[^/.]+$/, '');
}

/**
 * ตรวจหาปี พ.ศ. จากชื่อไฟล์
 */
function detectYearBE_(text) {
  const str = String(text || '');

  // หาปี พ.ศ. เช่น 2568, 2569, 2570
  const beMatch = str.match(/25[0-9]{2}/);
  if (beMatch) {
    return beMatch[0];
  }

  // หาปี ค.ศ. เช่น 2025, 2026 แล้วแปลงเป็น พ.ศ.
  const ceMatch = str.match(/20[0-9]{2}/);
  if (ceMatch) {
    return String(Number(ceMatch[0]) + 543);
  }

  // ถ้าไม่พบ ใช้ปีปัจจุบัน
  return String(new Date().getFullYear() + 543);
}

/**
 * ตรวจหมวดหมู่จาก keyword ในชีต KEYWORDS
 */
function detectCategory_(text) {
  const str = String(text || '').toLowerCase();
  let bestCategory = 'อื่น ๆ';
  let bestScore = 0;

  let keywordRows = [];

  try {
    keywordRows = getSheetDataAsObjects_(CONFIG.SHEETS.KEYWORDS);
  } catch (err) {
    keywordRows = [];
  }

  keywordRows.forEach(function(row) {
    const keyword = String(row['Keyword'] || '').toLowerCase().trim();
    const category = String(row['ประเภทที่แนะนำ'] || '').trim();
    const weight = Number(row['น้ำหนัก'] || 1);
    const status = String(row['สถานะ'] || '').trim();

    if (!keyword || !category || status !== 'เปิดใช้งาน') {
      return;
    }

    if (str.indexOf(keyword) !== -1) {
      const score = weight * 10;

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }
  });

  // กันคะแนนเกิน 95
  const confidence = Math.min(bestScore, 95);

  return {
    category: bestCategory,
    confidence: confidence || 40
  };
}

/**
 * เดาเรื่องเอกสารจากชื่อไฟล์
 */
function detectSubject_(text) {
  let subject = String(text || '').trim();

  subject = subject
    .replace(/25[0-9]{2}/g, '')
    .replace(/20[0-9]{2}/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const removeWords = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'jpg',
    'png',
    'scan',
    'เอกสาร'
  ];

  removeWords.forEach(function(word) {
    const regex = new RegExp(word, 'gi');
    subject = subject.replace(regex, '');
  });

  subject = subject.replace(/\s+/g, ' ').trim();

  if (!subject) {
    subject = 'ไม่ระบุเรื่อง';
  }

  return subject;
}

/**
 * ดึงคำสำคัญจากชื่อไฟล์
 */
function extractKeywords_(text) {
  const str = String(text || '').toLowerCase();
  const keywords = [];

  let keywordRows = [];

  try {
    keywordRows = getSheetDataAsObjects_(CONFIG.SHEETS.KEYWORDS);
  } catch (err) {
    keywordRows = [];
  }

  keywordRows.forEach(function(row) {
    const keyword = String(row['Keyword'] || '').trim();
    const status = String(row['สถานะ'] || '').trim();

    if (!keyword || status !== 'เปิดใช้งาน') {
      return;
    }

    if (str.indexOf(keyword.toLowerCase()) !== -1) {
      keywords.push(keyword);
    }
  });

  return uniqueArray_(keywords);
}

/**
 * ลบค่าซ้ำใน Array
 */
function uniqueArray_(arr) {
  const map = {};

  arr.forEach(function(item) {
    map[item] = true;
  });

  return Object.keys(map);
}

/**
 * วิเคราะห์แล้วสร้างข้อมูลพร้อมบันทึกเบื้องต้น
 * ใช้สำหรับไฟล์ที่ถูกอัปโหลดแล้ว
 */
function createFileRecordFromAnalysis(fileInfo, source) {
  const analysis = analyzeFileName(fileInfo.fileName);

  const suggested = analysis.suggested;

  return addFileRecord({
    fileName: fileInfo.fileName,
    category: suggested.category,
    yearBE: suggested.yearBE,
    subject: suggested.subject,
    owner: CONFIG.SCHOOL_NAME,
    documentDate: '',
    driveFileId: fileInfo.fileId || '',
    driveUrl: fileInfo.fileUrl || '',
    folderId: fileInfo.folderId || '',
    folderPath: fileInfo.folderPath || '',
    keywords: suggested.keywords,
    aiConfidence: suggested.aiConfidence,
    status: suggested.status,
    source: source || 'WEB',
    note: 'บันทึกจากผลวิเคราะห์ชื่อไฟล์'
  });
}

/**
 * ทดสอบวิเคราะห์ชื่อไฟล์
 */
function testAnalyzeFileName() {
  return analyzeFileName('คำสั่งแต่งตั้งคณะกรรมการกีฬาโรงเรียน ปี2569.pdf');
}

/**
 * ทดสอบวิเคราะห์ชื่อไฟล์ประเภทพัสดุ
 */
function testAnalyzeFileName2() {
  return analyzeFileName('รายงานจัดซื้อวัสดุสำนักงาน พัสดุ 2569.xlsx');
}

/**
 * ทดสอบวิเคราะห์ชื่อไฟล์ที่ไม่ชัดเจน
 */
function testAnalyzeFileName3() {
  return analyzeFileName('เอกสารสแกน_001.pdf');
}