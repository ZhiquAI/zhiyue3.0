import React, { useState, useEffect } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './hooks/useAuth';
import { AppProvider } from './contexts/AppContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import MainApplication from './components/MainApplication';
import ErrorMonitor from './components/debug/ErrorMonitor';
import SimpleDebugToolbar from './components/debug/SimpleDebugToolbar';
import './styles/app.css';
import './utils/devtools'; // 导入开发者工具（包含geminiTest）
import './utils/logSync'; // 导入日志同步服务

const App: React.FC = () => {
  const [showErrorMonitor, setShowErrorMonitor] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // 连接到开发者工具的错误计数
    if (import.meta.env.DEV && window.__DEV_TOOLS__) {
      // 设置错误计数变化回调
      window.__DEV_TOOLS__.onErrorCountChange = (count: number) => {
        setErrorCount(count);
      };

      // 获取初始错误计数
      const initialCount = window.__DEV_TOOLS__.getErrorCount();
      setErrorCount(initialCount);
    }
  }, []);

  const handleToggleErrorMonitor = () => {
    setShowErrorMonitor(!showErrorMonitor);
  };

  const handleClearErrors = () => {
    if (window.__DEV_TOOLS__) {
      window.__DEV_TOOLS__.clearErrors();
    }
    setErrorCount(0);
    setShowErrorMonitor(false);
  };

  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            fontSize: 14,
            borderRadius: 6,
          },
        }}
      >
        <AntdApp>
          <AuthProvider>
            <AppProvider>
              <MainApplication />
              {/* 开发环境下显示调试工具 */}
              {import.meta.env.DEV && (
                <>
                  {showErrorMonitor && <ErrorMonitor />}
                  <SimpleDebugToolbar
                    errorCount={errorCount}
                    onToggleErrorMonitor={handleToggleErrorMonitor}
                    onClearErrors={handleClearErrors}
                  />
                </>
              )}
            </AppProvider>
          </AuthProvider>
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;