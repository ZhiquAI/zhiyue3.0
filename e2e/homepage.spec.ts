import { test, expect } from '@playwright/test';

test.describe('首页测试', () => {
  test('应该正确加载首页', async ({ page }) => {
    await page.goto('/');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/智阅AI/);
    
    // 检查主要导航元素
    await expect(page.locator('text=智阅AI')).toBeVisible();
    
    // 检查登录按钮
    await expect(page.locator('text=登录')).toBeVisible();
    
    // 检查注册按钮
    await expect(page.locator('text=注册')).toBeVisible();
  });

  test('应该显示功能介绍卡片', async ({ page }) => {
    await page.goto('/');
    
    // 检查功能卡片是否存在
    await expect(page.locator('text=智能阅卷')).toBeVisible();
    await expect(page.locator('text=考试管理')).toBeVisible();
    await expect(page.locator('text=数据分析')).toBeVisible();
  });

  test('导航菜单应该正常工作', async ({ page }) => {
    await page.goto('/');
    
    // 点击登录按钮
    await page.click('text=登录');
    
    // 应该跳转到登录页面或显示登录模态框
    await expect(page.locator('text=用户名').or(page.locator('text=邮箱'))).toBeVisible();
  });

  test('响应式设计测试', async ({ page }) => {
    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // 检查移动端导航
    await expect(page.locator('text=智阅AI')).toBeVisible();
    
    // 测试桌面端视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    // 检查桌面端布局
    await expect(page.locator('text=智阅AI')).toBeVisible();
  });
});