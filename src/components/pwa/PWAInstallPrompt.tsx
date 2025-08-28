/**
 * PWA 安装提示组件
 * 提供原生应用般的安装体验
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Divider } from 'antd';
import { 
  DownloadOutlined, 
  MobileOutlined, 
  DesktopOutlined,
  CheckCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { usePWAInstall, useDeviceInfo, useNetworkStatus } from '../../hooks/useMobile';
import { cn } from '../../design-system';

const { Title, Paragraph, Text } = Typography;

interface PWAInstallPromptProps {
  showOnMount?: boolean;
  delayMs?: number;
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  showOnMount = true,
  delayMs = 30000, // 30秒后显示
  className = ''
}) => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const { isMobile, isDesktop } = useDeviceInfo();
  
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 检查是否已经拒绝过安装
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      // 如果距离上次拒绝超过7天，可以再次显示
      if (daysSinceDismissed < 7) {
        setDismissed(true);
      }
    }
  }, []);

  // 延迟显示安装提示
  useEffect(() => {
    if (!showOnMount || dismissed || isInstalled || !isInstallable) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [showOnMount, delayMs, dismissed, isInstalled, isInstallable]);

  // 处理安装
  const handleInstall = async () => {
    setInstalling(true);
    
    try {
      const success = await promptInstall();
      if (success) {
        setVisible(false);
        // 显示成功提示
        setTimeout(() => {
          Modal.success({
            title: '安装成功',
            content: '智阅3.0已成功安装到您的设备，您可以在主屏幕找到应用图标。',
            okText: '好的'
          });
        }, 500);
      }
    } catch (error) {
      console.error('PWA install failed:', error);
    } finally {
      setInstalling(false);
    }
  };

  // 处理拒绝安装
  const handleDismiss = (rememberChoice: boolean = false) => {
    setVisible(false);
    
    if (rememberChoice) {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      setDismissed(true);
    }
  };

  // 不显示条件
  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  // 获取设备特定的安装说明
  const getInstallInstructions = () => {
    if (isMobile) {
      return [
        '📱 将应用添加到主屏幕',
        '🚀 获得原生应用体验',
        '📶 支持离线使用',
        '🔔 接收重要通知'
      ];
    }
    
    return [
      '💻 安装桌面版应用',
      '⚡ 更快的启动速度',
      '📶 离线功能支持',
      '🎯 专注的工作环境'
    ];
  };

  const features = getInstallInstructions();

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            {isMobile ? <MobileOutlined className="text-primary-600 text-lg" /> : 
             <DesktopOutlined className="text-primary-600 text-lg" />}
          </div>
          <div>
            <Title level={4} className="mb-0">安装智阅3.0</Title>
            <Text type="secondary" className="text-sm">
              {isMobile ? '添加到主屏幕' : '安装桌面版'}
            </Text>
          </div>
        </div>
      }
      open={visible}
      onCancel={() => handleDismiss(false)}
      closeIcon={<CloseOutlined />}
      footer={null}
      width={isMobile ? 360 : 480}
      centered
      maskClosable={false}
      className={cn('pwa-install-modal', className)}
    >
      <div className="py-4">
        <Paragraph className="text-neutral-600 mb-6">
          安装智阅3.0应用，享受更好的使用体验。安装后您可以像使用原生应用一样访问所有功能。
        </Paragraph>

        <div className="mb-6">
          <Title level={5} className="mb-3">应用特色</Title>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircleOutlined className="text-success-500 flex-shrink-0" />
                <Text>{feature}</Text>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <Space className="w-full justify-between">
          <Button 
            type="text" 
            onClick={() => handleDismiss(true)}
            className="text-neutral-500"
          >
            不再提醒
          </Button>
          
          <Space>
            <Button onClick={() => handleDismiss(false)}>
              稍后再说
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              loading={installing}
              onClick={handleInstall}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {installing ? '安装中...' : '立即安装'}
            </Button>
          </Space>
        </Space>
      </div>
    </Modal>
  );
};

// PWA 状态指示器
export const PWAStatusBadge: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { isInstalled } = usePWAInstall();
  const { isOnline } = useNetworkStatus();

  if (!isInstalled) return null;

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        isOnline ? 'bg-success-500' : 'bg-warning-500'
      )} />
      <Text className="text-xs text-neutral-500">
        {isOnline ? 'PWA在线' : 'PWA离线'}
      </Text>
    </div>
  );
};

// 手动安装按钮
export const PWAInstallButton: React.FC<{
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'text';
  className?: string;
}> = ({ 
  size = 'middle',
  type = 'default',
  className = ''
}) => {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [loading, setLoading] = useState(false);

  if (!isInstallable) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      await promptInstall();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      type={type}
      icon={<DownloadOutlined />}
      loading={loading}
      onClick={handleClick}
      className={className}
    >
      安装应用
    </Button>
  );
};

export default PWAInstallPrompt;