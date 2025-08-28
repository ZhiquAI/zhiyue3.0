import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Tag, Progress, Button, Modal, Descriptions, Statistic } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, WarningOutlined, InfoCircleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 定义警报类型
interface QualityAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  graders?: string[];
  grader?: string;
  scores?: number[];
  avgTime?: number;
  improvement?: number;
  timestamp: string;
  status: 'pending' | 'investigating' | 'resolved';
  priority: 'high' | 'medium' | 'low';
}

// 模拟质量监控数据
const mockQualityData = {
  realTimeAlerts: [ 
    {
      id: '1',
      type: 'error' as const,
      title: '评分差异过大',
      description: '试卷ID: 2024001，两位阅卷员评分差异达15分',
      graders: ['张老师', '李老师'],
      scores: [85, 70],
      timestamp: '2024-01-21 14:30:25',
      status: 'pending' as const,
      priority: 'high' as const
    },
    {
      id: '2',
      type: 'warning' as const,
      title: '阅卷速度异常',
      description: '王老师最近10份试卷平均用时超过20分钟',
      grader: '王老师',
      avgTime: 22.5,
      timestamp: '2024-01-21 14:25:10',
      status: 'investigating' as const,
      priority: 'medium' as const
    },
    {
      id: '3',
      type: 'info' as const,
      title: '质量评分提升',
      description: '刘老师本周质量评分较上周提升5.2%',
      grader: '刘老师',
      improvement: 5.2,
      timestamp: '2024-01-21 14:20:45',
      status: 'resolved' as const,
      priority: 'low' as const
    }
  ],
  qualityTrends: [
    { time: '09:00', consistency: 95, accuracy: 92, fairness: 94 },
    { time: '10:00', consistency: 94, accuracy: 93, fairness: 95 },
    { time: '11:00', consistency: 96, accuracy: 91, fairness: 93 },
    { time: '12:00', consistency: 93, accuracy: 94, fairness: 96 },
    { time: '13:00', consistency: 95, accuracy: 95, fairness: 94 },
    { time: '14:00', consistency: 92, accuracy: 89, fairness: 91 },
    { time: '15:00', consistency: 94, accuracy: 92, fairness: 93 }
  ],
  scoreDistribution: [
    { grader: '张老师', avgScore: 78.5, variance: 12.3, outliers: 2 },
    { grader: '李老师', avgScore: 76.8, variance: 15.7, outliers: 4 },
    { grader: '王老师', avgScore: 82.1, variance: 18.9, outliers: 6 },
    { grader: '刘老师', avgScore: 75.2, variance: 11.8, outliers: 1 },
    { grader: '陈老师', avgScore: 79.6, variance: 20.4, outliers: 8 }
  ],
  anomalyDetection: [
    { paperId: '2024001', grader1: '张老师', grader2: '李老师', score1: 85, score2: 70, difference: 15, status: 'review_needed' },
    { paperId: '2024002', grader1: '王老师', grader2: '刘老师', score1: 92, score2: 88, difference: 4, status: 'normal' },
    { paperId: '2024003', grader1: '陈老师', grader2: '张老师', score1: 65, score2: 78, difference: 13, status: 'review_needed' }
  ]
};

interface QualityMonitorProps {
  examId?: string;
}

