import { useState, useCallback, useRef, useEffect } from 'react';
import { message, notification } from 'antd';

// 错误类型定义
interface ErrorRecord {
  id: string;
  error: Error;
  context: ErrorContext;
  timestamp: Date;
  retryCount: number;
  resolved: boolean;
  recoveryStrategy?: string;
}

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

interface ErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => void;
  onRetry?: (context: ErrorContext) => Promise<void>;
  onFallback?: (context: ErrorContext) => void;
  silent?: boolean;
}

interface RecoveryStrategy {
  name: string;
  condition: (error: Error, context: ErrorContext) => boolean;
  execute: (error: Error, context: ErrorContext) => Promise<RecoveryResult>;
  priority: number;
}

interface RecoveryResult {
  success: boolean;
  message: string;
  nextAction?: 'retry' | 'fallback' | 'abort' | 'manual';
  data?: any;
}

// 常用的恢复策略
const createRecoveryStrategies = (): RecoveryStrategy[] => [
  // 网络错误恢复策略
  {
    name: 'network_retry',
    condition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('fetch') || 
             message.includes('timeout') ||
             message.includes('connection');
    },
    execute: async (error: Error, context: ErrorContext): Promise<RecoveryResult> => {
      // 等待网络恢复
      if (navigator.onLine) {
        return {
          success: true,
          message: '网络连接已恢复，可以重试',
          nextAction: 'retry'
        };
      }
      
      // 等待网络连接
      return new Promise((resolve) => {
        const handleOnline = () => {
          window.removeEventListener('online', handleOnline);
          resolve({
            success: true,
            message: '网络连接已恢复',
            nextAction: 'retry'
          });
        };
        
        window.addEventListener('online', handleOnline);
        
        // 10秒后超时
        setTimeout(() => {
          window.removeEventListener('online', handleOnline);
          resolve({
            success: false,
            message: '网络连接超时',
            nextAction: 'manual'
          });
        }, 10000);
      });
    },
    priority: 1
  },

  // API错误恢复策略
  {
    name: 'api_fallback',
    condition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('api') || 
             message.includes('server') || 
             message.includes('503') ||
             message.includes('502');
    },
    execute: async (error: Error, context: ErrorContext): Promise<RecoveryResult> => {
      // 检查是否有备用API端点
      const backupEndpoints = JSON.parse(
        localStorage.getItem('backup_endpoints') || '[]'
      );
      
      if (backupEndpoints.length > 0) {
        return {
          success: true,
          message: '已切换到备用服务',
          nextAction: 'retry',
          data: { useBackup: true }
        };
      }
      
      return {
        success: false,
        message: '服务暂时不可用',
        nextAction: 'fallback'
      };
    },
    priority: 2
  },

  // 文件处理错误恢复策略
  {
    name: 'file_processing_retry',
    condition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('file') || 
             message.includes('upload') || 
             message.includes('processing');
    },
    execute: async (error: Error, context: ErrorContext): Promise<RecoveryResult> => {
      // 检查文件是否仍然可用
      if (context.additionalData?.file) {
        const file = context.additionalData.file as File;
        
        // 简单的文件可用性检查
        if (file.size > 0 && file.name) {
          return {
            success: true,
            message: '文件验证通过，可以重试处理',
            nextAction: 'retry'
          };
        }
      }
      
      return {
        success: false,
        message: '文件不可用，请重新选择',
        nextAction: 'manual'
      };
    },
    priority: 3
  },

  // AI服务错误恢复策略
  {
    name: 'ai_service_fallback',
    condition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('ai') || 
             message.includes('gemini') || 
             message.includes('quota') ||
             message.includes('rate limit');
    },
    execute: async (error: Error, context: ErrorContext): Promise<RecoveryResult> => {
      // 检查是否可以使用规则引擎作为后备
      const hasRuleEngine = localStorage.getItem('rule_engine_available') === 'true';
      
      if (hasRuleEngine) {
        return {
          success: true,
          message: '已切换到规则引擎处理',
          nextAction: 'retry',
          data: { useRuleEngine: true }
        };
      }
      
      return {
        success: false,
        message: 'AI服务暂时不可用，需要人工处理',
        nextAction: 'manual'
      };
    },
    priority: 4
  },

  // 内存错误恢复策略
  {
    name: 'memory_cleanup',
    condition: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('memory') || 
             message.includes('heap') || 
             message.includes('out of memory');
    },
    execute: async (error: Error, context: ErrorContext): Promise<RecoveryResult> => {
      // 尝试清理内存
      if (window.gc) {
        window.gc(); // 如果可用，强制垃圾回收
      }
      
      // 清理本地存储的临时数据
      const keysToClean = Object.keys(localStorage).filter(key => 
        key.startsWith('temp_') || key.startsWith('cache_')
      );
      
      keysToClean.forEach(key => localStorage.removeItem(key));
      
      return {
        success: true,
        message: '已清理内存，建议减少并发处理数量',
        nextAction: 'retry'
      };
    },
    priority: 5
  }
];

// 错误ID生成器
const generateErrorId = (error: Error, context: ErrorContext): string => {
  const errorSignature = `${error.name}_${context.component || 'unknown'}_${context.action || 'unknown'}`;
  return `${errorSignature}_${Date.now()}`;
};

// 计算重试延迟（指数退避）
const calculateRetryDelay = (retryCount: number, baseDelay: number = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // 最大30秒
};

// 判断是否应该重试
const shouldRetry = (error: Error, context: ErrorContext, retryCount: number): boolean => {
  const maxRetries = 3;
  if (retryCount >= maxRetries) return false;
  
  // 某些错误类型不应该重试
  const noRetryErrors = ['permission', 'unauthorized', 'validation', 'syntax'];
  const errorMessage = error.message.toLowerCase();
  
  return !noRetryErrors.some(pattern => errorMessage.includes(pattern));
};

// 获取用户友好的错误信息
const getUserFriendlyErrorMessage = (error: Error): string => {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('network')) {
    return '网络连接失败，请检查网络设置';
  }
  if (errorMessage.includes('permission')) {
    return '权限不足，请联系管理员';
  }
  if (errorMessage.includes('file')) {
    return '文件处理失败，请检查文件格式';
  }
  if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    return '服务使用频率过高，请稍后再试';
  }
  
  return '操作失败，请稍后重试或联系技术支持';
};

