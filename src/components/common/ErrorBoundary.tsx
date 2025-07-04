// 错误边界组件 - 捕获和处理React错误
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, message, Space } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录错误到监控系统
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // 这里可以集成错误监控服务，如Sentry
    console.error('Error caught by boundary:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopyError = () => {
    if (!this.state.error) return;

    const errorInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        name: this.state.error.name,
        message: this.state.error.message,
        stack: this.state.error.stack,
      },
      componentStack: this.state.errorInfo?.componentStack,
    };

    const errorText = `
=== 智阅AI 错误报告 ===
时间: ${errorInfo.timestamp}
页面: ${errorInfo.url}
浏览器: ${errorInfo.userAgent}

错误信息:
${errorInfo.error.name}: ${errorInfo.error.message}

错误堆栈:
${errorInfo.error.stack}

组件堆栈:
${errorInfo.componentStack || '无'}
=========================
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      message.success('错误信息已复制到剪贴板');
    }).catch(() => {
      // 降级方案：创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('错误信息已复制到剪贴板');
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full">
            <Result
              icon={<AlertTriangle className="text-red-500" size={64} />}
              title="页面出现错误"
              subTitle="抱歉，页面遇到了一些问题。请尝试刷新页面或联系技术支持。"
              extra={[
                <Button type="primary" onClick={this.handleRetry} key="retry">
                  重试
                </Button>,
                <Button onClick={this.handleReload} key="reload">
                  刷新页面
                </Button>,
                <Button
                  icon={<CopyOutlined />}
                  onClick={this.handleCopyError}
                  key="copy"
                  title="复制错误信息用于bug报告"
                >
                  复制错误信息
                </Button>,
              ]}
            />
            
            {/* 开发环境下显示错误详情 */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <summary className="cursor-pointer font-medium text-red-800">
                  错误详情 (仅开发环境显示)
                </summary>
                <div className="mt-2 text-sm text-red-700">
                  <p><strong>错误:</strong> {this.state.error.message}</p>
                  <p><strong>堆栈:</strong></p>
                  <pre className="whitespace-pre-wrap text-xs bg-red-100 p-2 rounded mt-1">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <p><strong>组件堆栈:</strong></p>
                      <pre className="whitespace-pre-wrap text-xs bg-red-100 p-2 rounded mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;