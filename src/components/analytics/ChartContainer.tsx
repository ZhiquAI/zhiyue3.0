import React, { useState } from 'react';
import { Card, Space, Button, Dropdown, Tooltip, Spin } from 'antd';
import { DownloadOutlined, FullscreenOutlined, MoreOutlined, ReloadOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'pdf' | 'excel') => void;
  onFullscreen?: () => void;
  className?: string;
  height?: number;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  extra,
  loading = false,
  onRefresh,
  onExport,
  onFullscreen,
  className = '',
  height = 400
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'png',
      label: '导出为图片',
      icon: <DownloadOutlined />,
      onClick: () => onExport?.('png')
    },
    {
      key: 'pdf',
      label: '导出为PDF',
      icon: <DownloadOutlined />,
      onClick: () => onExport?.('pdf')
    },
    {
      key: 'excel',
      label: '导出数据',
      icon: <DownloadOutlined />,
      onClick: () => onExport?.('excel')
    }
  ];

  const moreMenuItems: MenuProps['items'] = [
    ...(onExport ? exportMenuItems : []),
    ...(onFullscreen ? [{
      key: 'fullscreen',
      label: '全屏查看',
      icon: <FullscreenOutlined />,
      onClick: onFullscreen
    }] : [])
  ];

  const renderExtra = () => {
    const actions = [];

    if (onRefresh) {
      actions.push(
        <Tooltip title="刷新数据" key="refresh">
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            loading={isRefreshing}
            onClick={handleRefresh}
            size="small"
          />
        </Tooltip>
      );
    }

    if (moreMenuItems.length > 0) {
      actions.push(
        <Dropdown 
          menu={{ items: moreMenuItems }} 
          trigger={['click']}
          key="more"
        >
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      );
    }

    if (extra) {
      actions.push(extra);
    }

    return actions.length > 0 ? <Space>{actions}</Space> : null;
  };

  return (
    <Card 
      title={<span className="text-slate-800 font-semibold">{title}</span>}
      extra={renderExtra()}
      className={`chart-container ${className}`}
      styles={{
        body: { 
          padding: '16px',
          minHeight: height
        }
      }}
    >
      <Spin spinning={loading} tip="加载中...">
        <div style={{ height: height - 32 }}>
          {children}
        </div>
      </Spin>
    </Card>
  );
};

export default ChartContainer;
