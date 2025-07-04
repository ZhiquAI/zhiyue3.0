import React, { useState } from 'react';
import { Button, Space, Badge, Tooltip, message } from 'antd';
import { 
  BugOutlined, 
  CopyOutlined, 
  InfoCircleOutlined, 
  EyeInvisibleOutlined
} from '@ant-design/icons';

interface SimpleDebugToolbarProps {
  errorCount?: number;
  onToggleErrorMonitor?: () => void;
  onClearErrors?: () => void;
  className?: string;
}

const SimpleDebugToolbar: React.FC<SimpleDebugToolbarProps> = ({
  errorCount = 0,
  onToggleErrorMonitor,
  onClearErrors,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleCopySystemInfo = () => {
    const systemInfo = `
=== 智阅AI 系统信息 ===
时间: ${new Date().toISOString()}
页面: ${window.location.href}
浏览器: ${navigator.userAgent}
语言: ${navigator.language}
平台: ${navigator.platform}
屏幕: ${screen.width} x ${screen.height}
窗口: ${window.innerWidth} x ${window.innerHeight}
========================
    `.trim();

    navigator.clipboard.writeText(systemInfo).then(() => {
      message.success('系统信息已复制到剪贴板');
    }).catch(() => {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = systemInfo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('系统信息已复制到剪贴板');
    });
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-[9998] ${className}`}>
        <Tooltip title="显示调试工具栏">
          <Button
            type="primary"
            shape="circle"
            icon={<BugOutlined />}
            onClick={() => setIsVisible(true)}
            className="shadow-lg"
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-[9998] ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">调试工具</span>
          <Tooltip title="隐藏">
            <Button
              type="text"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setIsVisible(false)}
              size="small"
            />
          </Tooltip>
        </div>
        
        <Space direction="vertical" size="small" className="w-full">
          <Space size="small" className="w-full">
            <Badge count={errorCount} size="small">
              <Tooltip title="错误监控">
                <Button
                  type={errorCount > 0 ? 'primary' : 'default'}
                  danger={errorCount > 0}
                  icon={<BugOutlined />}
                  onClick={onToggleErrorMonitor}
                  size="small"
                >
                  错误 ({errorCount})
                </Button>
              </Tooltip>
            </Badge>
            
            {errorCount > 0 && (
              <Tooltip title="清除错误">
                <Button
                  size="small"
                  onClick={onClearErrors}
                  type="text"
                >
                  清除
                </Button>
              </Tooltip>
            )}
          </Space>
          
          <Space size="small" className="w-full">
            <Tooltip title="复制系统信息">
              <Button
                icon={<InfoCircleOutlined />}
                onClick={handleCopySystemInfo}
                size="small"
              >
                系统信息
              </Button>
            </Tooltip>
            
            <Tooltip title="复制错误信息">
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  const devTools = (window as any).__DEV_TOOLS__;
                  if (devTools && devTools.getErrors) {
                    const errors = devTools.getErrors();
                    const errorText = errors.map((error: any) => 
                      `[${error.timestamp}] ${error.type}: ${error.message}`
                    ).join('\n');
                    
                    if (errorText) {
                      navigator.clipboard.writeText(errorText).then(() => {
                        message.success('错误信息已复制');
                      });
                    } else {
                      message.info('暂无错误信息');
                    }
                  }
                }}
                size="small"
              >
                错误信息
              </Button>
            </Tooltip>
          </Space>
        </Space>
      </div>
    </div>
  );
};

export default SimpleDebugToolbar;
