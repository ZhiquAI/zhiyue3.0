import React, { useState } from 'react';
import { Card, Typography, Button, Space, Table, Tag, Modal, Form, Input, DatePicker, Select, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface Exam {
  id: string;
  name: string;
  subject: string;
  grade: string;
  date: string;
  status: 'draft' | 'published' | 'completed';
  studentCount: number;
}

const mockExams: Exam[] = [
  {
    id: '1',
    name: '高一数学期中考试',
    subject: '数学',
    grade: '高一',
    date: '2025-09-15',
    status: 'published',
    studentCount: 45
  },
  {
    id: '2',
    name: '高二物理月考',
    subject: '物理',
    grade: '高二',
    date: '2025-09-20',
    status: 'draft',
    studentCount: 38
  },
  {
    id: '3',
    name: '高三化学模拟考',
    subject: '化学',
    grade: '高三',
    date: '2025-09-10',
    status: 'completed',
    studentCount: 52
  }
];

export const ExamManagement: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const statusColors = {
    draft: 'orange',
    published: 'blue',
    completed: 'green'
  };

  const statusTexts = {
    draft: '草稿',
    published: '已发布',
    completed: '已完成'
  };

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '考试日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: keyof typeof statusColors) => (
        <Tag color={statusColors[status]}>
          {statusTexts[status]}
        </Tag>
      ),
    },
    {
      title: '学生人数',
      dataIndex: 'studentCount',
      key: 'studentCount',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Exam) => (
        <Space size="middle">
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            type="primary"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleView = (exam: Exam) => {
    Modal.info({
      title: '考试详情',
      content: (
        <div>
          <p><strong>考试名称：</strong>{exam.name}</p>
          <p><strong>学科：</strong>{exam.subject}</p>
          <p><strong>年级：</strong>{exam.grade}</p>
          <p><strong>考试日期：</strong>{exam.date}</p>
          <p><strong>状态：</strong>{statusTexts[exam.status]}</p>
          <p><strong>学生人数：</strong>{exam.studentCount}</p>
        </div>
      ),
      width: 500,
    });
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    form.setFieldsValue(exam);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '您确定要删除这个考试吗？此操作不可撤销。',
      onOk: () => {
        setExams(exams.filter(exam => exam.id !== id));
      },
    });
  };

  const handleAdd = () => {
    setEditingExam(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingExam) {
        // 编辑考试
        setExams(exams.map(exam => 
          exam.id === editingExam.id ? { ...exam, ...values } : exam
        ));
      } else {
        // 新增考试
        const newExam: Exam = {
          id: Date.now().toString(),
          ...values,
          studentCount: 0
        };
        setExams([newExam, ...exams]);
      }
      setModalVisible(false);
      form.resetFields();
    });
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space align="center">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/dashboard')}
          >
            返回工作台
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            考试管理
          </Title>
          <Text type="secondary">管理考试信息、创建新考试</Text>
        </Space>
      </Card>

      {/* 功能区域 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新建考试
          </Button>
          <Button>批量操作</Button>
          <Button>导入考试</Button>
          <Button>导出数据</Button>
        </Space>
      </Card>

      {/* 考试列表 */}
      <Card title={`考试列表 (共${exams.length}个考试)`}>
        <Table 
          dataSource={exams}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 新建/编辑考试弹窗 */}
      <Modal
        title={editingExam ? '编辑考试' : '新建考试'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="考试名称"
            rules={[{ required: true, message: '请输入考试名称' }]}
          >
            <Input placeholder="请输入考试名称" />
          </Form.Item>
          
          <Form.Item
            name="subject"
            label="学科"
            rules={[{ required: true, message: '请选择学科' }]}
          >
            <Select placeholder="请选择学科">
              <Option value="数学">数学</Option>
              <Option value="语文">语文</Option>
              <Option value="英语">英语</Option>
              <Option value="物理">物理</Option>
              <Option value="化学">化学</Option>
              <Option value="生物">生物</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="grade"
            label="年级"
            rules={[{ required: true, message: '请选择年级' }]}
          >
            <Select placeholder="请选择年级">
              <Option value="高一">高一</Option>
              <Option value="高二">高二</Option>
              <Option value="高三">高三</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="date"
            label="考试日期"
            rules={[{ required: true, message: '请选择考试日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            initialValue="draft"
          >
            <Select>
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="completed">已完成</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 提示信息 */}
      <Alert
        message="考试管理功能"
        description="在这里您可以创建新的考试、编辑现有考试信息、管理考试状态，以及查看所有考试的详细信息。"
        type="info"
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default ExamManagement;