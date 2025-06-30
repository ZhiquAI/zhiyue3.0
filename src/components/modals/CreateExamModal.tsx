import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, Card, Space } from 'antd';
import { CheckCircleOutlined, BookOutlined, ReadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam, ExamStatus } from '../../types/exam';

interface CreateExamModalProps {
  visible: boolean;
  onClose: () => void;
}

const CreateExamModal: React.FC<CreateExamModalProps> = ({ visible, onClose }) => {
  const { addExam } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 重置状态
  const resetModal = () => {
    form.resetFields();
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      // 验证表单
      const values = await form.validateFields();
      
      if (!values.name?.trim()) {
        message.error('考试名称不能为空');
        return;
      }
      
      setLoading(true);
      
      // 模拟创建过程
      message.loading('正在创建考试...', 0);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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

      addExam(newExam);
      
      message.destroy();
      message.success('考试创建成功！请前往配置试卷。');
      
      // 重置并关闭
      resetModal();
      onClose();
      
    } catch (error) {
      setLoading(false);
      message.destroy();
      console.error('Create exam error:', error);
      if (error.errorFields) {
        message.error('请完善必填信息');
      } else {
        message.error('创建考试失败，请重试');
      }
    }
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
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <FileTextOutlined className="text-white text-lg" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-0">创建新考试</h3>
            <p className="text-sm text-gray-500 mb-0">填写基本信息，稍后可在配置页面上传试卷</p>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
      className="create-exam-modal"
    >
      <div className="py-6">
        <Form 
          form={form} 
          layout="vertical" 
          name="exam_form"
          size="large"
        >
          <Form.Item
            name="name"
            label={
              <div className="flex items-center gap-2">
                <BookOutlined className="text-blue-500" />
                <span className="font-medium">考试名称</span>
              </div>
            }
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
              className="rounded-lg"
            />
          </Form.Item>
          
          <div className="grid grid-cols-2 gap-6">
            <Form.Item
              name="subject"
              label={
                <div className="flex items-center gap-2">
                  <BookOutlined className="text-green-500" />
                  <span className="font-medium">科目</span>
                </div>
              }
              rules={[{ required: true, message: '请选择科目' }]}
            >
              <Select placeholder="请选择科目" className="rounded-lg">
                <Select.Option value="历史">
                  <div className="flex items-center gap-2">
                    <span>📚</span>
                    <span>历史</span>
                  </div>
                </Select.Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="grade"
              label={
                <div className="flex items-center gap-2">
                  <ReadOutlined className="text-purple-500" />
                  <span className="font-medium">年级</span>
                </div>
              }
              rules={[{ required: true, message: '请选择年级' }]}
            >
              <Select placeholder="请选择年级" className="rounded-lg">
                <Select.Option value="初一">
                  <div className="flex items-center gap-2">
                    <span>🎓</span>
                    <span>初一</span>
                  </div>
                </Select.Option>
                <Select.Option value="初二">
                  <div className="flex items-center gap-2">
                    <span>🎓</span>
                    <span>初二</span>
                  </div>
                </Select.Option>
                <Select.Option value="初三">
                  <div className="flex items-center gap-2">
                    <span>🎓</span>
                    <span>初三</span>
                  </div>
                </Select.Option>
                <Select.Option value="高一">
                  <div className="flex items-center gap-2">
                    <span>🎓</span>
                    <span>高一</span>
                  </div>
                </Select.Option>
                <Select.Option value="高二">
                  <div className="flex items-center gap-2">
                    <span>🎓</span>
                    <span>高二</span>
                  </div>
                </Select.Option>
                <Select.Option value="高三">
                  <div className="flex items-center gap-2">
                    <span>🎓</span>
                    <span>高三</span>
                  </div>
                </Select.Option>
              </Select>
            </Form.Item>
          </div>
        </Form>

        {/* 后续步骤说明 */}
        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="text-center">
            <h4 className="font-semibold text-gray-800 mb-3">📋 创建后的下一步</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <p className="font-medium text-gray-700">上传试卷</p>
                <p className="text-gray-500 text-xs">PDF或图片格式</p>
              </div>
              <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <p className="font-medium text-gray-700">AI智能分析</p>
                <p className="text-gray-500 text-xs">自动识别题目</p>
              </div>
              <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <p className="font-medium text-gray-700">配置评分</p>
                <p className="text-gray-500 text-xs">设置评分标准</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button size="large" onClick={onClose}>
          取消
        </Button>
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleCreate}
          icon={<CheckCircleOutlined />}
          className="bg-gradient-to-r from-blue-500 to-purple-600 border-0"
        >
          创建考试
        </Button>
      </div>
    </Modal>
  );
};

export default CreateExamModal;