export const useErrorRecovery = () => {
  const [errorHistory, setErrorHistory] = useState<ErrorRecord[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const retryCountMap = useRef(new Map<string, number>());
  const recoveryStrategies = useRef(createRecoveryStrategies());

  // 添加自定义恢复策略
  const addRecoveryStrategy = useCallback((strategy: RecoveryStrategy) => {
    recoveryStrategies.current.push(strategy);
    // 按优先级排序
    recoveryStrategies.current.sort((a, b) => a.priority - b.priority);
  }, []);

  // 获取适合的恢复策略
  const getRecoveryStrategy = useCallback((error: Error, context: ErrorContext): RecoveryStrategy | null => {
    return recoveryStrategies.current.find(strategy => 
      strategy.condition(error, context)
    ) || null;
  }, []);

  // 主要错误处理函数
  const handleError = useCallback(async (
    error: Error,
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
  ) => {
    const errorId = generateErrorId(error, context);
    const retryCount = retryCountMap.current.get(errorId) || 0;
    const maxRetries = options.maxRetries || 3;

    // 记录错误
    const errorRecord: ErrorRecord = {
      id: errorId,
      error,
      context,
      timestamp: new Date(),
      retryCount,
      resolved: false
    };

    setErrorHistory(prev => {
      const updated = [errorRecord, ...prev.slice(0, 19)]; // 保持最多20个错误记录
      return updated;
    });

    // 静默模式不显示用户通知
    if (!options.silent) {
      console.error('Error handled by useErrorRecovery:', error);
    }

    // 尝试恢复策略
    const strategy = getRecoveryStrategy(error, context);
    let recoveryResult: RecoveryResult | null = null;

    if (strategy && retryCount < maxRetries) {
      setIsRecovering(true);
      
      try {
        recoveryResult = await strategy.execute(error, context);
        errorRecord.recoveryStrategy = strategy.name;
        
        if (recoveryResult.success) {
          // 恢复成功
          if (!options.silent) {
            message.success(recoveryResult.message);
          }
          
          if (recoveryResult.nextAction === 'retry' && options.onRetry) {
            // 增加重试计数
            retryCountMap.current.set(errorId, retryCount + 1);
            
            // 延迟后重试
            const delay = calculateRetryDelay(retryCount, options.retryDelay);
            setTimeout(async () => {
              try {
                await options.onRetry!(context);
                // 重试成功，标记错误为已解决
                setErrorHistory(prev => 
                  prev.map(record => 
                    record.id === errorId ? { ...record, resolved: true } : record
                  )
                );
              } catch (retryError) {
                // 重试失败，递归处理
                await handleError(retryError as Error, context, {
                  ...options,
                  maxRetries: maxRetries - 1
                });
              }
            }, delay);
            
            return { 
              shouldRetry: true, 
              retryDelay: delay, 
              strategy: strategy.name,
              recoveryResult
            };
          }
        }
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      } finally {
        setIsRecovering(false);
      }
    }

    // 恢复失败或无可用策略
    if (!recoveryResult?.success) {
      // 尝试fallback
      if (options.fallbackAction) {
        options.fallbackAction();
        return { 
          shouldRetry: false, 
          usedFallback: true,
          recoveryResult
        };
      }

      // 显示用户友好的错误信息
      if (!options.silent) {
        const userMessage = getUserFriendlyErrorMessage(error);
        
        notification.error({
          message: '操作失败',
          description: userMessage,
          duration: 0,
          key: errorId,
          btn: shouldRetry(error, context, retryCount) ? (
            <div>
              <button 
                onClick={() => {
                  notification.close(errorId);
                  handleError(error, context, options);
                }}
                style={{ marginRight: 8 }}
              >
                重试
              </button>
              <button onClick={() => notification.close(errorId)}>
                关闭
              </button>
            </div>
          ) : undefined
        });
      }
    }

    return { 
      shouldRetry: false, 
      recoveryResult,
      strategy: strategy?.name
    };
  }, [getRecoveryStrategy]);

  // 手动重试错误
  const retryError = useCallback(async (errorId: string, context: ErrorContext) => {
    const errorRecord = errorHistory.find(record => record.id === errorId);
    if (!errorRecord || errorRecord.resolved) return;

    await handleError(errorRecord.error, context, {
      maxRetries: 1,
      silent: false
    });
  }, [errorHistory, handleError]);

  // 标记错误为已解决
  const resolveError = useCallback((errorId: string) => {
    setErrorHistory(prev =>
      prev.map(record =>
        record.id === errorId ? { ...record, resolved: true } : record
      )
    );
    retryCountMap.current.delete(errorId);
  }, []);

  // 清除错误历史
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
    retryCountMap.current.clear();
  }, []);

  // 获取错误统计
  const getErrorStatistics = useCallback(() => {
    const total = errorHistory.length;
    const resolved = errorHistory.filter(record => record.resolved).length;
    const unresolved = total - resolved;
    
    const byCategory = errorHistory.reduce((acc, record) => {
      const category = record.error.name || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStrategy = errorHistory.reduce((acc, record) => {
      if (record.recoveryStrategy) {
        acc[record.recoveryStrategy] = (acc[record.recoveryStrategy] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      resolved,
      unresolved,
      byCategory,
      byStrategy,
      successRate: total > 0 ? (resolved / total) * 100 : 0
    };
  }, [errorHistory]);

  // 导出错误报告
  const exportErrorReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      statistics: getErrorStatistics(),
      errors: errorHistory.map(record => ({
        id: record.id,
        errorName: record.error.name,
        errorMessage: record.error.message,
        context: record.context,
        timestamp: record.timestamp.toISOString(),
        retryCount: record.retryCount,
        resolved: record.resolved,
        recoveryStrategy: record.recoveryStrategy
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('错误报告已导出');
  }, [errorHistory, getErrorStatistics]);

  // 清理副作用
  useEffect(() => {
    return () => {
      retryCountMap.current.clear();
    };
  }, []);

  return {
    // 状态
    errorHistory,
    isRecovering,
    
    // 主要方法
    handleError,
    retryError,
    resolveError,
    clearErrorHistory,
    
    // 工具方法
    addRecoveryStrategy,
    getErrorStatistics,
    exportErrorReport
  };
};

export default useErrorRecovery;