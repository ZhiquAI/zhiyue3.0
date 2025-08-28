import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Progress,
  Modal,
  Form,
  DatePicker,
  message
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface GradingTask {
  id: string;
  name: string;
  subject: string;
  grade: string;
  status: '待配置' | '待阅卷' | '阅卷中' | '已完成';
  createdAt: string;
  totalStudents: number;
  completedStudents: number;
  description?: string;
  dueDate?: string;
}

const TaskManagementPanel: React.FC = () => {
  const [tasks, setTasks] = useState<GradingTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<GradingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 模拟任务数据
  useEffect(() => {
    const mockTasks: GradingTask[] = [
      {
        id: 'task_001',
        name: '高二数学期中考试',
        subject: '数学',
        grade: '高二',
        status: '待阅卷',
        createdAt: '2025-08-25',
        totalStudents: 150,
        completedStudents: 0,
        description: '高二年级数学期中考试阅卷任务',
        dueDate: '2025-08-30'
      },
      {
        id: 'task_002',
        name: '高一语文月考',
        subject: '语文',
        grade: '高一',
        status: '阅卷中',
        createdAt: '2025-08-24',
        totalStudents: 120,
        completedStudents: 45,
        description: '高一年级语文月考阅卷任务',
        dueDate: '2025-08-28'
      },
      {
        id: 'task_003',
        name: '高三英语模拟考',
        subject: '英语',
        grade: '高三',
        status: '已完成',
        createdAt: '2025-08-20',
        totalStudents: 180,
        completedStudents: 180,
        description: '高三年级英语模拟考试阅卷任务',
        dueDate: '2025-08-25'
      }
    ];
    
    setTasks(mockTasks);
    setFilteredTasks(mockTasks);
  }, []);

  // 搜索和筛选
  useEffect(() => {
    let filtered = [...tasks];
    
    if (searchText) {
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchText.toLowerCase()) ||
        task.subject.toLowerCase().includes(searchText.toLowerCase()) ||
        task.grade.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    setFilteredTasks(filtered);
  }, [tasks, searchText, statusFilter]);

  const handleCreateTask = async (values: any) => {
    try {
      const newTask: GradingTask = {
        id: `task_${Date.now()}`,
        name: values.name,
        subject: values.subject,
        grade: values.grade,
        status: '待配置',
        createdAt: new Date().toISOString().split('T')[0],
        totalStudents: values.totalStudents || 0,
        completedStudents: 0,
        description: values.description,
        dueDate: values.dueDate?.format('YYYY-MM-DD')
      };

      setTasks(prev => [newTask, ...prev]);
      setCreateModalVisible(false);
      form.resetFields();
      message.success('阅卷任务创建成功');
    } catch (error) {
      message.error('创建任务失败');
    }
  };

  const handleStartGrading = async (taskId: string) => {
    try {
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: '阅卷中' as const } : task
      ));
      message.success('阅卷任务已开始');
    } catch (error) {
      message.error('启动阅卷失败');
    }
  };

  const getProgressPercent = (task: GradingTask) => {
    if (task.totalStudents === 0) return 0;
    return Math.round((task.completedStudents / task.totalStudents) * 100);
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      '待配置': 'default',
      '待阅卷': 'warning',
      '阅卷中': 'processing',
      '已完成': 'success'
    };
    return colorMap[status as keyof typeof colorMap] || 'default';
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: GradingTask) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-sm text-gray-500">
            {record.subject} · {record.grade}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: '进度',
      key: 'progress',
      render: (_: any, record: GradingTask) => {
        const percent = getProgressPercent(record);
        return (
          <div style={{ width: 120 }}>
            <Progress percent={percent} size="small" />
            <div className="text-xs text-gray-500 mt-1">
              {record.completedStudents}/{record.totalStudents}
            </div>
          </div>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt'
    },
    {
      title: '截止时间',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => date || '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: GradingTask) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
          >
            详情
          </Button>
          {record.status === '待阅卷' && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartGrading(record.id)}
            >
              开始
            </Button>
          )}
          {record.status === '已完成' && (
            <Button size="small" icon={<BarChartOutlined />}>
              报告
            </Button>
          )}
          <Button 
            size="small" 
            icon={<EditOutlined />}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={tasks.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中"
              value={tasks.filter(t => t.status === '阅卷中').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={tasks.filter(t => t.status === '待阅卷').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={tasks.filter(t => t.status === '已完成').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Input
              placeholder="搜索任务名称、科目或年级"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="任务状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">全部状态</Option>
              <Option value="待配置">待配置</Option>
              <Option value="待阅卷">待阅卷</Option>
              <Option value="阅卷中">阅卷中</Option>
              <Option value="已完成">已完成</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button onClick={() => {
              setSearchText('');
              setStatusFilter('all');
            }}>
              重置
            </Button>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建任务
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 任务列表 */}
      <Card title="任务列表">
        <Table
          dataSource={filteredTasks}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 创建任务Modal */}
      <Modal
        title="新建阅卷任务"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
        >
          <Form.Item
            label="任务名称"
            name="name"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：高二数学期中考试" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="科目"
                name="subject"
                rules={[{ required: true, message: '请选择科目' }]}
              >
                <Select placeholder="选择科目">
                  <Option value="语文">语文</Option>
                  <Option value="数学">数学</Option>
                  <Option value="英语">英语</Option>
                  <Option value="物理">物理</Option>
                  <Option value="化学">化学</Option>
                  <Option value="生物">生物</Option>
                  <Option value="历史">历史</Option>
                  <Option value="地理">地理</Option>
                  <Option value="政治">政治</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="年级"
                name="grade"
                rules={[{ required: true, message: '请选择年级' }]}
              >
                <Select placeholder="选择年级">
                  <Option value="高一">高一</Option>
                  <Option value="高二">高二</Option>
                  <Option value="高三">高三</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="学生总数" name="totalStudents">
                <Input type="number" placeholder="例如：150" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="截止时间" name="dueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="任务描述" name="description">
            <TextArea rows={4} placeholder="简要描述这次阅卷任务的内容和要求" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建任务
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskManagementPanel;