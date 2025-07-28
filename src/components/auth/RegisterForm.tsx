import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Select, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BookOutlined, BankOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { authApi } from '../../services/api';
import { cn } from '../../utils/cn';

const { Title, Text, Link } = Typography;
const { Option } = Select;

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  school?: string;
  subject?: string;
  grades?: string[];
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSwitchToLogin,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // 学科选项
  const subjects = [
    { value: 'history', label: '历史' },
    { value: 'chinese', label: '语文' },
    { value: 'math', label: '数学' },
    { value: 'english', label: '英语' },
    { value: 'physics', label: '物理' },
    { value: 'chemistry', label: '化学' },
    { value: 'biology', label: '生物' },
    { value: 'geography', label: '地理' },
    { value: 'politics', label: '政治' }
  ];

  // 年级选项
  const grades = [
    { value: 'grade7', label: '七年级' },
    { value: 'grade8', label: '八年级' },
    { value: 'grade9', label: '九年级' },
    { value: 'high1', label: '高一' },
    { value: 'high2', label: '高二' },
    { value: 'high3', label: '高三' }
  ];

  const handleSubmit = async (values: RegisterFormData) => {
    try {
      setLoading(true);
      setError('');
      
      const { confirmPassword, ...registerData } = values;
      
      const response = await authApi.register(registerData);
      
      if (response.success) {
        setSuccess(true);
        form.resetFields();
        
        // 延迟执行成功回调
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError(response.message || '注册失败，请重试');
      }
    } catch (err: any) {
      console.error('注册错误:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('注册失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入密码'));
    }
    if (value.length < 6) {
      return Promise.reject(new Error('密码至少6个字符'));
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      return Promise.reject(new Error('密码必须包含大小写字母和数字'));
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请确认密码'));
    }
    if (value !== form.getFieldValue('password')) {
      return Promise.reject(new Error('两次输入的密码不一致'));
    }
    return Promise.resolve();
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <Title level={3} className="!mb-2 !text-green-600">
          注册成功！
        </Title>
        <Text type="secondary" className="text-base mb-6 block">
          欢迎加入智阅AI，您的账户已创建成功
        </Text>
        {onSwitchToLogin && (
          <Button 
            type="primary" 
            onClick={onSwitchToLogin}
            className="w-full h-12"
          >
            前往登录
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <Title level={3} className="!mb-2 !text-gray-800">
          创建账户
        </Title>
        <Text type="secondary" className="text-base">
          加入智阅AI，开启智能阅卷之旅
        </Text>
      </div>

      {error && (
        <div className="mb-6">
          <Alert
            message={error}
            type="error"
            showIcon
            className="mb-3"
            closable
            onClose={() => setError('')}
          />
          <Alert
            message="遇到网络问题？"
            description={
              <div>
                <Text type="secondary" className="text-sm">
                  如果持续遇到网络错误，您可以：
                </Text>
                <div className="mt-2 space-y-1">
                  <div className="text-sm">
                    • <Link href="/debug" target="_blank" className="text-blue-600">运行网络诊断工具</Link>
                  </div>
                  <div className="text-sm">
                    • 使用测试账户：<Text code>demo</Text> / <Text code>Demo123456</Text>
                  </div>
                </div>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      )}

      <Form
        form={form}
        name="register"
        onFinish={handleSubmit}
        autoComplete="off"
        size="large"
        layout="vertical"
        scrollToFirstError
      >
        <Form.Item
          name="name"
          label="真实姓名"
          rules={[
            { required: true, message: '请输入真实姓名' },
            { min: 2, message: '姓名至少2个字符' }
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="请输入真实姓名"
            className="h-11"
          />
        </Form.Item>

        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="请输入用户名"
            className="h-11"
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱地址"
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            placeholder="请输入邮箱地址"
            className="h-11"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[{ validator: validatePassword }]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="请输入密码"
            className="h-11"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认密码"
          rules={[{ validator: validateConfirmPassword }]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="请再次输入密码"
            className="h-11"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Divider className="!my-4">
          <Text type="secondary" className="text-sm">可选信息</Text>
        </Divider>

        <Form.Item
          name="school"
          label="学校名称"
        >
          <Input
            prefix={<BankOutlined className="text-gray-400" />}
            placeholder="请输入学校名称（可选）"
            className="h-11"
          />
        </Form.Item>

        <Form.Item
          name="subject"
          label="任教学科"
        >
          <Select
            placeholder="请选择任教学科（可选）"
            className="h-11"
            suffixIcon={<BookOutlined className="text-gray-400" />}
          >
            {subjects.map(subject => (
              <Option key={subject.value} value={subject.value}>
                {subject.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="grades"
          label="任教年级"
        >
          <Select
            mode="multiple"
            placeholder="请选择任教年级（可选）"
            className="min-h-11"
          >
            {grades.map(grade => (
              <Option key={grade.value} value={grade.value}>
                {grade.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item className="!mb-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className={cn(
              'w-full h-12 text-base font-medium',
              'bg-primary-600 hover:bg-primary-700',
              'border-primary-600 hover:border-primary-700',
              'shadow-sm hover:shadow-md transition-all duration-200'
            )}
          >
            {loading ? '注册中...' : '创建账户'}
          </Button>
        </Form.Item>

        <div className="text-center space-y-3">
          {onSwitchToLogin && (
            <div>
              <Text type="secondary">
                已有账户？{' '}
                <Link 
                  onClick={onSwitchToLogin}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  立即登录
                </Link>
              </Text>
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-100">
            <Text type="secondary" className="text-xs">
              测试账户：<Text code className="text-xs">demo</Text> / <Text code className="text-xs">Demo123456</Text>
            </Text>
            <div className="mt-1">
              <Link href="/debug" target="_blank" className="text-xs text-blue-600">
                网络诊断工具
              </Link>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
};