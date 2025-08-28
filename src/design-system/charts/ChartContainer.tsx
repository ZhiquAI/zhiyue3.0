/**
 * 统一图表容器组件
 * 提供加载状态、错误处理、工具栏等通用功能
 */

import React, { useState, useRef } from 'react';
import { Card, Button, Tooltip, Spin, Alert, Space } from 'antd';
import { 
  DownloadOutlined, 
  FullscreenOutlined, 
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { cn } from '../utils';
import { chartSizes, ChartContainerProps, getChartTheme } from './index';
import { useThemeContext } from '../../contexts/ThemeContext';

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  title,
  description,
  loading = false,
  error = null,
  size = 'medium',
  className = '',
  toolbar = false,
  exportable = false,
  fullscreen = false,
  responsive = true,
  onDataClick
}) => {
  const { isDark } = useThemeContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const theme = getChartTheme(isDark ? 'dark' : 'light');
  const sizeConfig = chartSizes[size];

  // 导出图表为PNG
  const handleExport = async () => {
    if (!containerRef.current) return;
    
    try {
      // 使用html2canvas导出图片
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(containerRef.current);
      
      // 创建下载链接
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // 全屏切换
  const handleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 模拟刷新延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    // 这里可以触发父组件的数据重新加载
  };

  // 工具栏渲染
  const renderToolbar = () => {
    if (!toolbar) return null;

    return (
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
        
        <Space>
          <Tooltip title="刷新数据">
            <Button 
              type="text" 
              icon={<ReloadOutlined spin={isRefreshing} />}
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
            />
          </Tooltip>
          
          {exportable && (
            <Tooltip title="导出图片">
              <Button 
                type="text" 
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={loading}
              />
            </Tooltip>
          )}
          
          {fullscreen && (
            <Tooltip title={isFullscreen ? "退出全屏" : "全屏显示"}>
              <Button 
                type="text" 
                icon={<FullscreenOutlined />}
                onClick={handleFullscreen}
                disabled={loading}
              />
            </Tooltip>
          )}
          
          <Tooltip title="图表设置">
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              disabled={loading}
            />
          </Tooltip>
        </Space>
      </div>
    );
  };

  // 错误状态渲染
  const renderError = () => {
    if (!error) return null;

    return (
      <div className="flex items-center justify-center" style={{ height: sizeConfig.height }}>
        <Alert
          message="图表加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleRefresh}>
              重试
            </Button>
          }
        />
      </div>
    );
  };

  // 加载状态渲染
  const renderLoading = () => {
    if (!loading) return null;

    return (
      <div 
        className="flex items-center justify-center"
        style={{ height: sizeConfig.height }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  };

  // 空状态渲染
  const renderEmpty = () => {
    return (
      <div 
        className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400"
        style={{ height: sizeConfig.height }}
      >
        <div className="text-6xl mb-4">📊</div>
        <div className="text-lg font-medium mb-2">暂无数据</div>
        <div className="text-sm">请检查数据源或稍后再试</div>
      </div>
    );
  };

  return (
    <Card
      ref={containerRef}
      className={cn(
        'chart-container',
        'transition-all duration-200',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      bodyStyle={{ 
        padding: toolbar ? '24px' : '16px',
        minHeight: sizeConfig.height + (toolbar ? 100 : 40)
      }}
    >
      {renderToolbar()}
      
      <div 
        className={cn(
          'chart-content',
          'relative',
          responsive && 'w-full'
        )}
        style={!responsive ? sizeConfig : { width: '100%', height: sizeConfig.height }}
      >
        {loading && renderLoading()}
        {error && !loading && renderError()}
        {!loading && !error && children}
      </div>
    </Card>
  );
};

export default ChartContainer;