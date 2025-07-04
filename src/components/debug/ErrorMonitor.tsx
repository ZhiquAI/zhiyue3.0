import React, { useEffect, useState } from 'react';
import { Card, Alert, Button, Collapse, Typography, message, Space } from 'antd';
import { BugOutlined, ClearOutlined, CopyOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface ErrorInfo {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  source?: string;
}

const ErrorMonitor: React.FC = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 监听全局错误
    const handleError = (event: ErrorEvent) => {
      const errorInfo: ErrorInfo = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename
      };
      setErrors(prev => [errorInfo, ...prev].slice(0, 50)); // 保留最近50个错误
      setIsVisible(true);
    };

    // 监听未处理的Promise拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorInfo: ErrorInfo = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack
      };
      setErrors(prev => [errorInfo, ...prev].slice(0, 50));
      setIsVisible(true);
    };

    // 监听控制台错误（重写console.error）
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorInfo: ErrorInfo = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: args.join(' '),
        source: 'console'
      };
      setErrors(prev => [errorInfo, ...prev].slice(0, 50));
      setIsVisible(true);
      originalConsoleError.apply(console, args);
    };

    // 监听控制台警告
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const errorInfo: ErrorInfo = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'warning',
        message: args.join(' '),
        source: 'console'
      };
      setErrors(prev => [errorInfo, ...prev].slice(0, 50));
      originalConsoleWarn.apply(console, args);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  const clearErrors = () => {
    setErrors([]);
    setIsVisible(false);
  };

  const copyError = (error: ErrorInfo) => {
    const errorText = `
=== 智阅AI 错误监控报告 ===
时间: ${error.timestamp}
类型: ${error.type}
来源: ${error.source || '未知'}
浏览器: ${navigator.userAgent}
页面: ${window.location.href}

错误信息:
${error.message}

${error.stack ? `错误堆栈:\n${error.stack}` : ''}
============================
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      message.success('错误信息已复制到剪贴板');
    }).catch(() => {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('错误信息已复制到剪贴板');
    });
  };

  const copyAllErrors = () => {
    const allErrorsText = errors.map(error => {
      return `[${error.timestamp}] ${error.type.toUpperCase()}: ${error.message}`;
    }).join('\n');

    const reportText = `
=== 智阅AI 批量错误报告 ===
导出时间: ${new Date().toISOString()}
错误总数: ${errors.length}
浏览器: ${navigator.userAgent}
页面: ${window.location.href}

错误列表:
${allErrorsText}
============================
    `.trim();

    navigator.clipboard.writeText(reportText).then(() => {
      message.success(`已复制 ${errors.length} 个错误信息到剪贴板`);
    }).catch(() => {
      message.error('复制失败，请手动选择文本复制');
    });
  };

  const getAlertType = (type: string) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  if (!isVisible || errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 w-96 max-h-[80vh] overflow-auto z-[9999] bg-white rounded-lg shadow-lg">
      <Card
        title={
          <div className="flex items-center gap-2">
            <BugOutlined />
            <span>错误监控 ({errors.length})</span>
          </div>
        }
        size="small"
        extra={
          <Space size="small">
            <Button
              size="small"
              onClick={copyAllErrors}
              icon={<CopyOutlined />}
              title="复制所有错误信息"
            >
              复制全部
            </Button>
            <Button size="small" onClick={clearErrors} icon={<ClearOutlined />}>
              清除
            </Button>
            <Button
              size="small"
              type="text"
              onClick={() => setIsVisible(false)}
            >
              ×
            </Button>
          </Space>
        }
      >
        <div className="max-h-96 overflow-auto">
          {errors.map((error, index) => (
            <Alert
              key={error.id}
              type={getAlertType(error.type)}
              message={
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Text strong>[{error.timestamp}]</Text>
                    <Paragraph className="m-0 mt-1">
                      {error.message}
                    </Paragraph>
                  </div>
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => copyError(error)}
                    title="复制此错误信息"
                    className="ml-2 flex-shrink-0"
                  />
                </div>
              }
              description={
                error.stack && (
                  <Collapse ghost>
                    <Panel header="查看堆栈信息" key="1">
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-48">
                        {error.stack}
                      </pre>
                    </Panel>
                  </Collapse>
                )
              }
              className="mb-2"
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ErrorMonitor;
