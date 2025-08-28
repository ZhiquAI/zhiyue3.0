/**
 * 实时监控仪表板
 * 展示系统状态、进度追踪、质量监控等实时信息
 */

import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Alert, Badge, Button, Tabs, Table, Tag } from 'antd';
import { 
  MonitorOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSystemMonitor } from '../../hooks/useSystemMonitor';
import { useRealTimeProgress } from '../../hooks/useRealTimeProgress';
import { useQualityMonitoring } from '../../hooks/useQualityMonitoring';

const { TabPane } = Tabs;

interface RealTimeDashboardProps {
  examId?: string;
  batchId?: string;
  className?: string;
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  examId,
  batchId,
  className
}) => {
  const [activeTab, setActiveTab] = useState('system');

  // 系统监控
  const {
    isConnected: systemConnected,
    systemStatus,
    services,
    alerts,
    performanceHistory,
    isHealthy,
    criticalAlerts,
    refreshSystemStatus,
    acknowledgeAlert,
    clearAlerts
  } = useSystemMonitor({
    autoConnect: true,
    refreshInterval: 30000,
    enableAlerts: true
  });

  // 进度监控（如果有批次ID）
  const progressMonitor = useRealTimeProgress({
    batchId: batchId || 'demo-batch',
    autoConnect: !!batchId,
    enableHistory: true,
    onBatchCompleted: (progress) => {
      console.log('Batch completed:', progress);
    },
    onError: (error) => {
      console.error('Progress error:', error);
    }
  });

  // 质量监控（如果有考试ID）
  const qualityMonitor = useQualityMonitoring(examId);

  // 渲染系统状态卡片
  const renderSystemStatusCard = () => (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <MonitorOutlined className="mr-2" />
            系统状态
          </span>
          <div className="flex items-center space-x-2">
            <Badge 
              status={systemConnected ? 'processing' : 'error'} 
              text={systemConnected ? '已连接' : '未连接'} 
            />
            <Button 
              icon={<ReloadOutlined />} 
              size="small" 
              onClick={refreshSystemStatus}
            >
              刷新
            </Button>
          </div>
        </div>
      }
    >
      {systemStatus ? (
        <>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="CPU使用率"
                value={systemStatus.cpu_percent}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: systemStatus.cpu_percent > 80 ? '#cf1322' : '#3f8600' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="内存使用率"
                value={systemStatus.memory_percent}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: systemStatus.memory_percent > 85 ? '#cf1322' : '#3f8600' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="磁盘使用率"
                value={systemStatus.disk_percent}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: systemStatus.disk_percent > 90 ? '#cf1322' : '#3f8600' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="活跃连接"
                value={systemStatus.connections.total_connections}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>

          {/* 性能趋势图 */}
          {performanceHistory.length > 0 && (
            <div className="mt-4">
              <h4>性能趋势</h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={performanceHistory.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU%" />
                    <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="内存%" />
                    <Line type="monotone" dataKey="disk" stroke="#ffc658" name="磁盘%" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 系统告警 */}
          {alerts.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4>系统告警</h4>
                <Button size="small" onClick={clearAlerts}>
                  清除所有
                </Button>
              </div>
              {alerts.slice(0, 5).map((alert) => (
                <Alert
                  key={alert.id}
                  message={alert.title}
                  description={alert.message}
                  type={alert.type === 'critical' ? 'error' : alert.type as any}
                  showIcon
                  closable
                  className="mb-2"
                  onClose={() => acknowledgeAlert(alert.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500">
          {systemConnected ? '正在加载系统状态...' : '系统监控未连接'}
        </div>
      )}
    </Card>
  );

  // 渲染进度监控卡片
  const renderProgressCard = () => (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <ClockCircleOutlined className="mr-2" />
            进度监控
          </span>
          <div className="flex items-center space-x-2">
            <Badge 
              status={progressMonitor.isConnected ? 'processing' : 'error'} 
              text={progressMonitor.isConnected ? '已连接' : '未连接'} 
            />
            <Button.Group size="small">
              <Button icon={<PlayCircleOutlined />} onClick={progressMonitor.resumeBatch}>
                开始
              </Button>
              <Button icon={<PauseCircleOutlined />} onClick={progressMonitor.pauseBatch}>
                暂停
              </Button>
              <Button icon={<StopOutlined />} onClick={progressMonitor.cancelBatch}>
                停止
              </Button>
            </Button.Group>
          </div>
        </div>
      }
    >
      {progressMonitor.progress ? (
        <>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div className="text-center">
                <Progress
                  type="circle"
                  percent={progressMonitor.progressPercentage}
                  format={() => `${progressMonitor.progressPercentage}%`}
                  status={progressMonitor.hasErrors ? 'exception' : 'active'}
                />
                <div className="mt-2 text-sm text-gray-600">
                  总体进度
                </div>
              </div>
            </Col>
            <Col span={12}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Statistic
                    title="已完成"
                    value={progressMonitor.progress.completedTasks}
                    suffix={`/ ${progressMonitor.progress.totalTasks}`}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="处理中"
                    value={progressMonitor.progress.processingTasks}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="错误数"
                    value={progressMonitor.progress.failedTasks}
                    prefix={<ExclamationCircleOutlined />}
                    valueStyle={{ color: progressMonitor.hasErrors ? '#cf1322' : undefined }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="处理速度"
                    value={progressMonitor.progress.processingRate}
                    precision={1}
                    suffix="任务/分钟"
                  />
                </Col>
              </Row>
            </Col>
          </Row>

          <div className="mt-4">
            <p><strong>状态：</strong>
              <Tag color={
                progressMonitor.progress.status === 'completed' ? 'green' :
                progressMonitor.progress.status === 'processing' ? 'blue' :
                progressMonitor.progress.status === 'failed' ? 'red' : 'default'
              }>
                {progressMonitor.progress.status}
              </Tag>
            </p>
            <p><strong>预计剩余时间：</strong> {progressMonitor.estimatedTimeRemaining} 分钟</p>
            <p><strong>平均任务耗时：</strong> {progressMonitor.averageTaskDuration} 秒</p>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500">
          {progressMonitor.isConnected ? '正在加载进度信息...' : '进度监控未连接'}
        </div>
      )}
    </Card>
  );

  // 渲染质量监控卡片
  const renderQualityCard = () => (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <CheckCircleOutlined className="mr-2" />
            质量监控
          </span>
          <div className="flex items-center space-x-2">
            <Badge 
              status={qualityMonitor.isConnected ? 'processing' : 'error'} 
              text={qualityMonitor.isConnected ? '已连接' : '未连接'} 
            />
            <Button 
              icon={<ReloadOutlined />} 
              size="small" 
              onClick={qualityMonitor.refreshMetrics}
            >
              刷新
            </Button>
          </div>
        </div>
      }
    >
      {qualityMonitor.qualityMetrics ? (
        <>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="准确率"
                value={qualityMonitor.qualityMetrics.accuracyRate * 100}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: qualityMonitor.qualityMetrics.accuracyRate > 0.95 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="一致性"
                value={qualityMonitor.qualityMetrics.consistencyScore * 100}
                precision={1}
                suffix="%"
                valueStyle={{ 
                  color: qualityMonitor.qualityMetrics.consistencyScore > 0.9 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="处理速度"
                value={qualityMonitor.qualityMetrics.processingSpeed}
                precision={1}
                suffix="份/分钟"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="错误率"
                value={qualityMonitor.qualityMetrics.errorRate * 100}
                precision={2}
                suffix="%"
                valueStyle={{ 
                  color: qualityMonitor.qualityMetrics.errorRate < 0.05 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
          </Row>

          {/* 质量告警 */}
          {qualityMonitor.alerts.length > 0 && (
            <div className="mt-4">
              <h4>质量告警</h4>
              {qualityMonitor.alerts.slice(0, 3).map((alert) => (
                <Alert
                  key={alert.id}
                  message={alert.title}
                  description={alert.message}
                  type={alert.type === 'error' ? 'error' : 'warning'}
                  showIcon
                  closable
                  className="mb-2"
                  onClose={() => qualityMonitor.acknowledgeAlert(alert.id)}
                />
              ))}
            </div>
          )}

          {/* 实时数据图表 */}
          {qualityMonitor.realTimeData.length > 0 && (
            <div className="mt-4">
              <h4>实时质量趋势</h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={qualityMonitor.realTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="准确率%" />
                    <Line type="monotone" dataKey="consistency" stroke="#82ca9d" name="一致性%" />
                    <Line type="monotone" dataKey="errorRate" stroke="#ffc658" name="错误率%" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500">
          {qualityMonitor.isConnected ? '正在加载质量指标...' : '质量监控未连接'}
        </div>
      )}
    </Card>
  );

  return (
    <div className={className}>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="系统监控" key="system">
          {renderSystemStatusCard()}
        </TabPane>
        
        {batchId && (
          <TabPane tab="进度监控" key="progress">
            {renderProgressCard()}
          </TabPane>
        )}
        
        {examId && (
          <TabPane tab="质量监控" key="quality">
            {renderQualityCard()}
          </TabPane>
        )}
      </Tabs>
    </div>
  );
};

export default RealTimeDashboard;