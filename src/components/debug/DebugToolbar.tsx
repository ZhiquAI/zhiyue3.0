import React, { useState } from 'react';
import { Button, Dropdown, Space, Badge, Tooltip } from 'antd';
import { 
  BugOutlined, 
  CopyOutlined, 
  InfoCircleOutlined, 
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { copyDebugInfo, copyToClipboard, formatSystemInfoForCopy } from '../../utils/copyUtils';

interface DebugToolbarProps {
  errorCount?: number;
  onToggleErrorMonitor?: () => void;
  onClearErrors?: () => void;
  className?: string;
}

const DebugToolbar: React.FC<DebugToolbarProps> = ({
  errorCount = 0,
  onToggleErrorMonitor,
  onClearErrors,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleCopySystemInfo = () => {
    const systemInfo = formatSystemInfoForCopy();
    copyToClipboard(systemInfo, '系统信息已复制', '复制系统信息失败');
  };

  const handleCopyDebugInfo = () => {
    copyDebugInfo();
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  const handleTestError = () => {
    // 故意触发一个错误用于测试
    throw new Error('这是一个测试错误，用于验证错误监控功能');
  };

  const handleToggleDevTools = () => {
    const devTools = (window as any).__DEV_TOOLS__;
    if (devTools) {
      if (devTools.logApiCalls) {
        devTools.disableVerboseLogging();
      } else {
        devTools.enableVerboseLogging();
      }
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'copy-system',
      label: '复制系统信息',
      icon: <InfoCircleOutlined />,
      onClick: handleCopySystemInfo
    },
    {
      key: 'copy-debug',
      label: '复制调试信息',
      icon: <CopyOutlined />,
      onClick: handleCopyDebugInfo
    },
    {
      type: 'divider'
    },
    {
      key: 'toggle-devtools',
      label: '切换API日志',
      icon: <SettingOutlined />,
      onClick: handleToggleDevTools
    },
    {
      key: 'test-error',
      label: '测试错误监控',
      icon: <BugOutlined />,
      onClick: handleTestError
    },
    {
      type: 'divider'
    },
    {
      key: 'reload',
      label: '重新加载页面',
      icon: <ReloadOutlined />,
      onClick: handleReloadPage
    }
  ];

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

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-[9998] ${className}`}>
        <Space>
          <Badge count={errorCount} size="small">
            <Tooltip title="显示错误监控">
              <Button
                type={errorCount > 0 ? 'primary' : 'default'}
                danger={errorCount > 0}
                icon={<BugOutlined />}
                onClick={onToggleErrorMonitor}
                className="shadow-lg"
              />
            </Tooltip>
          </Badge>
          
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="topRight">
            <Button
              icon={<SettingOutlined />}
              className="shadow-lg"
              title="调试工具"
            />
          </Dropdown>
          
          <Tooltip title="展开工具栏">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => setIsMinimized(false)}
              size="small"
            />
          </Tooltip>
          
          <Tooltip title="隐藏工具栏">
            <Button
              type="text"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setIsVisible(false)}
              size="small"
            />
          </Tooltip>
        </Space>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-[9998] ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">调试工具</span>
          <Space size="small">
            <Tooltip title="最小化">
              <Button
                type="text"
                icon={<EyeInvisibleOutlined />}
                onClick={() => setIsMinimized(true)}
                size="small"
              />
            </Tooltip>
            <Tooltip title="隐藏">
              <Button
                type="text"
                icon={<EyeInvisibleOutlined />}
                onClick={() => setIsVisible(false)}
                size="small"
              />
            </Tooltip>
          </Space>
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
            
            <Tooltip title="复制调试信息">
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyDebugInfo}
                size="small"
              >
                调试信息
              </Button>
            </Tooltip>
          </Space>
          
          <Space size="small" className="w-full">
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="topRight">
              <Button
                icon={<SettingOutlined />}
                size="small"
                className="w-full"
              >
                更多工具
              </Button>
            </Dropdown>
          </Space>
        </Space>
      </div>
    </div>
  );
};

export default DebugToolbar;
