import React, { useState } from 'react';
import { Card, Button, Alert, Typography, Space, Input, Form } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface LoginTestFormData {
  username: string;
  password: string;
}

export const LoginTest: React.FC = () => {
  const [form] = Form.useForm();
  const { user, login, logout, loading } = useAuth();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  const handleLogin = async (values: LoginTestFormData) => {
    try {
      setError('');
      setSuccess('');
      
      console.log('开始登录...');
      await login(values.username, values.password);
      console.log('登录API调用成功');
      setSuccess('登录成功！正在跳转...');
      
      // 延迟跳转以显示成功消息，并等待用户状态更新
      setTimeout(() => {
        console.log('开始跳转到 /dashboard');
        navigate('/dashboard', { replace: true });
        console.log('跳转命令已执行');
      }, 2000); // 增加延迟时间确保状态更新
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.message || '登录失败');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSuccess('已退出登录');
      setError('');
    } catch (err: any) {
      setError(err.message || '退出失败');
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <Title level={3} className="!mb-4">
          登录跳转测试
        </Title>
        
        {user ? (
          <div>
            <Alert
              message="用户已登录"
              description={
                <div>
                  <p><strong>用户名:</strong> {user.username}</p>
                  <p><strong>姓名:</strong> {user.name}</p>
                  <p><strong>邮箱:</strong> {user.email}</p>
                  <p><strong>角色:</strong> {user.role}</p>
                </div>
              }
              type="success"
              showIcon
              className="mb-4"
            />
            
            <Space wrap>
              <Button type="primary" onClick={handleGoToDashboard}>
                前往仪表板
              </Button>
              <Button onClick={() => navigate('/exams')}>
                前往考试管理
              </Button>
              <Button onClick={() => navigate('/route-test')}>
                路由测试页面
              </Button>
              <Button onClick={handleLogout} loading={loading}>
                退出登录
              </Button>
            </Space>
          </div>
        ) : (
          <div>
            <Alert
              message="用户未登录"
              description="请使用测试账户登录：demo / Demo123456"
              type="info"
              showIcon
              className="mb-4"
            />
            
            <Form
              form={form}
              onFinish={handleLogin}
              layout="vertical"
              initialValues={{ username: 'demo', password: 'Demo123456' }}
            >
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                />
              </Form.Item>
              
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                />
              </Form.Item>
              
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="w-full"
                >
                  {loading ? '登录中...' : '测试登录'}
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
        
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            className="mt-4"
            closable
            onClose={() => setError('')}
          />
        )}
        
        {success && (
          <Alert
            message="成功"
            description={success}
            type="success"
            showIcon
            className="mt-4"
            closable
            onClose={() => setSuccess('')}
          />
        )}
        
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <Title level={5}>测试说明</Title>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 使用测试账户 demo / Demo123456 进行登录测试</li>
            <li>• 登录成功后会显示用户信息</li>
            <li>• 点击"前往仪表板"按钮测试页面跳转</li>
            <li>• 可以退出登录重新测试</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};