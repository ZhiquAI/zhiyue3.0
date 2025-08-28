import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { App as AntdApp, message } from 'antd';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppRouter } from './AppRouter';
import { initMessage } from './utils/message';
// import { registerServiceWorker } from './utils/pwa';

// 内部组件用于初始化message实例
const AppContent: React.FC = () => {
  const { message: antdMessage } = AntdApp.useApp();
  
  useEffect(() => {
    // 初始化全局message实例
    initMessage(antdMessage);
    
    // 暂时注释掉PWA功能以简化调试
    /* 
    registerServiceWorker({
      swUrl: '/sw.js',
      onSuccess: (registration) => {
        console.log('PWA registered successfully:', registration);
      },
      onUpdate: (registration) => {
        message.info({
          content: '发现新版本，点击更新',
          duration: 0,
          key: 'sw-update',
          btn: (
            <button
              onClick={() => {
                registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                message.destroy('sw-update');
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              立即更新
            </button>
          ),
        });
      },
      onError: (error) => {
        console.error('PWA registration failed:', error);
      },
    });
    */
  }, [antdMessage]);

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
      <ThemeProvider>
        <AntdApp>
          <AppContent />
        </AntdApp>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;