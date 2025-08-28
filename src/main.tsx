import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App';
import SimpleApp from './SimpleApp';
import './styles/design-system.css';

// 使用简单应用进行调试
const USE_SIMPLE_APP = true;

// 拦截不必要的网络请求
if (typeof window !== 'undefined') {
  // 拦截 fetch 请求
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const url = args[0]?.toString() || '';
      if (url.includes('trace.qq.com') || url.includes('h.trace')) {
        console.warn('🚫 Blocked fetch request to:', url);
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
      return originalFetch.apply(window, args);
    };
  }
  
  // 拦截 XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      if (url && (url.includes('trace.qq.com') || url.includes('h.trace'))) {
        console.warn('🚫 Blocked XHR request to:', url);
        // 返回一个空的成功响应
        setTimeout(() => {
          Object.defineProperty(xhr, 'status', { value: 200 });
          Object.defineProperty(xhr, 'responseText', { value: '{}' });
          Object.defineProperty(xhr, 'readyState', { value: 4 });
          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
        }, 0);
        return;
      }
      return originalOpen.apply(this, [method, url, ...rest]);
    };
    return xhr;
  };
  
  // 拦截动态脚本加载
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && value && (value.includes('trace.qq.com') || value.includes('h.trace'))) {
          console.warn('🚫 Blocked script load from:', value);
          return;
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };
}

// 添加详细的错误处理（仅记录，不操作DOM）
window.addEventListener('error', (event) => {
  // 过滤掉网络错误，专注于JavaScript错误
  if (!event.error?.message?.includes('trace.qq.com')) {
    console.error('❌ 全局错误:', event.error);
  }
  // 阻止错误传播，防止阻塞页面渲染
  if (event.error?.message?.includes('trace.qq.com') || event.error?.message?.includes('h.trace')) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // 如果是追踪服务的拒绝，静默处理
  if (event.reason?.message?.includes('trace.qq.com') || 
      event.reason?.message?.includes('h.trace') ||
      event.reason?.message?.includes('Request blocked by app security policy')) {
    event.preventDefault();
    console.warn('🚫 Blocked tracking request error (handled)');
    return;
  }
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
  
  // 更详细的渲染错误捕获
  try {
    root.render(USE_SIMPLE_APP ? <SimpleApp /> : <App />);
    console.log(`✅ ${USE_SIMPLE_APP ? 'SimpleApp' : 'App'} 启动成功！`);
    
    // 检查DOM是否真的被渲染了
    setTimeout(() => {
      const rootContent = document.getElementById('root');
      console.log('🔍 Root元素内容检查:', rootContent?.innerHTML?.length > 0 ? '有内容' : '无内容');
      if (rootContent?.innerHTML?.length === 0) {
        console.error('⚠️ React组件没有正确渲染到DOM中');
      }
    }, 100);
    
  } catch (renderError) {
    console.error('💥 渲染失败:', renderError);
    throw renderError;
  }

  // 显示成功信息
  setTimeout(() => {
    console.log('🎉 智阅AI前端已成功加载！');
  }, 1000);

} catch (error) {
  console.error('💥 应用启动失败:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 显示错误信息到控制台，让ErrorBoundary处理UI
  console.error('💥 应用启动失败详情:', {
    message: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  // 抛出错误让ErrorBoundary捕获
  throw error;
}
