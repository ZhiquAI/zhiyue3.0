import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Table, 
  Upload, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Alert, 
  Progress,
  Space,
  Tag,
  Divider,
  Tabs,
  Popconfirm,
  Tooltip,
  Typography,
  Empty,
  Spin
} from 'antd';
import { 
  TeamOutlined, 
  UploadOutlined, 
  DownloadOutlined, 
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  EyeOutlined,
  CopyOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Exam } from '../../types/exam';
import { PreGradingConfiguration } from '../../types/preGrading';
import { message } from '../../utils/message';
import { studentApi, Student, StudentCreate, StudentUpdate } from '../../api/studentApi';
import OptimizedAnswerSheetDesigner from '../TemplateDesigner/OptimizedAnswerSheetDesigner';

// 移除废弃的TabPane导入
const { Dragger } = Upload;
const { Search } = Input;
const { Text } = Typography;

interface PreparationStageProps {
  exam: Exam;
  configuration: PreGradingConfiguration;
  onConfigUpdate?: (config: Partial<PreGradingConfiguration>) => void;
  onComplete?: () => void;
}

// 答题卡模板接口
interface AnswerSheetTemplate {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  examType?: string;
  pageWidth: number;
  pageHeight: number;
  dpi: number;
  regionCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isActive: boolean;
  type: 'standard' | 'custom';
  questionCount: number;
  objectiveCount: number;
  subjectiveCount: number;
  layout: 'A4_portrait' | 'A4_landscape' | 'A3_portrait';
  status: 'active' | 'draft';
}

interface TemplateConfig {
  id?: string;
  name: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  examType?: string;
  pageWidth: number;
  pageHeight: number;
  dpi: number;
  regions: TemplateRegion[];
}

interface TemplateRegion {
  id: string;
  type: 'question' | 'student_info' | 'barcode' | 'header' | 'footer';
  subType?: 'choice' | 'subjective' | 'fill_blank' | 'essay';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  properties?: {
    questionNumber?: number;
    maxScore?: number;
    choiceCount?: number;
    fields?: string[];
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
  };
}

