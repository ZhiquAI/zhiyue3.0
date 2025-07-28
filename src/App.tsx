import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './hooks/useAuth';
import { AppRouter } from './AppRouter';
import { initMessage } from './utils/message';
import './styles/app.css';

// 内部组件用于初始化message实例
const AppContent: React.FC = () => {
  const { message } = AntdApp.useApp();
  
  useEffect(() => {
    // 初始化全局message实例
    initMessage(message);
  }, [message]);

  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <AppRouter />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
};

const App: React.FC = () => {
  console.log('🚀 App component is rendering!');

  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#2563eb',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            fontSize: 14,
            borderRadius: 8,
          },
        }}
      >
        <AntdApp>
          <AppContent />
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;