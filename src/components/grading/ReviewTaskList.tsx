// 阅卷复核任务列表组件
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  message,
  Tooltip,
  Badge,
  Select,
  Input,
  DatePicker,
  Row,
  Col
} from 'antd';
import {
  EyeOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface ReviewTask {
  id: string;
  answerSheetId: string;
  studentName: string;
  studentId: string;
  reviewType: 'double' | 'triple' | 'dispute';
  status: 'pending' | 'in_progress' | 'completed' | 'disputed';
  priority: 'high' | 'medium' | 'low';
  originalScore: number;
  reviewScore?: number;
  scoreDifference?: number;
  assignedReviewer?: string;
  createdAt: string;
  deadline: string;
  questionCount: number;
  disputeReason?: string;
}

interface ReviewTaskListProps {
  examId: string;
  onReviewTask: (task: ReviewTask) => void;
}

const ReviewTaskList: React.FC<ReviewTaskListProps> = ({ examId, onReviewTask }) => {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    reviewType: '',
    priority: '',
    dateRange: null as any,
    keyword: ''
  });

  // 获取复核任务列表
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        exam_id: examId,
        ...(filters.status && { status: filters.status }),
        ...(filters.reviewType && { review_type: filters.reviewType }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.keyword && { keyword: filters.keyword }),
        ...(filters.dateRange && {
          start_date: filters.dateRange[0].format('YYYY-MM-DD'),
          end_date: filters.dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await fetch(`/api/grading-review/tasks?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取复核任务失败');
      }

      const data = await response.json();
      setTasks(data.data || []);
    } catch (error: any) {
      message.error('获取复核任务失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 批量分配复核任务
  const handleBatchAssign = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要分配的任务');
      return;
    }

    Modal.confirm({
      title: '批量分配复核任务',
      content: `确定要分配选中的 ${selectedRowKeys.length} 个任务吗？`,
      onOk: async () => {
        try {
          const response = await fetch('/api/grading-review/tasks/batch-assign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
              task_ids: selectedRowKeys,
              exam_id: examId
            })
          });

          if (!response.ok) {
            throw new Error('批量分配失败');
          }

          message.success('批量分配成功');
          setSelectedRowKeys([]);
          fetchTasks();
        } catch (error: any) {
          message.error('批量分配失败: ' + error.message);
        }
      }
    });
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待复核' },
      in_progress: { color: 'blue', text: '复核中' },
      completed: { color: 'green', text: '已完成' },
      disputed: { color: 'red', text: '有争议' }
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取复核类型标签
  const getReviewTypeTag = (type: string) => {
    const typeConfig: Record<string, { color: string; text: string }> = {
      double: { color: 'blue', text: '双评' },
      triple: { color: 'purple', text: '三评' },
      dispute: { color: 'red', text: '争议处理' }
    };
    const config = typeConfig[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取优先级标签
  const getPriorityTag = (priority: string) => {
    const priorityConfig: Record<string, { color: string; text: string }> = {
      high: { color: 'red', text: '高' },
      medium: { color: 'orange', text: '中' },
      low: { color: 'green', text: '低' }
    };
    const config = priorityConfig[priority] || { color: 'default', text: priority };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<ReviewTask> = [
    {
      title: '学生信息',
      key: 'student',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.studentName}</div>
          <div className="text-gray-500 text-sm">{record.studentId}</div>
        </div>
      )
    },
    {
      title: '复核类型',
      dataIndex: 'reviewType',
      key: 'reviewType',
      render: (type) => getReviewTypeTag(type)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => getPriorityTag(priority)
    },
    {
      title: '分数信息',
      key: 'score',
      render: (_, record) => (
        <div>
          <div>原始分数: {record.originalScore}</div>
          {record.reviewScore !== undefined && (
            <div>
              复核分数: {record.reviewScore}
              {record.scoreDifference !== undefined && (
                <span className={`ml-2 ${
                  Math.abs(record.scoreDifference) > 5 ? 'text-red-500' : 'text-green-500'
                }`}>
                  ({record.scoreDifference > 0 ? '+' : ''}{record.scoreDifference})
                </span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      title: '分配情况',
      dataIndex: 'assignedReviewer',
      key: 'assignedReviewer',
      render: (reviewer) => reviewer || <Tag color="orange">未分配</Tag>
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (deadline) => {
        const isOverdue = dayjs(deadline).isBefore(dayjs());
        return (
          <span className={isOverdue ? 'text-red-500' : ''}>
            {dayjs(deadline).format('YYYY-MM-DD HH:mm')}
            {isOverdue && <Badge status="error" text="已逾期" className="ml-2" />}
          </span>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onReviewTask(record)}
            />
          </Tooltip>
          {record.status === 'disputed' && record.disputeReason && (
            <Tooltip title={`争议原因: ${record.disputeReason}`}>
              <Button
                size="small"
                icon={<ExclamationCircleOutlined />}
                danger
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record: ReviewTask) => ({
      disabled: record.status === 'completed'
    })
  };

  useEffect(() => {
    fetchTasks();
  }, [examId, filters]);

  return (
    <Card
      title="阅卷复核任务"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTasks}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            onClick={handleBatchAssign}
            disabled={selectedRowKeys.length === 0}
          >
            批量分配 ({selectedRowKeys.length})
          </Button>
        </Space>
      }
    >
      {/* 筛选条件 */}
      <Row gutter={16} className="mb-4">
        <Col span={4}>
          <Select
            placeholder="状态筛选"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value || '' })}
            className="w-full"
          >
            <Option value="pending">待复核</Option>
            <Option value="in_progress">复核中</Option>
            <Option value="completed">已完成</Option>
            <Option value="disputed">有争议</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            placeholder="复核类型"
            allowClear
            value={filters.reviewType}
            onChange={(value) => setFilters({ ...filters, reviewType: value || '' })}
            className="w-full"
          >
            <Option value="double">双评</Option>
            <Option value="triple">三评</Option>
            <Option value="dispute">争议处理</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            placeholder="优先级"
            allowClear
            value={filters.priority}
            onChange={(value) => setFilters({ ...filters, priority: value || '' })}
            className="w-full"
          >
            <Option value="high">高</Option>
            <Option value="medium">中</Option>
            <Option value="low">低</Option>
          </Select>
        </Col>
        <Col span={6}>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            value={filters.dateRange}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            className="w-full"
          />
        </Col>
        <Col span={6}>
          <Input
            placeholder="搜索学生姓名或学号"
            prefix={<SearchOutlined />}
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            allowClear
          />
        </Col>
      </Row>

      {/* 任务列表 */}
      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          total: tasks.length,
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
        }}
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};

export default ReviewTaskList;