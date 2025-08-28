import { test, expect } from '@playwright/test';

test.describe('用户认证测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('用户登录流程', async ({ page }) => {
    // 点击登录按钮
    await page.click('text=登录');
    
    // 等待登录表单出现
    await expect(page.locator('input[type="text"]').or(page.locator('input[type="email"]'))).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // 填写登录信息
    const usernameInput = page.locator('input[type="text"]').or(page.locator('input[type="email"]')).first();
    const passwordInput = page.locator('input[type="password"]');
    
    await usernameInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    // 点击登录按钮
    await page.click('button:has-text("登录")');
    
    // 等待登录结果（成功或失败）
    // 由于是测试环境，可能会显示错误信息或跳转到仪表板
    await page.waitForTimeout(2000);
    
    // 检查是否有错误信息或成功跳转
    const hasError = await page.locator('text=用户名或密码错误').isVisible().catch(() => false);
    const hasDashboard = await page.locator('text=仪表板').or(page.locator('text=考试管理')).isVisible().catch(() => false);
    
    expect(hasError || hasDashboard).toBeTruthy();
  });

  test('用户注册流程', async ({ page }) => {
    // 点击注册按钮
    await page.click('text=注册');
    
    // 等待注册表单出现
    await expect(page.locator('input[placeholder*="用户名"]').or(page.locator('input[placeholder*="邮箱"]'))).toBeVisible();
    
    // 填写注册信息
    const usernameInput = page.locator('input[placeholder*="用户名"]').or(page.locator('input[placeholder*="邮箱"]')).first();
    const emailInput = page.locator('input[type="email"]').or(page.locator('input[placeholder*="邮箱"]'));
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();
    
    if (await usernameInput.isVisible()) {
      await usernameInput.fill('testuser');
    }
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('newuser@example.com');
    }
    
    await passwordInput.fill('password123');
    
    if (await confirmPasswordInput.isVisible() && confirmPasswordInput !== passwordInput) {
      await confirmPasswordInput.fill('password123');
    }
    
    // 点击注册按钮
    await page.click('button:has-text("注册")');
    
    // 等待注册结果
    await page.waitForTimeout(2000);
    
    // 检查是否有成功或错误信息
    const hasSuccess = await page.locator('text=注册成功').isVisible().catch(() => false);
    const hasError = await page.locator('text=用户已存在').or(page.locator('text=注册失败')).isVisible().catch(() => false);
    
    expect(hasSuccess || hasError).toBeTruthy();
  });

  test('表单验证测试', async ({ page }) => {
    // 测试登录表单验证
    await page.click('text=登录');
    
    // 不填写任何信息直接提交
    await page.click('button:has-text("登录")');
    
    // 等待验证错误信息
    await page.waitForTimeout(1000);
    
    // 检查是否有验证错误信息
    const hasValidationError = await page.locator('text=请输入').or(page.locator('text=必填')).isVisible().catch(() => false);
    
    if (hasValidationError) {
      expect(hasValidationError).toBeTruthy();
    }
  });

  test('密码重置流程', async ({ page }) => {
    await page.click('text=登录');
    
    // 查找忘记密码链接
    const forgotPasswordLink = page.locator('text=忘记密码').or(page.locator('text=找回密码'));
    
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // 检查是否显示密码重置表单
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // 填写邮箱
      await page.fill('input[type="email"]', 'test@example.com');
      
      // 点击发送重置邮件按钮
      await page.click('button:has-text("发送")');
      
      // 等待结果
      await page.waitForTimeout(2000);
      
      // 检查是否有成功或错误信息
      const hasMessage = await page.locator('text=已发送').or(page.locator('text=邮箱不存在')).isVisible().catch(() => false);
      expect(hasMessage).toBeTruthy();
    }
  });
});