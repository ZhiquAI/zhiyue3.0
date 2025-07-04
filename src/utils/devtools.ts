// 开发者工具集成脚本
import { testGeminiConnection } from './geminiTest';
import logSyncService, { logInfo, logError, logWarn } from './logSync';

// 扩展window对象，添加调试工具
declare global {
  interface Window {
    __DEV_TOOLS__: {
      testGemini: () => Promise<boolean>;
      getErrors: () => any[];
      clearErrors: () => void;
      getErrorCount: () => number;
      logApiCalls: boolean;
      enableVerboseLogging: () => void;
      disableVerboseLogging: () => void;
      onErrorCountChange?: (count: number) => void;
    };
  }
}

// 错误收集器
class ErrorCollector {
  private errors: any[] = [];
  private maxErrors = 100;
  private onErrorCountChange?: (count: number) => void;

  addError(error: any) {
    this.errors.unshift({
      timestamp: new Date().toISOString(),
      ...error
    });

    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // 通知错误计数变化
    if (this.onErrorCountChange) {
      this.onErrorCountChange(this.errors.length);
    }
  }

  getErrors() {
    return this.errors;
  }

  getErrorCount() {
    return this.errors.length;
  }

  clearErrors() {
    this.errors = [];
    if (this.onErrorCountChange) {
      this.onErrorCountChange(0);
    }
  }

  setOnErrorCountChange(callback: (count: number) => void) {
    this.onErrorCountChange = callback;
  }
}

const errorCollector = new ErrorCollector();

// API调用日志
let logApiCalls = false;

// 拦截fetch请求进行日志记录
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options] = args;
  
  if (logApiCalls) {
    console.group(`🌐 API调用: ${url}`);
    console.log('请求选项:', options);
    console.time('请求耗时');
  }
  
  try {
    const response = await originalFetch(...args);
    
    if (logApiCalls) {
      console.log('响应状态:', response.status, response.statusText);
      console.timeEnd('请求耗时');
      console.groupEnd();
    }
    
    // 记录API错误
    if (!response.ok) {
      const errorData = {
        type: 'api_error',
        url: url.toString(),
        status: response.status,
        statusText: response.statusText
      };
      errorCollector.addError(errorData);
      logError('api', `API请求失败: ${response.status} ${response.statusText}`, errorData);
    } else {
      logInfo('api', `API请求成功: ${url}`, { status: response.status });
    }
    
    return response;
  } catch (error) {
    if (logApiCalls) {
      console.error('请求失败:', error);
      console.timeEnd('请求耗时');
      console.groupEnd();
    }
    
    errorCollector.addError({
      type: 'network_error',
      url: url.toString(),
      error: error.message
    });
    
    throw error;
  }
};

// 开发者工具对象
const devTools = {
  // 测试Gemini连接
  testGemini: testGeminiConnection,

  // 获取错误列表
  getErrors: () => errorCollector.getErrors(),

  // 获取错误数量
  getErrorCount: () => errorCollector.getErrorCount(),

  // 清除错误
  clearErrors: () => errorCollector.clearErrors(),

  // API调用日志开关
  logApiCalls: false,

  // 错误计数变化回调
  onErrorCountChange: undefined as ((count: number) => void) | undefined,

  // 启用详细日志
  enableVerboseLogging: () => {
    logApiCalls = true;
    devTools.logApiCalls = true;
    console.log('✅ 已启用详细API日志');
  },

  // 禁用详细日志
  disableVerboseLogging: () => {
    logApiCalls = false;
    devTools.logApiCalls = false;
    console.log('❌ 已禁用详细API日志');
  }
};

// 将开发者工具挂载到window对象
if (import.meta.env.DEV) {
  window.__DEV_TOOLS__ = devTools;

  // 设置错误计数变化回调
  errorCollector.setOnErrorCountChange((count) => {
    if (devTools.onErrorCountChange) {
      devTools.onErrorCountChange(count);
    }
  });

  // 在控制台显示可用的调试命令
  console.log(`
🛠️  智阅AI开发者工具已加载

可用命令：
• __DEV_TOOLS__.testGemini() - 测试Gemini API连接
• __DEV_TOOLS__.getErrors() - 获取错误列表
• __DEV_TOOLS__.getErrorCount() - 获取错误数量
• __DEV_TOOLS__.clearErrors() - 清除错误记录
• __DEV_TOOLS__.enableVerboseLogging() - 启用详细API日志
• __DEV_TOOLS__.disableVerboseLogging() - 禁用详细API日志

快捷方式：
• testGemini() - 测试API连接
• getErrors() - 查看错误
• clearErrors() - 清除错误
  `);

  // 添加快捷方式
  (window as any).testGemini = devTools.testGemini;
  (window as any).getErrors = devTools.getErrors;
  (window as any).clearErrors = devTools.clearErrors;
}

export default devTools;
