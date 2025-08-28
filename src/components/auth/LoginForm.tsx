import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { cn, buttonStyles, inputStyles, layout } from '../../design-system';

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
      
      console.log('LoginForm: 登录API调用成功，准备调用onSuccess回调');
      // 使用setTimeout确保状态更新完成后再调用回调
      setTimeout(() => {
        console.log('LoginForm: 调用onSuccess回调');
        onSuccess?.();
      }, 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <Title level={3} className="!mb-2 !text-neutral-800">
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
            prefix={<UserOutlined className="text-neutral-400" />}
            placeholder="请输入用户名或邮箱"
            className={cn(inputStyles.base, inputStyles.variants.default, inputStyles.sizes.lg)}
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
            prefix={<LockOutlined className="text-neutral-400" />}
            placeholder="请输入密码"
            className={cn(inputStyles.base, inputStyles.variants.default, inputStyles.sizes.lg)}
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <div className={cn(layout.flex.between(), "mb-6")}>
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
              buttonStyles.base,
              buttonStyles.variants.primary,
              buttonStyles.sizes.lg,
              'w-full'
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
          
          <div className="pt-2 border-t border-neutral-100">
            <Text type="secondary" className="text-xs">
              测试账户：<Text code className="text-xs">demo</Text> / <Text code className="text-xs">demo123</Text>
            </Text>
          </div>
        </div>
      </Form>
    </div>
  );
};