import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App';
import './index.css';

// 添加详细的错误处理
window.addEventListener('error', (event) => {
  console.error('❌ 全局错误:', event.error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #dc3545; font-family: Arial; background: #fff;">
        <h2>⚠️ 应用启动错误</h2>
        <p><strong>错误信息:</strong> ${event.error?.message || '未知错误'}</p>
        <details style="margin-top: 10px;">
          <summary>错误详情</summary>
          <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${event.error?.stack || ''}</pre>
        </details>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">重新加载页面</button>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ 未处理的Promise拒绝:', event.reason);
});

// 启动日志
console.log('🎬 开始启动智阅AI...');
console.log('🌍 环境:', import.meta.env.MODE);

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('无法找到root元素');
  }

  console.log('📦 创建React根容器...');
  const root = createRoot(rootElement);

  console.log('🎨 渲染主应用组件...');
  root.render(<App />);

  console.log('✅ 应用启动成功！');

  // 显示成功信息
  setTimeout(() => {
    console.log('🎉 智阅AI前端已成功加载！');
  }, 1000);

} catch (error) {
  console.error('💥 应用启动失败:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 显示错误信息
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #dc3545; font-family: Arial; background: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center; max-width: 600px;">
          <h2>💥 应用启动失败</h2>
          <p style="margin: 20px 0;"><strong>错误:</strong> ${errorMessage}</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>可能的解决方案:</h3>
            <ul style="text-align: left; padding-left: 20px;">
              <li>检查浏览器控制台是否有其他错误信息</li>
              <li>确保所有npm依赖已正确安装</li>
              <li>尝试重新启动开发服务器</li>
              <li>清除浏览器缓存</li>
            </ul>
          </div>
          <button onclick="location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">🔄 重新加载</button>
        </div>
      </div>
    `;
  }
}
