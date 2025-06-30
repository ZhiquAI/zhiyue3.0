import React, { useState } from 'react';
import { Modal, Steps, Form, Input, Select, Upload, Button, message } from 'antd';
import { FileImageOutlined, FileDoneOutlined, InboxOutlined } from '@ant-design/icons';
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

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newExam: Exam = {
        id: Date.now().toString(),
        name: values.name,
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

      addExam(newExam);
      setLoading(false);
      message.success('考试创建成功，AI正在后台处理！');
      
      // Reset form and close modal
      form.resetFields();
      setCurrentStep(0);
      onClose();
    } catch (err) {
      setLoading(false);
      console.log('Validate Failed:', err);
    }
  };

  const steps = [
    {
      title: '基本信息',
      content: (
        <Form form={form} layout="vertical" name="exam_form">
          <Form.Item
            name="name"
            label="考试名称"
            rules={[{ required: true, message: '请输入考试名称' }]}
          >
            <Input placeholder="例如：初二期中历史考试" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="科目"
            rules={[{ required: true, message: '请选择科目' }]}
          >
            <Select placeholder="请选择科目">
              <Select.Option value="历史">历史</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="grade"
            label="年级"
            rules={[{ required: true, message: '请选择年级' }]}
          >
            <Select placeholder="请选择年级">
              <Select.Option value="初一">初一</Select.Option>
              <Select.Option value="初二">初二</Select.Option>
              <Select.Option value="初三">初三</Select.Option>
              <Select.Option value="高一">高一</Select.Option>
              <Select.Option value="高二">高二</Select.Option>
              <Select.Option value="高三">高三</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      )
    },
    {
      title: '上传试卷',
      content: (
        <Upload.Dragger
          name="paper"
          multiple={false}
          beforeUpload={() => false}
          accept=".pdf,.jpg,.jpeg,.png"
        >
          <p className="ant-upload-drag-icon">
            <FileImageOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽试卷原件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 PDF、JPG、PNG 格式，文件大小不超过 10MB
          </p>
        </Upload.Dragger>
      )
    },
    {
      title: '上传答案',
      content: (
        <Upload.Dragger
          name="answer"
          multiple={false}
          beforeUpload={() => false}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        >
          <p className="ant-upload-drag-icon">
            <FileDoneOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽参考答案到此区域上传</p>
          <p className="ant-upload-hint">
            可选项，支持多种文档格式。上传后AI将自动分析生成评分标准
          </p>
        </Upload.Dragger>
      )
    }
  ];

  return (
    <Modal
      title="创建新考试"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Steps current={currentStep} className="mb-6">
        <Steps.Step title="基本信息" />
        <Steps.Step title="上传试卷" />
        <Steps.Step title="上传答案" />
      </Steps>

      <div className="mb-6">
        {steps[currentStep].content}
      </div>

      <div className="flex justify-end gap-2">
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep(currentStep - 1)}>
            上一步
          </Button>
        )}
        {currentStep < steps.length - 1 && (
          <Button
            type="primary"
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            下一步
          </Button>
        )}
        {currentStep === steps.length - 1 && (
          <Button
            type="primary"
            loading={loading}
            onClick={handleCreate}
          >
            完成并创建
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default CreateExamModal;