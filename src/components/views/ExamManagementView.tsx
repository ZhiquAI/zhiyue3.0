import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Form, Input, Select, Breadcrumb, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, BarChartOutlined, DeleteOutlined, EditOutlined, UnorderedListOutlined, TeamOutlined, BarcodeOutlined, FormOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { useDebounce } from '../../utils/performance';
import CreateExamModal from '../modals/CreateExamModal';
import { Exam } from '../../types/exam';
import VirtualTable from '../common/VirtualTable';
import ErrorBoundary from '../common/ErrorBoundary';
import { message } from '../../utils/message';
import AnswerSheetTemplateEditor from '../TemplateDesigner/AnswerSheetTemplateEditor';

const ExamManagementView: React.FC = () => {
  const { exams, setSubViewInfo, setCurrentView, deleteExam, refreshExams } = useAppContext();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [templateEditorVisible, setTemplateEditorVisible] = useState(false);
  const [filteredExams, setFilteredExams] = useState(exams);
  const [form] = Form.useForm();
  const { state: deleteState, execute: executeDelete } = useAsyncOperation();
  const [showSubMenu, setShowSubMenu] = useState(true); // 控制是否显示子菜单卡片

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

  const handleExamAction = (exam: Exam) => {
    console.log('Handling exam action for:', exam.name, 'status:', exam.status);

    // 所有考试都通过阅卷中心进行处理，由阅卷中心决定具体的工作流步骤
    setCurrentView('markingCenter');
    setSubViewInfo({
      view: null, // 不指定具体的子视图，让阅卷中心自动决定
      exam,
      source: 'examManagement' // 标识来源为考试管理
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

  // 子菜单卡片数据
  const subMenuCards = [
    {
      key: 'examList',
      title: '考试任务列表',
      description: '查看和管理所有考试任务，跟踪考试进度',
      icon: <UnorderedListOutlined className="text-2xl" />,
      color: 'from-blue-500 to-blue-600',
      onClick: () => setShowSubMenu(false)
    },
    {
      key: 'studentInfo',
      title: '学生信息管理',
      description: '管理学生基本信息，导入导出学生数据',
      icon: <TeamOutlined className="text-2xl" />,
      color: 'from-green-500 to-green-600',
      onClick: () => {
        setCurrentView('studentManagement');
        setSubViewInfo({ view: 'studentManagement', exam: null, source: 'examManagement' });
      }
    },

    {
      key: 'barcodeGenerator',
      title: '条形码制作工具',
      description: '生成条形码，制作标准化条形码标签',
      icon: <BarcodeOutlined className="text-2xl" />,
      color: 'from-orange-500 to-orange-600',
      onClick: () => {
        setCurrentView('barcodeGenerator');
      }
    },
    {
      key: 'answerSheetDesigner',
      title: '答题卡模板设计器',
      description: '可视化设计答题卡模板，自定义区域布局',
      icon: <FormOutlined className="text-2xl" />, 
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => {
        setShowSubMenu(false);
        setTimeout(() => setTemplateEditorVisible(true), 0);
      }
    }
  ];

  // 渲染卡片式子菜单
  const renderSubMenuCards = () => (
    <div className="space-y-6">
      <Breadcrumb className="mb-4" items={[{ title: '考试管理' }]} />
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">考试管理</h2>
        <p className="text-gray-600">选择您要使用的功能模块</p>
      </div>
      
      <Row gutter={[24, 24]}>
        {subMenuCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
            <Card
              hoverable
              className="h-full transition-all duration-300 hover:shadow-lg border-0 overflow-hidden"
              onClick={card.onClick}
              style={{ cursor: 'pointer' }}
            >
              <div className={`bg-gradient-to-br ${card.color} p-6 -m-6 mb-4 text-white`}>
                <div className="flex items-center justify-center mb-3">
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-center text-white">
                  {card.title}
                </h3>
              </div>
              <div className="pt-2">
                <p className="text-gray-600 text-sm text-center leading-relaxed">
                  {card.description}
                </p>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  const getActionButton = (exam: Exam) => {
    const actionMap: Record<string, JSX.Element> = {
      '待配置': (
        <Button 
          type="primary" 
          onClick={() => handleExamAction(exam)}
        >
          开始阅卷流程
        </Button>
      ),
      '待阅卷': (
        <Button 
          type="primary"
          onClick={() => handleExamAction(exam)}
        >
          继续阅卷流程
        </Button>
      ),
      '阅卷中': (
        <Button 
          type="primary"
          onClick={() => handleExamAction(exam)}
        >
          进入阅卷中心
        </Button>
      ),
      '已完成': (
        <Button 
          type="primary" 
          ghost 
          icon={<BarChartOutlined />} 
          onClick={() => handleExamAction(exam)}
        >
          查看报告
        </Button>
      )
    };
    return actionMap[exam.status] || null;
  };

  const getStatusDescription = (exam: Exam) => {
    const descriptions: Record<string, string> = {
      '待配置': '等待在阅卷中心开始处理',
      '待阅卷': '可在阅卷中心继续处理',
      '阅卷中': `阅卷进行中 (${exam.tasks.completed}/${exam.tasks.total})`,
      '已完成': `阅卷已完成，平均分 ${exam.avgScore}分`
    };
    return descriptions[exam.status] || '';
  };

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Exam) => (
        <div>
          <Button 
            type="link" 
            onClick={() => handleExamAction(record)} 
            className="p-0 h-auto font-semibold text-left"
          >
            {text}
          </Button>
          <div className="text-xs text-gray-500 mt-1">
            {getStatusDescription(record)}
          </div>
        </div>
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
      render: (status: string, record: Exam) => (
        <div>
          <Tag color={getStatusColor(status)}>{status}</Tag>
          {status === '阅卷中' && record.tasks.total > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              进度: {Math.round((record.tasks.completed / record.tasks.total) * 100)}%
            </div>
          )}
          {record.tasks.hasError && (
            <Tag color="red" className="mt-1 text-xs">
              有异常
            </Tag>
          )}
        </div>
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

  // 如果显示子菜单，则渲染卡片式子菜单
  if (showSubMenu) {
    return (
      <ErrorBoundary>

        {renderSubMenuCards()}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>

      
      <Breadcrumb 
        className="mb-4" 
        items={[
          { title: <span style={{ cursor: 'pointer' }} onClick={() => setShowSubMenu(true)}>考试管理</span> },
          { title: '考试任务列表' }
        ]} 
      />
      
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
      
      {/* 模板设计器组件 - 始终渲染以便调试 */}
      {templateEditorVisible && (
        <AnswerSheetTemplateEditor
          visible={templateEditorVisible}
          onClose={() => setTemplateEditorVisible(false)}
          onSave={(template) => {
            console.log('保存模板:', template);
            message.success('答题卡模板保存成功');
            setTemplateEditorVisible(false);
          }}
          mode="create"
        />
      )}
    </ErrorBoundary>
  );
};

export default ExamManagementView;