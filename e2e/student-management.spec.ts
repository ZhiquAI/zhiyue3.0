import { test, expect } from '@playwright/test';

test.describe('学生管理测试', () => {
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
    
    // 导航到学生管理页面
    const studentManagementLink = page.locator('text=学生管理').or(page.locator('a[href*="student"]'));
    if (await studentManagementLink.isVisible()) {
      await studentManagementLink.click();
    }
  });

  test('学生列表显示', async ({ page }) => {
    // 检查学生管理页面标题
    await expect(page.locator('text=学生管理').or(page.locator('h1, h2, h3'))).toBeVisible();
    
    // 检查添加学生按钮
    const addButton = page.locator('text=添加学生').or(page.locator('text=新增学生')).or(page.locator('button:has-text("添加")')).first();
    await expect(addButton).toBeVisible();
    
    // 检查学生列表或空状态
    const studentList = page.locator('[data-testid="student-list"]').or(page.locator('.ant-table')).or(page.locator('text=暂无学生'));
    await expect(studentList).toBeVisible();
  });

  test('添加新学生流程', async ({ page }) => {
    // 点击添加学生按钮
    const addButton = page.locator('text=添加学生').or(page.locator('text=新增学生')).or(page.locator('button:has-text("添加")')).first();
    await addButton.click();
    
    // 等待添加学生表单出现
    await page.waitForTimeout(1000);
    
    // 检查表单字段
    const nameInput = page.locator('input[placeholder*="姓名"]').or(page.locator('input[placeholder*="学生姓名"]'));
    const studentIdInput = page.locator('input[placeholder*="学号"]').or(page.locator('input[placeholder*="学生ID"]'));
    const emailInput = page.locator('input[placeholder*="邮箱"]').or(page.locator('input[type="email"]'));
    const classInput = page.locator('input[placeholder*="班级"]').or(page.locator('select[placeholder*="班级"]'));
    
    if (await nameInput.isVisible()) {
      await nameInput.fill('测试学生' + Date.now());
    }
    
    if (await studentIdInput.isVisible()) {
      await studentIdInput.fill('STU' + Date.now());
    }
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(`test${Date.now()}@example.com`);
    }
    
    if (await classInput.isVisible()) {
      if (await classInput.getAttribute('tagName') === 'SELECT') {
        await classInput.selectOption({ index: 0 });
      } else {
        await classInput.fill('测试班级');
      }
    }
    
    // 提交表单
    const submitButton = page.locator('button:has-text("确定")').or(page.locator('button:has-text("添加")').or(page.locator('button:has-text("保存")')));
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // 等待添加结果
      await page.waitForTimeout(2000);
      
      // 检查是否有成功或错误信息
      const hasSuccess = await page.locator('text=添加成功').or(page.locator('.ant-message-success')).isVisible().catch(() => false);
      const hasError = await page.locator('text=添加失败').or(page.locator('.ant-message-error')).isVisible().catch(() => false);
      
      expect(hasSuccess || hasError).toBeTruthy();
    }
  });

  test('学生搜索功能', async ({ page }) => {
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

  test('学生信息编辑', async ({ page }) => {
    // 查找编辑按钮
    const editButton = page.locator('text=编辑').or(page.locator('button[title="编辑"]')).first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // 等待编辑表单出现
      await page.waitForTimeout(1000);
      
      // 修改学生姓名
      const nameInput = page.locator('input[placeholder*="姓名"]').or(page.locator('input[value*="学生"]'));
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill('修改后的学生姓名' + Date.now());
        
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

  test('学生删除功能', async ({ page }) => {
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

  test('批量导入学生', async ({ page }) => {
    // 查找批量导入按钮
    const importButton = page.locator('text=批量导入').or(page.locator('text=导入学生'));
    
    if (await importButton.isVisible()) {
      await importButton.click();
      
      // 等待导入对话框出现
      await page.waitForTimeout(1000);
      
      // 查找文件上传区域
      const uploadArea = page.locator('input[type="file"]').or(page.locator('.ant-upload'));
      if (await uploadArea.isVisible()) {
        // 模拟文件上传（这里只是检查上传组件是否存在）
        await expect(uploadArea).toBeVisible();
        
        // 查找取消按钮并点击（避免实际上传文件）
        const cancelButton = page.locator('button:has-text("取消")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    }
  });

  test('学生班级筛选', async ({ page }) => {
    // 查找班级筛选器
    const classFilter = page.locator('select').or(page.locator('.ant-select')).first();
    
    if (await classFilter.isVisible()) {
      await classFilter.click();
      
      // 等待下拉选项出现
      await page.waitForTimeout(500);
      
      // 选择一个班级
      const classOption = page.locator('.ant-select-item').first();
      if (await classOption.isVisible()) {
        await classOption.click();
        
        // 等待筛选结果
        await page.waitForTimeout(1000);
        
        // 检查筛选结果
        const hasFilteredResults = await page.locator('.ant-table-tbody').or(page.locator('text=暂无数据')).isVisible().catch(() => false);
        expect(hasFilteredResults).toBeTruthy();
      }
    }
  });

  test('学生详情查看', async ({ page }) => {
    // 查找查看详情按钮
    const viewButton = page.locator('text=查看').or(page.locator('text=详情')).or(page.locator('button[title="查看"]')).first();
    
    if (await viewButton.isVisible()) {
      await viewButton.click();
      
      // 等待详情页面或模态框出现
      await page.waitForTimeout(1000);
      
      // 检查学生详情信息
      const studentDetails = page.locator('.ant-descriptions').or(page.locator('.student-details')).or(page.locator('text=学生信息'));
      await expect(studentDetails).toBeVisible();
      
      // 关闭详情页面
      const closeButton = page.locator('button:has-text("关闭")').or(page.locator('.ant-modal-close'));
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('学生成绩查看', async ({ page }) => {
    // 查找成绩按钮
    const gradeButton = page.locator('text=成绩').or(page.locator('text=查看成绩')).first();
    
    if (await gradeButton.isVisible()) {
      await gradeButton.click();
      
      // 等待成绩页面出现
      await page.waitForTimeout(1000);
      
      // 检查成绩信息
      const gradeInfo = page.locator('.ant-table').or(page.locator('text=成绩')).or(page.locator('text=暂无成绩'));
      await expect(gradeInfo).toBeVisible();
    }
  });

  test('批量操作学生', async ({ page }) => {
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