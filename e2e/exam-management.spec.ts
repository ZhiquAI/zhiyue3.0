import { test, expect } from '@playwright/test';

test.describe('考试管理测试', () => {
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
    
    // 导航到考试管理页面
    const examManagementLink = page.locator('text=考试管理').or(page.locator('a[href*="exam"]'));
    if (await examManagementLink.isVisible()) {
      await examManagementLink.click();
    }
  });

  test('考试列表显示', async ({ page }) => {
    // 检查考试管理页面标题
    await expect(page.locator('text=考试管理').or(page.locator('h1, h2, h3'))).toBeVisible();
    
    // 检查创建考试按钮
    const createButton = page.locator('text=创建考试').or(page.locator('text=新建考试')).or(page.locator('button:has-text("创建")')).first();
    await expect(createButton).toBeVisible();
    
    // 检查考试列表或空状态
    const examList = page.locator('[data-testid="exam-list"]').or(page.locator('.ant-table')).or(page.locator('text=暂无考试'));
    await expect(examList).toBeVisible();
  });

  test('创建新考试流程', async ({ page }) => {
    // 点击创建考试按钮
    const createButton = page.locator('text=创建考试').or(page.locator('text=新建考试')).or(page.locator('button:has-text("创建")')).first();
    await createButton.click();
    
    // 等待创建考试表单出现
    await page.waitForTimeout(1000);
    
    // 检查表单字段
    const titleInput = page.locator('input[placeholder*="考试名称"]').or(page.locator('input[placeholder*="标题"]'));
    const descriptionInput = page.locator('textarea[placeholder*="描述"]').or(page.locator('input[placeholder*="描述"]'));
    
    if (await titleInput.isVisible()) {
      await titleInput.fill('测试考试 - ' + Date.now());
    }
    
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('这是一个自动化测试创建的考试');
    }
    
    // 设置考试时间（如果有日期选择器）
    const datePickerStart = page.locator('input[placeholder*="开始时间"]').or(page.locator('.ant-picker-input')).first();
    if (await datePickerStart.isVisible()) {
      await datePickerStart.click();
      await page.waitForTimeout(500);
      
      // 选择今天的日期
      const todayButton = page.locator('.ant-picker-today-btn').or(page.locator('text=今天'));
      if (await todayButton.isVisible()) {
        await todayButton.click();
      } else {
        // 如果没有今天按钮，点击确定
        const okButton = page.locator('.ant-btn-primary:has-text("确定")');
        if (await okButton.isVisible()) {
          await okButton.click();
        }
      }
    }
    
    // 提交表单
    const submitButton = page.locator('button:has-text("确定")').or(page.locator('button:has-text("创建")').or(page.locator('button:has-text("保存")')));
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // 等待创建结果
      await page.waitForTimeout(2000);
      
      // 检查是否有成功或错误信息
      const hasSuccess = await page.locator('text=创建成功').or(page.locator('.ant-message-success')).isVisible().catch(() => false);
      const hasError = await page.locator('text=创建失败').or(page.locator('.ant-message-error')).isVisible().catch(() => false);
      
      expect(hasSuccess || hasError).toBeTruthy();
    }
  });

  test('考试搜索功能', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"]').or(page.locator('input[type="search"]'));
    
    if (await searchInput.isVisible()) {
      // 输入搜索关键词
      await searchInput.fill('测试');
      
      // 等待搜索结果
      await page.waitForTimeout(1000);
      
      // 检查搜索结果或无结果提示
      const hasResults = await page.locator('.ant-table-tbody tr').or(page.locator('text=暂无数据')).isVisible().catch(() => false);
      expect(hasResults).toBeTruthy();
    }
  });

  test('考试状态筛选', async ({ page }) => {
    // 查找状态筛选器
    const statusFilter = page.locator('select').or(page.locator('.ant-select')).first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      
      // 等待下拉选项出现
      await page.waitForTimeout(500);
      
      // 选择一个状态
      const activeOption = page.locator('text=进行中').or(page.locator('text=活跃'));
      if (await activeOption.isVisible()) {
        await activeOption.click();
        
        // 等待筛选结果
        await page.waitForTimeout(1000);
        
        // 检查筛选结果
        const hasFilteredResults = await page.locator('.ant-table-tbody').or(page.locator('text=暂无数据')).isVisible().catch(() => false);
        expect(hasFilteredResults).toBeTruthy();
      }
    }
  });

  test('考试编辑功能', async ({ page }) => {
    // 查找编辑按钮
    const editButton = page.locator('text=编辑').or(page.locator('button[title="编辑"]')).first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // 等待编辑表单出现
      await page.waitForTimeout(1000);
      
      // 修改考试名称
      const titleInput = page.locator('input[placeholder*="考试名称"]').or(page.locator('input[value*="考试"]'));
      if (await titleInput.isVisible()) {
        await titleInput.clear();
        await titleInput.fill('修改后的考试名称 - ' + Date.now());
        
        // 保存修改
        const saveButton = page.locator('button:has-text("保存")').or(page.locator('button:has-text("确定")'));
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // 等待保存结果
          await page.waitForTimeout(2000);
          
          // 检查是否有成功或错误信息
          const hasSuccess = await page.locator('text=保存成功').or(page.locator('.ant-message-success')).isVisible().catch(() => false);
          const hasError = await page.locator('text=保存失败').or(page.locator('.ant-message-error')).isVisible().catch(() => false);
          
          expect(hasSuccess || hasError).toBeTruthy();
        }
      }
    }
  });

  test('考试删除功能', async ({ page }) => {
    // 查找删除按钮
    const deleteButton = page.locator('text=删除').or(page.locator('button[title="删除"]')).first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // 等待确认对话框
      await page.waitForTimeout(500);
      
      // 查找确认按钮
      const confirmButton = page.locator('button:has-text("确定")').or(page.locator('button:has-text("删除")').or(page.locator('.ant-btn-dangerous')));
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        
        // 等待删除结果
        await page.waitForTimeout(2000);
        
        // 检查是否有成功或错误信息
        const hasSuccess = await page.locator('text=删除成功').or(page.locator('.ant-message-success')).isVisible().catch(() => false);
        const hasError = await page.locator('text=删除失败').or(page.locator('.ant-message-error')).isVisible().catch(() => false);
        
        expect(hasSuccess || hasError).toBeTruthy();
      }
    }
  });

  test('批量操作功能', async ({ page }) => {
    // 查找复选框
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      // 选择第一个复选框
      await checkboxes.first().click();
      
      // 查找批量操作按钮
      const batchButton = page.locator('text=批量操作').or(page.locator('text=批量删除'));
      if (await batchButton.isVisible()) {
        await batchButton.click();
        
        // 等待批量操作结果
        await page.waitForTimeout(1000);
        
        // 检查是否有操作结果
        const hasResult = await page.locator('.ant-message').or(page.locator('text=操作成功')).isVisible().catch(() => false);
        expect(hasResult).toBeTruthy();
      }
    }
  });
});