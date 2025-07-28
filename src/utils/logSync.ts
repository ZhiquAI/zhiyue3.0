// 日志同步服务 - 将浏览器日志同步到文件系统
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

class LogSyncService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private syncInterval: number | null = null;
  private isEnabled = false;

  constructor() {
    this.initializeSync();
  }

  private initializeSync() {
    // 暂时禁用日志同步功能以减少错误日志
    // 只在开发环境启用
    if (false && import.meta.env.DEV) {
      this.isEnabled = true;
      this.startPeriodicSync();
      this.interceptConsoleMethods();
      this.setupErrorHandlers();
    }
  }

  private interceptConsoleMethods() {
    // 拦截console.log
    const originalLog = console.log;
    console.log = (...args) => {
      this.addLog('info', 'console', args.join(' '), args);
      originalLog.apply(console, args);
    };

    // 拦截console.error
    const originalError = console.error;
    console.error = (...args) => {
      this.addLog('error', 'console', args.join(' '), args);
      originalError.apply(console, args);
    };

    // 拦截console.warn
    const originalWarn = console.warn;
    console.warn = (...args) => {
      this.addLog('warn', 'console', args.join(' '), args);
      originalWarn.apply(console, args);
    };

    // 拦截console.info
    const originalInfo = console.info;
    console.info = (...args) => {
      this.addLog('info', 'console', args.join(' '), args);
      originalInfo.apply(console, args);
    };
  }

  private setupErrorHandlers() {
    // 全局错误处理
    window.addEventListener('error', (event) => {
      this.addLog('error', 'runtime', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Promise拒绝处理
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', 'promise', `Unhandled Promise Rejection: ${event.reason}`, {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  addLog(level: LogEntry['level'], category: string, message: string, data?: any, stack?: string) {
    if (!this.isEnabled) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      stack
    };

    this.logs.unshift(logEntry);
    
    // 保持日志数量限制
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 立即同步重要错误
    if (level === 'error') {
      this.syncToFile();
    }
  }

  private sanitizeData(data: any): any {
    try {
      // 处理循环引用和不可序列化的对象
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Error) return value.toString();
        if (value instanceof HTMLElement) return `[HTMLElement: ${value.tagName}]`;
        return value;
      }));
    } catch (error) {
      return '[Unserializable Object]';
    }
  }

  private startPeriodicSync() {
    // 每5秒同步一次日志
    this.syncInterval = window.setInterval(() => {
      this.syncToFile();
    }, 5000);
  }

  private async syncToFile() {
    if (this.logs.length === 0) return;

    try {
      // 准备日志数据
      const logData = {
        syncTime: new Date().toISOString(),
        totalLogs: this.logs.length,
        logs: this.logs.slice(0, 50) // 只同步最近50条
      };

      // 发送到后端API进行文件写入
      await fetch('/api/dev/sync-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      }).catch(() => {
        // 如果后端不可用，使用localStorage作为备份
        this.syncToLocalStorage(logData);
      });

    } catch (error) {
      console.warn('日志同步失败:', error);
    }
  }

  private syncToLocalStorage(logData: any) {
    try {
      localStorage.setItem('dev_logs', JSON.stringify(logData));
      localStorage.setItem('dev_logs_timestamp', new Date().toISOString());
    } catch (error) {
      console.warn('无法保存日志到localStorage:', error);
    }
  }

  // 获取所有日志
  getLogs(): LogEntry[] {
    return this.logs;
  }

  // 清除日志
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('dev_logs');
  }

  // 导出日志为文本格式
  exportLogsAsText(): string {
    return this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const level = log.level.toUpperCase().padEnd(5);
      const category = log.category.padEnd(10);
      let output = `[${timestamp}] ${level} ${category} ${log.message}`;
      
      if (log.data) {
        output += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
      }
      
      if (log.stack) {
        output += `\n  Stack: ${log.stack}`;
      }
      
      return output;
    }).join('\n\n');
  }

  // 停止同步
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isEnabled = false;
  }
}

// 创建全局实例
const logSyncService = new LogSyncService();

// 导出服务和便捷方法
export default logSyncService;

// 便捷的日志记录方法
export const logInfo = (category: string, message: string, data?: any) => {
  logSyncService.addLog('info', category, message, data);
};

export const logError = (category: string, message: string, data?: any, stack?: string) => {
  logSyncService.addLog('error', category, message, data, stack);
};

export const logWarn = (category: string, message: string, data?: any) => {
  logSyncService.addLog('warn', category, message, data);
};

export const logDebug = (category: string, message: string, data?: any) => {
  logSyncService.addLog('debug', category, message, data);
};

// 将服务挂载到window对象供调试使用
if (import.meta.env.DEV) {
  (window as any).__LOG_SYNC__ = {
    service: logSyncService,
    getLogs: () => logSyncService.getLogs(),
    clearLogs: () => logSyncService.clearLogs(),
    exportLogs: () => logSyncService.exportLogsAsText(),
    downloadLogs: () => {
      const logs = logSyncService.exportLogsAsText();
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zhiyue-ai-logs-${new Date().toISOString().slice(0, 19)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
}
