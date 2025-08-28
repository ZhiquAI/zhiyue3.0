import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Alert,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Tooltip,
  Badge,
  Timeline,
  Tabs,
  message,
  Descriptions,
  Empty,
  Spin
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SettingOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  AlertOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/plots';
import { RangePickerProps } from 'antd/es/date-picker';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface QualityMetric {
  metric_name: string;
  value: number;
  threshold: number;
  status: string;
  timestamp: string;
  details?: any;
}

interface QualityAnomaly {
  anomaly_id: string;
  type: string;
  severity: string;
  description: string;
  affected_items: string[];
  detection_time: string;
  confidence: number;
  suggested_actions: string[];
  resolution_status: string;
  metadata?: any;
}

interface DashboardData {
  summary: {
    total_sessions: number;
    total_anomalies: number;
    active_anomalies: number;
    quality_distribution: { [key: string]: number };
    period_days: number;
  };
  recent_reports: any[];
  active_anomalies: QualityAnomaly[];
  quality_trends: { [key: string]: number[] };
}

const QualityControlDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [anomalies, setAnomalies] = useState<QualityAnomaly[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');

  // 模态框状态
  const [anomalyDetailVisible, setAnomalyDetailVisible] = useState<boolean>(false);
  const [thresholdModalVisible, setThresholdModalVisible] = useState<boolean>(false);
  const [assessmentModalVisible, setAssessmentModalVisible] = useState<boolean>(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<QualityAnomaly | null>(null);

  // 表单
  const [thresholdForm] = Form.useForm();
  const [assessmentForm] = Form.useForm();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (days: number = 7) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quality-control/dashboard?days=${days}`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      message.error('加载仪表板数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async (sessionId?: string, dateRange?: [moment.Moment, moment.Moment]) => {
    try {
      let url = '/api/quality-control/metrics';
      const params = new URLSearchParams();
      
      if (sessionId) {
        url += `/${sessionId}`;
      }
      
      if (dateRange) {
        params.append('start_time', dateRange[0].toISOString());
        params.append('end_time', dateRange[1].toISOString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      message.error('加载质量指标失败');
    }
  };

  const loadAnomalies = async (filters?: any) => {
    try {
      const params = new URLSearchParams();
      
      if (filters?.sessionId) params.append('session_id', filters.sessionId);
      if (filters?.type) params.append('anomaly_type', filters.type);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.status) params.append('resolution_status', filters.status);
      
      const response = await fetch(`/api/quality-control/anomalies?${params.toString()}`);
      const data = await response.json();
      setAnomalies(data);
    } catch (error) {
      message.error('加载异常信息失败');
    }
  };

  const handleAssessQuality = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/quality-control/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`质量评估完成，报告ID: ${result.report_id}`);
        setAssessmentModalVisible(false);
        assessmentForm.resetFields();
        loadDashboardData();
      } else {
        const error = await response.json();
        message.error(`评估失败: ${error.detail}`);
      }
    } catch (error) {
      message.error('质量评估失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAnomaly = async (anomalyId: string, action: string, notes?: string) => {
    try {
      const response = await fetch(`/api/quality-control/anomalies/${anomalyId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_action: action,
          resolution_notes: notes,
        }),
      });

      if (response.ok) {
        message.success('异常已解决');
        setAnomalyDetailVisible(false);
        loadAnomalies();
        loadDashboardData();
      } else {
        message.error('解决异常失败');
      }
    } catch (error) {
      message.error('解决异常失败');
    }
  };

  const handleUpdateThresholds = async (values: any) => {
    try {
      const response = await fetch('/api/quality-control/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('阈值更新成功');
        setThresholdModalVisible(false);
        thresholdForm.resetFields();
      } else {
        message.error('阈值更新失败');
      }
    } catch (error) {
      message.error('阈值更新失败');
    }
  };

  const getStatusIcon = (status: string) => {
    const iconMap = {
      excellent: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      good: <CheckCircleOutlined style={{ color: '#1890ff' }} />,
      fair: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      poor: <WarningOutlined style={{ color: '#ff7a45' }} />,
      critical: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    };
    return iconMap[status as keyof typeof iconMap] || <ExclamationCircleOutlined />;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      excellent: '#52c41a',
      good: '#1890ff', 
      fair: '#faad14',
      poor: '#ff7a45',
      critical: '#ff4d4f'
    };
    return colorMap[status as keyof typeof colorMap] || '#d9d9d9';
  };

  const getSeverityColor = (severity: string) => {
    const colorMap = {
      critical: 'red',
      poor: 'orange',
      fair: 'yellow',
      good: 'blue',
      excellent: 'green'
    };
    return colorMap[severity as keyof typeof colorMap] || 'default';
  };

  // 质量趋势图表配置
  const qualityTrendConfig = {
    data: dashboardData?.quality_trends ? Object.keys(dashboardData.quality_trends).map(metric => 
      dashboardData.quality_trends[metric].map((value, index) => ({
        day: index + 1,
        metric,
        value
      }))
    ).flat() : [],
    xField: 'day',
    yField: 'value',
    seriesField: 'metric',
    smooth: true,
    legend: { position: 'top' as const },
    color: ['#1890ff', '#52c41a', '#faad14', '#ff4d4f']
  };

  // 质量分布图表配置
  const qualityDistributionConfig = {
    data: dashboardData?.summary.quality_distribution ? Object.entries(dashboardData.summary.quality_distribution).map(([level, count]) => ({
      level,
      count
    })) : [],
    angleField: 'count',
    colorField: 'level',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}'
    },
    color: ['#52c41a', '#1890ff', '#faad14', '#ff7a45', '#ff4d4f']
  };

  const metricsColumns = [
    {
      title: '指标名称',
      dataIndex: 'metric_name',
      key: 'metric_name',
      render: (text: string) => {
        const nameMap = {
          accuracy: '准确性',
          consistency: '一致性', 
          response_time: '响应时间',
          error_rate: '错误率',
          confidence: '置信度',
          distribution: '分布合理性'
        };
        return nameMap[text as keyof typeof nameMap] || text;
      }
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: QualityMetric) => {
        const isPercentage = ['accuracy', 'consistency', 'confidence', 'error_rate'].includes(record.metric_name);
        const isTime = record.metric_name === 'response_time';
        
        let displayValue = value.toFixed(isTime ? 0 : 3);
        if (isPercentage) displayValue = (value * 100).toFixed(1) + '%';
        if (isTime) displayValue += 'ms';
        
        return displayValue;
      }
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (threshold: number, record: QualityMetric) => {
        const isPercentage = ['accuracy', 'consistency', 'confidence', 'error_rate'].includes(record.metric_name);
        const isTime = record.metric_name === 'response_time';
        
        let displayValue = threshold.toFixed(isTime ? 0 : 3);
        if (isPercentage) displayValue = (threshold * 100).toFixed(1) + '%';
        if (isTime) displayValue += 'ms';
        
        return displayValue;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getSeverityColor(status)} icon={getStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '检测时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time: string) => moment(time).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  const anomaliesColumns = [
    {
      title: '异常类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          score_outlier: '分数异常',
          pattern_deviation: '模式偏离',
          grader_inconsistency: '评卷员不一致',
          system_error: '系统错误',
          data_quality: '数据质量',
          performance_degradation: '性能下降'
        };
        return typeMap[type as keyof typeof typeMap] || type;
      }
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (
        <Progress 
          percent={Math.round(confidence * 100)} 
          size="small" 
          status={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'active' : 'exception'}
        />
      )
    },
    {
      title: '检测时间',
      dataIndex: 'detection_time',
      key: 'detection_time',
      render: (time: string) => moment(time).fromNow()
    },
    {
      title: '状态',
      dataIndex: 'resolution_status',
      key: 'resolution_status',
      render: (status: string) => (
        <Badge 
          status={status === 'resolved' ? 'success' : 'processing'} 
          text={status === 'resolved' ? '已解决' : '待处理'}
        />
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: QualityAnomaly) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedAnomaly(record);
                setAnomalyDetailVisible(true);
              }}
            />
          </Tooltip>
          {record.resolution_status === 'pending' && (
            <Tooltip title="快速解决">
              <Button 
                type="text" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleResolveAnomaly(record.anomaly_id, 'manual_review')}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  if (loading && !dashboardData) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 头部操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <h2 style={{ margin: 0 }}>智能质量控制</h2>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<AlertOutlined />} 
              type="primary"
              onClick={() => setAssessmentModalVisible(true)}
            >
              质量评估
            </Button>
            <Button 
              icon={<SettingOutlined />}
              onClick={() => setThresholdModalVisible(true)}
            >
              阈值设置
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => loadDashboardData()}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      {dashboardData && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic 
                title="评估会话" 
                value={dashboardData.summary.total_sessions}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="检测异常" 
                value={dashboardData.summary.total_anomalies}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="待处理异常" 
                value={dashboardData.summary.active_anomalies}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic 
                title="解决率" 
                value={
                  dashboardData.summary.total_anomalies > 0 
                    ? Math.round(((dashboardData.summary.total_anomalies - dashboardData.summary.active_anomalies) / dashboardData.summary.total_anomalies) * 100)
                    : 100
                }
                suffix="%"
                prefix={<TrendingUpOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容区域 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 概览 */}
          <TabPane tab="概览" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="质量趋势" size="small">
                  {dashboardData?.quality_trends && Object.keys(dashboardData.quality_trends).length > 0 ? (
                    <Line {...qualityTrendConfig} height={300} />
                  ) : (
                    <Empty description="暂无趋势数据" />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="质量分布" size="small">
                  {dashboardData?.summary.quality_distribution ? (
                    <Pie {...qualityDistributionConfig} height={300} />
                  ) : (
                    <Empty description="暂无分布数据" />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 活跃异常列表 */}
            <Card title="活跃异常" style={{ marginTop: '16px' }} size="small">
              {dashboardData?.active_anomalies?.length ? (
                <Table
                  columns={anomaliesColumns}
                  dataSource={dashboardData.active_anomalies}
                  rowKey="anomaly_id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                />
              ) : (
                <Empty description="暂无活跃异常" />
              )}
            </Card>
          </TabPane>

          {/* 质量指标 */}
          <TabPane tab="质量指标" key="metrics">
            <Space style={{ marginBottom: '16px' }}>
              <Input.Search
                placeholder="输入会话ID"
                allowClear
                onSearch={(value) => {
                  setSelectedSessionId(value);
                  loadMetrics(value);
                }}
                style={{ width: 200 }}
              />
              <RangePicker
                showTime
                onChange={(dates) => {
                  if (dates) {
                    loadMetrics(selectedSessionId, dates);
                  }
                }}
              />
              <Button 
                icon={<FilterOutlined />}
                onClick={() => loadMetrics(selectedSessionId)}
              >
                查询
              </Button>
            </Space>

            <Table
              columns={metricsColumns}
              dataSource={metrics}
              rowKey={(record) => `${record.metric_name}-${record.timestamp}`}
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          </TabPane>

          {/* 异常管理 */}
          <TabPane tab="异常管理" key="anomalies">
            <Space style={{ marginBottom: '16px' }}>
              <Select
                placeholder="异常类型"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => loadAnomalies({ type: value })}
              >
                <Option value="score_outlier">分数异常</Option>
                <Option value="pattern_deviation">模式偏离</Option>
                <Option value="grader_inconsistency">评卷员不一致</Option>
                <Option value="system_error">系统错误</Option>
                <Option value="data_quality">数据质量</Option>
                <Option value="performance_degradation">性能下降</Option>
              </Select>

              <Select
                placeholder="严重程度"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => loadAnomalies({ severity: value })}
              >
                <Option value="critical">严重</Option>
                <Option value="poor">较差</Option>
                <Option value="fair">一般</Option>
                <Option value="good">良好</Option>
                <Option value="excellent">优秀</Option>
              </Select>

              <Select
                placeholder="处理状态"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => loadAnomalies({ status: value })}
              >
                <Option value="pending">待处理</Option>
                <Option value="resolved">已解决</Option>
              </Select>

              <Button 
                icon={<FilterOutlined />}
                onClick={() => loadAnomalies()}
              >
                查询
              </Button>
            </Space>

            <Table
              columns={anomaliesColumns}
              dataSource={anomalies}
              rowKey="anomaly_id"
              loading={loading}
              pagination={{ pageSize: 15 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 异常详情模态框 */}
      <Modal
        title="异常详情"
        visible={anomalyDetailVisible}
        onCancel={() => setAnomalyDetailVisible(false)}
        footer={
          selectedAnomaly?.resolution_status === 'pending' ? [
            <Button key="cancel" onClick={() => setAnomalyDetailVisible(false)}>
              取消
            </Button>,
            <Button 
              key="resolve" 
              type="primary"
              onClick={() => {
                if (selectedAnomaly) {
                  handleResolveAnomaly(selectedAnomaly.anomaly_id, 'manual_review');
                }
              }}
            >
              标记为已解决
            </Button>
          ] : null
        }
        width={800}
      >
        {selectedAnomaly && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="异常ID">{selectedAnomaly.anomaly_id}</Descriptions.Item>
            <Descriptions.Item label="类型">{selectedAnomaly.type}</Descriptions.Item>
            <Descriptions.Item label="严重程度">
              <Tag color={getSeverityColor(selectedAnomaly.severity)}>
                {selectedAnomaly.severity.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="置信度">
              {Math.round(selectedAnomaly.confidence * 100)}%
            </Descriptions.Item>
            <Descriptions.Item label="检测时间" span={2}>
              {moment(selectedAnomaly.detection_time).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {selectedAnomaly.description}
            </Descriptions.Item>
            <Descriptions.Item label="建议操作" span={2}>
              {selectedAnomaly.suggested_actions.map((action, index) => (
                <Tag key={index} color="blue">{action}</Tag>
              ))}
            </Descriptions.Item>
            {selectedAnomaly.affected_items?.length > 0 && (
              <Descriptions.Item label="影响项目" span={2}>
                {selectedAnomaly.affected_items.join(', ')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 阈值设置模态框 */}
      <Modal
        title="质量阈值设置"
        visible={thresholdModalVisible}
        onCancel={() => setThresholdModalVisible(false)}
        onOk={() => thresholdForm.submit()}
      >
        <Form
          form={thresholdForm}
          layout="vertical"
          onFinish={handleUpdateThresholds}
        >
          <Form.Item
            name="metric_name"
            label="指标名称"
            rules={[{ required: true, message: '请选择指标' }]}
          >
            <Select placeholder="选择要设置的指标">
              <Option value="accuracy">准确性</Option>
              <Option value="consistency">一致性</Option>
              <Option value="response_time">响应时间</Option>
              <Option value="error_rate">错误率</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['thresholds', 'excellent']} label="优秀阈值">
                <Input type="number" step="0.01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['thresholds', 'good']} label="良好阈值">
                <Input type="number" step="0.01" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['thresholds', 'fair']} label="一般阈值">
                <Input type="number" step="0.01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['thresholds', 'poor']} label="较差阈值">
                <Input type="number" step="0.01" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 质量评估模态框 */}
      <Modal
        title="执行质量评估"
        visible={assessmentModalVisible}
        onCancel={() => setAssessmentModalVisible(false)}
        onOk={() => assessmentForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={assessmentForm}
          layout="vertical"
          onFinish={handleAssessQuality}
        >
          <Form.Item
            name="session_id"
            label="会话ID"
            rules={[{ required: true, message: '请输入会话ID' }]}
          >
            <Input placeholder="输入要评估的会话ID" />
          </Form.Item>

          <Form.Item
            name="grading_results"
            label="评分结果数据"
            rules={[{ required: true, message: '请输入评分结果数据' }]}
          >
            <Input.TextArea 
              rows={6}
              placeholder="请输入JSON格式的评分结果数据"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QualityControlDashboard;