/**
 * 性能监控组件
 * 实时监控应用性能并提供优化建议
 */

import React, { useEffect, useState } from 'react';
import { Card, Progress, Alert, Statistic, Row, Col, Switch, Typography } from 'antd';
import { 
  ThunderboltOutlined, 
  HddOutlined, 
  ClockCircleOutlined, 
  WarningOutlined 
} from '@ant-design/icons';
import { observeWebVitals, observeLongTasks, useMemoryMonitor, type PerformanceMetrics } from '../../utils/performance';

const { Title, Text } = Typography;

interface PerformanceMonitorProps {
  showDetails?: boolean;
  autoHide?: boolean;
  threshold?: {
    lcp: number;
    fid: number;
    cls: number;
    memory: number;
  };
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  autoHide = true,
  threshold = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    memory: 0.8
  }
}) => {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [longTasks, setLongTasks] = useState<number[]>([]);
  const [visible, setVisible] = useState(!autoHide);
  const memoryInfo = useMemoryMonitor();

  useEffect(() => {
    // 监控 Web Vitals
    observeWebVitals((newMetrics) => {
      setMetrics(prev => ({ ...prev, ...newMetrics }));
    });

    // 监控长任务
    const longTaskObserver = observeLongTasks((duration) => {
      setLongTasks(prev => [...prev.slice(-9), duration]);
    });

    return () => {
      if (longTaskObserver) {
        longTaskObserver.disconnect();
      }
    };
  }, []);

  // 获取性能等级
  const getPerformanceGrade = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'good';
    if (value <= thresholds[1]) return 'needs-improvement';
    return 'poor';
  };

  // 获取进度条颜色
  const getProgressColor = (grade: string) => {
    switch (grade) {
      case 'good': return '#52c41a';
      case 'needs-improvement': return '#faad14';
      case 'poor': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 性能建议
  const getOptimizationSuggestions = () => {
    const suggestions: string[] = [];

    if (metrics.lcp && metrics.lcp > threshold.lcp) {
      suggestions.push('LCP过高：优化图片加载、使用CDN、减少服务器响应时间');
    }

    if (metrics.fid && metrics.fid > threshold.fid) {
      suggestions.push('FID过高：减少JavaScript执行时间、优化第三方脚本');
    }

    if (memoryInfo && memoryInfo.usage > threshold.memory) {
      suggestions.push('内存使用过高：检查内存泄漏、优化大对象使用');
    }

    if (longTasks.length > 5) {
      suggestions.push('频繁的长任务：考虑代码分割、使用Web Workers');
    }

    return suggestions;
  };

  const suggestions = getOptimizationSuggestions();
  const hasIssues = suggestions.length > 0;

  // 自动隐藏逻辑
  useEffect(() => {
    if (autoHide && hasIssues) {
      setVisible(true);
    } else if (autoHide && !hasIssues) {
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [hasIssues, autoHide]);

  if (!visible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setVisible(true)}
      >
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center
          ${hasIssues ? 'bg-warning-500 animate-pulse' : 'bg-success-500'}
          text-white shadow-lg hover:shadow-xl transition-all
        `}>
          <ThunderboltOutlined />
        </div>
      </div>
    );
  }

  return (
    <Card
      className="fixed bottom-4 right-4 z-50 w-80 shadow-lg"
      size="small"
      title={
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ThunderboltOutlined />
            性能监控
          </span>
          <Switch
            size="small"
            checked={showDetails}
            onChange={setVisible}
            checkedChildren="详情"
            unCheckedChildren="简化"
          />
        </div>
      }
      extra={
        <button
          onClick={() => setVisible(false)}
          className="text-neutral-400 hover:text-neutral-600"
        >
          ×
        </button>
      }
    >
      {/* Core Web Vitals */}
      <div className="mb-4">
        <Title level={5} className="mb-2">Core Web Vitals</Title>
        
        {metrics.lcp && (
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <Text className="text-sm">LCP (毫秒)</Text>
              <Text className="text-sm">{Math.round(metrics.lcp)}</Text>
            </div>
            <Progress
              percent={Math.min((metrics.lcp / 4000) * 100, 100)}
              strokeColor={getProgressColor(getPerformanceGrade(metrics.lcp, [2500, 4000]))}
              size="small"
              showInfo={false}
            />
          </div>
        )}

        {metrics.fcp && (
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <Text className="text-sm">FCP (毫秒)</Text>
              <Text className="text-sm">{Math.round(metrics.fcp)}</Text>
            </div>
            <Progress
              percent={Math.min((metrics.fcp / 3000) * 100, 100)}
              strokeColor={getProgressColor(getPerformanceGrade(metrics.fcp, [1800, 3000]))}
              size="small"
              showInfo={false}
            />
          </div>
        )}
      </div>

      {/* 内存使用 */}
      {memoryInfo && (
        <div className="mb-4">
          <Title level={5} className="mb-2">
            <HddOutlined className="mr-1" />
            内存使用
          </Title>
          <Row gutter={12}>
            <Col span={12}>
              <Statistic
                title="已使用"
                value={Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}
                suffix="MB"
                valueStyle={{ fontSize: '14px' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="使用率"
                value={Math.round(memoryInfo.usage * 100)}
                suffix="%"
                valueStyle={{ 
                  fontSize: '14px',
                  color: memoryInfo.usage > 0.8 ? '#ff4d4f' : '#52c41a'
                }}
              />
            </Col>
          </Row>
        </div>
      )}

      {/* 长任务监控 */}
      {showDetails && longTasks.length > 0 && (
        <div className="mb-4">
          <Title level={5} className="mb-2">
            <ClockCircleOutlined className="mr-1" />
            长任务 (最近10个)
          </Title>
          <div className="flex gap-1 flex-wrap">
            {longTasks.map((duration, index) => (
              <div
                key={index}
                className={`
                  px-2 py-1 rounded text-xs
                  ${duration > 100 ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-700'}
                `}
              >
                {Math.round(duration)}ms
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {suggestions.length > 0 && (
        <Alert
          message="性能优化建议"
          description={
            <ul className="text-xs mt-2 pl-4">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="mb-1">{suggestion}</li>
              ))}
            </ul>
          }
          type="warning"
          icon={<WarningOutlined />}
          showIcon
        />
      )}

      {suggestions.length === 0 && (
        <Alert
          message="性能良好"
          description="当前应用性能指标均在正常范围内"
          type="success"
          showIcon
        />
      )}
    </Card>
  );
};

export default PerformanceMonitor;