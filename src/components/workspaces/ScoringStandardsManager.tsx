import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Alert, Tag, message, Upload, Progress, Spin, Modal, Form, Select, Switch, Slider, InputNumber, Table, Space, Divider, Input, Tooltip } from 'antd';
import { CheckCircleOutlined, UploadOutlined, RobotOutlined, FileTextOutlined, SettingOutlined, EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { 
  uploadPaperFile, 
  uploadAnswerFile, 
  generateScoringStandards, 
  saveScoringStandards,
  validateUploadFile,
  type Question as ApiQuestion,
  type UploadedFile as ApiUploadedFile
} from '../../services/scoringStandardsApi';

// 使用API中定义的类型
type UploadedFile = ApiUploadedFile;
type Question = ApiQuestion;

interface ScoringCriterion {
  id: string;
  description: string;
  score: number;
  isRequired: boolean;
}

interface ScoringStandardsManagerProps {
  visible: boolean;
  onClose: () => void;
  processedSheets?: any[];
  onComplete?: (questions: Question[]) => void;
}

const ScoringStandardsManager: React.FC<ScoringStandardsManagerProps> = ({ visible, onClose, processedSheets, onComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<{
    paper: UploadedFile | null;
    answer: UploadedFile | null;
  }>({
    paper: null,
    answer: null
  });
  
  const [processingStatus, setProcessingStatus] = useState({
    paper: 'none' as 'none' | 'uploading' | 'processing' | 'completed' | 'error',
    answer: 'none' as 'none' | 'uploading' | 'processing' | 'completed' | 'error',
    aiGeneration: 'none' as 'none' | 'processing' | 'completed' | 'error'
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 处理文件上传
  const handleFileUpload = (type: 'paper' | 'answer') => async (info: any) => {
    const { file, fileList } = info;
    
    if (file.status === 'uploading') {
      setProcessingStatus(prev => ({ ...prev, [type]: 'uploading' }));
      return;
    }
    
    if (fileList.length === 0) {
      setUploadedFiles(prev => ({ ...prev, [type]: null }));
      setProcessingStatus(prev => ({ ...prev, [type]: 'none' }));
      return;
    }

    const uploadedFile = fileList[fileList.length - 1];
    const fileObj = uploadedFile.originFileObj || uploadedFile;
    
    if (fileObj) {
      // 验证文件
      const validationError = validateUploadFile(fileObj, type);
      if (validationError) {
        message.error(validationError);
        return;
      }
      
      try {
        setProcessingStatus(prev => ({ ...prev, [type]: 'uploading' }));
        
        // 调用API上传文件
        const uploadedFileData = type === 'paper' 
          ? await uploadPaperFile(fileObj)
          : await uploadAnswerFile(fileObj);
        
        setUploadedFiles(prev => ({ ...prev, [type]: uploadedFileData }));
        setProcessingStatus(prev => ({ ...prev, [type]: 'completed' }));
        
        message.success(`${type === 'paper' ? '试卷' : '参考答案'}文件上传成功！`);
        
      } catch (error) {
        setProcessingStatus(prev => ({ ...prev, [type]: 'error' }));
        message.error(`文件处理失败: ${error}`);
      }
    }
  };

  // 删除文件
  const handleDeleteFile = (type: 'paper' | 'answer') => {
    const file = uploadedFiles[type];
    if (file?.url) {
      URL.revokeObjectURL(file.url);
    }
    setUploadedFiles(prev => ({ ...prev, [type]: null }));
    setProcessingStatus(prev => ({ ...prev, [type]: 'none' }));
    message.success(`${type === 'paper' ? '试卷' : '参考答案'}文件已删除`);
  };

  // AI生成评分标准
  const handleAIGeneration = async () => {
    if (!uploadedFiles.paper) {
      message.warning('请先上传试卷文件');
      return;
    }

    setProcessingStatus(prev => ({ ...prev, aiGeneration: 'processing' }));
    
    try {
      // 调用API生成评分标准
      const generatedQuestions = await generateScoringStandards(
        uploadedFiles.paper,
        uploadedFiles.answer || undefined
      );
      
      setQuestions(generatedQuestions);
      setProcessingStatus(prev => ({ ...prev, aiGeneration: 'completed' }));
      message.success('AI评分标准生成完成！');
      
    } catch (error) {
      setProcessingStatus(prev => ({ ...prev, aiGeneration: 'error' }));
      message.error(`AI生成失败: ${error}`);
    }
  };

  // 编辑题目
  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    form.setFieldsValue({
      number: question.number,
      type: question.type,
      content: question.content,
      totalScore: question.totalScore,
      scoringCriteria: question.scoringCriteria
    });
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      const updatedQuestion: Question = {
        ...editingQuestion!,
        ...values
      };
      
      setQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
      setEditModalVisible(false);
      setEditingQuestion(null);
      message.success('题目编辑成功');
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 删除题目
  const handleDeleteQuestion = (questionId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这道题目吗？',
      onOk: () => {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        message.success('题目删除成功');
      }
    });
  };

  // 添加新题目
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      number: (questions.length + 1).toString(),
      type: 'subjective',
      content: '',
      totalScore: 10,
      scoringCriteria: [
        { id: Date.now().toString(), description: '', score: 10, isRequired: true }
      ]
    };
    
    setEditingQuestion(newQuestion);
    form.setFieldsValue({
      number: newQuestion.number,
      type: newQuestion.type,
      content: newQuestion.content,
      totalScore: newQuestion.totalScore,
      scoringCriteria: newQuestion.scoringCriteria
    });
    setEditModalVisible(true);
  };

  // 完成配置
  const handleComplete = async () => {
    if (questions.length === 0) {
      message.warning('请先生成或添加题目');
      return;
    }
    
    try {
      // 保存评分标准到后端
      await saveScoringStandards(questions, processedSheets?.[0]?.id);
      
      onComplete?.(questions);
      onClose();
      message.success('评分标准配置完成！');
      
    } catch (error) {
      message.error(`保存失败: ${error}`);
    }
  };

  // 渲染文件上传区域
  const renderFileUploadArea = (type: 'paper' | 'answer') => {
    const file = uploadedFiles[type];
    const status = processingStatus[type];
    const title = type === 'paper' ? '试卷文件' : '参考答案';
    const description = type === 'paper' ? '上传试卷原件（PDF、JPG、PNG格式）' : '上传参考答案（可选，用于生成评分标准）';

    if (status === 'none' || !file) {
      return (
        <Card title={title} className="h-full">
          <Upload
            name="file"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleFileUpload(type)}
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full"
          >
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors cursor-pointer">
              <div className="mb-4">
                <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              </div>
              <p className="text-gray-600 mb-2 font-medium">{description}</p>
              <p className="text-xs text-gray-400 mb-3">
                支持 PDF、JPG、PNG 格式，最大 10MB
              </p>
              <Button type="primary" ghost icon={<UploadOutlined />}>
                选择文件
              </Button>
            </div>
          </Upload>
        </Card>
      );
    }

    if (status === 'uploading') {
      return (
        <Card title={title} className="h-full">
          <div className="h-full flex flex-col items-center justify-center bg-blue-50 rounded-lg">
            <Progress 
              type="circle" 
              percent={30}
              status="active"
              className="mb-4"
            />
            <p className="text-blue-600 font-medium">正在上传文件...</p>
            <p className="text-sm text-gray-500">{file.name}</p>
          </div>
        </Card>
      );
    }

    if (status === 'processing') {
      return (
        <Card title={title} className="h-full">
          <div className="h-full flex flex-col items-center justify-center bg-purple-50 rounded-lg">
            <Spin size="large" className="mb-4" />
            <p className="text-purple-600 font-medium">AI正在分析文件...</p>
            <p className="text-sm text-gray-500">{file.name}</p>
          </div>
        </Card>
      );
    }

    if (status === 'completed' && file) {
      return (
        <Card 
          title={
            <div className="flex items-center justify-between">
              <span>{title}</span>
              <Tag color="green">已上传</Tag>
            </div>
          } 
          className="h-full"
        >
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <FileTextOutlined className="text-green-600 text-xl" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 mb-1">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    大小: {(file.size / 1024 / 1024).toFixed(2)} MB | 
                    类型: {file.type}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="primary" 
                ghost 
                onClick={() => window.open(file.url, '_blank')}
                className="flex-1"
              >
                查看文件
              </Button>
              <Button 
                danger 
                onClick={() => handleDeleteFile(type)}
              >
                删除
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return null;
  };

  // 题目表格列定义
  const questionColumns = [
    {
      title: '题号',
      dataIndex: 'number',
      key: 'number',
      width: 80
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap = {
          choice: '选择题',
          subjective: '主观题',
          calculation: '计算题',
          essay: '论述题'
        };
        return <Tag color="blue">{typeMap[type as keyof typeof typeMap]}</Tag>;
      }
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <span>{content.length > 50 ? content.substring(0, 50) + '...' : content}</span>
        </Tooltip>
      )
    },
    {
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 80,
      render: (score: number) => <Tag color="orange">{score}分</Tag>
    },
    {
      title: '评分标准',
      key: 'criteria',
      width: 120,
      render: (record: Question) => (
        <span>{record.scoringCriteria.length} 条标准</span>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: Question) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEditQuestion(record)}
            size="small"
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteQuestion(record.id)}
            size="small"
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Modal
      title="设置评分标准"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      className="scoring-standards-modal"
    >
      <div className="scoring-standards-manager">
      {/* 使用说明 */}
      <Alert
        message="评分标准设置流程"
        description={
          <div className="space-y-2">
            <p><strong>第一步：</strong>上传试卷文件（必需）- 支持PDF、JPG、PNG格式</p>
            <p><strong>第二步：</strong>上传参考答案（可选）- 用于参考评分标准</p>
            <p><strong>第三步：</strong>AI自动生成评分标准，或手动添加题目</p>
            <p><strong>第四步：</strong>编辑和完善评分标准</p>
          </div>
        }
        type="info"
        showIcon
        className="mb-6"
      />

      {/* 文件上传区域 */}
      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} lg={12}>
          {renderFileUploadArea('paper')}
        </Col>
        
        <Col xs={24} lg={12}>
          {renderFileUploadArea('answer')}
        </Col>
      </Row>

      {/* AI生成区域 */}
      {processingStatus.paper === 'completed' && (
        <Card title="AI评分标准生成" className="mb-6">
          <div className="text-center">
            {processingStatus.aiGeneration === 'none' && (
              <div>
                <p className="text-gray-600 mb-4">基于上传的试卷文件，AI将自动识别题目并生成评分标准</p>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<RobotOutlined />}
                  onClick={handleAIGeneration}
                >
                  AI自动生成评分标准
                </Button>
              </div>
            )}
            
            {processingStatus.aiGeneration === 'processing' && (
              <div>
                <Spin size="large" className="mb-4" />
                <p className="text-blue-600 font-medium">AI正在分析试卷并生成评分标准...</p>
                <p className="text-sm text-gray-500 mt-2">这可能需要几分钟时间，请耐心等待</p>
              </div>
            )}
            
            {processingStatus.aiGeneration === 'completed' && (
              <Alert
                message="AI生成完成"
                description={`成功识别 ${questions.length} 道题目并生成评分标准，您可以在下方查看和编辑`}
                type="success"
                showIcon
              />
            )}
          </div>
        </Card>
      )}

      {/* 题目列表和编辑 */}
      {(questions.length > 0 || processingStatus.aiGeneration === 'completed') && (
        <Card 
          title="题目和评分标准"
          extra={
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddQuestion}
              >
                添加题目
              </Button>
              <Button 
                type="primary" 
                size="large" 
                icon={<CheckCircleOutlined />}
                onClick={handleComplete}
                disabled={questions.length === 0}
              >
                完成配置
              </Button>
            </Space>
          }
        >
          <Table
            columns={questionColumns}
            dataSource={questions}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        </Card>
      )}

      {/* 编辑题目模态框 */}
      <Modal
        title={editingQuestion?.id ? '编辑题目' : '添加题目'}
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingQuestion(null);
        }}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="题号"
                name="number"
                rules={[{ required: true, message: '请输入题号' }]}
              >
                <Input placeholder="如：1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="题型"
                name="type"
                rules={[{ required: true, message: '请选择题型' }]}
              >
                <Select>
                  <Select.Option value="choice">选择题</Select.Option>
                  <Select.Option value="subjective">主观题</Select.Option>
                  <Select.Option value="calculation">计算题</Select.Option>
                  <Select.Option value="essay">论述题</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="总分"
                name="totalScore"
                rules={[{ required: true, message: '请输入总分' }]}
              >
                <InputNumber min={1} max={100} placeholder="10" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="题目内容"
            name="content"
            rules={[{ required: true, message: '请输入题目内容' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入题目内容..." />
          </Form.Item>
          
          <Form.Item label="评分标准">
            <Form.List name="scoringCriteria">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="flex gap-2 mb-2">
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: '请输入评分描述' }]}
                        className="flex-1"
                      >
                        <Input placeholder="评分描述" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'score']}
                        rules={[{ required: true, message: '请输入分数' }]}
                        style={{ width: 100 }}
                      >
                        <InputNumber min={0} placeholder="分数" />
                      </Form.Item>
                      <Button 
                        type="link" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => remove(name)}
                      />
                    </div>
                  ))}
                  <Button 
                    type="dashed" 
                    onClick={() => add({ description: '', score: 0, isRequired: false })} 
                    block 
                    icon={<PlusOutlined />}
                  >
                    添加评分标准
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </Modal>
  );
};

export default ScoringStandardsManager;