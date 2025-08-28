import React, { useState, useMemo } from 'react';
import {
  Card,
  Progress,
  Badge,
  List,
  Typography,
  Space,
  Button,
  Statistic,
  Row,
  Col,
  Tag,
  Timeline,
  Switch,
  InputNumber,
  Divider
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  ReloadOutlined,
  BellOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useQualityMonitoring } from '../../hooks/useQualityMonitoring';

const { Text, Title } = Typography;

interface QualityMonitoringPanelProps {
  examId?: string;
  compact?: boolean;
}

interface QualityThreshold {
  metric: string;
  threshold: number;
  enabled: boolean;
}

interface QualityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high';
}

export const QualityMonitoringPanel: React.FC<QualityMonitoringPanelProps> = ({
  examId,
  compact = false
}) => {
  const {
    qualityMetrics,
    alerts,
    realTimeData,
    acknowledgeAlert,
    adjustQualityThreshold,
    refreshMetrics
  } = useQualityMonitoring(examId);

  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState<QualityThreshold[]>([
    { metric: 'accuracy', threshold: 95, enabled: true },
    { metric: 'consistency', threshold: 90, enabled: true },
    { metric: 'speed', threshold: 5, enabled: true },
    { metric: 'errorRate', threshold: 5, enabled: true }
  ]);

  // 计算质量得分
  const qualityScore = useMemo(() => {
    if (!qualityMetrics) return 0;
    
    const scores = [
      qualityMetrics.accuracyRate * 100,
      qualityMetrics.consistencyScore * 100,
      Math.min(qualityMetrics.processingSpeed / 10 * 100, 100),
      Math.max(0, 100 - qualityMetrics.errorRate * 100)
    ];
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [qualityMetrics]);

  // 获取质量状态
  const getQualityStatus = (score: number) => {
    if (score >= 90) return { status: 'success', text: '优秀' };
    if (score >= 80) return { status: 'processing', text: '良好' };
    if (score >= 70) return { status: 'warning', text: '一般' };
    return { status: 'exception', text: '需改进' };
  };

  // 获取趋势图标
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
    if (trend < 0) return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
    return <ClockCircleOutlined style={{ color: '#faad14' }} />;
  };

  // 处理阈值调整
  const handleThresholdChange = (metric: string, value: number) => {
    setThresholds(prev => 
      prev.map(t => t.metric === metric ? { ...t, threshold: value } : t)
    );
    adjustQualityThreshold(metric, value);
  };

  // 处理告警确认
  const handleAcknowledgeAlert = (alertId: string) => {
    acknowledgeAlert(alertId);
  };

  // 未解决告警数量
  const unresolvedAlertsCount = alerts.filter(alert => !alert.resolved).length;

  // 紧凑模式渲染
  if (compact) {
    return (
      <div style={{ padding: '8px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge count={unresolvedAlertsCount} size="small">
              <BellOutlined />
            </Badge>
            <Text strong>{qualityScore}分</Text>
          </div>
          
          <Progress
            percent={qualityScore}
            size="small"
            status={getQualityStatus(qualityScore).status as 'success' | 'exception' | 'normal' | 'active'}
            format={() => getQualityStatus(qualityScore).text}
          />

          {qualityMetrics && (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">准确率</Text>
                <Text>{Math.round(qualityMetrics.accuracyRate * 100)}%</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">一致性</Text>
                <Text>{Math.round(qualityMetrics.consistencyScore * 100)}%</Text>
              </div>
            </Space>
          )}
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 标题和设置 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>质量监控</Title>
          <Space>
            <Badge count={unresolvedAlertsCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                size="small"
              />
            </Badge>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={refreshMetrics}
              size="small"
            />
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(!showSettings)}
              size="small"
            />
          </Space>
        </div>

        {/* 整体质量评分 */}
        <Card size="small">
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={qualityScore}
              size={120}
              status={getQualityStatus(qualityScore).status as 'success' | 'exception' | 'normal' | 'active'}
              format={() => (
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{qualityScore}</div>
                  <div style={{ fontSize: '12px' }}>{getQualityStatus(qualityScore).text}</div>
                </div>
              )}
            />
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">整体质量评分</Text>
            </div>
          </div>
        </Card>

        {/* 核心指标 */}
        {qualityMetrics && (
          <Card size="small" title="核心指标">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="评分准确率"
                  value={qualityMetrics.accuracyRate * 100}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: qualityMetrics.accuracyRate >= 0.95 ? '#52c41a' : '#faad14',
                    fontSize: '16px'
                  }}
                  prefix={getTrendIcon(qualityMetrics.accuracyTrend || 0)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="一致性评分"
                  value={qualityMetrics.consistencyScore * 100}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: qualityMetrics.consistencyScore >= 0.90 ? '#52c41a' : '#faad14',
                    fontSize: '16px'
                  }}
                  prefix={getTrendIcon(qualityMetrics.consistencyTrend || 0)}
                />
              </Col>
            </Row>
            
            <Divider style={{ margin: '16px 0' }} />
            
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="处理速度"
                  value={qualityMetrics.processingSpeed}
                  suffix="份/分钟"
                  valueStyle={{ 
                    color: qualityMetrics.processingSpeed >= 5 ? '#52c41a' : '#faad14',
                    fontSize: '16px'
                  }}
                  prefix={getTrendIcon(qualityMetrics.speedTrend || 0)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="错误率"
                  value={qualityMetrics.errorRate * 100}
                  precision={2}
                  suffix="%"
                  valueStyle={{ 
                    color: qualityMetrics.errorRate <= 0.05 ? '#52c41a' : '#ff4d4f',
                    fontSize: '16px'
                  }}
                  prefix={getTrendIcon(-(qualityMetrics.errorTrend || 0))}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* AI置信度分布 */}
        {qualityMetrics?.confidenceDistribution && (
          <Card size="small" title="AI置信度分布">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={qualityMetrics.confidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <RechartsTooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  dot={{ fill: '#1890ff', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* 实时趋势 */}
        {realTimeData && realTimeData.length > 0 && (
          <Card size="small" title="实时趋势">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <RechartsTooltip />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#52c41a" 
                  name="准确率"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="consistency" 
                  stroke="#1890ff" 
                  name="一致性"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="speed" 
                  stroke="#faad14" 
                  name="速度"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* 质量告警 */}
        {alerts.length > 0 && (
          <Card size="small" title={`质量告警 (${unresolvedAlertsCount})`}>
            <List
              size="small"
              dataSource={alerts.slice(0, 5)}
              renderItem={(alert: QualityAlert) => (
                <List.Item
                  actions={[
                    !alert.resolved && (
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        确认
                      </Button>
                    )
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        status={alert.resolved ? 'default' : 
                               alert.type === 'error' ? 'error' : 
                               alert.type === 'warning' ? 'warning' : 'processing'}
                      />
                    }
                    title={
                      <Space>
                        <Text strong={!alert.resolved}>{alert.title}</Text>
                        <Tag color={
                          alert.severity === 'high' ? 'red' :
                          alert.severity === 'medium' ? 'orange' : 'blue'
                        }>
                          {alert.severity}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary">{alert.message}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {alert.timestamp}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
            
            {alerts.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <Button type="link" size="small">
                  查看全部 {alerts.length} 条告警
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* 质量阈值设置 */}
        {showSettings && (
          <Card size="small" title="质量阈值设置">
            <Space direction="vertical" style={{ width: '100%' }}>
              {thresholds.map(threshold => (
                <div key={threshold.metric} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div style={{ flex: 1 }}>
                    <Text>{
                      threshold.metric === 'accuracy' ? '准确率' :
                      threshold.metric === 'consistency' ? '一致性' :
                      threshold.metric === 'speed' ? '速度' :
                      threshold.metric === 'errorRate' ? '错误率' : threshold.metric
                    }</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <InputNumber
                      min={0}
                      max={100}
                      value={threshold.threshold}
                      onChange={(value) => handleThresholdChange(threshold.metric, value || 0)}
                      size="small"
                      style={{ width: '70px' }}
                    />
                    <Text type="secondary">
                      {threshold.metric === 'speed' ? '份/分钟' : '%'}
                    </Text>
                    <Switch
                      checked={threshold.enabled}
                      size="small"
                      onChange={(checked) => {
                        setThresholds(prev => 
                          prev.map(t => t.metric === threshold.metric ? 
                            { ...t, enabled: checked } : t)
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* 质量建议 */}
        <Card size="small" title="质量优化建议">
          <Timeline>
            {qualityMetrics && qualityMetrics.accuracyRate < 0.95 && (
              <Timeline.Item 
                dot={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                color="orange"
              >
                <Text>建议优化AI模型参数，提高评分准确率</Text>
              </Timeline.Item>
            )}
            
            {qualityMetrics && qualityMetrics.processingSpeed < 5 && (
              <Timeline.Item 
                dot={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                color="blue"
              >
                <Text>考虑增加并发处理数量，提升处理速度</Text>
              </Timeline.Item>
            )}
            
            {qualityMetrics && qualityMetrics.errorRate > 0.05 && (
              <Timeline.Item 
                dot={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                color="red"
              >
                <Text>错误率偏高，建议检查输入数据质量</Text>
              </Timeline.Item>
            )}
            
            <Timeline.Item 
              dot={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              color="green"
            >
              <Text>系统运行正常，建议保持当前配置</Text>
            </Timeline.Item>
          </Timeline>
        </Card>
      </Space>
    </div>
  );
};

export default QualityMonitoringPanel;