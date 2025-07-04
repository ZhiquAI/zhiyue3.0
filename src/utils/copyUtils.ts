import { message } from 'antd';

/**
 * 复制文本到剪贴板的工具函数
 * @param text 要复制的文本
 * @param successMessage 成功提示信息
 * @param errorMessage 失败提示信息
 */
export const copyToClipboard = async (
  text: string, 
  successMessage: string = '已复制到剪贴板',
  errorMessage: string = '复制失败'
): Promise<boolean> => {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      message.success(successMessage);
      return true;
    }
    
    // 降级方案：使用传统的 document.execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      message.success(successMessage);
      return true;
    } else {
      throw new Error('execCommand failed');
    }
  } catch (error) {
    console.error('Copy failed:', error);
    message.error(errorMessage);
    return false;
  }
};

/**
 * 格式化错误信息为可读的文本格式
 * @param error 错误对象
 * @param additionalInfo 额外信息
 */
export const formatErrorForCopy = (
  error: any,
  additionalInfo?: Record<string, any>
): string => {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const url = window.location.href;
  
  let errorText = `
=== 智阅AI 错误报告 ===
时间: ${timestamp}
页面: ${url}
浏览器: ${userAgent}
`;

  // 添加错误基本信息
  if (error.name) {
    errorText += `\n错误类型: ${error.name}`;
  }
  
  if (error.message) {
    errorText += `\n错误信息: ${error.message}`;
  }
  
  if (error.stack) {
    errorText += `\n\n错误堆栈:\n${error.stack}`;
  }
  
  // 添加组件堆栈（如果是React错误）
  if (error.componentStack) {
    errorText += `\n\n组件堆栈:\n${error.componentStack}`;
  }
  
  // 添加额外信息
  if (additionalInfo) {
    errorText += `\n\n额外信息:`;
    Object.entries(additionalInfo).forEach(([key, value]) => {
      errorText += `\n${key}: ${JSON.stringify(value, null, 2)}`;
    });
  }
  
  errorText += `\n=========================`;
  
  return errorText.trim();
};

/**
 * 格式化系统信息为可读的文本格式
 */
export const formatSystemInfoForCopy = (): string => {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const url = window.location.href;
  const language = navigator.language;
  const platform = navigator.platform;
  const cookieEnabled = navigator.cookieEnabled;
  const onLine = navigator.onLine;
  
  // 获取屏幕信息
  const screenInfo = {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth
  };
  
  // 获取窗口信息
  const windowInfo = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight
  };
  
  return `
=== 智阅AI 系统信息 ===
导出时间: ${timestamp}
当前页面: ${url}
浏览器: ${userAgent}
语言: ${language}
平台: ${platform}
Cookie启用: ${cookieEnabled}
网络状态: ${onLine ? '在线' : '离线'}

屏幕信息:
- 分辨率: ${screenInfo.width} x ${screenInfo.height}
- 颜色深度: ${screenInfo.colorDepth} 位
- 像素深度: ${screenInfo.pixelDepth} 位

窗口信息:
- 内部尺寸: ${windowInfo.innerWidth} x ${windowInfo.innerHeight}
- 外部尺寸: ${windowInfo.outerWidth} x ${windowInfo.outerHeight}

本地存储:
- localStorage: ${typeof Storage !== 'undefined' && localStorage ? '支持' : '不支持'}
- sessionStorage: ${typeof Storage !== 'undefined' && sessionStorage ? '支持' : '不支持'}
- indexedDB: ${typeof indexedDB !== 'undefined' ? '支持' : '不支持'}

性能信息:
- 内存使用: ${(performance as any).memory ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)}MB` : '不可用'}
- 连接类型: ${(navigator as any).connection?.effectiveType || '未知'}
========================
  `.trim();
};

/**
 * 复制当前页面的调试信息
 */
export const copyDebugInfo = async (): Promise<boolean> => {
  const systemInfo = formatSystemInfoForCopy();
  
  // 获取控制台错误（如果有的话）
  const devTools = (window as any).__DEV_TOOLS__;
  let errorInfo = '';
  
  if (devTools && devTools.getErrors) {
    const errors = devTools.getErrors();
    if (errors.length > 0) {
      errorInfo = `\n\n=== 最近的错误记录 ===\n`;
      errors.slice(0, 5).forEach((error: any, index: number) => {
        errorInfo += `${index + 1}. [${error.timestamp}] ${error.type}: ${error.message}\n`;
      });
    }
  }
  
  const debugText = systemInfo + errorInfo;
  
  return copyToClipboard(
    debugText,
    '调试信息已复制到剪贴板',
    '复制调试信息失败'
  );
};
