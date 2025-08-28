/**
 * 阅卷工作流程管理工作区
 * 提供工作流程监控、试卷分配和进度跟踪功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Progress,
  Select,
  Table,
  Alert,
  Space,
  Row,
  Col,
  Statistic,
  message,
  Spin,
  Badge,
} from 'antd';
import {
  PlayCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface GradingWorkflowWorkspaceProps {
  examId: string;
  onWorkflowUpdate?: (status: string) => void;
}

interface WorkflowStatistics {
  exam_id: string;
  overview: {
    total_graders: number;
    total_assigned: number;
    total_completed: number;
    overall_completion_rate: number;
    average_grader_completion_rate: number;
  };
  progress: {
    exam_id: string;
    total_sheets: number;
    graded_sheets: number;
    completion_rate: number;
    grader_progress: Array<{
      grader_id: string;
      grader_name: string;
      assigned_count: number;
      completed_count: number;
      completion_rate: number;
    }>;
    estimated_completion?: string;
  };
  grader_workloads: Array<{
    grader_id: string;
    assigned_count: number;
    completed_count: number;
    pending_count: number;
    completion_rate: number;
    avg_grading_time_minutes: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const GradingWorkflowWorkspace: React.FC<GradingWorkflowWorkspaceProps> = ({
  examId,
  onWorkflowUpdate,
}) => {
  const [statistics, setStatistics] = useState<WorkflowStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentStrategy, setAssignmentStrategy] = useState<string>('balanced');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 模拟数据加载
  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: WorkflowStatistics = {
        exam_id: examId,
        overview: {
          total_graders: 8,
          total_assigned: 240,
          total_completed: 180,
          overall_completion_rate: 75.0,
          average_grader_completion_rate: 72.5,
        },
        progress: {
          exam_id: examId,
          total_sheets: 240,
          graded_sheets: 180,
          completion_rate: 75.0,
          grader_progress: [
            { grader_id: '1', grader_name: '张老师', assigned_count: 30, completed_count: 25, completion_rate: 83.3 },
            { grader_id: '2', grader_name: '李老师', assigned_count: 30, completed_count: 22, completion_rate: 73.3 },
            { grader_id: '3', grader_name: '王老师', assigned_count: 30, completed_count: 28, completion_rate: 93.3 },
          ],
          estimated_completion: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
        grader_workloads: [
          { grader_id: '1', assigned_count: 30, completed_count: 25, pending_count: 5, completion_rate: 83.3, avg_grading_time_minutes: 3.2 },
          { grader_id: '2', assigned_count: 30, completed_count: 22, pending_count: 8, completion_rate: 73.3, avg_grading_time_minutes: 4.1 },
          { grader_id: '3', assigned_count: 30, completed_count: 28, pending_count: 2, completion_rate: 93.3, avg_grading_time_minutes: 2.8 },
        ],
      };

      setStatistics(mockData);
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate('loaded');
      }
    } catch (err) {
      console.error('加载工作流程数据失败:', err);
      setError('加载工作流程数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 分配试卷
  const handleAssignPapers = async () => {
    try {
      setIsAssigning(true);
      setError(null);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('试卷分配成功');
      await loadWorkflowData();
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate('assigned');
      }
    } catch (err) {
      console.error('分配试卷失败:', err);
      setError('分配试卷失败，请重试');
    } finally {
      setIsAssigning(false);
    }
  };

  // 优化分配
  const handleOptimizeAssignment = async () => {
    try {
      setIsOptimizing(true);
      setError(null);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      message.success('分配优化完成');
      await loadWorkflowData();
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate('optimized');
      }
    } catch (err) {
      console.error('优化分配失败:', err);
      setError('优化分配失败，请重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (examId) {
      loadWorkflowData();
    }
  }, [examId]);

  // 准备图表数据
  const graderProgressData = statistics?.progress.grader_progress.map(grader => ({
    name: grader.grader_name,
    completed: grader.completed_count,
    assigned: grader.assigned_count,
    rate: grader.completion_rate,
  })) || [];

  const workloadDistribution = statistics?.grader_workloads.map((workload, index) => ({
    name: `阅卷员${index + 1}`,
    value: workload.assigned_count,
    completed: workload.completed_count,
  })) || [];

  const columns = [
    {
      title: '阅卷员ID',
      dataIndex: 'grader_id',
      key: 'grader_id',
    },
    {
      title: '已分配',
      dataIndex: 'assigned_count',
      key: 'assigned_count',
    },
    {
      title: '已完成',
      dataIndex: 'completed_count',
      key: 'completed_count',
    },
    {
      title: '待处理',
      dataIndex: 'pending_count',
      key: 'pending_count',
    },
    {
      title: '完成率',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      render: (rate: number) => (
        <Space>
          <Progress percent={rate} size="small" style={{ width: 60 }} />
          <span>{rate.toFixed(1)}%</span>
        </Space>
      ),
    },
    {
      title: '平均用时(分钟)',
      dataIndex: 'avg_grading_time_minutes',
      key: 'avg_grading_time_minutes',
      render: (time: number) => time.toFixed(1),
    },
    {
      title: '状态',
      key: 'status',
      render: (record: { completion_rate: number }) => (
        <Badge 
          status={record.completion_rate === 100 ? "success" : "processing"}
          text={record.completion_rate === 100 ? "已完成" : "进行中"}
        />
      ),
    },
  ];

  if (loading && !statistics) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>加载工作流程数据中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 错误提示 */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 概览卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="阅卷员总数"
              value={statistics?.overview.total_graders || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已分配试卷"
              value={statistics?.overview.total_assigned || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成阅卷"
              value={statistics?.overview.total_completed || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="完成率"
              value={(statistics?.overview.overall_completion_rate || 0).toFixed(1)}
              suffix="%"
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作面板 */}
      <Card title={<><SettingOutlined /> 工作流程控制</>} style={{ marginBottom: 24 }}>
        <Space wrap>
          <span>分配策略:</span>
          <Select
            value={assignmentStrategy}
            onChange={setAssignmentStrategy}
            style={{ width: 120 }}
          >
            <Select.Option value="balanced">均衡分配</Select.Option>
            <Select.Option value="random">随机分配</Select.Option>
            <Select.Option value="expertise">专业匹配</Select.Option>
            <Select.Option value="workload">负载优先</Select.Option>
          </Select>

          <Button
            type="primary"
            icon={isAssigning ? <ReloadOutlined spin /> : <PlayCircleOutlined />}
            onClick={handleAssignPapers}
            loading={isAssigning}
          >
            {isAssigning ? '分配中...' : '开始分配'}
          </Button>

          <Button
            icon={isOptimizing ? <ReloadOutlined spin /> : <RiseOutlined />}
            onClick={handleOptimizeAssignment}
            loading={isOptimizing}
          >
            {isOptimizing ? '优化中...' : '优化分配'}
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={loadWorkflowData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {/* 进度概览 */}
      {statistics?.progress && (
        <Card title="阅卷进度" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>总体进度</span>
              <span>{statistics.progress.graded_sheets}/{statistics.progress.total_sheets}</span>
            </div>
            <Progress percent={statistics.progress.completion_rate} />
            <p style={{ marginTop: 8, color: '#666' }}>
              完成率: {statistics.progress.completion_rate.toFixed(1)}%
            </p>
          </div>

          {statistics.progress.estimated_completion && (
            <div style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              <span>预计完成时间: {new Date(statistics.progress.estimated_completion).toLocaleString()}</span>
            </div>
          )}
        </Card>
      )}

      {/* 图表区域 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="阅卷员进度对比">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={graderProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#8884d8" name="已完成" />
                <Bar dataKey="assigned" fill="#82ca9d" name="已分配" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="工作负载分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workloadDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {workloadDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 阅卷员详细信息表格 */}
      {statistics?.grader_workloads && statistics.grader_workloads.length > 0 && (
        <Card title="阅卷员工作详情">
          <Table
            columns={columns}
            dataSource={statistics.grader_workloads}
            rowKey="grader_id"
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
};

export default GradingWorkflowWorkspace;