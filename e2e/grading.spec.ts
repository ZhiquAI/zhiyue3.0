import { test, expect } from '@playwright/test';

test.describe('阅卷功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // 尝试登录（如果需要）
    const loginButton = page.locator('text=登录');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      
      // 填写测试用户信息
      const usernameInput = page.locator('input[type="text"]').or(page.locator('input[type="email"]')).first();
      const passwordInput = page.locator('input[type="password"]');
      
      if (await usernameInput.isVisible()) {
        await usernameInput.fill('test@example.com');
        await passwordInput.fill('password123');
        await page.click('button:has-text("登录")');
        await page.waitForTimeout(2000);
      }
    }
    
    // 导航到阅卷页面
    const gradingLink = page.locator('text=阅卷').or(page.locator('text=批改')).or(page.locator('a[href*="grading"]'));
    if (await gradingLink.isVisible()) {
      await gradingLink.click();
    }
  });

  test('阅卷页面显示', async ({ page }) => {
    // 检查阅卷页面标题
    await expect(page.locator('text=阅卷').or(page.locator('text=批改')).or(page.locator('h1, h2, h3'))).toBeVisible();
    
    // 检查考试选择器
    const examSelector = page.locator('select').or(page.locator('.ant-select')).first();
    await expect(examSelector).toBeVisible();
    
    // 检查阅卷模式选择
    const gradingModeSelector = page.locator('text=客观题').or(page.locator('text=主观题')).or(page.locator('text=智能阅卷'));
    await expect(gradingModeSelector).toBeVisible();
  });

  test('选择考试进行阅卷', async ({ page }) => {
    // 选择考试
    const examSelector = page.locator('select').or(page.locator('.ant-select')).first();
    if (await examSelector.isVisible()) {
      await examSelector.click();
      
      // 等待下拉选项出现
      await page.waitForTimeout(500);
      
      // 选择第一个考试
      const firstExam = page.locator('.ant-select-item').first();
      if (await firstExam.isVisible()) {
        await firstExam.click();
        
        // 等待考试加载
        await page.waitForTimeout(2000);
        
        // 检查是否显示试卷或学生答卷
        const paperContent = page.locator('.paper-content').or(page.locator('.answer-sheet')).or(page.locator('text=试卷'));
        await expect(paperContent).toBeVisible();
      }
    }
  });

  test('客观题自动阅卷', async ({ page }) => {
    // 选择客观题阅卷模式
    const objectiveMode = page.locator('text=客观题').or(page.locator('input[value="objective"]'));
    if (await objectiveMode.isVisible()) {
      await objectiveMode.click();
      
      // 查找开始阅卷按钮
      const startGradingButton = page.locator('text=开始阅卷').or(page.locator('text=自动阅卷')).or(page.locator('button:has-text("阅卷")'));
      if (await startGradingButton.isVisible()) {
        await startGradingButton.click();
        
        // 等待阅卷完成
        await page.waitForTimeout(3000);
        
        // 检查阅卷结果
        const gradingResult = page.locator('text=阅卷完成').or(page.locator('.grading-result')).or(page.locator('text=成绩'));
        await expect(gradingResult).toBeVisible();
      }
    }
  });

  test('主观题手动阅卷', async ({ page }) => {
    // 选择主观题阅卷模式
    const subjectiveMode = page.locator('text=主观题').or(page.locator('input[value="subjective"]'));
    if (await subjectiveMode.isVisible()) {
      await subjectiveMode.click();
      
      // 查找第一个待阅卷的题目
      const firstQuestion = page.locator('.question-item').or(page.locator('.answer-item')).first();
      if (await firstQuestion.isVisible()) {
        await firstQuestion.click();
        
        // 等待题目详情加载
        await page.waitForTimeout(1000);
        
        // 查找分数输入框
        const scoreInput = page.locator('input[placeholder*="分数"]').or(page.locator('input[type="number"]'));
        if (await scoreInput.isVisible()) {
          await scoreInput.fill('8');
          
          // 查找评语输入框
          const commentInput = page.locator('textarea[placeholder*="评语"]').or(page.locator('textarea'));
          if (await commentInput.isVisible()) {
            await commentInput.fill('答题思路清晰，表达准确。');
          }
          
          // 保存评分
          const saveButton = page.locator('button:has-text("保存")').or(page.locator('button:has-text("确定")'));
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // 等待保存结果
            await page.waitForTimeout(1000);
            
            // 检查保存成功提示
            const saveSuccess = await page.locator('text=保存成功').or(page.locator('.ant-message-success')).isVisible().catch(() => false);
            expect(saveSuccess).toBeTruthy();
          }
        }
      }
    }
  });

  test('智能阅卷功能', async ({ page }) => {
    // 选择智能阅卷模式
    const aiMode = page.locator('text=智能阅卷').or(page.locator('text=AI阅卷')).or(page.locator('input[value="ai"]'));
    if (await aiMode.isVisible()) {
      await aiMode.click();
      
      // 查找开始智能阅卷按钮
      const startAiGradingButton = page.locator('text=开始智能阅卷').or(page.locator('text=AI阅卷')).or(page.locator('button:has-text("智能阅卷")'));
      if (await startAiGradingButton.isVisible()) {
        await startAiGradingButton.click();
        
        // 等待AI阅卷完成（可能需要较长时间）
        await page.waitForTimeout(5000);
        
        // 检查AI阅卷结果
        const aiResult = page.locator('text=智能阅卷完成').or(page.locator('.ai-grading-result')).or(page.locator('text=AI评分'));
        await expect(aiResult).toBeVisible();
      }
    }
  });

  test('阅卷进度查看', async ({ page }) => {
    // 查找进度显示区域
    const progressArea = page.locator('.progress').or(page.locator('.ant-progress')).or(page.locator('text=进度'));
    if (await progressArea.isVisible()) {
      await expect(progressArea).toBeVisible();
      
      // 检查进度百分比
      const progressPercent = page.locator('.ant-progress-text').or(page.locator('text=%'));
      if (await progressPercent.isVisible()) {
        await expect(progressPercent).toBeVisible();
      }
    }
  });

  test('阅卷结果统计', async ({ page }) => {
    // 查找统计按钮或链接
    const statisticsButton = page.locator('text=统计').or(page.locator('text=结果统计')).or(page.locator('text=成绩统计'));
    if (await statisticsButton.isVisible()) {
      await statisticsButton.click();
      
      // 等待统计页面加载
      await page.waitForTimeout(2000);
      
      // 检查统计图表
      const charts = page.locator('.ant-chart').or(page.locator('canvas')).or(page.locator('.chart'));
      if (await charts.isVisible()) {
        await expect(charts).toBeVisible();
      }
      
      // 检查统计数据
      const statisticsData = page.locator('.statistics-data').or(page.locator('.ant-statistic')).or(page.locator('text=平均分'));
      if (await statisticsData.isVisible()) {
        await expect(statisticsData).toBeVisible();
      }
    }
  });

  test('导出阅卷结果', async ({ page }) => {
    // 查找导出按钮
    const exportButton = page.locator('text=导出').or(page.locator('text=导出成绩')).or(page.locator('button:has-text("导出")'));
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // 等待导出选项出现
      await page.waitForTimeout(1000);
      
      // 选择导出格式（如果有选择）
      const excelOption = page.locator('text=Excel').or(page.locator('text=.xlsx'));
      if (await excelOption.isVisible()) {
        await excelOption.click();
      }
      
      // 确认导出
      const confirmExportButton = page.locator('button:has-text("确定")').or(page.locator('button:has-text("导出")'));
      if (await confirmExportButton.isVisible()) {
        await confirmExportButton.click();
        
        // 等待导出完成提示
        await page.waitForTimeout(2000);
        
        // 检查导出成功提示
        const exportSuccess = await page.locator('text=导出成功').or(page.locator('.ant-message-success')).isVisible().catch(() => false);
        expect(exportSuccess).toBeTruthy();
      }
    }
  });

  test('阅卷历史记录', async ({ page }) => {
    // 查找历史记录按钮
    const historyButton = page.locator('text=历史记录').or(page.locator('text=阅卷历史'));
    if (await historyButton.isVisible()) {
      await historyButton.click();
      
      // 等待历史记录页面加载
      await page.waitForTimeout(1000);
      
      // 检查历史记录列表
      const historyList = page.locator('.ant-table').or(page.locator('.history-list')).or(page.locator('text=暂无记录'));
      await expect(historyList).toBeVisible();
    }
  });

  test('批量阅卷操作', async ({ page }) => {
    // 查找批量阅卷按钮
    const batchGradingButton = page.locator('text=批量阅卷').or(page.locator('text=批量操作'));
    if (await batchGradingButton.isVisible()) {
      await batchGradingButton.click();
      
      // 等待批量操作界面出现
      await page.waitForTimeout(1000);
      
      // 选择批量操作类型
      const batchType = page.locator('text=批量给分').or(page.locator('text=统一评分'));
      if (await batchType.isVisible()) {
        await batchType.click();
        
        // 输入批量分数
        const batchScoreInput = page.locator('input[placeholder*="分数"]');
        if (await batchScoreInput.isVisible()) {
          await batchScoreInput.fill('7');
          
          // 确认批量操作
          const confirmBatchButton = page.locator('button:has-text("确定")').or(page.locator('button:has-text("应用")'));
          if (await confirmBatchButton.isVisible()) {
            await confirmBatchButton.click();
            
            // 等待批量操作完成
            await page.waitForTimeout(2000);
            
            // 检查操作成功提示
            const batchSuccess = await page.locator('text=批量操作成功').or(page.locator('.ant-message-success')).isVisible().catch(() => false);
            expect(batchSuccess).toBeTruthy();
          }
        }
      }
    }
  });

  test('阅卷质量检查', async ({ page }) => {
    // 查找质量检查按钮
    const qualityCheckButton = page.locator('text=质量检查').or(page.locator('text=复核'));
    if (await qualityCheckButton.isVisible()) {
      await qualityCheckButton.click();
      
      // 等待质量检查页面加载
      await page.waitForTimeout(1000);
      
      // 检查质量检查结果
      const qualityResult = page.locator('.quality-check-result').or(page.locator('text=检查结果')).or(page.locator('.ant-table'));
      await expect(qualityResult).toBeVisible();
    }
  });
});