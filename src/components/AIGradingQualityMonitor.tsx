import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Button,
  Select,
  DatePicker,
  Space,
  Alert,
  Tooltip,
  Modal,
  Typography,
  Tabs,
  List,
  Avatar,
  Badge,
  Divider,
  Timeline,
  Rate
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { TrendingUp, TrendingDown, AlertTriangle, Award, Target, Brain } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface QualityMetrics {
  accuracy_rate: number;
  consistency_rate: number;
  efficiency_score: number;
  teacher_satisfaction: number;
  false_positive_rate: number;
  false_negative_rate: number;
  average_processing_time: number;
  total_processed: number;
}

interface QualityTrend {
  date: string;
  accuracy: number;
  consistency: number;
  efficiency: number;
  satisfaction: number;
}

interface QualityIssue {
  id: string;
  type: 'accuracy' | 'consistency' | 'efficiency' | 'bias';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_count: number;
  detected_at: string;
  status: 'open' | 'investigating' | 'resolved';
  resolution?: string;
}

interface SubjectPerformance {
  subject: string;
  accuracy: number;
  consistency: number;
  total_questions: number;
  avg_score_diff: number;
}

interface TeacherFeedback {
  id: string;
  teacher_name: string;
  subject: string;
  rating: number;
  feedback: string;
  date: string;
  ai_score: number;
  manual_score: number;
  question_type: string;
}

