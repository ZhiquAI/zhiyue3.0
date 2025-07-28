import React from 'react';
import { Card, Statistic, Progress, Tag, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  progress?: {
    percent: number;
    status?: 'success' | 'exception' | 'normal' | 'active';
  };
  extra?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  suffix,
  prefix,
  trend,
  progress,
  extra,
  loading = false,
  className = ''
}) => {
  const getValueColor = () => {
    if (trend) {
      return trend.isPositive ? '#52c41a' : '#ff4d4f';
    }
    return '#1677ff';
  };

  const renderTrend = () => {
    if (!trend) return null;
    
    return (
      <div className="mt-2">
        <Tag 
          color={trend.isPositive ? 'green' : 'red'}
          className="border-0"
        >
          {trend.isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          <span className="ml-1">
            {Math.abs(trend.value)}%
            {trend.period && ` (${trend.period})`}
          </span>
        </Tag>
      </div>
    );
  };

  const renderProgress = () => {
    if (!progress) return null;
    
    return (
      <div className="mt-3">
        <Progress 
          percent={progress.percent} 
          status={progress.status}
          size="small"
          showInfo={false}
        />
      </div>
    );
  };

  return (
    <Card 
      className={`analytics-card ${className}`}
      loading={loading}
      extra={extra}
    >
      <div className="space-y-2">
        <Statistic
          title={<span className="text-slate-600 font-medium">{title}</span>}
          value={value}
          suffix={suffix}
          prefix={prefix}
          valueStyle={{ 
            color: getValueColor(),
            fontSize: '24px',
            fontWeight: 'bold'
          }}
        />
        {renderTrend()}
        {renderProgress()}
      </div>
    </Card>
  );
};

export default AnalyticsCard;
