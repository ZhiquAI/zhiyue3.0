import React, { useEffect, useState } from 'react';
import { Card, Button, Alert, Typography, Space } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export const SimpleAuthTest: React.FC = () => {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [authLog, setAuthLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAuthLog(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[AuthTest] ${message}`);
  };

  useEffect(() => {
    addLog(`认证状态变化: loading=${loading}, user=${user ? user.username : 'null'}`);
  }, [user, loading]);

  const handleQuickLogin = async () => {
    try {
      addLog('开始快速登录...');
      await login('demo', 'Demo123456');
      addLog('登录API调用完成');
      
      // 等待一段时间让状态更新
      setTimeout(() => {
        addLog(`登录后状态检查: user=${user ? user.username : 'null'}, loading=${loading}`);
      }, 100);
      
      setTimeout(() => {
        addLog(`延迟1秒后状态检查: user=${user ? user.username : 'null'}, loading=${loading}`);
      }, 1000);
      
      setTimeout(() => {
        addLog(`延迟2秒后状态检查: user=${user ? user.username : 'null'}, loading=${loading}`);
      }, 2000);
      
    } catch (error: any) {
      addLog(`登录失败: ${error.message}`);
    }
  };

  const handleTestNavigation = () => {
    addLog('尝试导航到 /dashboard');
    navigate('/dashboard');
  };

  const handleDirectNavigation = () => {
    addLog('直接导航到 /dashboard（不检查认证）');
    window.location.href = '/dashboard';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <Title level={3} className="!mb-4">
          认证状态测试
        </Title>
        
        <Alert
          message="当前认证状态"
          description={
            <div>
              <p><strong>用户:</strong> {user ? `${user.username} (${user.name})` : '未登录'}</p>
              <p><strong>加载状态:</strong> {loading ? '加载中' : '已完成'}</p>
              <p><strong>用户角色:</strong> {user?.role || 'N/A'}</p>
            </div>
          }
          type={user ? 'success' : 'warning'}
          showIcon
          className="mb-6"
        />
        
        <Space wrap className="mb-6">
          <Button type="primary" onClick={handleQuickLogin} loading={loading}>
            快速登录 (demo)
          </Button>
          <Button onClick={handleTestNavigation} disabled={!user}>
            测试导航到Dashboard
          </Button>
          <Button onClick={handleDirectNavigation}>
            直接跳转到Dashboard
          </Button>
          <Button onClick={() => setAuthLog([])}>
            清空日志
          </Button>
        </Space>
        
        <div className="bg-gray-50 p-4 rounded">
          <Title level={5}>认证日志</Title>
          <div className="max-h-60 overflow-y-auto">
            {authLog.length === 0 ? (
              <Text type="secondary">暂无日志</Text>
            ) : (
              authLog.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <Title level={5}>测试说明</Title>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 点击"快速登录"测试登录流程</li>
            <li>• 观察认证状态的变化过程</li>
            <li>• 测试登录后的导航功能</li>
            <li>• 查看浏览器控制台获取更多信息</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};