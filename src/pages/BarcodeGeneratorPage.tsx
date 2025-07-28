import React, { useState } from 'react';
import { Layout, Button, Typography } from 'antd';
import { ArrowLeftOutlined, BarcodeOutlined } from '@ant-design/icons';
import BarcodeGenerator from '../components/tools/BarcodeGenerator';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';

const { Content, Header } = Layout;
const { Title } = Typography;

const BarcodeGeneratorPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [generatorVisible, setGeneratorVisible] = useState(true);

  // 如果用户未登录，重定向到登录页面
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleCloseGenerator = () => {
    setGeneratorVisible(false);
    navigate('/dashboard');
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-white shadow-sm px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            返回
          </Button>
          <div className="flex items-center gap-2">
            <BarcodeOutlined className="text-blue-600 text-xl" />
            <Title level={4} className="m-0">条形码生成器</Title>
          </div>
        </div>
      </Header>
      <Content className="p-6">
        <div className="max-w-6xl mx-auto">
          <BarcodeGenerator 
            visible={generatorVisible}
            onClose={handleCloseGenerator}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default BarcodeGeneratorPage;
export { BarcodeGeneratorPage };