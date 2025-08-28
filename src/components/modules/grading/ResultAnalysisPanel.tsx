import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  Button,
  DatePicker,
  Space,
  Tag,
  Progress,
  Alert,
  Tabs
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  TrophyOutlined,
  ExclamationTriangleOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface AnalysisData {
  id: string;
  examName: string;
  subject: string;
  grade: string;
  completedAt: string;
  totalStudents: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  accuracy: number;
}

interface QuestionAnalysis {
  questionId: string;
  questionType: string;
  avgScore: number;
  difficulty: string;
  discrimination: number;
  errorRate: number;
  commonErrors: string[];
}

const ResultAnalysisPanel: React.FC = () => {
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('week');
  const [analysisData] = useState<AnalysisData[]>([
    {
      id: '1',
      examName: '高三英语模拟考',
      subject: '英语',
      grade: '高三',
      completedAt: '2025-08-20 16:30:00',
      totalStudents: 180,
      avgScore: 78.5,
      highestScore: 95,
      lowestScore: 42,
      passRate: 85.6,
      accuracy: 96.8
    },
    {
      id: '2',
      examName: '高一语文月考',
      subject: '语文', 
      grade: '高一',
      completedAt: '2025-08-24 17:20:00',
      totalStudents: 120,
      avgScore: 72.3,
      highestScore: 88,
      lowestScore: 35,
      passRate: 78.3,
      accuracy: 95.2
    },
    {
      id: '3',
      examName: '高二数学期中考试',
      subject: '数学',
      grade: '高二', 
      completedAt: '2025-08-25 15:45:00',
      totalStudents: 150,
      avgScore: 65.8,
      highestScore: 92,
      lowestScore: 28,
      passRate: 68.7,
      accuracy: 97.1
    }
  ]);

  const [questionAnalysis] = useState<QuestionAnalysis[]>([
    {
      questionId: 'Q1',
      questionType: '选择题',
      avgScore: 8.5,
      difficulty: '中等',
      discrimination: 0.85,
      errorRate: 15,
      commonErrors: ['选项混淆', '基础概念不清']
    },
    {
      questionId: 'Q2',
      questionType: '填空题',
      avgScore: 6.2,
      difficulty: '困难',
      discrimination: 0.72,
      errorRate: 38,
      commonErrors: ['计算错误', '公式应用错误', '步骤不完整']
    },
    {
      questionId: 'Q3',
      questionType: '主观题',
      avgScore: 12.8,
      difficulty: '中等',
      discrimination: 0.78,
      errorRate: 28,
      commonErrors: ['论述不充分', '要点遗漏', '表达不清晰']
    }
  ]);

  const getGradeColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#1890ff'; 
    if (score >= 70) return '#faad14';
    if (score >= 60) return '#fa8c16';
    return '#ff4d4f';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colorMap = {
      '简单': 'success',
      '中等': 'warning', 
      '困难': 'error'
    };
    return colorMap[difficulty as keyof typeof colorMap] || 'default';
  };

  const analysisColumns = [
    {
      title: '考试信息',
      key: 'exam',
      render: (_: any, record: AnalysisData) => (
        <div>
          <div className="font-medium">{record.examName}</div>
          <div className="text-sm text-gray-500">
            {record.subject} · {record.grade} · {record.totalStudents}人
          </div>
        </div>
      )
    },
    {
      title: '平均分',
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (score: number) => (
        <span style={{ color: getGradeColor(score), fontWeight: 'bold' }}>
          {score.toFixed(1)}
        </span>
      ),
      sorter: (a: AnalysisData, b: AnalysisData) => a.avgScore - b.avgScore
    },
    {
      title: '分数范围',
      key: 'scoreRange',
      render: (_: any, record: AnalysisData) => (
        <div>
          <div className="text-sm">
            最高: <span className="text-green-600 font-medium">{record.highestScore}</span>
          </div>
          <div className="text-sm">
            最低: <span className="text-red-600 font-medium">{record.lowestScore}</span>
          </div>
        </div>
      )
    },
    {
      title: '及格率',
      dataIndex: 'passRate',
      key: 'passRate',
      render: (rate: number) => (
        <div>
          <Progress 
            percent={rate} 
            size="small" 
            strokeColor={rate >= 80 ? '#52c41a' : rate >= 60 ? '#1890ff' : '#ff4d4f'}
          />
          <div className="text-xs text-center mt-1">{rate.toFixed(1)}%</div>
        </div>
      ),
      sorter: (a: AnalysisData, b: AnalysisData) => a.passRate - b.passRate
    },
    {
      title: 'AI准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      render: (accuracy: number) => (
        <Tag color={accuracy >= 95 ? 'success' : 'warning'}>
          {accuracy.toFixed(1)}%
        </Tag>
      )
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (time: string) => (
        <div className="text-sm">{time}</div>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: AnalysisData) => (
        <Space>
          <Button size="small" icon={<BarChartOutlined />}>
            详细报告
          </Button>
          <Button size="small" icon={<DownloadOutlined />}>
            下载
          </Button>
        </Space>
      )
    }
  ];

  const questionColumns = [
    {
      title: '题目',
      dataIndex: 'questionId',
      key: 'questionId',
      render: (id: string, record: QuestionAnalysis) => (
        <div>
          <div className="font-medium">{id}</div>
          <Tag color="blue" size="small">{record.questionType}</Tag>
        </div>
      )
    },
    {
      title: '平均得分',
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (score: number) => (
        <span className="font-medium">{score.toFixed(1)}分</span>
      )
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => (
        <Tag color={getDifficultyColor(difficulty)}>{difficulty}</Tag>
      )
    },
    {
      title: '区分度',
      dataIndex: 'discrimination',
      key: 'discrimination',
      render: (value: number) => (
        <Progress 
          percent={value * 100} 
          size="small"
          format={() => value.toFixed(2)}
          strokeColor={value >= 0.8 ? '#52c41a' : value >= 0.6 ? '#1890ff' : '#ff4d4f'}
        />
      )
    },
    {
      title: '错误率',
      dataIndex: 'errorRate',
      key: 'errorRate',
      render: (rate: number) => (
        <span style={{ color: rate > 30 ? '#ff4d4f' : '#1890ff' }}>
          {rate}%
        </span>
      )
    },
    {
      title: '常见错误',
      dataIndex: 'commonErrors',
      key: 'commonErrors',
      render: (errors: string[]) => (
        <div>
          {errors.slice(0, 2).map((error, index) => (
            <Tag key={index} size="small" color="orange">{error}</Tag>
          ))}
          {errors.length > 2 && <span className="text-gray-500">...</span>}
        </div>
      )
    }
  ];

  const tabItems = [
    {
      key: 'overview',
      label: '总体分析',
      children: (
        <div>
          <Table
            dataSource={analysisData}
            columns={analysisColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      )
    },
    {
      key: 'questions',
      label: '题目分析',
      children: (
        <div>
          <Alert
            message="题目质量分析"
            description="通过统计分析帮助教师了解题目难度分布、学生掌握情况，为教学改进提供数据支持。"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Table
            dataSource={questionAnalysis}
            columns={questionColumns}
            rowKey="questionId"
            pagination={{ pageSize: 10 }}
          />
        </div>
      )
    }
  ];

  return (
    <div>
      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成分析"
              value={analysisData.length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总学生数"
              value={analysisData.reduce((sum, item) => sum + item.totalStudents, 0)}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均准确率"
              value={analysisData.length > 0 
                ? analysisData.reduce((sum, item) => sum + item.accuracy, 0) / analysisData.length
                : 0
              }
              precision={1}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均及格率"
              value={analysisData.length > 0 
                ? analysisData.reduce((sum, item) => sum + item.passRate, 0) / analysisData.length
                : 0
              }
              precision={1}
              suffix="%"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Select
              placeholder="选择考试"
              value={selectedExam}
              onChange={setSelectedExam}
              style={{ width: '100%' }}
            >
              <Option value="all">全部考试</Option>
              {analysisData.map(exam => (
                <Option key={exam.id} value={exam.id}>{exam.examName}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="时间范围"
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: '100%' }}
            >
              <Option value="week">最近一周</Option>
              <Option value="month">最近一月</Option>
              <Option value="quarter">最近三月</Option>
              <Option value="custom">自定义</Option>
            </Select>
          </Col>
          <Col span={8}>
            {timeRange === 'custom' && (
              <RangePicker style={{ width: '100%' }} />
            )}
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<PrinterOutlined />}>
                打印报告
              </Button>
              <Button type="primary" icon={<ShareAltOutlined />}>
                分享分析
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 分析内容 */}
      <Card>
        <Tabs
          items={tabItems}
          tabBarExtraContent={
            <Space>
              <Button icon={<LineChartOutlined />}>
                趋势图
              </Button>
              <Button icon={<PieChartOutlined />}>
                分布图
              </Button>
              <Button type="primary" icon={<DownloadOutlined />}>
                导出报告
              </Button>
            </Space>
          }
        />
      </Card>

      {/* 分析建议 */}
      <Card title="智能分析建议" style={{ marginTop: '24px' }}>
        <Alert
          message="教学建议"
          description={
            <ul className="mt-2">
              <li>• 高二数学期中考试及格率较低(68.7%)，建议加强基础知识训练</li>
              <li>• 主观题普遍得分不高，需要加强学生的表达能力和逻辑思维</li>
              <li>• AI准确率保持在95%以上，可以信任AI初评结果</li>
              <li>• 建议重点关注难度较高的填空题，学生错误率达38%</li>
            </ul>
          }
          type="success"
          showIcon
          icon={<TrophyOutlined />}
        />
      </Card>
    </div>
  );
};

export default ResultAnalysisPanel;