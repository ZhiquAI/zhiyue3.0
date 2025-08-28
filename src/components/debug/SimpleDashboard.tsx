import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Space, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  school?: string;
  subject?: string;
}

export const SimpleDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 演示模式 - 直接设置用户信息，跳过token检查
    console.log('演示模式：直接设置用户信息');
    setTimeout(() => {
      const mockUser: User = {
        id: 'demo-id',
        username: 'demo',
        name: '演示用户',
        email: 'demo@example.com',
        role: 'teacher',
        school: '演示学校',
        subject: '数学'
      };
      setUser(mockUser);
      setLoading(false);
    }, 500); // 减少延迟时间
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/auth', { replace: true });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Card loading={true} style={{ width: 400 }}>
          <Card.Meta title="加载中..." description="正在获取用户信息..." />
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Alert
          message="用户信息获取失败"
          description="请重新登录"
          type="error"
          action={
            <Button size="small" onClick={() => navigate('/auth')}>
              重新登录
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* 顶部栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              智阅AI工作台
            </Title>
            <Text type="secondary">智能历史阅卷助手</Text>
          </div>
          <Space>
            <Text strong>
              <UserOutlined /> {user.name} ({user.role})
            </Text>
            <Button 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </Space>
        </div>
      </Card>

      {/* 用户信息卡片 */}
      <Card title="用户信息" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div>
            <Text strong>用户名：</Text>
            <Text>{user.username}</Text>
          </div>
          <div>
            <Text strong>姓名：</Text>
            <Text>{user.name}</Text>
          </div>
          <div>
            <Text strong>邮箱：</Text>
            <Text>{user.email}</Text>
          </div>
          <div>
            <Text strong>角色：</Text>
            <Text>{user.role}</Text>
          </div>
          {user.school && (
            <div>
              <Text strong>学校：</Text>
              <Text>{user.school}</Text>
            </div>
          )}
          {user.subject && (
            <div>
              <Text strong>学科：</Text>
              <Text>{user.subject}</Text>
            </div>
          )}
        </div>
      </Card>

      {/* 功能卡片 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px' 
      }}>
        <Card title="学生管理" hoverable>
          <Text type="secondary">管理学生信息、导入导出、建立学生档案</Text>
          <br /><br />
          <Button 
            type="primary" 
            onClick={() => navigate('/student-management')}
          >
            学生管理
          </Button>
        </Card>

        <Card title="考试管理" hoverable>
          <Text type="secondary">创建考试、设计答题卡、生成条码</Text>
          <br /><br />
          <Button 
            type="primary" 
            onClick={() => navigate('/exam-management')}
          >
            考试管理
          </Button>
        </Card>

        <Card title="智能阅卷" hoverable>
          <Text type="secondary">AI辅助阅卷、任务管理、批量处理、结果分析</Text>
          <br /><br />
          <Button 
            type="primary" 
            onClick={() => navigate('/grading')}
          >
            智能阅卷
          </Button>
        </Card>

        <Card title="成绩分析" hoverable>
          <Text type="secondary">数据分析、报告生成、学情诊断</Text>
          <br /><br />
          <Button 
            type="primary" 
            onClick={() => navigate('/analysis')}
          >
            成绩分析
          </Button>
        </Card>
      </div>

      {/* 成功提示 */}
      <Alert
        message="登录成功！"
        description="欢迎使用智阅AI工作台，您已成功登录并可以访问工作台功能。"
        type="success"
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default SimpleDashboard;