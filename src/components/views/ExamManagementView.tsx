import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Form, Input, Select, Breadcrumb, Modal, message, Popconfirm } from 'antd';
import { PlusOutlined, BarChartOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { useDebounce } from '../../utils/performance';
import { validateExamName } from '../../utils/validation';
import CreateExamModal from '../modals/CreateExamModal';
import { Exam } from '../../types/exam';
import VirtualTable from '../common/VirtualTable';
import ErrorBoundary from '../common/ErrorBoundary';

const ExamManagementView: React.FC = () => {
  const { exams, setSubViewInfo, deleteExam, refreshExams } = useAppContext();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [filteredExams, setFilteredExams] = useState(exams);
  const [form] = Form.useForm();
  const { state: deleteState, execute: executeDelete } = useAsyncOperation();

  // 防抖搜索
  const debouncedSearch = useDebounce((values: any) => {
    handleSearch(values);
  }, 300);

  useEffect(() => {
    setFilteredExams(exams);
  }, [exams]);

  const handleSearch = (values: any) => {
    let data = [...exams];
    
    if (values.name) {
      data = data.filter(e => e.name.toLowerCase().includes(values.name.toLowerCase()));
    }
    if (values.subject) {
      data = data.filter(e => e.subject === values.subject);
    }
    if (values.grade) {
      data = data.filter(e => e.grade === values.grade);
    }
    if (values.status) {
      data = data.filter(e => e.status === values.status);
    }
    
    setFilteredExams(data);
  };

  const handleReset = () => {
    form.resetFields();
    setFilteredExams(exams);
  };

  const handleNavigate = (type: string, exam: Exam) => {
    const navigationMap = {
      '待配置': 'configure',
      '阅卷中': 'marking',
      '已完成': 'analysis'
    };
    
    setSubViewInfo({ 
      view: navigationMap[exam.status] || 'configure', 
      exam 
    });
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      await executeDelete(() => deleteExam(examId));
      await refreshExams();
    } catch (error) {
      console.error('Delete exam failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      '待配置': 'orange',
      '待阅卷': 'geekblue',
      '阅卷中': 'processing',
      '已完成': 'success'
    };
    return colorMap[status] || 'default';
  };

  const getActionButton = (exam: Exam) => {
    const actionMap: Record<string, JSX.Element> = {
      '待配置': (
        <Button type="primary" onClick={() => handleNavigate('configure', exam)}>
          配置试卷
        </Button>
      ),
      '待阅卷': (
        <Button type="primary" onClick={() => handleNavigate('upload', exam)}>
          上传答题卡
        </Button>
      ),
      '阅卷中': (
        <Button type="primary" onClick={() => handleNavigate('marking', exam)}>
          进入阅卷
        </Button>
      ),
      '已完成': (
        <Button 
          type="primary" 
          ghost 
          icon={<BarChartOutlined />} 
          onClick={() => handleNavigate('analysis', exam)}
        >
          查看报告
        </Button>
      )
    };
    return actionMap[exam.status] || null;
  };

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Exam) => (
        <Button 
          type="link" 
          onClick={() => handleNavigate('view', record)} 
          className="p-0 h-auto font-semibold text-left"
        >
          {text}
        </Button>
      ),
      sorter: (a: Exam, b: Exam) => a.name.localeCompare(b.name),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      filters: [
        { text: '历史', value: '历史' },
      ],
      onFilter: (value: any, record: Exam) => record.subject === value,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      filters: [
        { text: '初一', value: '初一' },
        { text: '初二', value: '初二' },
        { text: '初三', value: '初三' },
        { text: '高一', value: '高一' },
        { text: '高二', value: '高二' },
        { text: '高三', value: '高三' },
      ],
      onFilter: (value: any, record: Exam) => record.grade === value,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a: Exam, b: Exam) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
      filters: [
        { text: '待配置', value: '待配置' },
        { text: '待阅卷', value: '待阅卷' },
        { text: '阅卷中', value: '阅卷中' },
        { text: '已完成', value: '已完成' },
      ],
      onFilter: (value: any, record: Exam) => record.status === value,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Exam) => (
        <Space>
          {getActionButton(record)}
          <Button 
            icon={<EditOutlined />}
            onClick={() => message.info('编辑功能开发中...')}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个考试吗？"
            description="删除后将无法恢复，请谨慎操作。"
            onConfirm={() => handleDeleteExam(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ loading: deleteState.loading }}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              disabled={record.status === '阅卷中'}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    }
  ];

  return (
    <ErrorBoundary>
      <Breadcrumb className="mb-4" items={[{ title: '考试管理' }]} />
      
      <Card>
        <Form 
          form={form} 
          onValuesChange={debouncedSearch}
          layout="inline" 
          className="mb-4"
        >
          <Form.Item name="name">
            <Input 
              placeholder="搜索考试名称"
              allowClear
            />
          </Form.Item>
          <Form.Item name="subject">
            <Select 
              placeholder="选择科目" 
              style={{ width: 120 }} 
              allowClear
            >
              <Select.Option value="历史">历史</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="grade">
            <Select 
              placeholder="选择年级" 
              style={{ width: 120 }} 
              allowClear
            >
              <Select.Option value="初一">初一</Select.Option>
              <Select.Option value="初二">初二</Select.Option>
              <Select.Option value="初三">初三</Select.Option>
              <Select.Option value="高一">高一</Select.Option>
              <Select.Option value="高二">高二</Select.Option>
              <Select.Option value="高三">高三</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status">
            <Select 
              placeholder="选择状态" 
              style={{ width: 120 }} 
              allowClear
            >
              <Select.Option value="待配置">待配置</Select.Option>
              <Select.Option value="待阅卷">待阅卷</Select.Option>
              <Select.Option value="阅卷中">阅卷中</Select.Option>
              <Select.Option value="已完成">已完成</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button onClick={handleReset}>重置</Button>
          </Form.Item>
        </Form>

        <div className="flex justify-end mb-4">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setCreateModalVisible(true)}
          >
            创建新考试
          </Button>
        </div>

        {/* 使用虚拟表格处理大数据量 */}
        {filteredExams.length > 100 ? (
          <VirtualTable
            columns={columns}
            dataSource={filteredExams}
            rowKey="id"
            height={600}
          />
        ) : (
          <Table 
            columns={columns} 
            dataSource={filteredExams} 
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />
        )}
      </Card>

      <CreateExamModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </ErrorBoundary>
  );
};

export default ExamManagementView;