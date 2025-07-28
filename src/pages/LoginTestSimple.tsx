import React, { useState } from 'react';
import { Button, Card, Typography, Input, Space, Alert } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export const LoginTestSimple: React.FC = () => {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleQuickLogin = async () => {
    try {
      setError('');
      setMessage('开始登录...');
      
      await login('teacher1', 'password123');
      
      setMessage('登录成功！用户状态已更新');
      
      // 等待一下确保状态更新
      setTimeout(() => {
        setMessage('准备跳转到工作台...');
        navigate('/dashboard', { replace: true });
      }, 500);
      
    } catch (err: any) {
      setError(err.message || '登录失败');
      setMessage('');
    }
  };

  const handleDirectNavigate = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Title level={3}>登录跳转测试</Title>
        </div>

        <Space direction="vertical" className="w-full" size="large">
          {/* 当前状态显示 */}
          <div className="p-4 bg-gray-50 rounded">
            <Text strong>当前状态：</Text>
            <div className="mt-2 space-y-1">
              <div>用户登录: {user ? '已登录' : '未登录'}</div>
              <div>用户名: {user?.username || '无'}</div>
              <div>加载中: {loading ? '是' : '否'}</div>
              <div>当前路径: {window.location.pathname}</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <Space direction="vertical" className="w-full">
            <Button 
              type="primary" 
              size="large" 
              className="w-full"
              loading={loading}
              onClick={handleQuickLogin}
            >
              快速登录并跳转
            </Button>
            
            <Button 
              size="large" 
              className="w-full"
              onClick={handleDirectNavigate}
              disabled={!user}
            >
              直接跳转到工作台
            </Button>
          </Space>

          {/* 消息显示 */}
          {message && (
            <Alert message={message} type="info" showIcon />
          )}
          
          {error && (
            <Alert message={error} type="error" showIcon />
          )}

          {/* 测试说明 */}
          <div className="text-sm text-gray-500">
            <Text type="secondary">
              测试账户：testuser / password123
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};