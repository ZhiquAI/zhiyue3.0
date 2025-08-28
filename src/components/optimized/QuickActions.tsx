import React from 'react';
import { Button, Space, Dropdown, Badge, Tooltip } from 'antd';
import {
  SettingOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';

interface QuickActionsProps {
  compact?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ compact = false }) => {
  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = () => {
    console.log('导出数据');
  };

  const settingsMenuItems = [
    {
      key: 'display',
      label: '显示设置',
    },
    {
      key: 'workflow',
      label: '工作流配置',
    },
    {
      key: 'notifications',
      label: '通知设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'about',
      label: '关于系统',
    }
  ];

  const notificationMenuItems = [
    {
      key: 'processing',
      label: '处理完成通知',
    },
    {
      key: 'error',
      label: '错误告警 (2)',
    },
    {
      key: 'quality',
      label: '质量监控通知',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'clear',
      label: '清除所有通知',
    }
  ];

  const helpMenuItems = [
    {
      key: 'guide',
      label: '使用指南',
    },
    {
      key: 'shortcuts',
      label: '快捷键说明',
    },
    {
      key: 'faq',
      label: '常见问题',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'support',
      label: '技术支持',
    }
  ];

  if (compact) {
    return (
      <Space size="small">
        <Badge count={2} size="small">
          <Button type="text" icon={<BellOutlined />} size="small" />
        </Badge>
        
        <Dropdown menu={{ items: settingsMenuItems }} placement="bottomRight">
          <Button type="text" icon={<SettingOutlined />} size="small" />
        </Dropdown>
      </Space>
    );
  }

  return (
    <Space size="middle">
      <Tooltip title="刷新页面">
        <Button 
          type="text" 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
        />
      </Tooltip>

      <Tooltip title="导出数据">
        <Button 
          type="text" 
          icon={<DownloadOutlined />} 
          onClick={handleExport}
        />
      </Tooltip>

      <Tooltip title="全屏显示">
        <Button 
          type="text" 
          icon={<FullscreenOutlined />} 
          onClick={handleFullscreen}
        />
      </Tooltip>

      <Badge count={2} size="small">
        <Dropdown 
          menu={{ items: notificationMenuItems }} 
          placement="bottomRight"
          trigger={['click']}
        >
          <Button type="text" icon={<BellOutlined />} />
        </Dropdown>
      </Badge>

      <Dropdown 
        menu={{ items: helpMenuItems }} 
        placement="bottomRight"
        trigger={['click']}
      >
        <Button type="text" icon={<QuestionCircleOutlined />} />
      </Dropdown>

      <Dropdown 
        menu={{ items: settingsMenuItems }} 
        placement="bottomRight"
        trigger={['click']}
      >
        <Button type="text" icon={<SettingOutlined />} />
      </Dropdown>
    </Space>
  );
};

export default QuickActions;