// 阅卷复核统计组件
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Space,
  Select,
  DatePicker,
  Button,
  message,
  Tooltip,
  Badge
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface ReviewStatistics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  disputedTasks: number;
  averageReviewTime: number;
  accuracyRate: number;
  reviewerStats: ReviewerStat[];
  dailyProgress: DailyProgress[];
  scoreDistribution: ScoreDistribution[];
}

interface ReviewerStat {
  reviewerId: string;
  reviewerName: string;
  assignedTasks: number;
  completedTasks: number;
  averageTime: number;
  accuracyRate: number;
  disputeRate: number;
}

interface DailyProgress {
  date: string;
  completed: number;
  disputed: number;
  total: number;
}

interface ScoreDistribution {
  scoreRange: string;
  originalCount: number;
  reviewCount: number;
  difference: number;
}

interface ReviewStatisticsProps {
  examId: string;
}

const ReviewStatistics: React.FC<ReviewStatisticsProps> = ({ examId }) => {
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');

  // 获取统计数据
  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        exam_id: examId,
        ...(selectedReviewer && { reviewer_id: selectedReviewer }),
        ...(dateRange && {
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await fetch(`/api/grading-review/statistics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取统计数据失败');
      }

      const data = await response.json();
      setStatistics(data.data);
    } catch (error) {
      message.error('获取统计数据失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 导出统计报告
  const handleExportReport = async () => {
    try {
      const params = new URLSearchParams({
        exam_id: examId,
        format: 'excel',
        ...(selectedReviewer && { reviewer_id: selectedReviewer }),
        ...(dateRange && {
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await fetch(`/api/grading-review/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `复核统计报告_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('报告导出成功');
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message);
    }
  };

  // 复核员统计表格列
  const reviewerColumns: ColumnsType<ReviewerStat> = [
    {
      title: '复核员',
      dataIndex: 'reviewerName',
      key: 'reviewerName',
      render: (name, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-gray-500 text-sm">{record.reviewerId}</div>
        </div>
      )
    },
    {
      title: '分配任务',
      dataIndex: 'assignedTasks',
      key: 'assignedTasks',
      render: (count) => (
        <Statistic
          value={count}
          prefix={<FileTextOutlined />}
          valueStyle={{ fontSize: '14px' }}
        />
      )
    },
    {
      title: '完成任务',
      dataIndex: 'completedTasks',
      key: 'completedTasks',
      render: (completed, record) => {
        const rate = record.assignedTasks > 0 ? (completed / record.assignedTasks) * 100 : 0;
        return (
          <div>
            <div>{completed}</div>
            <Progress percent={rate} size="small" showInfo={false} />
            <div className="text-xs text-gray-500">{rate.toFixed(1)}%</div>
          </div>
        );
      }
    },
    {
      title: '平均用时',
      dataIndex: 'averageTime',
      key: 'averageTime',
      render: (time) => (
        <Tooltip title="平均每个任务的复核时间">
          <Tag icon={<ClockCircleOutlined />}>
            {Math.round(time)}分钟
          </Tag>
        </Tooltip>
      )
    },
    {
      title: '准确率',
      dataIndex: 'accuracyRate',
      key: 'accuracyRate',
      render: (rate) => {
        const color = rate >= 95 ? 'green' : rate >= 90 ? 'orange' : 'red';
        return (
          <Tag color={color}>
            {(rate * 100).toFixed(1)}%
          </Tag>
        );
      }
    },
    {
      title: '争议率',
      dataIndex: 'disputeRate',
      key: 'disputeRate',
      render: (rate) => {
        const color = rate <= 5 ? 'green' : rate <= 10 ? 'orange' : 'red';
        return (
          <Badge
            count={`${(rate * 100).toFixed(1)}%`}
            style={{ backgroundColor: color === 'green' ? '#52c41a' : color === 'orange' ? '#fa8c16' : '#ff4d4f' }}
          />
        );
      }
    }
  ];

  // 分数分布表格列
  const distributionColumns: ColumnsType<ScoreDistribution> = [
    {
      title: '分数区间',
      dataIndex: 'scoreRange',
      key: 'scoreRange'
    },
    {
      title: '原始评分数量',
      dataIndex: 'originalCount',
      key: 'originalCount',
      render: (count) => <Tag color="blue">{count}</Tag>
    },
    {
      title: '复核评分数量',
      dataIndex: 'reviewCount',
      key: 'reviewCount',
      render: (count) => <Tag color="green">{count}</Tag>
    },
    {
      title: '差异',
      dataIndex: 'difference',
      key: 'difference',
      render: (diff) => {
        const color = diff === 0 ? 'default' : diff > 0 ? 'red' : 'orange';
        return (
          <Tag color={color}>
            {diff > 0 ? '+' : ''}{diff}
          </Tag>
        );
      }
    }
  ];

  useEffect(() => {
    fetchStatistics();
  }, [examId, selectedReviewer, dateRange]);

  if (!statistics) {
    return (
      <Card loading={loading}>
        <div className="text-center py-8">加载统计数据中...</div>
      </Card>
    );
  }

  const completionRate = statistics.totalTasks > 0 ? 
    (statistics.completedTasks / statistics.totalTasks) * 100 : 0;
  const disputeRate = statistics.totalTasks > 0 ? 
    (statistics.disputedTasks / statistics.totalTasks) * 100 : 0;

  return (
    <div className="review-statistics">
      {/* 筛选条件 */}
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Select
              placeholder="选择复核员"
              allowClear
              value={selectedReviewer}
              onChange={setSelectedReviewer}
              className="w-full"
            >
              {statistics.reviewerStats.map(reviewer => (
                <Option key={reviewer.reviewerId} value={reviewer.reviewerId}>
                  {reviewer.reviewerName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={setDateRange}
              className="w-full"
            />
          </Col>
          <Col span={10}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchStatistics}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportReport}
              >
                导出报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 总体统计 */}
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={statistics.totalTasks}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={statistics.completedTasks}
              prefix={<CheckCircleOutlined />}
              suffix={`/ ${statistics.totalTasks}`}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress percent={completionRate} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={statistics.pendingTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="有争议"
              value={statistics.disputedTasks}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div className="mt-2">
              <Tag color={disputeRate <= 5 ? 'green' : disputeRate <= 10 ? 'orange' : 'red'}>
                争议率: {disputeRate.toFixed(1)}%
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 质量指标 */}
      <Row gutter={16} className="mb-4">
        <Col span={12}>
          <Card title="复核质量">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="平均复核时间"
                  value={statistics.averageReviewTime}
                  suffix="分钟"
                  precision={1}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="准确率"
                  value={statistics.accuracyRate * 100}
                  suffix="%"
                  precision={1}
                  valueStyle={{ 
                    color: statistics.accuracyRate >= 0.95 ? '#52c41a' : 
                           statistics.accuracyRate >= 0.90 ? '#fa8c16' : '#ff4d4f' 
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="复核员概况">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="活跃复核员"
                  value={statistics.reviewerStats.filter(r => r.completedTasks > 0).length}
                  prefix={<UserOutlined />}
                  suffix={`/ ${statistics.reviewerStats.length}`}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="平均完成率"
                  value={
                    statistics.reviewerStats.length > 0 ?
                    (statistics.reviewerStats.reduce((sum, r) => 
                      sum + (r.assignedTasks > 0 ? r.completedTasks / r.assignedTasks : 0), 0
                    ) / statistics.reviewerStats.length * 100) : 0
                  }
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 复核员详细统计 */}
      <Card title="复核员统计" className="mb-4">
        <Table
          columns={reviewerColumns}
          dataSource={statistics.reviewerStats}
          rowKey="reviewerId"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 分数分布统计 */}
      <Card title="分数分布对比">
        <Table
          columns={distributionColumns}
          dataSource={statistics.scoreDistribution}
          rowKey="scoreRange"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default ReviewStatistics;