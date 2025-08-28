import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Modal, Collapse, Typography, Space, Tag, Alert } from 'antd';
import { 
  ExclamationCircleOutlined, 
  ReloadOutlined, 
  BugOutlined,
  HomeOutlined,
  CopyOutlined
} from '@ant-design/icons';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
  showDetails: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

// 错误分类器
class ErrorClassifier {
  static classify(error: Error): {
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userMessage: string;
    actionable: boolean;
  } {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // 网络错误
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        category: 'network',
        severity: 'medium',
        userMessage: '网络连接异常，请检查网络后重试',
        actionable: true
      };
    }

    // API错误
    if (errorMessage.includes('api') || errorMessage.includes('request')) {
      return {
        category: 'api',
        severity: 'medium',
        userMessage: '服务请求失败，请稍后重试',
        actionable: true
      };
    }

    // 文件处理错误
    if (errorMessage.includes('file') || errorMessage.includes('upload')) {
      return {
        category: 'file',
        severity: 'medium',
        userMessage: '文件处理失败，请检查文件格式和大小',
        actionable: true
      };
    }

    // AI服务错误
    if (errorMessage.includes('ai') || errorMessage.includes('gemini')) {
      return {
        category: 'ai',
        severity: 'high',
        userMessage: 'AI服务暂时不可用，系统将使用备用方案',
        actionable: true
      };
    }

    // 内存错误
    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return {
        category: 'memory',
        severity: 'critical',
        userMessage: '系统资源不足，请刷新页面或联系管理员',
        actionable: true
      };
    }

    // 权限错误
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return {
        category: 'permission',
        severity: 'high',
        userMessage: '权限不足，请联系管理员',
        actionable: false
      };
    }

    // 组件错误
    if (errorStack.includes('react') || errorStack.includes('component')) {
      return {
        category: 'component',
        severity: 'medium',
        userMessage: '页面渲染异常，尝试刷新页面',
        actionable: true
      };
    }

    // 默认未知错误
    return {
      category: 'unknown',
      severity: 'medium',
      userMessage: '系统出现异常，请尝试刷新页面或联系技术支持',
      actionable: true
    };
  }
}

// 错误报告服务
class ErrorReportingService {
  static async reportError(
    error: Error,
    errorInfo: ErrorInfo,
    context: any = {}
  ): Promise<string> {
    const errorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('userId'),
        sessionId: sessionStorage.getItem('sessionId'),
        ...context
      }
    };

    try {
      // 发送错误报告到后端
      const response = await fetch('/api/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      });

      if (response.ok) {
        return errorReport.id;
      }
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }

    // 本地存储错误报告（兜底）
    const localErrors = JSON.parse(localStorage.getItem('error_reports') || '[]');
    localErrors.push(errorReport);
    // 只保留最近的10个错误
    localStorage.setItem('error_reports', JSON.stringify(localErrors.slice(-10)));

    return errorReport.id;
  }

  static async getLocalErrorReports(): Promise<any[]> {
    return JSON.parse(localStorage.getItem('error_reports') || '[]');
  }

  static clearLocalErrorReports(): void {
    localStorage.removeItem('error_reports');
  }
}

