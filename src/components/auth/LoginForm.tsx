import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

const { Title, Text, Link } = Typography;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  onSwitchToForgot?: () => void;
  onSuccess?: () => void;
}

interface LoginFormData {
  username: string;
  password: string;
  remember: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSwitchToRegister, 
  onSwitchToForgot,
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const { login, loading } = useAuth();
  const [error, setError] = useState<string>('');

  const handleSubmit = async (values: LoginFormData) => {
    try {
      setError('');
      await login(values.username, values.password);
      
      // 记住登录状态
      if (values.remember) {
        localStorage.setItem('remember_login', 'true');
      } else {
        localStorage.removeItem('remember_login');
      }
      
      // 调用成功回调
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <Title level={3} className="!mb-2 !text-gray-800">
          欢迎回来
        </Title>
        <Text type="secondary" className="text-base">
          登录您的智阅AI账户
        </Text>
      </div>

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

      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        autoComplete="off"
        size="large"
        layout="vertical"
      >
        <Form.Item
          name="username"
          label="用户名或邮箱"
          rules={[
            { required: true, message: '请输入用户名或邮箱' }
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder="请输入用户名或邮箱"
            className="h-11"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="请输入密码"
            className="h-11"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <div className="flex items-center justify-between mb-6">
          <Form.Item name="remember" valuePropName="checked" className="!mb-0">
            <Checkbox>记住我</Checkbox>
          </Form.Item>
          
          {onSwitchToForgot && (
            <Link 
              onClick={onSwitchToForgot}
              className="text-primary-600 hover:text-primary-700"
            >
              忘记密码？
            </Link>
          )}
        </div>

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
            {loading ? '登录中...' : '登录'}
          </Button>
        </Form.Item>

        <div className="text-center space-y-3">
          {onSwitchToRegister && (
            <div>
              <Text type="secondary">
                还没有账户？{' '}
                <Link 
                  onClick={onSwitchToRegister}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  立即注册
                </Link>
              </Text>
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-100">
            <Text type="secondary" className="text-xs">
              测试账户：<Text code className="text-xs">demo</Text> / <Text code className="text-xs">demo123</Text>
            </Text>
          </div>
        </div>
      </Form>
    </div>
  );
};