const QualityMonitor: React.FC<QualityMonitorProps> = () => {
  const [selectedAlert, setSelectedAlert] = useState<QualityAlert | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [autoRefresh] = useState(true);
  const [refreshInterval] = useState(30); // 秒

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // 模拟数据刷新
      console.log('刷新质量监控数据');
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleViewAlert = (alert: QualityAlert) => {
    setSelectedAlert(alert);
    setModalVisible(true);
  };

  const handleResolveAlert = (alertId: string) => {
    console.log('处理警报:', alertId);
    // 实际应用中这里会调用API
  };

  const alertColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const config = {
          error: { color: 'red', icon: <ExclamationCircleOutlined /> },
          warning: { color: 'orange', icon: <WarningOutlined /> },
          info: { color: 'blue', icon: <InfoCircleOutlined /> }
        };
        return (
          <div className="flex items-center justify-center">
            <Tag color={config[type as keyof typeof config].color} icon={config[type as keyof typeof config].icon}>
              {type === 'error' ? '错误' : type === 'warning' ? '警告' : '信息'}
            </Tag>
          </div>
        );
      }
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: QualityAlert) => (
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-gray-500 mt-1">{record.description}</div>
        </div>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const colors = { high: 'red', medium: 'orange', low: 'green' };
        const texts = { high: '高', medium: '中', low: '低' };
        return <Tag color={colors[priority as keyof typeof colors]}>{texts[priority as keyof typeof texts]}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = {
          pending: { color: 'red', text: '待处理' },
          investigating: { color: 'orange', text: '调查中' },
          resolved: { color: 'green', text: '已解决' }
        };
        return <Tag color={config[status as keyof typeof config].color}>{config[status as keyof typeof config].text}</Tag>;
      }
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: string) => (
        <div className="text-sm text-gray-600">{timestamp}</div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: QualityAlert) => (
        <div className="flex gap-2">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewAlert(record)}
          >
            查看
          </Button>
          {record.status !== 'resolved' && (
            <Button 
              size="small" 
              type="primary"
              onClick={() => handleResolveAlert(record.id)}
            >
              处理
            </Button>
          )}
        </div>
      )
    }
  ];

  const anomalyColumns = [
    {
      title: '试卷ID',
      dataIndex: 'paperId',
      key: 'paperId',
      render: (paperId: string) => (
        <span className="font-mono text-blue-600">{paperId}</span>
      )
    },
    {
      title: '阅卷员1',
      dataIndex: 'grader1',
      key: 'grader1'
    },
    {
      title: '分数1',
      dataIndex: 'score1',
      key: 'score1',
      render: (score: number) => (
        <span className="font-semibold">{score}分</span>
      )
    },
    {
      title: '阅卷员2',
      dataIndex: 'grader2',
      key: 'grader2'
    },
    {
      title: '分数2',
      dataIndex: 'score2',
      key: 'score2',
      render: (score: number) => (
        <span className="font-semibold">{score}分</span>
      )
    },
    {
      title: '差异',
      dataIndex: 'difference',
      key: 'difference',
      render: (diff: number) => (
        <span className={`font-semibold ${
          diff >= 10 ? 'text-red-600' :
          diff >= 5 ? 'text-orange-600' :
          'text-green-600'
        }`}>
          {diff}分
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'review_needed' ? 'red' : 'green'}>
          {status === 'review_needed' ? '需要复核' : '正常'}
        </Tag>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-red-600 text-xl" />
            <h2 className="text-xl font-semibold">阅卷质量监控</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => console.log('手动刷新')}
            >
              刷新数据
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">自动刷新:</span>
              <Tag color={autoRefresh ? 'green' : 'red'}>
                {autoRefresh ? '开启' : '关闭'}
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      {/* 实时统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="待处理警报"
              value={mockQualityData.realTimeAlerts.filter(a => a.status === 'pending').length}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="调查中"
              value={mockQualityData.realTimeAlerts.filter(a => a.status === 'investigating').length}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已解决"
              value={mockQualityData.realTimeAlerts.filter(a => a.status === 'resolved').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="异常试卷"
              value={mockQualityData.anomalyDetection.filter(a => a.status === 'review_needed').length}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 质量趋势图 */}
      <Card title="实时质量趋势">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockQualityData.qualityTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[80, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="consistency" stroke="#3b82f6" name="一致性" strokeWidth={2} />
            <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="准确性" strokeWidth={2} />
            <Line type="monotone" dataKey="fairness" stroke="#f59e0b" name="公平性" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 警报列表 */}
      <Card title="实时警报">
        <Table
          columns={alertColumns}
          dataSource={mockQualityData.realTimeAlerts}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 异常检测 */}
      <Card title="评分异常检测">
        <Table
          columns={anomalyColumns}
          dataSource={mockQualityData.anomalyDetection}
          rowKey="paperId"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 阅卷员评分分布 */}
      <Card title="阅卷员评分分布分析">
        <Row gutter={[16, 16]}>
          {mockQualityData.scoreDistribution.map((grader, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card size="small" title={grader.grader}>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">平均分</span>
                      <span className="font-semibold">{grader.avgScore}分</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">方差</span>
                      <span className={`font-semibold ${
                        grader.variance > 15 ? 'text-red-600' :
                        grader.variance > 10 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {grader.variance}
                      </span>
                    </div>
                    <Progress 
                      percent={Math.min(grader.variance * 5, 100)} 
                      size="small" 
                      strokeColor={
                        grader.variance > 15 ? '#ef4444' :
                        grader.variance > 10 ? '#f59e0b' :
                        '#10b981'
                      }
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">异常值</span>
                      <span className={`font-semibold ${
                        grader.outliers > 5 ? 'text-red-600' :
                        grader.outliers > 2 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {grader.outliers}个
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 警报详情模态框 */}
      <Modal
        title="警报详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
          selectedAlert?.status !== 'resolved' && selectedAlert?.id && (
            <Button 
              key="resolve" 
              type="primary"
              onClick={() => {
                handleResolveAlert(selectedAlert.id);
                setModalVisible(false);
              }}
            >
              标记为已解决
            </Button>
          )
        ]}
      >
        {selectedAlert && (
          <div className="space-y-4">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="类型">
                <Tag color={selectedAlert.type === 'error' ? 'red' : selectedAlert.type === 'warning' ? 'orange' : 'blue'}>
                  {selectedAlert.type === 'error' ? '错误' : selectedAlert.type === 'warning' ? '警告' : '信息'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标题">{selectedAlert.title}</Descriptions.Item>
              <Descriptions.Item label="描述">{selectedAlert.description}</Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={selectedAlert.priority === 'high' ? 'red' : selectedAlert.priority === 'medium' ? 'orange' : 'green'}>
                  {selectedAlert.priority === 'high' ? '高' : selectedAlert.priority === 'medium' ? '中' : '低'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="时间">{selectedAlert.timestamp}</Descriptions.Item>
            </Descriptions>
            
            {selectedAlert.graders && selectedAlert.graders.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">相关阅卷员</h4>
                <div className="flex gap-2">
                  {selectedAlert.graders.map((grader: string, index: number) => (
                    <Tag key={index}>{grader}</Tag>
                  ))}
                </div>
              </div>
            )}
            
            {selectedAlert.scores && selectedAlert.graders && selectedAlert.scores.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">评分详情</h4>
                <div className="space-y-2">
                  {selectedAlert.graders.map((grader: string, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{grader}</span>
                      <span className="font-semibold">{selectedAlert.scores?.[index]}分</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QualityMonitor;