export class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      retryCount: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    // 报告错误
    ErrorReportingService.reportError(error, errorInfo, {
      retryCount: this.state.retryCount,
      errorId: this.state.errorId
    }).then(reportId => {
      this.setState({ errorId: reportId });
    });

    // 调用外部错误处理器
    this.props.onError?.(error, errorInfo);

    // 错误日志
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        showDetails: false
      }));
    } else {
      Modal.warning({
        title: '重试次数已达上限',
        content: '请刷新页面或联系技术支持',
        okText: '刷新页面',
        onOk: () => window.location.reload()
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  copyErrorDetails = () => {
    if (!this.state.error) return;

    const errorDetails = {
      errorId: this.state.errorId,
      error: this.state.error.message,
      stack: this.state.error.stack,
      timestamp: new Date().toISOString()
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        Modal.success({
          title: '错误信息已复制',
          content: '您可以将此信息发送给技术支持团队'
        });
      })
      .catch(() => {
        Modal.error({
          title: '复制失败',
          content: '请手动选择并复制错误信息'
        });
      });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const errorClassification = ErrorClassifier.classify(this.state.error);
      const maxRetries = this.props.maxRetries || 3;
      const canRetry = this.state.retryCount < maxRetries && errorClassification.actionable;

      // 使用自定义fallback组件
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
          padding: '24px', 
          minHeight: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <Result
              status="error"
              title="系统遇到了一些问题"
              subTitle={errorClassification.userMessage}
              extra={[
                <Space key="actions" wrap>
                  {canRetry && (
                    <Button 
                      type="primary" 
                      icon={<ReloadOutlined />} 
                      onClick={this.handleRetry}
                    >
                      重试 ({maxRetries - this.state.retryCount} 次机会)
                    </Button>
                  )}
                  
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={this.handleReload}
                  >
                    刷新页面
                  </Button>
                  
                  <Button 
                    icon={<HomeOutlined />} 
                    onClick={this.handleGoHome}
                  >
                    返回首页
                  </Button>
                  
                  <Button 
                    type="text" 
                    icon={<BugOutlined />} 
                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  >
                    {this.state.showDetails ? '隐藏' : '查看'}详情
                  </Button>
                </Space>
              ]}
            />

            {/* 错误详情 */}
            {this.state.showDetails && (
              <div style={{ marginTop: '24px' }}>
                <Alert
                  message="错误详细信息"
                  description="以下信息可能有助于技术人员诊断问题"
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />

                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* 错误分类信息 */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Text strong>错误类型:</Text>
                    <Tag color={
                      errorClassification.severity === 'critical' ? 'red' :
                      errorClassification.severity === 'high' ? 'orange' :
                      errorClassification.severity === 'medium' ? 'blue' : 'green'
                    }>
                      {errorClassification.category}
                    </Tag>
                    <Tag color={
                      errorClassification.severity === 'critical' ? 'red' :
                      errorClassification.severity === 'high' ? 'orange' :
                      errorClassification.severity === 'medium' ? 'blue' : 'green'
                    }>
                      {errorClassification.severity}
                    </Tag>
                  </div>

                  <div>
                    <Text strong>错误ID:</Text>
                    <Text code style={{ marginLeft: '8px' }}>{this.state.errorId}</Text>
                  </div>

                  <Collapse ghost>
                    <Panel header="错误详情" key="error-details">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>错误信息:</Text>
                          <Paragraph code copyable>
                            {this.state.error.message}
                          </Paragraph>
                        </div>

                        {this.state.error.stack && (
                          <div>
                            <Text strong>堆栈跟踪:</Text>
                            <Paragraph 
                              code 
                              copyable
                              style={{ 
                                maxHeight: '200px', 
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                fontSize: '12px'
                              }}
                            >
                              {this.state.error.stack}
                            </Paragraph>
                          </div>
                        )}

                        {this.state.errorInfo && (
                          <div>
                            <Text strong>组件堆栈:</Text>
                            <Paragraph 
                              code 
                              copyable
                              style={{ 
                                maxHeight: '150px', 
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                fontSize: '12px'
                              }}
                            >
                              {this.state.errorInfo.componentStack}
                            </Paragraph>
                          </div>
                        )}
                      </Space>
                    </Panel>
                  </Collapse>

                  <Button 
                    icon={<CopyOutlined />} 
                    onClick={this.copyErrorDetails}
                    style={{ marginTop: '8px' }}
                  >
                    复制错误信息
                  </Button>
                </Space>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }
}

// 导出错误处理相关工具
export { ErrorClassifier, ErrorReportingService };
export default GlobalErrorBoundary;