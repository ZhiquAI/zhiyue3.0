import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Typography, Space, Divider, Tag, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  details?: string;
}

export const NetworkDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showTestAccount, setShowTestAccount] = useState(false);

  const diagnosticTests = [
    {
      name: '后端服务连接',
      test: async () => {
        const response = await fetch('http://localhost:8000/health');
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: '后端服务正常', details: `状态: ${data.status}` };
        }
        throw new Error(`HTTP ${response.status}`);
      }
    },
    {
      name: 'CORS配置检查',
      test: async () => {
        const response = await fetch('http://localhost:8000/', {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });
        if (response.ok) {
          return { success: true, message: 'CORS配置正常', details: '跨域请求已允许' };
        }
        throw new Error('CORS配置错误');
      }
    },
    {
      name: '注册接口测试',
      test: async () => {
        try {
          await authApi.register({
            username: `test_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'Test123456',
            name: '测试用户'
          });
          return { success: true, message: '注册接口正常', details: '可以创建新用户' };
        } catch (error: any) {
          if (error.response?.status === 400 && error.response?.data?.detail?.includes('已存在')) {
            return { success: true, message: '注册接口正常', details: '接口响应正确' };
          }
          throw error;
        }
      }
    },
    {
      name: '登录接口测试',
      test: async () => {
        try {
          await authApi.login({ username: 'demo', password: 'Demo123456' });
          return { success: true, message: '登录接口正常', details: '测试账户可用' };
        } catch (error: any) {
          if (error.response?.status === 401) {
            return { success: true, message: '登录接口正常', details: '接口响应正确' };
          }
          throw error;
        }
      }
    }
  ];

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    for (const diagnostic of diagnosticTests) {
      setResults(prev => [...prev, {
        name: diagnostic.name,
        status: 'loading',
        message: '检测中...'
      }]);
      
      try {
        const result = await diagnostic.test();
        setResults(prev => prev.map(r => 
          r.name === diagnostic.name 
            ? { ...r, status: 'success', message: result.message, details: result.details }
            : r
        ));
      } catch (error: any) {
        setResults(prev => prev.map(r => 
          r.name === diagnostic.name 
            ? { 
                ...r, 
                status: 'error', 
                message: '检测失败', 
                details: error.message || '未知错误'
              }
            : r
        ));
      }
      
      // 添加延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'loading':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const hasErrors = results.some(r => r.status === 'error');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <Title level={3} className="!mb-4">
          网络连接诊断
        </Title>
        
        <Paragraph type="secondary">
          如果您遇到注册或登录问题，请运行此诊断工具来检查网络连接状态。
        </Paragraph>

        <Space className="mb-6">
          <Button 
            type="primary" 
            onClick={runDiagnostics}
            loading={isRunning}
            disabled={isRunning}
          >
            {isRunning ? '诊断中...' : '开始诊断'}
          </Button>
          
          <Button 
            onClick={() => setShowTestAccount(!showTestAccount)}
          >
            {showTestAccount ? '隐藏' : '显示'}测试账户
          </Button>
        </Space>

        {showTestAccount && (
          <Alert
            message="测试账户信息"
            description={
              <div>
                <p><UserOutlined /> 用户名: <Tag color="blue">demo</Tag></p>
                <p><LockOutlined /> 密码: <Tag color="blue">Demo123456</Tag></p>
                <p className="text-sm text-gray-500 mt-2">
                  如果注册功能有问题，您可以使用此测试账户直接登录体验系统功能。
                </p>
              </div>
            }
            type="info"
            showIcon
            className="mb-6"
          />
        )}

        {results.length > 0 && (
          <div>
            <Divider>诊断结果</Divider>
            
            {hasErrors && (
              <Alert
                message="检测到网络问题"
                description="部分连接测试失败，请检查后端服务是否正常运行，或联系技术支持。"
                type="warning"
                showIcon
                className="mb-4"
              />
            )}
            
            <Space direction="vertical" className="w-full">
              {results.map((result, index) => (
                <Card key={index} size="small" className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <Text strong>{result.name}</Text>
                        <div className="text-sm text-gray-500">{result.message}</div>
                        {result.details && (
                          <div className="text-xs text-gray-400 mt-1">{result.details}</div>
                        )}
                      </div>
                    </div>
                    
                    {result.status === 'loading' && <Spin size="small" />}
                  </div>
                </Card>
              ))}
            </Space>
          </div>
        )}

        {!isRunning && results.length > 0 && !hasErrors && (
          <Alert
            message="网络连接正常"
            description="所有连接测试都通过了，您的网络配置没有问题。如果仍然遇到注册问题，请尝试刷新页面或清除浏览器缓存。"
            type="success"
            showIcon
            className="mt-4"
          />
        )}
      </Card>
    </div>
  );
};