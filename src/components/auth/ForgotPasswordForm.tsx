import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Steps } from 'antd';
import { MailOutlined, LockOutlined, SafetyCertificateOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { authApi } from '../../services/api';
import { cn } from '../../utils/cn';

const { Title, Text, Link } = Typography;
const { Step } = Steps;

interface ForgotPasswordFormProps {
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

interface ResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSwitchToLogin,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 倒计时效果
  React.useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async (values: { email: string }) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await authApi.requestPasswordReset(values.email);
      
      if (response.success) {
        setEmail(values.email);
        setCurrentStep(1);
        setCountdown(60); // 60秒倒计时
      } else {
        setError(response.message || '发送验证码失败，请重试');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '发送验证码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values: Omit<ResetPasswordData, 'email'>) => {
    try {
      setLoading(true);
      setError('');
      
      const { confirmPassword, ...resetData } = values;
      
      const response = await authApi.confirmPasswordReset({
        email,
        ...resetData
      });
      
      if (response.success) {
        setSuccess(true);
        form.resetFields();
        
        // 延迟执行成功回调
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError(response.message || '重置密码失败，请重试');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '重置密码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await authApi.requestPasswordReset(email);
      
      if (response.success) {
        setCountdown(60);
      } else {
        setError(response.message || '重发验证码失败，请重试');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '重发验证码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入新密码'));
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
      return Promise.reject(new Error('请确认新密码'));
    }
    if (value !== form.getFieldValue('newPassword')) {
      return Promise.reject(new Error('两次输入的密码不一致'));
    }
    return Promise.resolve();
  };

  if (success) {
    return (
      <Card 
        className={cn(
          'w-full max-w-md mx-auto',
          'shadow-lg border-0',
          'bg-white/95 backdrop-blur-sm'
        )}
        styles={{ body: { padding: '2rem' } }}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Title level={3} className="!mb-2 !text-green-600">
            密码重置成功！
          </Title>
          <Text type="secondary" className="text-base mb-6 block">
            您的密码已成功重置，请使用新密码登录
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
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'w-full max-w-md mx-auto',
        'shadow-lg border-0',
        'bg-white/95 backdrop-blur-sm'
      )}
      styles={{ body: { padding: '2rem' } }}
    >
      <div className="text-center mb-6">
        <Title level={2} className="!mb-2 !text-gray-800">
          重置密码
        </Title>
        <Text type="secondary" className="text-base">
          {currentStep === 0 ? '输入邮箱地址获取验证码' : '输入验证码和新密码'}
        </Text>
      </div>

      <Steps current={currentStep} className="mb-6">
        <Step 
          title="验证邮箱" 
          icon={<MailOutlined />}
        />
        <Step 
          title="重置密码" 
          icon={<LockOutlined />}
        />
      </Steps>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          className="mb-6"
          closable
          onClose={() => setError('')}
        />
      )}

      {currentStep === 0 ? (
        <Form
          form={form}
          name="sendCode"
          onFinish={handleSendCode}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
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
              placeholder="请输入注册时使用的邮箱地址"
              className="h-11"
            />
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
              {loading ? '发送中...' : '发送验证码'}
            </Button>
          </Form.Item>

          {onSwitchToLogin && (
            <div className="text-center">
              <Text type="secondary">
                想起密码了？{' '}
                <Link 
                  onClick={onSwitchToLogin}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  返回登录
                </Link>
              </Text>
            </div>
          )}
        </Form>
      ) : (
        <Form
          form={form}
          name="resetPassword"
          onFinish={handleResetPassword}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item className="mb-4">
            <Alert
              message={`验证码已发送至 ${email}`}
              type="info"
              showIcon
              icon={<MailOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="code"
            label="验证码"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 6, message: '验证码为6位数字' }
            ]}
          >
            <div className="flex gap-2">
              <Input
                prefix={<SafetyCertificateOutlined className="text-gray-400" />}
                placeholder="请输入6位验证码"
                className="h-11 flex-1"
                maxLength={6}
              />
              <Button
                onClick={handleResendCode}
                disabled={countdown > 0}
                className="h-11 px-4"
              >
                {countdown > 0 ? `${countdown}s` : '重发'}
              </Button>
            </div>
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ validator: validatePassword }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请输入新密码"
              className="h-11"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[{ validator: validateConfirmPassword }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请再次输入新密码"
              className="h-11"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
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
              {loading ? '重置中...' : '重置密码'}
            </Button>
          </Form.Item>

          <div className="flex justify-between text-center">
            <Link 
              onClick={() => setCurrentStep(0)}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 返回上一步
            </Link>
            {onSwitchToLogin && (
              <Link 
                onClick={onSwitchToLogin}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                返回登录
              </Link>
            )}
          </div>
        </Form>
      )}
    </Card>
  );
};