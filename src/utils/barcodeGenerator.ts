/**
 * 条码生成和PDF输出工具
 * 为每个学生生成唯一条码并输出PDF
 */

export interface StudentInfo {
  id: string;
  name: string;
  studentNumber: string;
  examNumber: string;
  className?: string;
  grade?: string;
}

export interface BarcodeConfig {
  type: 'qrcode' | 'code128' | 'datamatrix';
  width: number;
  height: number;
  format: 'png' | 'svg';
  encoding?: 'utf8' | 'ascii';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // For QR codes
}

export interface PDFLayoutConfig {
  pageSize: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  rows: number;
  columns: number;
  includeText: boolean;
  fontSize: number;
  barcodeSize: {
    width: number;
    height: number;
  };
}

/**
 * 生成学生条码数据
 */
export function generateBarcodeData(student: StudentInfo, examId?: string): string {
  const data = {
    studentId: student.id,
    name: student.name,
    studentNumber: student.studentNumber,
    examNumber: student.examNumber,
    className: student.className,
    examId: examId,
    timestamp: new Date().toISOString()
  };

  // 根据条码类型决定数据格式
  return JSON.stringify(data);
}

/**
 * 生成二维码
 */
export async function generateQRCode(
  data: string, 
  config: BarcodeConfig
): Promise<string> {
  try {
    // 这里应该使用实际的二维码库，如 qrcode.js
    // 目前返回模拟数据
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // 简单的占位符绘制
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, config.width, config.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('QR', 10, 20);
    }
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('生成二维码失败:', error);
    throw new Error('生成二维码失败');
  }
}

/**
 * 生成条形码
 */