const AIGradingQualityMonitor: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [teacherFeedback, setTeacherFeedback] = useState<TeacherFeedback[]>([]);
  const [showIssueDetail, setShowIssueDetail] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);

  // 模拟数据
  const mockMetrics: QualityMetrics = {
    accuracy_rate: 92.5,
    consistency_rate: 89.3,
    efficiency_score: 95.8,
    teacher_satisfaction: 4.2,
    false_positive_rate: 3.2,
    false_negative_rate: 4.3,
    average_processing_time: 1.8,
    total_processed: 15420
  };

  const mockTrends: QualityTrend[] = [
    { date: '2024-01-20', accuracy: 91.2, consistency: 88.5, efficiency: 94.2, satisfaction: 4.1 },
    { date: '2024-01-21', accuracy: 92.1, consistency: 89.1, efficiency: 95.1, satisfaction: 4.2 },
    { date: '2024-01-22', accuracy: 91.8, consistency: 88.9, efficiency: 94.8, satisfaction: 4.0 },
    { date: '2024-01-23', accuracy: 93.2, consistency: 90.2, efficiency: 96.1, satisfaction: 4.3 },
    { date: '2024-01-24', accuracy: 92.8, consistency: 89.7, efficiency: 95.5, satisfaction: 4.2 },
    { date: '2024-01-25', accuracy: 92.5, consistency: 89.3, efficiency: 95.8, satisfaction: 4.2 },
    { date: '2024-01-26', accuracy: 93.1, consistency: 90.1, efficiency: 96.2, satisfaction: 4.4 }
  ];

  const mockIssues: QualityIssue[] = [
    {
      id: '1',
      type: 'accuracy',
      severity: 'medium',
      description: '数学主观题评分准确率下降，可能与新题型适应性有关',
      affected_count: 156,
      detected_at: '2024-01-25 14:30',
      status: 'investigating'
    },
    {
      id: '2',
      type: 'consistency',
      severity: 'low',
      description: '语文作文评分一致性略有波动，建议优化评分标准',
      affected_count: 89,
      detected_at: '2024-01-24 09:15',
      status: 'open'
    },
    {
      id: '3',
      type: 'bias',
      severity: 'high',
      description: '发现对特定答题风格存在评分偏见，需要调整算法',
      affected_count: 234,
      detected_at: '2024-01-23 16:45',
      status: 'resolved',
      resolution: '已更新评分模型，消除风格偏见'
    }
  ];

  const mockSubjectPerformance: SubjectPerformance[] = [
    { subject: '语文', accuracy: 89.2, consistency: 86.5, total_questions: 3420, avg_score_diff: 1.2 },
    { subject: '数学', accuracy: 95.8, consistency: 93.2, total_questions: 4150, avg_score_diff: 0.8 },
    { subject: '英语', accuracy: 91.5, consistency: 88.9, total_questions: 2890, avg_score_diff: 1.1 },
    { subject: '物理', accuracy: 93.1, consistency: 90.7, total_questions: 2340, avg_score_diff: 0.9 },
    { subject: '化学', accuracy: 92.3, consistency: 89.8, total_questions: 1980, avg_score_diff: 1.0 },
    { subject: '生物', accuracy: 90.7, consistency: 87.6, total_questions: 1640, avg_score_diff: 1.3 }
  ];

  const mockTeacherFeedback: TeacherFeedback[] = [
    {
      id: '1',
      teacher_name: '张老师',
      subject: '数学',
      rating: 5,
      feedback: 'AI评分非常准确，大大提高了阅卷效率',
      date: '2024-01-25',
      ai_score: 18,
      manual_score: 18,
      question_type: '解答题'
    },
    {
      id: '2',
      teacher_name: '李老师',
      subject: '语文',
      rating: 4,
      feedback: '整体不错，但在创新性评价方面还需要改进',
      date: '2024-01-24',
      ai_score: 15,
      manual_score: 16,
      question_type: '作文'
    },
    {
      id: '3',
      teacher_name: '王老师',
      subject: '英语',
      rating: 4,
      feedback: 'AI能够准确识别语法错误，但对语言表达的评价还需优化',
      date: '2024-01-23',
      ai_score: 12,
      manual_score: 13,
      question_type: '阅读理解'
    }
  ];

  useEffect(() => {
    loadQualityData();
  }, [timeRange, selectedSubject]);

  const loadQualityData = async () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setQualityMetrics(mockMetrics);
      setQualityTrends(mockTrends);
      setQualityIssues(mockIssues);
      setSubjectPerformance(mockSubjectPerformance);
      setTeacherFeedback(mockTeacherFeedback);
      setLoading(false);
    }, 1000);
  };

  const getMetricColor = (value: number, type: 'percentage' | 'rating' | 'time') => {
    if (type === 'percentage') {
      if (value >= 90) return '#52c41a';
      if (value >= 80) return '#faad14';
      return '#ff4d4f';
    }
    if (type === 'rating') {
      if (value >= 4.0) return '#52c41a';
      if (value >= 3.0) return '#faad14';
      return '#ff4d4f';
    }
    if (type === 'time') {
      if (value <= 2.0) return '#52c41a';
      if (value <= 5.0) return '#faad14';
      return '#ff4d4f';
    }
    return '#1677ff';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'green';
      case 'investigating': return 'orange';
      case 'open': return 'red';
      default: return 'default';
    }
  };

  const renderTrendChart = () => {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <LineChartOutlined className="text-4xl mb-2" />
          <div>趋势图表</div>
          <div className="text-sm">准确率趋势: 92.5% ↗</div>
        </div>
      </div>
    );
  };

  const renderSubjectChart = () => {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <BarChartOutlined className="text-4xl mb-2" />
          <div>学科对比图</div>
          <div className="text-sm">数学表现最佳: 95.8%</div>
        </div>
      </div>
    );
  };

  const issueColumns = [
    {
      title: '问题类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          accuracy: '准确性',
          consistency: '一致性',
          efficiency: '效率',
          bias: '偏见'
        };
        return <Tag color="blue">{typeMap[type as keyof typeof typeMap]}</Tag>;
      }
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const severityMap = {
          critical: '严重',
          high: '高',
          medium: '中',
          low: '低'
        };
        return <Tag color={getSeverityColor(severity)}>{severityMap[severity as keyof typeof severityMap]}</Tag>;
      }
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '影响数量',
      dataIndex: 'affected_count',
      key: 'affected_count',
      render: (count: number) => <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
    },
    {
      title: '检测时间',
      dataIndex: 'detected_at',
      key: 'detected_at'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          resolved: '已解决',
          investigating: '调查中',
          open: '待处理'
        };
        return <Tag color={getStatusColor(status)}>{statusMap[status as keyof typeof statusMap]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: QualityIssue) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedIssue(record);
            setShowIssueDetail(true);
          }}
        >
          详情
        </Button>
      )
    }
  ];

  const feedbackColumns = [
    {
      title: '教师',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (name: string, record: TeacherFeedback) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-500">{record.subject}</div>
        </div>
      )
    },
    {
      title: '评分对比',
      key: 'score_comparison',
      render: (record: TeacherFeedback) => (
        <div className="space-y-1">
          <div className="text-xs">AI: <span className="font-medium">{record.ai_score}</span></div>
          <div className="text-xs">人工: <span className="font-medium">{record.manual_score}</span></div>
          <div className="text-xs">差值: <span className={`font-medium ${Math.abs(record.ai_score - record.manual_score) <= 1 ? 'text-green-500' : 'text-red-500'}`}>
            {Math.abs(record.ai_score - record.manual_score)}
          </span></div>
        </div>
      )
    },
    {
      title: '满意度',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled value={rating} />
    },
    {
      title: '反馈内容',
      dataIndex: 'feedback',
      key: 'feedback',
      ellipsis: true
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card size="small">
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <Text strong>时间范围:</Text>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                style={{ width: 120 }}
                options={[
                  { value: '1d', label: '今天' },
                  { value: '7d', label: '近7天' },
                  { value: '30d', label: '近30天' },
                  { value: '90d', label: '近90天' }
                ]}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>学科:</Text>
              <Select
                value={selectedSubject}
                onChange={setSelectedSubject}
                style={{ width: 120 }}
                options={[
                  { value: 'all', label: '全部' },
                  { value: '语文', label: '语文' },
                  { value: '数学', label: '数学' },
                  { value: '英语', label: '英语' },
                  { value: '物理', label: '物理' },
                  { value: '化学', label: '化学' },
                  { value: '生物', label: '生物' }
                ]}
              />
            </Space>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadQualityData} loading={loading}>
                刷新
              </Button>
              <Button icon={<DownloadOutlined />}>
                导出报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 核心指标概览 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="准确率"
              value={qualityMetrics?.accuracy_rate || 0}
              suffix="%"
              valueStyle={{ color: getMetricColor(qualityMetrics?.accuracy_rate || 0, 'percentage') }}
              prefix={<Target className="w-4 h-4" />}
            />
            <Progress
              percent={qualityMetrics?.accuracy_rate || 0}
              strokeColor={getMetricColor(qualityMetrics?.accuracy_rate || 0, 'percentage')}
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="一致性"
              value={qualityMetrics?.consistency_rate || 0}
              suffix="%"
              valueStyle={{ color: getMetricColor(qualityMetrics?.consistency_rate || 0, 'percentage') }}
              prefix={<CheckCircleOutlined />}
            />
            <Progress
              percent={qualityMetrics?.consistency_rate || 0}
              strokeColor={getMetricColor(qualityMetrics?.consistency_rate || 0, 'percentage')}
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="效率分数"
              value={qualityMetrics?.efficiency_score || 0}
              suffix="%"
              valueStyle={{ color: getMetricColor(qualityMetrics?.efficiency_score || 0, 'percentage') }}
              prefix={<TrendingUp className="w-4 h-4" />}
            />
            <Progress
              percent={qualityMetrics?.efficiency_score || 0}
              strokeColor={getMetricColor(qualityMetrics?.efficiency_score || 0, 'percentage')}
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="教师满意度"
              value={qualityMetrics?.teacher_satisfaction || 0}
              suffix="/5"
              valueStyle={{ color: getMetricColor(qualityMetrics?.teacher_satisfaction || 0, 'rating') }}
              prefix={<Award className="w-4 h-4" />}
            />
            <Progress
              percent={(qualityMetrics?.teacher_satisfaction || 0) * 20}
              strokeColor={getMetricColor(qualityMetrics?.teacher_satisfaction || 0, 'rating')}
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 详细指标 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" title="处理效率">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="平均处理时间"
                  value={qualityMetrics?.average_processing_time || 0}
                  suffix="秒"
                  valueStyle={{ 
                    color: getMetricColor(qualityMetrics?.average_processing_time || 0, 'time'),
                    fontSize: '16px'
                  }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="总处理量"
                  value={qualityMetrics?.total_processed || 0}
                  valueStyle={{ fontSize: '16px' }}
                  prefix={<BarChartOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="错误率分析">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title="误报率"
                  value={qualityMetrics?.false_positive_rate || 0}
                  suffix="%"
                  valueStyle={{ fontSize: '16px', color: '#ff4d4f' }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="漏报率"
                  value={qualityMetrics?.false_negative_rate || 0}
                  suffix="%"
                  valueStyle={{ fontSize: '16px', color: '#faad14' }}
                  prefix={<WarningOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="质量状态">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Text>整体状态</Text>
                <Tag color="green">良好</Tag>
              </div>
              <div className="flex items-center justify-between">
                <Text>待处理问题</Text>
                <Badge count={qualityIssues.filter(i => i.status !== 'resolved').length} />
              </div>
              <div className="flex items-center justify-between">
                <Text>本周改进</Text>
                <Text className="text-green-500">+2.3%</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表分析 */}
      <Row gutter={16}>
        <Col span={16}>
          <Card title="质量趋势分析" size="small">
            <div style={{ height: 300 }}>
              {renderTrendChart()}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="学科表现对比" size="small">
            <div style={{ height: 300 }}>
              {renderSubjectChart()}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 详细数据 */}
      <Tabs
        items={[
          {
            key: 'issues',
            label: (
              <span>
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                质量问题 ({qualityIssues.length})
              </span>
            ),
            children: (
              <Table
                columns={issueColumns}
                dataSource={qualityIssues}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            )
          },
          {
            key: 'feedback',
            label: (
              <span>
                <TrophyOutlined className="inline mr-1" />
                教师反馈 ({teacherFeedback.length})
              </span>
            ),
            children: (
              <Table
                columns={feedbackColumns}
                dataSource={teacherFeedback}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            )
          },
          {
            key: 'subjects',
            label: (
              <span>
                <BarChartOutlined className="inline mr-1" />
                学科表现
              </span>
            ),
            children: (
              <Table
                dataSource={subjectPerformance}
                rowKey="subject"
                size="small"
                columns={[
                  { title: '学科', dataIndex: 'subject', key: 'subject' },
                  {
                    title: '准确率',
                    dataIndex: 'accuracy',
                    key: 'accuracy',
                    render: (value: number) => (
                      <div>
                        <Text>{value}%</Text>
                        <Progress percent={value} showInfo={false} size="small" />
                      </div>
                    )
                  },
                  {
                    title: '一致性',
                    dataIndex: 'consistency',
                    key: 'consistency',
                    render: (value: number) => (
                      <div>
                        <Text>{value}%</Text>
                        <Progress percent={value} showInfo={false} size="small" />
                      </div>
                    )
                  },
                  { title: '题目总数', dataIndex: 'total_questions', key: 'total_questions' },
                  {
                    title: '平均分差',
                    dataIndex: 'avg_score_diff',
                    key: 'avg_score_diff',
                    render: (value: number) => (
                      <Text className={value <= 1 ? 'text-green-500' : 'text-orange-500'}>
                        {value}分
                      </Text>
                    )
                  }
                ]}
              />
            )
          }
        ]}
      />

      {/* 问题详情模态框 */}
      <Modal
        title="质量问题详情"
        open={showIssueDetail}
        onCancel={() => setShowIssueDetail(false)}
        footer={[
          <Button key="close" onClick={() => setShowIssueDetail(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedIssue && (
          <div className="space-y-4">
            <div>
              <Title level={5}>问题信息</Title>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Text>问题类型:</Text>
                  <Tag color="blue">{selectedIssue.type}</Tag>
                </div>
                <div className="flex justify-between">
                  <Text>严重程度:</Text>
                  <Tag color={getSeverityColor(selectedIssue.severity)}>{selectedIssue.severity}</Tag>
                </div>
                <div className="flex justify-between">
                  <Text>影响数量:</Text>
                  <Text>{selectedIssue.affected_count} 个评分</Text>
                </div>
                <div className="flex justify-between">
                  <Text>检测时间:</Text>
                  <Text>{selectedIssue.detected_at}</Text>
                </div>
                <div className="flex justify-between">
                  <Text>当前状态:</Text>
                  <Tag color={getStatusColor(selectedIssue.status)}>{selectedIssue.status}</Tag>
                </div>
              </div>
            </div>
            
            <Divider />
            
            <div>
              <Title level={5}>问题描述</Title>
              <Paragraph>{selectedIssue.description}</Paragraph>
            </div>
            
            {selectedIssue.resolution && (
              <div>
                <Title level={5}>解决方案</Title>
                <Alert
                  message="问题已解决"
                  description={selectedIssue.resolution}
                  type="success"
                  showIcon
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AIGradingQualityMonitor;