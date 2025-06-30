import React, { useState, useEffect } from 'react';
import { Modal, Steps, Form, Input, Select, Upload, Button, message, Progress } from 'antd';
import { FileImageOutlined, FileDoneOutlined, InboxOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam, ExamStatus } from '../../types/exam';

interface CreateExamModalProps {
  visible: boolean;
  onClose: () => void;
}

const CreateExamModal: React.FC<CreateExamModalProps> = ({ visible, onClose }) => {
  const { addExam } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [uploadedFiles, setUploadedFiles] = useState({
    paper: null as any,
    answer: null as any
  });
  const [formValues, setFormValues] = useState({
    name: '',
    subject: '',
    grade: ''
  });

  // 监听表单值变化
  const handleFormChange = () => {
    const values = form.getFieldsValue(['name', 'subject', 'grade']);
    setFormValues(values);
  };

  // 重置状态
  const resetModal = () => {
    form.resetFields();
    setCurrentStep(0);
    setUploadedFiles({ paper: null, answer: null });
    setFormValues({ name: '', subject: '', grade: '' });
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      
      // 获取所有表单数据
      const values = form.getFieldsValue();
      console.log('Form values:', values);
      
      // 验证基本信息字段
      if (!values.name?.trim() || !values.subject || !values.grade) {
        message.error('请确保基本信息已完整填写');
        setLoading(false);
        return;
      }
      
      // 验证试卷上传
      if (!uploadedFiles.paper) {
        message.error('请上传试卷文件');
        setLoading(false);
        return;
      }
      
      // 模拟文件上传和处理
      message.loading('正在上传文件并创建考试...', 0);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newExam: Exam = {
        id: Date.now().toString(),
        name: values.name.trim(),
        subject: values.subject,
        grade: values.grade,
        status: '待配置' as ExamStatus,
        createdAt: new Date().toISOString().split('T')[0],
        tasks: { 
          total: 0, 
          completed: 0, 
          hasError: false 
        },
        avgScore: null
      };

      console.log('Creating exam with data:', newExam);
      
      addExam(newExam);
      
      message.destroy();
      message.success('考试创建成功！AI正在后台分析试卷内容...');
      
      // 重置表单和状态
      resetModal();
      onClose();
      
    } catch (err) {
      setLoading(false);
      message.destroy();
      console.error('Create exam error:', err);
      message.error('创建考试失败，请重试');
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // 验证基本信息
        await form.validateFields(['name', 'subject', 'grade']);
        const values = form.getFieldsValue(['name', 'subject', 'grade']);
        if (!values.name?.trim()) {
          message.error('请输入考试名称');
          return;
        }
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // 验证试卷上传
        if (!uploadedFiles.paper) {
          message.error('请先上传试卷文件');
          return;
        }
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleFileChange = (type: 'paper' | 'answer') => (info: any) => {
    const { fileList } = info;
    if (fileList.length > 0) {
      const file = fileList[fileList.length - 1];
      setUploadedFiles(prev => ({
        ...prev,
        [type]: file
      }));
      message.success(`${type === 'paper' ? '试卷' : '答案'}文件上传成功`);
    } else {
      setUploadedFiles(prev => ({
        ...prev,
        [type]: null
      }));
    }
  };

  const steps = [
    {
      title: '基本信息',
      icon: <CheckCircleOutlined />,
      content: (
        <div className="py-6">
          <Form 
            form={form} 
            layout="vertical" 
            name="exam_form"
            onValuesChange={handleFormChange}
            initialValues={{
              name: '',
              subject: '',
              grade: ''
            }}
          >
            <Form.Item
              name="name"
              label="考试名称"
              rules={[
                { required: true, message: '请输入考试名称' },
                { min: 2, message: '考试名称至少2个字符' },
                { max: 50, message: '考试名称不能超过50个字符' },
                { 
                  validator: (_, value) => {
                    if (value && value.trim().length === 0) {
                      return Promise.reject(new Error('考试名称不能为空'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input 
                placeholder="例如：2024-2025学年第二学期八年级历史期末考试" 
                showCount
                maxLength={50}
                size="large"
              />
            </Form.Item>
            
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="subject"
                label="科目"
                rules={[{ required: true, message: '请选择科目' }]}
              >
                <Select placeholder="请选择科目" size="large">
                  <Select.Option value="历史">历史</Select.Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="grade"
                label="年级"
                rules={[{ required: true, message: '请选择年级' }]}
              >
                <Select placeholder="请选择年级" size="large">
                  <Select.Option value="初一">初一</Select.Option>
                  <Select.Option value="初二">初二</Select.Option>
                  <Select.Option value="初三">初三</Select.Option>
                  <Select.Option value="高一">高一</Select.Option>
                  <Select.Option value="高二">高二</Select.Option>
                  <Select.Option value="高三">高三</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </Form>
        </div>
      )
    },
    {
      title: '上传试卷',
      icon: <FileImageOutlined />,
      content: (
        <div className="py-6">
          <Upload.Dragger
            name="paper"
            multiple={false}
            beforeUpload={() => false}
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange('paper')}
            fileList={uploadedFiles.paper ? [uploadedFiles.paper] : []}
            className="mb-4"
          >
            <p className="ant-upload-drag-icon">
              <FileImageOutlined style={{ fontSize: '48px', color: '#1677ff' }} />
            </p>
            <p className="ant-upload-text text-lg font-medium">
              点击或拖拽试卷原件到此区域上传
            </p>
            <p className="ant-upload-hint text-gray-500">
              支持 PDF、JPG、PNG 格式，文件大小不超过 10MB
            </p>
          </Upload.Dragger>
          
          {uploadedFiles.paper && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircleOutlined />
                <span className="font-medium">试卷文件已上传</span>
              </div>
              <p className="text-sm text-green-600 mt-1 mb-0">
                文件名: {uploadedFiles.paper.name}
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      title: '上传答案',
      icon: <FileDoneOutlined />,
      content: (
        <div className="py-6">
          <Upload.Dragger
            name="answer"
            multiple={false}
            beforeUpload={() => false}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileChange('answer')}
            fileList={uploadedFiles.answer ? [uploadedFiles.answer] : []}
            className="mb-4"
          >
            <p className="ant-upload-drag-icon">
              <FileDoneOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
            </p>
            <p className="ant-upload-text text-lg font-medium">
              点击或拖拽参考答案到此区域上传
            </p>
            <p className="ant-upload-hint text-gray-500">
              可选项，支持多种文档格式。上传后AI将自动分析生成评分标准
            </p>
          </Upload.Dragger>
          
          {uploadedFiles.answer && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <CheckCircleOutlined />
                <span className="font-medium">参考答案已上传</span>
              </div>
              <p className="text-sm text-blue-600 mt-1 mb-0">
                文件名: {uploadedFiles.answer.name}
              </p>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">创建完成后系统将：</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 自动识别试卷中的题目和分值</li>
              <li>• 基于参考答案生成智能评分标准</li>
              <li>• 为主观题配置多维度评分规则</li>
              <li>• 准备就绪后通知您开始阅卷</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  // 检查是否可以进行下一步
  const canProceed = () => {
    if (currentStep === 0) {
      // 检查基本信息是否完整
      return formValues.name?.trim() && formValues.subject && formValues.grade;
    } else if (currentStep === 1) {
      // 检查试卷是否已上传
      return uploadedFiles.paper;
    }
    return true;
  };

  // 当模态框关闭时重置状态
  useEffect(() => {
    if (!visible) {
      resetModal();
    }
  }, [visible]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileImageOutlined className="text-blue-600" />
          </div>
          <span className="text-lg font-semibold">创建新考试</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
      className="create-exam-modal"
    >
      <div className="mb-8">
        <Steps 
          current={currentStep} 
          size="small"
          items={steps.map((step, index) => ({
            title: step.title,
            icon: index < currentStep ? <CheckCircleOutlined /> : step.icon,
            status: index < currentStep ? 'finish' : index === currentStep ? 'process' : 'wait'
          }))}
        />
      </div>

      <div className="min-h-[400px]">
        {steps[currentStep].content}
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          步骤 {currentStep + 1} / {steps.length}
          {currentStep === 0 && (
            <span className="ml-2 text-xs">
              ({formValues.name?.trim() ? '✓' : '✗'} 名称 
              {formValues.subject ? ' ✓' : ' ✗'} 科目 
              {formValues.grade ? ' ✓' : ' ✗'} 年级)
            </span>
          )}
        </div>
        
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button size="large" onClick={handlePrev}>
              上一步
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              size="large"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              下一步
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleCreate}
              icon={<CheckCircleOutlined />}
            >
              完成并创建
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CreateExamModal;