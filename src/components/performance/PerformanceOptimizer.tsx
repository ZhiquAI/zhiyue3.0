import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Button,
  Switch,
  Slider,
  Divider,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  InputNumber
} from 'antd';
import {
  ThunderboltOutlined,
  SettingOutlined,
  MonitorOutlined,
  RocketOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { message } from '../../utils/message';
import { batchProcessingService } from '../../services/batchProcessingService';

interface PerformanceMetrics {
  uploadSpeed: number; // MB/s
  processingSpeed: number; // files/min
  memoryUsage: number; // MB
  cpuUsage: number; // %
  concurrentTasks: number;
  queueLength: number;
  errorRate: number; // %
  avgResponseTime: number; // ms
}

interface OptimizationConfig {
  maxConcurrentUploads: number;
  maxConcurrentProcessing: number;
  chunkSize: number; // MB
  enableCompression: boolean;
  enableCaching: boolean;
  retryAttempts: number;
  timeoutDuration: number; // ms
  enableProgressiveUpload: boolean;
}

interface PerformanceOptimizerProps {
  onConfigChange?: (config: OptimizationConfig) => void;
}

const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  onConfigChange
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    uploadSpeed: 0,
    processingSpeed: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    concurrentTasks: 0,
    queueLength: 0,
    errorRate: 0,
    avgResponseTime: 0
  });

  const [config, setConfig] = useState<OptimizationConfig>({
    maxConcurrentUploads: 3,
    maxConcurrentProcessing: 5,
    chunkSize: 10,
    enableCompression: true,
    enableCaching: true,
    retryAttempts: 3,
    timeoutDuration: 300000,
    enableProgressiveUpload: true
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  interface OptimizationRecord {
    timestamp: string;
    config: OptimizationConfig;
    beforeMetrics: PerformanceMetrics;
    type: 'auto' | 'manual';
    changes?: Record<string, boolean>;
  }

  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationRecord[]>([]);

  // 性能监控
  useEffect(() => {
    const interval = setInterval(() => {
      updateMetrics();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const updateMetrics = useCallback(() => {
    const stats = batchProcessingService.getStats();
    
    // 模拟性能指标
    setMetrics({
      uploadSpeed: Math.random() * 20 + 5,
      processingSpeed: Math.random() * 30 + 10,
      memoryUsage: Math.random() * 500 + 200,
      cpuUsage: Math.random() * 40 + 20,
      concurrentTasks: stats.runningTasks,
      queueLength: stats.queueLength,
      errorRate: stats.errorRate * 100,
      avgResponseTime: stats.avgProcessingTime
    });
  }, []);

  // 应用优化配置
  const applyOptimization = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      // 更新批处理服务配置
      // TODO: 实际应用配置到批处理服务

      // 记录优化历史
      const optimizationRecord: OptimizationRecord = {
        timestamp: new Date().toISOString(),
        config: { ...config },
        beforeMetrics: { ...metrics },
        type: 'manual'
      };

      setOptimizationHistory(prev => [optimizationRecord, ...prev.slice(0, 9)]);
      
      // 通知父组件配置变更
      onConfigChange?.(config);
      
      message.success('性能优化配置已应用');
      
    } catch {
      message.error('应用优化配置失败');
    } finally {
      setIsOptimizing(false);
    }
  }, [config, metrics, onConfigChange]);

  // 自动优化
  const autoOptimize = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      const newConfig = { ...config };
      
      // 基于当前性能指标自动调整
      if (metrics.cpuUsage > 80) {
        newConfig.maxConcurrentProcessing = Math.max(1, newConfig.maxConcurrentProcessing - 1);
        newConfig.maxConcurrentUploads = Math.max(1, newConfig.maxConcurrentUploads - 1);
      } else if (metrics.cpuUsage < 40 && metrics.queueLength > 5) {
        newConfig.maxConcurrentProcessing = Math.min(10, newConfig.maxConcurrentProcessing + 1);
        newConfig.maxConcurrentUploads = Math.min(8, newConfig.maxConcurrentUploads + 1);
      }
      
      if (metrics.memoryUsage > 800) {
        newConfig.chunkSize = Math.max(1, newConfig.chunkSize - 2);
      } else if (metrics.memoryUsage < 300) {
        newConfig.chunkSize = Math.min(50, newConfig.chunkSize + 5);
      }
      
      if (metrics.errorRate > 10) {
        newConfig.retryAttempts = Math.min(5, newConfig.retryAttempts + 1);
        newConfig.timeoutDuration = Math.min(600000, newConfig.timeoutDuration + 60000);
      }
      
      setConfig(newConfig);
      
      // 记录自动优化
      const optimizationRecord: OptimizationRecord = {
        timestamp: new Date().toISOString(),
        config: newConfig,
        beforeMetrics: { ...metrics },
        type: 'auto',
        changes: {
          concurrentProcessing: newConfig.maxConcurrentProcessing !== config.maxConcurrentProcessing,
          concurrentUploads: newConfig.maxConcurrentUploads !== config.maxConcurrentUploads,
          chunkSize: newConfig.chunkSize !== config.chunkSize,
          retrySettings: newConfig.retryAttempts !== config.retryAttempts
        }
      };
      
      setOptimizationHistory(prev => [optimizationRecord, ...prev.slice(0, 9)]);
      
      message.success('自动优化完成');
      
    } catch {
      message.error('自动优化失败');
    } finally {
      setIsOptimizing(false);
    }
  }, [config, metrics]);

  // 重置为默认配置
  const resetToDefaults = () => {
    const defaultConfig: OptimizationConfig = {
      maxConcurrentUploads: 3,
      maxConcurrentProcessing: 5,
      chunkSize: 10,
      enableCompression: true,
      enableCaching: true,
      retryAttempts: 3,
      timeoutDuration: 300000,
      enableProgressiveUpload: true
    };
    
    setConfig(defaultConfig);
    message.info('已重置为默认配置');
  };

  // 性能指标颜色
  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return '#52c41a';
    if (value <= thresholds.warning) return '#faad14';
    return '#ff4d4f';
  };

  // 优化历史表格列
  const historyColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => new Date(timestamp).toLocaleString()
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'auto' ? 'blue' : 'green'}>
          {type === 'auto' ? '自动' : '手动'}
        </Tag>
      )
    },
    {
      title: '并发上传',
      dataIndex: ['config', 'maxConcurrentUploads'],
      key: 'concurrentUploads'
    },
    {
      title: '并发处理',
      dataIndex: ['config', 'maxConcurrentProcessing'],
      key: 'concurrentProcessing'
    },
    {
      title: '分块大小',
      dataIndex: ['config', 'chunkSize'],
      key: 'chunkSize',
      render: (size: number) => `${size}MB`
    }
  ];

  return (
    <div className="performance-optimizer">
      <Card title="性能优化器" extra={
        <Space>
          <Button 
            icon={<RocketOutlined />} 
            onClick={autoOptimize}
            loading={isOptimizing}
            type="primary"
          >
            自动优化
          </Button>
          <Button 
            icon={<SettingOutlined />} 
            onClick={() => setShowAdvancedSettings(true)}
          >
            高级设置
          </Button>
        </Space>
      }>
        {/* 性能指标 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="上传速度"
                value={metrics.uploadSpeed}
                precision={1}
                suffix="MB/s"
                valueStyle={{ color: getMetricColor(metrics.uploadSpeed, { good: 15, warning: 8 }) }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="处理速度"
                value={metrics.processingSpeed}
                precision={0}
                suffix="files/min"
                valueStyle={{ color: getMetricColor(metrics.processingSpeed, { good: 20, warning: 10 }) }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="内存使用"
                value={metrics.memoryUsage}
                precision={0}
                suffix="MB"
                valueStyle={{ color: getMetricColor(metrics.memoryUsage, { good: 400, warning: 600 }) }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="CPU使用率"
                value={metrics.cpuUsage}
                precision={1}
                suffix="%"
                valueStyle={{ color: getMetricColor(metrics.cpuUsage, { good: 50, warning: 70 }) }}
              />
            </Card>
          </Col>
        </Row>

        {/* 系统状态 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={12}>
            <Card title="系统负载" size="small">
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span>CPU使用率</span>
                  <span>{metrics.cpuUsage.toFixed(1)}%</span>
                </div>
                <Progress 
                  percent={metrics.cpuUsage} 
                  strokeColor={getMetricColor(metrics.cpuUsage, { good: 50, warning: 70 })}
                  showInfo={false}
                />
              </div>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span>内存使用</span>
                  <span>{metrics.memoryUsage.toFixed(0)}MB</span>
                </div>
                <Progress 
                  percent={(metrics.memoryUsage / 1000) * 100} 
                  strokeColor={getMetricColor(metrics.memoryUsage, { good: 400, warning: 600 })}
                  showInfo={false}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span>错误率</span>
                  <span>{metrics.errorRate.toFixed(1)}%</span>
                </div>
                <Progress 
                  percent={metrics.errorRate} 
                  strokeColor={getMetricColor(metrics.errorRate, { good: 2, warning: 5 })}
                  showInfo={false}
                />
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="任务状态" size="small">
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Statistic
                    title="并发任务"
                    value={metrics.concurrentTasks}
                    prefix={<ThunderboltOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="队列长度"
                    value={metrics.queueLength}
                    prefix={<DatabaseOutlined />}
                  />
                </Col>
                <Col span={24}>
                  <Statistic
                    title="平均响应时间"
                    value={metrics.avgResponseTime}
                    suffix="ms"
                    prefix={<MonitorOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 快速配置 */}
        <Card title="快速配置" size="small" className="mb-6">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div className="mb-2">并发上传数</div>
              <Slider
                min={1}
                max={8}
                value={config.maxConcurrentUploads}
                onChange={(value) => setConfig(prev => ({ ...prev, maxConcurrentUploads: value }))}
                marks={{ 1: '1', 4: '4', 8: '8' }}
              />
            </Col>
            <Col span={8}>
              <div className="mb-2">并发处理数</div>
              <Slider
                min={1}
                max={10}
                value={config.maxConcurrentProcessing}
                onChange={(value) => setConfig(prev => ({ ...prev, maxConcurrentProcessing: value }))}
                marks={{ 1: '1', 5: '5', 10: '10' }}
              />
            </Col>
            <Col span={8}>
              <div className="mb-2">分块大小 (MB)</div>
              <Slider
                min={1}
                max={50}
                value={config.chunkSize}
                onChange={(value) => setConfig(prev => ({ ...prev, chunkSize: value }))}
                marks={{ 1: '1', 25: '25', 50: '50' }}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <div className="flex items-center justify-between">
                <span>启用压缩</span>
                <Switch
                  checked={config.enableCompression}
                  onChange={(checked) => setConfig(prev => ({ ...prev, enableCompression: checked }))}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="flex items-center justify-between">
                <span>启用缓存</span>
                <Switch
                  checked={config.enableCaching}
                  onChange={(checked) => setConfig(prev => ({ ...prev, enableCaching: checked }))}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="flex items-center justify-between">
                <span>渐进式上传</span>
                <Switch
                  checked={config.enableProgressiveUpload}
                  onChange={(checked) => setConfig(prev => ({ ...prev, enableProgressiveUpload: checked }))}
                />
              </div>
            </Col>
            <Col span={6}>
              <Space>
                <Button onClick={applyOptimization} loading={isOptimizing} type="primary">
                  应用配置
                </Button>
                <Button onClick={resetToDefaults}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 性能建议 */}
        {(metrics.cpuUsage > 80 || metrics.memoryUsage > 600 || metrics.errorRate > 5) && (
          <Alert
            message="性能建议"
            description={
              <ul className="mb-0">
                {metrics.cpuUsage > 80 && <li>CPU使用率过高，建议减少并发任务数</li>}
                {metrics.memoryUsage > 600 && <li>内存使用过高，建议减小分块大小或启用压缩</li>}
                {metrics.errorRate > 5 && <li>错误率较高，建议增加重试次数或检查网络连接</li>}
              </ul>
            }
            type="warning"
            showIcon
            className="mb-6"
          />
        )}

        {/* 优化历史 */}
        {optimizationHistory.length > 0 && (
          <Card title="优化历史" size="small">
            <Table
              columns={historyColumns}
              dataSource={optimizationHistory}
              rowKey="timestamp"
              size="small"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        )}
      </Card>

      {/* 高级设置模态框 */}
      <Modal
        title="高级性能设置"
        open={showAdvancedSettings}
        onCancel={() => setShowAdvancedSettings(false)}
        onOk={() => {
          applyOptimization();
          setShowAdvancedSettings(false);
        }}
        width={600}
      >
        <Form layout="vertical">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item label="重试次数">
                <InputNumber
                  min={1}
                  max={10}
                  value={config.retryAttempts}
                  onChange={(value) => setConfig(prev => ({ ...prev, retryAttempts: value || 3 }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="超时时间 (秒)">
                <InputNumber
                  min={30}
                  max={600}
                  value={config.timeoutDuration / 1000}
                  onChange={(value) => setConfig(prev => ({ ...prev, timeoutDuration: (value || 300) * 1000 }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Alert
            message="注意"
            description="修改高级设置可能影响系统稳定性，请谨慎调整。"
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    </div>
  );
};

export default PerformanceOptimizer;