export async function generateBarcode(
  data: string, 
  config: BarcodeConfig
): Promise<string> {
  try {
    // 这里应该使用实际的条形码库，如 JsBarcode
    // 目前返回模拟数据
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // 简单的条形码占位符
      ctx.fillStyle = '#000000';
      for (let i = 0; i < config.width; i += 4) {
        if (i % 8 === 0) {
          ctx.fillRect(i, 0, 2, config.height);
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('生成条形码失败:', error);
    throw new Error('生成条形码失败');
  }
}

/**
 * 批量生成学生条码
 */
export async function generateStudentBarcodes(
  students: StudentInfo[],
  examId: string,
  barcodeConfig: BarcodeConfig
): Promise<Array<{
  student: StudentInfo;
  barcodeData: string;
  barcodeImage: string;
}>> {
  const results = [];

  for (const student of students) {
    try {
      const barcodeData = generateBarcodeData(student, examId);
      let barcodeImage: string;

      switch (barcodeConfig.type) {
        case 'qrcode':
          barcodeImage = await generateQRCode(barcodeData, barcodeConfig);
          break;
        case 'code128':
          barcodeImage = await generateBarcode(barcodeData, barcodeConfig);
          break;
        case 'datamatrix':
          // DataMatrix 实现
          barcodeImage = await generateQRCode(barcodeData, barcodeConfig); // 临时使用QR码
          break;
        default:
          throw new Error(`不支持的条码类型: ${barcodeConfig.type}`);
      }

      results.push({
        student,
        barcodeData,
        barcodeImage
      });
    } catch (error) {
      console.error(`为学生 ${student.name} 生成条码失败:`, error);
      // 继续处理其他学生
    }
  }

  return results;
}

/**
 * 生成PDF文档
 */
export async function generateBarcodesPDF(
  barcodeResults: Array<{
    student: StudentInfo;
    barcodeData: string;
    barcodeImage: string;
  }>,
  layoutConfig: PDFLayoutConfig,
  examInfo?: {
    name: string;
    subject: string;
    date: string;
  }
): Promise<Blob> {
  try {
    // 这里应该使用实际的PDF库，如 jsPDF 或 PDF-lib
    // 目前创建一个简单的HTML内容用于测试
    
    const htmlContent = generatePDFHTML(barcodeResults, layoutConfig, examInfo);
    
    // 创建临时HTML并打印为PDF（实际应用中应使用专业PDF库）
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // 等待内容加载完成
      await new Promise(resolve => {
        printWindow.addEventListener('load', resolve);
      });
      
      // 触发打印对话框
      printWindow.print();
      printWindow.close();
    }
    
    // 返回空的Blob（实际应返回PDF数据）
    return new Blob([''], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('生成PDF失败:', error);
    throw new Error('生成PDF失败');
  }
}

/**
 * 生成PDF的HTML内容
 */
function generatePDFHTML(
  barcodeResults: Array<{
    student: StudentInfo;
    barcodeData: string;
    barcodeImage: string;
  }>,
  layoutConfig: PDFLayoutConfig,
  examInfo?: {
    name: string;
    subject: string;
    date: string;
  }
): string {
  const { rows, columns, includeText, fontSize, barcodeSize } = layoutConfig;
  const itemsPerPage = rows * columns;
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>学生条码打印</title>
      <style>
        @page {
          margin: ${layoutConfig.margin.top}mm ${layoutConfig.margin.right}mm 
                  ${layoutConfig.margin.bottom}mm ${layoutConfig.margin.left}mm;
          size: ${layoutConfig.pageSize} ${layoutConfig.orientation};
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .page {
          page-break-after: always;
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 10px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(${columns}, 1fr);
          grid-template-rows: repeat(${rows}, 1fr);
          gap: 10px;
          flex: 1;
        }
        .barcode-item {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .barcode-image {
          width: ${barcodeSize.width}px;
          height: ${barcodeSize.height}px;
          margin-bottom: 5px;
        }
        .student-info {
          font-size: ${fontSize}px;
          line-height: 1.2;
        }
        .student-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
        .student-details {
          font-size: ${fontSize - 2}px;
          color: #666;
        }
      </style>
    </head>
    <body>
  `;

  // 分页处理
  for (let pageIndex = 0; pageIndex * itemsPerPage < barcodeResults.length; pageIndex++) {
    const pageItems = barcodeResults.slice(
      pageIndex * itemsPerPage,
      (pageIndex + 1) * itemsPerPage
    );

    html += `
      <div class="page">
        <div class="header">
          <h2>${examInfo?.name || '考试条码'}</h2>
          ${examInfo?.subject ? `<p>科目：${examInfo.subject}</p>` : ''}
          ${examInfo?.date ? `<p>日期：${examInfo.date}</p>` : ''}
        </div>
        <div class="grid">
    `;

    // 添加条码项
    for (let i = 0; i < itemsPerPage; i++) {
      const item = pageItems[i];
      
      if (item) {
        html += `
          <div class="barcode-item">
            <img src="${item.barcodeImage}" alt="条码" class="barcode-image" />
            ${includeText ? `
              <div class="student-info">
                <div class="student-name">${item.student.name}</div>
                <div class="student-details">
                  <div>学号: ${item.student.studentNumber}</div>
                  <div>准考证: ${item.student.examNumber}</div>
                  ${item.student.className ? `<div>班级: ${item.student.className}</div>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        html += `<div class="barcode-item"></div>`;
      }
    }

    html += `
        </div>
      </div>
    `;
  }

  html += `
    </body>
    </html>
  `;

  return html;
}

/**
 * 导出条码数据为Excel
 */
export function exportBarcodesToExcel(
  barcodeResults: Array<{
    student: StudentInfo;
    barcodeData: string;
    barcodeImage: string;
  }>,
  examInfo?: {
    name: string;
    subject: string;
    date: string;
  }
): void {
  try {
    // 创建CSV内容
    const headers = ['姓名', '学号', '准考证号', '班级', '条码数据'];
    const csvContent = [
      headers.join(','),
      ...barcodeResults.map(item => [
        `"${item.student.name}"`,
        `"${item.student.studentNumber}"`,
        `"${item.student.examNumber}"`,
        `"${item.student.className || ''}"`,
        `"${item.barcodeData}"`
      ].join(','))
    ].join('\n');

    // 创建并下载文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${examInfo?.name || '考试'}_条码数据.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出Excel失败:', error);
    throw new Error('导出Excel失败');
  }
}

/**
 * 预设的条码配置
 */
export const BARCODE_PRESETS = {
  qr_small: {
    type: 'qrcode' as const,
    width: 80,
    height: 80,
    format: 'png' as const,
    errorCorrectionLevel: 'M' as const
  },
  qr_medium: {
    type: 'qrcode' as const,
    width: 120,
    height: 120,
    format: 'png' as const,
    errorCorrectionLevel: 'M' as const
  },
  code128_standard: {
    type: 'code128' as const,
    width: 150,
    height: 50,
    format: 'png' as const,
    encoding: 'utf8' as const
  }
};

/**
 * 预设的PDF布局配置
 */
export const PDF_LAYOUT_PRESETS = {
  a4_2x5: {
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    rows: 5,
    columns: 2,
    includeText: true,
    fontSize: 12,
    barcodeSize: { width: 100, height: 100 }
  },
  a4_3x4: {
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margin: { top: 15, right: 15, bottom: 15, left: 15 },
    rows: 4,
    columns: 3,
    includeText: true,
    fontSize: 10,
    barcodeSize: { width: 80, height: 80 }
  },
  a4_4x6: {
    pageSize: 'A4' as const,
    orientation: 'portrait' as const,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    rows: 6,
    columns: 4,
    includeText: false,
    fontSize: 8,
    barcodeSize: { width: 60, height: 60 }
  }
};