const PreparationStage: React.FC<PreparationStageProps> = ({
  exam,
  configuration,
  onConfigUpdate,
  onComplete
}) => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<AnswerSheetTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'student' | 'template'>('student');
  const [editingItem, setEditingItem] = useState<Student | AnswerSheetTemplate | null>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  const [designerVisible, setDesignerVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<TemplateConfig | null>(null);
  const [designerMode, setDesignerMode] = useState<'create' | 'edit' | 'preview'>('create');

  // 初始化数据
  useEffect(() => {
    if (exam.id) {
      loadStudents();
      loadTemplates();
      fetchStatistics();
    }
  }, [exam.id, searchTerm, selectedClass]);

  // 加载学生数据
  const loadStudents = async () => {
    if (!exam.id) return;
    setLoading(true);
    try {
      const response = await studentApi.getStudents(exam.id, {
        search: searchTerm,
        class_name: selectedClass,
      });
      if (response.success) {
        setStudents(response.data || []);
      }
    } catch (error) {
      console.error('获取学生列表失败:', error);
      message.error('获取学生列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计信息
  const fetchStatistics = async () => {
    if (!exam.id) return;
    try {
      const response = await studentApi.getStudentStatistics(exam.id);
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 加载模板数据
  const loadTemplates = async () => {
    const mockTemplates: AnswerSheetTemplate[] = [
      {
        id: 'template_1',
        name: '标准答题卡模板',
        description: '通用标准答题卡模板',
        subject: '通用',
        gradeLevel: '初中',
        examType: '期中考试',
        pageWidth: 210,
        pageHeight: 297,
        dpi: 300,
        regionCount: 5,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
        isActive: true,
        type: 'standard',
        questionCount: 25,
        objectiveCount: 20,
        subjectiveCount: 5,
        layout: 'A4_portrait',
        status: 'active'
      },
      {
        id: 'template_2',
        name: '历史学科专用模板',
        description: '历史学科专用答题卡模板',
        subject: '历史',
        gradeLevel: '初中',
        examType: '期中考试',
        pageWidth: 210,
        pageHeight: 297,
        dpi: 300,
        regionCount: 6,
        createdAt: '2024-01-20',
        updatedAt: '2024-01-20',
        isActive: true,
        type: 'custom',
        questionCount: 30,
        objectiveCount: 25,
        subjectiveCount: 5,
        layout: 'A4_portrait',
        status: 'active'
      }
    ];
    setTemplates(mockTemplates);
    if (mockTemplates.length > 0) {
      setSelectedTemplate(mockTemplates[0].id);
    }
  };

  // 学生管理相关
  const handleStudentImport = (info: any) => {
    const { status, originFileObj } = info.file;
    if (status === 'done' && originFileObj) {
      handleImportStudents(originFileObj);
    } else if (status === 'error') {
      message.error(`${info.file.name} 导入失败`);
    }
  };

  const handleAddStudent = () => {
    setModalType('student');
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditStudent = (student: Student) => {
    setModalType('student');
    setEditingItem(student);
    form.setFieldsValue({
      student_id: student.student_id,
      student_name: student.student_name,
      class_name: student.class_name,
      grade: student.grade,
      school: student.school
    });
    setModalVisible(true);
  };

  // 删除学生函数将在后面定义

  // 模板管理相关
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && onConfigUpdate) {
      onConfigUpdate({
        structure: {
          ...configuration.structure,
          templateId: templateId,
          questionTypes: ['choice', 'fill_blank', 'short_answer', 'essay']
        }
      });
    }
    message.success('模板已选择');
  };

  const handleCreateTemplate = () => {
    setDesignerMode('create');
    setCurrentTemplate(null);
    setDesignerVisible(true);
  };

  const handleEditTemplate = (template: AnswerSheetTemplate) => {
    setDesignerMode('edit');
    setCurrentTemplate(template as unknown as TemplateConfig);
    setDesignerVisible(true);
  };

  const handlePreviewTemplate = (template: AnswerSheetTemplate) => {
    setDesignerMode('preview');
    setCurrentTemplate(template as unknown as TemplateConfig);
    setDesignerVisible(true);
  };

  const handleCopyTemplate = (template: AnswerSheetTemplate) => {
    const newTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (副本)`,
      createdAt: new Date().toISOString()
    };
    setTemplates([...templates, newTemplate]);
    message.success('模板复制成功');
  };

  const handleSaveTemplate = (templateConfig: TemplateConfig) => {
    if (designerMode === 'create') {
      const newTemplate: AnswerSheetTemplate = {
        id: `template_${Date.now()}`,
        name: templateConfig.name || '新模板',
        type: 'custom',
        questionCount: templateConfig.regions?.length || 0,
        objectiveCount: templateConfig.regions?.filter(r => r.type === 'question' && r.subType === 'choice').length || 0,
        subjectiveCount: templateConfig.regions?.filter(r => r.type === 'question' && r.subType !== 'choice').length || 0,
        layout: 'A4_portrait',
        regionCount: templateConfig.regions?.length || 0,
        subject: templateConfig.subject,
        description: templateConfig.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pageWidth: templateConfig.pageWidth,
        pageHeight: templateConfig.pageHeight,
        dpi: templateConfig.dpi,
        isActive: true,
        status: 'active'
      };
      setTemplates([...templates, newTemplate]);
      message.success('模板创建成功');
    } else if (designerMode === 'edit' && currentTemplate) {
      const updatedTemplates = templates.map(t => 
        t.id === currentTemplate.id ? {
          ...t,
          name: templateConfig.name || t.name,
          questionCount: templateConfig.regions?.length || 0,
          objectiveCount: templateConfig.regions?.filter(r => r.type === 'question' && r.subType === 'choice').length || 0,
          subjectiveCount: templateConfig.regions?.filter(r => r.type === 'question' && r.subType !== 'choice').length || 0,
          regionCount: templateConfig.regions?.length || 0,
          subject: templateConfig.subject,
          description: templateConfig.description,
          updatedAt: new Date().toISOString(),
          pageWidth: templateConfig.pageWidth,
          pageHeight: templateConfig.pageHeight,
          dpi: templateConfig.dpi
        } : t
      );
      setTemplates(updatedTemplates);
      message.success('模板更新成功');
    }
    setDesignerVisible(false);
  };

  const handleGenerateAnswerSheets = () => {
    if (!selectedTemplate) {
      message.warning('请先选择答题卡模板');
      return;
    }

    Modal.confirm({
      title: '生成答题卡',
      content: `将为 ${students.length} 名学生生成答题卡，每张答题卡都包含唯一的二维码。确定继续吗？`,
      onOk: async () => {
        setLoading(true);
        // 模拟生成过程
        setTimeout(() => {
          setLoading(false);
          message.success('答题卡生成完成，可在下载中心获取PDF文件');
        }, 2000);
      }
    });
  };

  // 检查准备工作完成状态
  const getPreparationStatus = () => {
    const hasStudents = students.length > 0;
    const hasTemplate = selectedTemplate !== null;
    const normalStudents = students.filter(s => s.is_active).length;
    
    return {
      hasStudents,
      hasTemplate,
      normalStudents,
      isComplete: hasStudents && hasTemplate && normalStudents > 0,
      completionRate: Math.round(((hasStudents ? 50 : 0) + (hasTemplate ? 50 : 0)) / 100 * 100)
    };
  };

  // 完成准备工作
  const handleCompletePreparation = () => {
    const status = getPreparationStatus();
    
    if (!status.hasStudents) {
      message.warning('请先导入学生信息');
      return;
    }

    if (!status.hasTemplate) {
      message.warning('请选择答题卡模板');
      return;
    }

    if (status.normalStudents === 0) {
      message.warning('没有正常状态的学生，请检查学生信息');
      return;
    }

    Modal.confirm({
      title: '完成考前准备',
      content: (
        <div>
          <p>确认完成考前准备工作？完成后将进入答题卡上传阶段。</p>
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <div>✓ 学生信息：{students.length} 人（正常：{status.normalStudents} 人）</div>
            <div>✓ 答题卡模板：{templates.find(t => t.id === selectedTemplate)?.name}</div>
          </div>
        </div>
      ),
      onOk: () => {
        // 更新配置信息
        if (onConfigUpdate) {
          onConfigUpdate({
            studentInfo: {
              totalStudents: students.length,
              importedStudents: status.normalStudents,
              validStudents: status.normalStudents
            },
            structure: {
              ...configuration.structure,
              templateId: selectedTemplate!,
              questionTypes: ['choice', 'fill_blank', 'short_answer', 'essay']
            }
          });
        }
        
        message.success('考前准备已完成，配置信息已保存');
        onComplete?.();
      }
    });
  };

  // 保存学生/模板信息
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalType === 'student') {
        if (editingItem) {
          // 编辑学生
          const response = await studentApi.updateStudent(exam.id, (editingItem as Student).uuid, values);
          if (response.success) {
            loadStudents();
            message.success('学生信息更新成功');
          }
        } else {
          // 添加学生
          const response = await studentApi.createStudent(exam.id, values);
          if (response.success) {
            loadStudents();
            message.success('学生添加成功');
          }
        }
      }
      
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 学生表格列定义
  const studentColumns = [
    {
      title: '学号',
      dataIndex: 'student_id',
      key: 'student_id',
      width: 120
    },
    {
      title: '姓名',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 100
    },
    {
      title: '班级',
      dataIndex: 'class_name',
      key: 'class_name',
      width: 120
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '正常' : '禁用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Student) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditStudent(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个学生吗？"
            onConfirm={() => handleDeleteStudent(record.uuid)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 统计数据
  const studentStats = {
    total: students.length,
    normal: students.filter(s => s.is_active).length,
    absent: students.filter(s => !s.is_active).length,
    invalid: 0
  };

  // 删除学生
  const handleDeleteStudent = async (studentUuid: string) => {
    try {
      const response = await studentApi.deleteStudent(exam.id, studentUuid);
      if (response.success) {
        loadStudents();
        fetchStatistics();
        message.success('学生删除成功');
      }
    } catch (error) {
      console.error('删除学生失败:', error);
      message.error('删除学生失败');
    }
  };

  // 批量导入学生
  const handleImportStudents = async (file: File) => {
    setLoading(true);
    try {
      const response = await studentApi.batchImportStudents(exam.id, file);
      if (response.success) {
        loadStudents();
        fetchStatistics();
        message.success(`导入完成! 成功: ${response.data?.success_count}, 失败: ${response.data?.failed_count}`);
      }
    } catch (error) {
      console.error('导入学生失败:', error);
      message.error('导入学生失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取班级列表
  const getClassList = () => {
    const classes = [...new Set(students.map(s => s.class_name))];
    return classes.filter(Boolean);
  };

  return (
    <div className="preparation-stage">


      {/* 主要内容 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'students',
              label: (
                <span>
                  <TeamOutlined />
                  学生信息管理
                  {studentStats.total > 0 && <Tag className="ml-2">{studentStats.total}</Tag>}
                </span>
              ),
              children: (
                <div className="student-management">
                  {/* 操作工具栏 */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Dragger
                        name="file"
                        multiple={false}
                        accept=".xlsx,.xls,.csv"
                        showUploadList={false}
                        onChange={handleStudentImport}
                        className="upload-dragger-inline"
                        style={{ width: 200, height: 40 }}
                      >
                        <Button icon={<UploadOutlined />}>
                          导入Excel
                        </Button>
                      </Dragger>
                      
                      <Button 
                        icon={<PlusOutlined />} 
                        onClick={handleAddStudent}
                      >
                        添加学生
                      </Button>
                      
                      <Button 
                        icon={<DownloadOutlined />}
                        onClick={() => message.info('导出功能开发中')}
                      >
                        导出模板
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        总计: {studentStats.total} 人 | 
                        正常: {studentStats.normal} 人 | 
                        缺考: {studentStats.absent} 人
                      </span>
                    </div>
                  </div>

                  {/* 学生列表 */}
                  <Table
                    columns={studentColumns}
                    dataSource={students}
                    rowKey="uuid"
                    loading={loading}
                    pagination={{
                      total: students.length,
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条记录`
                    }}
                    scroll={{ x: 600 }}
                  />
                </div>
              )
            },
            {
              key: 'templates',
              label: (
                <span>
                  <BarcodeOutlined />
                  答题卡模板
                  {selectedTemplate && <Tag color="green" className="ml-2">已选择</Tag>}
                </span>
              ),
              children: (
                <div className="template-management">
                  {/* 模板管理工具栏 */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button 
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreateTemplate}
                      >
                        模板设计器
                      </Button>
                      <Button 
                        icon={<SettingOutlined />}
                        onClick={() => {
                          // 打开模板管理页面
                          window.open('/template-management', '_blank');
                        }}
                      >
                        管理模板
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <Search
                        placeholder="搜索模板"
                        style={{ width: 200 }}
                        onSearch={(value) => console.log('搜索:', value)}
                      />
                      <span className="text-sm text-gray-600">
                        共 {templates.length} 个模板
                      </span>
                    </div>
                  </div>

                  {/* 模板列表 */}
                  <Row gutter={[16, 16]} className="mb-6">
                    {templates.map(template => (
                      <Col xs={24} sm={12} lg={8} key={template.id}>
                        <Card
                          hoverable
                          className={`template-card ${selectedTemplate === template.id ? 'border-primary' : ''}`}
                          onClick={() => handleSelectTemplate(template.id)}
                          actions={[
                            <Tooltip title="预览模板">
                              <Button 
                                type="text" 
                                icon={<EyeOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewTemplate(template);
                                }}
                              />
                            </Tooltip>,
                            <Tooltip title="编辑模板">
                              <Button 
                                type="text" 
                                icon={<EditOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTemplate(template);
                                }}
                              />
                            </Tooltip>,
                            <Tooltip title="复制模板">
                              <Button 
                                type="text" 
                                icon={<CopyOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyTemplate(template);
                                }}
                              />
                            </Tooltip>
                          ]}
                        >
                          <div className="mb-3">
                            <h4 className="mb-1">{template.name}</h4>
                            <div className="flex items-center gap-2 mb-2">
                              <Tag color={template.type === 'standard' ? 'blue' : 'purple'}>
                                {template.type === 'standard' ? '标准模板' : '自定义'}
                              </Tag>
                              {template.subject && (
                                <Tag color="green">{template.subject}</Tag>
                              )}
                            </div>
                            {template.description && (
                              <Text type="secondary" className="text-xs">
                                {template.description}
                              </Text>
                            )}
                          </div>
                          
                          <div className="template-info text-sm text-gray-600">
                            <div>题目总数: {template.questionCount}</div>
                            <div>客观题: {template.objectiveCount}</div>
                            <div>主观题: {template.subjectiveCount}</div>
                            <div>布局: {template.layout}</div>
                            <div>区域数: {template.regionCount}</div>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  {/* 答题卡生成 */}
                  {selectedTemplate && (
                    <Card 
                      title="答题卡生成"
                      extra={
                        <Button 
                          type="primary"
                          icon={<BarcodeOutlined />}
                          onClick={handleGenerateAnswerSheets}
                          loading={loading}
                        >
                          生成答题卡
                        </Button>
                      }
                    >
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <div><strong>选中模板:</strong> {templates.find(t => t.id === selectedTemplate)?.name}</div>
                            <div><strong>学生数量:</strong> {studentStats.total} 人</div>
                            <div><strong>生成方式:</strong> 带唯一二维码的PDF文件</div>
                          </div>
                        </Col>

                      </Row>
                    </Card>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* 添加/编辑学生模态框 */}
      <Modal
        title={editingItem ? '编辑学生信息' : '添加学生'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'normal' }}
        >
          <Form.Item
            name="student_id"
            label="学号"
            rules={[{ required: true, message: '请输入学号' }]}
          >
            <Input placeholder="请输入学号" />
          </Form.Item>
          
          <Form.Item
            name="student_name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          
          <Form.Item
            name="class_name"
            label="班级"
            rules={[{ required: true, message: '请输入班级' }]}
          >
            <Input placeholder="请输入班级" />
          </Form.Item>
          
          <Form.Item
            name="grade"
            label="年级"
          >
            <Input placeholder="请输入年级（可选）" />
          </Form.Item>
          
          <Form.Item
            name="school"
            label="学校"
          >
            <Input placeholder="请输入学校（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 使用新的优化答题卡模板设计器 */}
      <OptimizedAnswerSheetDesigner
        visible={designerVisible}
        mode={designerMode === 'preview' ? 'edit' : designerMode}
        initialTemplate={currentTemplate || undefined}
        onSave={handleSaveTemplate}
        onCancel={() => setDesignerVisible(false)}
      />
    </div>
  );
};

export default PreparationStage;