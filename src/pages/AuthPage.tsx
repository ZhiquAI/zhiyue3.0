import React, { useState, useEffect } from 'react';
import { Card, Typography, Button } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

const { Title, Text } = Typography;

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // 如果用户已登录，重定向到dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // 根据URL参数设置模式
  useEffect(() => {
    const modeParam = searchParams.get('mode') as AuthMode;
    if (modeParam && ['login', 'register', 'forgot'].includes(modeParam)) {
      setMode(modeParam);
    }
  }, [searchParams]);

  const handleLoginSuccess = () => {
    console.log('登录成功，准备跳转到dashboard');
    // 使用setTimeout确保状态更新完成后再跳转
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 100);
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    // 更新URL参数但不刷新页面
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('mode', newMode);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  const renderAuthForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm 
            onSwitchToRegister={() => handleModeChange('register')}
            onSwitchToForgot={() => handleModeChange('forgot')}
            onSuccess={handleLoginSuccess}
          />
        );
      case 'register':
        return (
          <RegisterForm 
            onSwitchToLogin={() => handleModeChange('login')}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordForm 
            onSwitchToLogin={() => handleModeChange('login')}
          />
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return '智阅AI登录';
      case 'register': return '创建账户';
      case 'forgot': return '重置密码';
      default: return '智阅AI';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      {/* 浮动装饰元素 */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-200/30 rounded-full blur-xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-pink-200/30 rounded-full blur-xl animate-pulse delay-500" />

      {/* 主要内容区域 */}
      <div className="relative z-10 w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <Title level={1} className="!mb-0 !text-gray-800 !text-3xl font-bold">
              智阅AI
            </Title>
          </div>
        </div>

        {/* 认证表单卡片 */}
        <Card 
          className={cn(
            'w-full shadow-2xl border-0 backdrop-blur-sm',
            'bg-white/95 rounded-2xl overflow-hidden'
          )}
          styles={{ body: { padding: '2rem' } }}
        >
          {renderAuthForm()}
        </Card>

        {/* 底部链接 - 仅在忘记密码模式显示 */}
        <div className="text-center mt-6">
          <Text type="secondary" className="text-sm">
            {mode === 'forgot' && (
              <>
                想起密码了？{' '}
                <Button 
                  type="link" 
                  className="p-0 h-auto text-sm font-medium"
                  onClick={() => handleModeChange('login')}
                >
                  返回登录
                </Button>
              </>
            )}
          </Text>
        </div>

        {/* 版权信息 */}
        <div className="text-center mt-8">
          <Text type="secondary" className="text-xs">
            © 2024 智阅AI. 保留所有权利.
          </Text>
        </div>
      </div>

      {/* 响应式样式 */}
      <style>
        {`
          @media (max-width: 640px) {
            .ant-card-body {
              padding: 1.5rem !important;
            }
          }
          
          .auth-form .ant-input {
            height: 48px;
            border-radius: 8px;
          }
          
          .auth-form .ant-btn {
            height: 48px;
            border-radius: 8px;
            font-weight: 500;
          }
          
          .auth-form .ant-btn-primary {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border: none;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          
          .auth-form .ant-btn-primary:hover {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          }
        `}
      </style>
    </div>
  );
};