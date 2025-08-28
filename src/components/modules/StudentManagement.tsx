import React, { useState } from 'react';
import { Card, Typography, Button, Space, Table, Modal, Form, Input, Select, Upload, Alert, Tag, Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface Student {
  id: string;
  studentId: string;
  name: string;
  grade: string;
  class: string;
  gender: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  avgScore: number;
}

const mockStudents: Student[] = [
  {
    id: '1',
    studentId: '2025001',
    name: '张小明',
    grade: '高一',
    class: '1班',
    gender: '男',
    phone: '138****1234',
    email: 'zhangxm@example.com',
    status: 'active',
    avgScore: 85.5
  },
  {
    id: '2',
    studentId: '2025002',
    name: '李小红',
    grade: '高一',
    class: '1班',
    gender: '女',
    phone: '139****5678',
    email: 'lixh@example.com',
    status: 'active',
    avgScore: 92.3
  },
  {
    id: '3',
    studentId: '2025003',
    name: '王小刚',
    grade: '高二',
    class: '2班',
    gender: '男',
    phone: '137****9012',
    status: 'inactive',
    avgScore: 78.2
  }
];

export const StudentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);

  const statusColors = {
    active: 'green',
    inactive: 'red'
  };

  const statusTexts = {
    active: '在校',
    inactive: '离校'
  };

  const columns = [
    {
      title: '头像',
      key: 'avatar',
      render: () => (
        <Avatar icon={<UserOutlined />} />
      ),
    },
    {
      title: '学号',
      dataIndex: 'studentId',
      key: 'studentId',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: '班级',
      dataIndex: 'class',
      key: 'class',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: '平均成绩',
      dataIndex: 'avgScore',
      key: 'avgScore',
      render: (score: number) => (
        <span style={{ 
          color: score >= 90 ? '#52c41a' : score >= 70 ? '#1890ff' : '#f5222d' 
        }}>
          {score.toFixed(1)}
        </span>
      ),
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
      title: '操作',
      key: 'action',
      render: (_: any, record: Student) => (
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

  const handleView = (student: Student) => {
    Modal.info({
      title: '学生详情',
      content: (
        <div>
          <p><strong>学号：</strong>{student.studentId}</p>
          <p><strong>姓名：</strong>{student.name}</p>
          <p><strong>年级班级：</strong>{student.grade} {student.class}</p>
          <p><strong>性别：</strong>{student.gender}</p>
          <p><strong>联系电话：</strong>{student.phone || '未填写'}</p>
          <p><strong>邮箱：</strong>{student.email || '未填写'}</p>
          <p><strong>平均成绩：</strong>{student.avgScore.toFixed(1)}分</p>
          <p><strong>状态：</strong>{statusTexts[student.status]}</p>
        </div>
      ),
      width: 500,
    });
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    form.setFieldsValue(student);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '您确定要删除这个学生吗？此操作不可撤销。',
      onOk: () => {
        setStudents(students.filter(student => student.id !== id));
      },
    });
  };

  const handleAdd = () => {
    setEditingStudent(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingStudent) {
        // 编辑学生
        setStudents(students.map(student => 
          student.id === editingStudent.id ? { ...student, ...values } : student
        ));
      } else {
        // 新增学生
        const newStudent: Student = {
          id: Date.now().toString(),
          ...values,
          avgScore: 0
        };
        setStudents([newStudent, ...students]);
      }
      setModalVisible(false);
      form.resetFields();
    });
  };

  const uploadProps = {
    name: 'file',
    accept: '.xlsx,.xls,.csv',
    beforeUpload: () => false,
    onChange: (info: any) => {
      console.log('上传文件:', info.fileList);
    },
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
            学生管理
          </Title>
          <Text type="secondary">管理学生信息、导入导出</Text>
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
            新增学生
          </Button>
          <Button 
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            批量导入
          </Button>
          <Button>批量操作</Button>
          <Button>导出Excel</Button>
          <Button>导出模板</Button>
        </Space>
      </Card>

      {/* 统计信息 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#1890ff' }}>{students.length}</div>
            <Text type="secondary">总学生数</Text>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#52c41a' }}>
              {students.filter(s => s.status === 'active').length}
            </div>
            <Text type="secondary">在校学生</Text>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#722ed1' }}>
              {(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length).toFixed(1)}
            </div>
            <Text type="secondary">平均成绩</Text>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#fa8c16' }}>
              {students.filter(s => s.avgScore >= 90).length}
            </div>
            <Text type="secondary">优秀学生</Text>
          </div>
        </Card>
      </div>

      {/* 学生列表 */}
      <Card title={`学生列表 (共${students.length}名学生)`}>
        <Table 
          dataSource={students}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 新建/编辑学生弹窗 */}
      <Modal
        title={editingStudent ? '编辑学生' : '新增学生'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="studentId"
            label="学号"
            rules={[{ required: true, message: '请输入学号' }]}
          >
            <Input placeholder="请输入学号" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              name="class"
              label="班级"
              rules={[{ required: true, message: '请输入班级' }]}
            >
              <Input placeholder="如：1班" />
            </Form.Item>
          </div>
          
          <Form.Item
            name="gender"
            label="性别"
            rules={[{ required: true, message: '请选择性别' }]}
          >
            <Select placeholder="请选择性别">
              <Option value="男">男</Option>
              <Option value="女">女</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="phone"
            label="联系电话"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Option value="active">在校</Option>
              <Option value="inactive">离校</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入学生"
        open={importModalVisible}
        onOk={() => setImportModalVisible(false)}
        onCancel={() => setImportModalVisible(false)}
      >
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .xlsx, .xls, .csv 格式。请先下载导入模板。
          </p>
        </Upload.Dragger>
        <div style={{ marginTop: '16px' }}>
          <Button type="link">下载导入模板</Button>
        </div>
      </Modal>

      {/* 提示信息 */}
      <Alert
        message="学生管理功能"
        description="支持学生信息的新增、编辑、删除和批量导入导出。可以查看学生详细信息和成绩统计，便于学校管理和教学安排。"
        type="info"
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default StudentManagement;