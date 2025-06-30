import { message } from 'antd';

export interface ExportData {
  examName: string;
  reportType: '年级报告' | '班级报告' | '个人报告';
  data: any;
  selectedClass?: any;
  selectedStudent?: any;
}

// 生成CSV格式数据
export const generateCSV = (data: any[], headers: string[]): string => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header] || '';
      // 处理包含逗号的值
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');
  
  return csvContent;
};

// 生成HTML报告
export const generateHTMLReport = (exportData: ExportData): string => {
  const { examName, reportType, data, selectedClass, selectedStudent } = exportData;
  
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${examName} - ${reportType}</title>
      <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1677ff; padding-bottom: 20px; }
        .header h1 { color: #1677ff; margin: 0; font-size: 28px; }
        .header p { color: #666; margin: 10px 0 0 0; font-size: 16px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #262626; border-left: 4px solid #1677ff; padding-left: 15px; margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef; }
        .stat-value { font-size: 32px; font-weight: bold; color: #1677ff; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; color: #262626; }
        tr:hover { background-color: #f5f5f5; }
        .suggestion-box { background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 8px; padding: 20px; margin-top: 20px; }
        .suggestion-box h3 { color: #1677ff; margin-top: 0; }
        .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        @media print { body { margin: 20px; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${examName}</h1>
        <p>${reportType} | 生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      </div>
  `;

  if (reportType === '年级报告') {
    htmlContent += `
      <div class="section">
        <h2>年级整体概况</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${data.gradeOverview.studentCount}</div>
            <div class="stat-label">参考人数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.gradeOverview.avgScore}</div>
            <div class="stat-label">平均分</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.gradeOverview.passRate}%</div>
            <div class="stat-label">及格率</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.gradeOverview.excellentRate}%</div>
            <div class="stat-label">优秀率</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>班级对比分析</h2>
        <table>
          <thead>
            <tr>
              <th>班级</th>
              <th>平均分</th>
              <th>优秀率</th>
            </tr>
          </thead>
          <tbody>
            ${data.gradeOverview.classCompare.map((cls: any) => `
              <tr>
                <td>${cls.name}</td>
                <td>${cls['平均分']}</td>
                <td>${cls['优秀率']}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>能力维度分析</h2>
        <table>
          <thead>
            <tr>
              <th>能力维度</th>
              <th>平均得分率</th>
            </tr>
          </thead>
          <tbody>
            ${data.gradeOverview.abilityData.map((ability: any) => `
              <tr>
                <td>${ability.ability}</td>
                <td>${ability['平均得分率']}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="suggestion-box">
        <h3>🤖 AI教学建议</h3>
        <p>${data.gradeOverview.aiSuggestion}</p>
      </div>
    `;
  } else if (reportType === '班级报告' && selectedClass) {
    htmlContent += `
      <div class="section">
        <h2>${selectedClass.className} 班级概况</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${selectedClass.studentCount}</div>
            <div class="stat-label">班级人数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${selectedClass.avgScore}</div>
            <div class="stat-label">班级平均分</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${selectedClass.passRate}%</div>
            <div class="stat-label">班级及格率</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${selectedClass.excellentRate}%</div>
            <div class="stat-label">班级优秀率</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>学生成绩明细</h2>
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>分数</th>
              <th>班级排名</th>
            </tr>
          </thead>
          <tbody>
            ${selectedClass.students.map((student: any) => `
              <tr>
                <td>${student.name}</td>
                <td>${student.score}</td>
                <td>${student.rank}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>能力对比分析（班级 vs 年级）</h2>
        <table>
          <thead>
            <tr>
              <th>能力维度</th>
              <th>班级得分率</th>
              <th>年级得分率</th>
              <th>差值</th>
            </tr>
          </thead>
          <tbody>
            ${selectedClass.abilityData.map((ability: any) => {
              const diff = ability['班级得分率'] - ability['年级得分率'];
              return `
                <tr>
                  <td>${ability.ability}</td>
                  <td>${ability['班级得分率']}%</td>
                  <td>${ability['年级得分率']}%</td>
                  <td style="color: ${diff >= 0 ? '#52c41a' : '#ff4d4f'}">${diff > 0 ? '+' : ''}${diff}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="suggestion-box">
        <h3>🤖 AI教学建议</h3>
        <p>${selectedClass.aiSuggestion}</p>
      </div>
    `;
  } else if (reportType === '个人报告' && selectedStudent) {
    htmlContent += `
      <div class="section">
        <h2>${selectedStudent.name} 个人成绩报告</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${selectedStudent.score}</div>
            <div class="stat-label">总分</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${selectedStudent.rank}</div>
            <div class="stat-label">班级排名</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">231</div>
            <div class="stat-label">年级排名</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>个人能力分析</h2>
        <table>
          <thead>
            <tr>
              <th>能力维度</th>
              <th>个人得分率</th>
              <th>班级平均</th>
              <th>差值</th>
            </tr>
          </thead>
          <tbody>
            ${data.personalReport.abilityData.map((ability: any) => {
              const diff = ability['个人得分率'] - ability['班级得分率'];
              return `
                <tr>
                  <td>${ability.ability}</td>
                  <td>${ability['个人得分率']}%</td>
                  <td>${ability['班级得分率']}%</td>
                  <td style="color: ${diff >= 0 ? '#52c41a' : '#ff4d4f'}">${diff > 0 ? '+' : ''}${diff}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="suggestion-box">
        <h3>🤖 AI学习建议</h3>
        <p>${data.personalReport.aiSuggestion}</p>
      </div>
    `;
  }

  htmlContent += `
      <div class="footer">
        <p>本报告由智阅AI自动生成 | 生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      </div>
    </body>
    </html>
  `;

  return htmlContent;
};

// 下载文件
export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// 主导出函数
export const exportReport = async (exportData: ExportData, format: 'html' | 'csv' | 'pdf' = 'html') => {
  const { examName, reportType, selectedClass, selectedStudent } = exportData;
  
  try {
    message.loading('正在生成报告...', 0);
    
    // 模拟异步处理
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let filename = `${examName}_${reportType}_${timestamp}`;
    
    if (selectedClass) {
      filename += `_${selectedClass.className}`;
    }
    if (selectedStudent) {
      filename += `_${selectedStudent.name}`;
    }

    if (format === 'html') {
      const htmlContent = generateHTMLReport(exportData);
      downloadFile(htmlContent, `${filename}.html`, 'text/html;charset=utf-8');
      message.destroy();
      message.success('HTML报告导出成功！');
    } else if (format === 'csv') {
      let csvData: any[] = [];
      let headers: string[] = [];
      
      if (reportType === '年级报告') {
        headers = ['班级', '平均分', '优秀率'];
        csvData = exportData.data.gradeOverview.classCompare.map((cls: any) => ({
          '班级': cls.name,
          '平均分': cls['平均分'],
          '优秀率': cls['优秀率']
        }));
      } else if (reportType === '班级报告' && selectedClass) {
        headers = ['姓名', '分数', '班级排名'];
        csvData = selectedClass.students.map((student: any) => ({
          '姓名': student.name,
          '分数': student.score,
          '班级排名': student.rank
        }));
      } else if (reportType === '个人报告' && selectedStudent) {
        headers = ['能力维度', '个人得分率', '班级平均'];
        csvData = exportData.data.personalReport.abilityData.map((ability: any) => ({
          '能力维度': ability.ability,
          '个人得分率': ability['个人得分率'],
          '班级平均': ability['班级得分率']
        }));
      }
      
      const csvContent = generateCSV(csvData, headers);
      downloadFile('\ufeff' + csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
      message.destroy();
      message.success('CSV数据导出成功！');
    } else if (format === 'pdf') {
      // PDF导出需要额外的库支持，这里先提示用户
      message.destroy();
      message.info('PDF导出功能正在开发中，请先使用HTML格式导出后打印为PDF');
    }
    
  } catch (error) {
    message.destroy();
    message.error('导出失败，请重试');
    console.error('Export error:', error);
  }
};

// 打印报告
export const printReport = (exportData: ExportData) => {
  const htmlContent = generateHTMLReport(exportData);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // 等待内容加载完成后打印
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    message.error('无法打开打印窗口，请检查浏览器设置');
  }
};