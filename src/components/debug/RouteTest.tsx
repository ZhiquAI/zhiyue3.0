import React from 'react';
import { Card, Button, Space, Typography, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

export const RouteTest: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const testRoutes = [
    { path: '/dashboard', name: '仪表板' },
    { path: '/exams', name: '考试管理' },
    { path: '/marking', name: '阅卷中心' },
    { path: '/analysis', name: '数据分析' },
    { path: '/auth', name: '认证页面' },
    { path: '/login-test', name: '登录测试' },
    { path: '/debug', name: '网络诊断' }
  ];

  const handleNavigate = (path: string) => {
    console.log(`导航到: ${path}`);
    navigate(path);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <Title level={3} className="!mb-4">
          路由跳转测试
        </Title>
        
        <Alert
          message="当前状态"
          description={
            <div>
              <p><strong>当前路径:</strong> {location.pathname}</p>
              <p><strong>用户状态:</strong> {user ? `已登录 (${user.username})` : '未登录'}</p>
              <p><strong>加载状态:</strong> {loading ? '加载中' : '已完成'}</p>
            </div>
          }
          type="info"
          showIcon
          className="mb-6"
        />
        
        <Title level={4} className="!mb-4">
          测试路由跳转
        </Title>
        
        <Space wrap>
          {testRoutes.map((route) => (
            <Button
              key={route.path}
              type={location.pathname === route.path ? 'primary' : 'default'}
              onClick={() => handleNavigate(route.path)}
            >
              {route.name}
            </Button>
          ))}
        </Space>
        
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <Title level={5}>测试说明</Title>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 点击按钮测试不同路由的跳转</li>
            <li>• 当前路径会高亮显示</li>
            <li>• 查看浏览器控制台了解跳转日志</li>
            <li>• 受保护的路由需要先登录</li>
          </ul>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <Title level={5}>调试信息</Title>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
            {JSON.stringify({
              pathname: location.pathname,
              search: location.search,
              hash: location.hash,
              state: location.state,
              user: user ? {
                id: user.id,
                username: user.username,
                role: user.role
              } : null,
              loading
            }, null, 2)}
          </pre>
        </div>
      </Card>
    </div>
  );
};