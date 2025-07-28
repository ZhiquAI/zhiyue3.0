import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { MainApplication } from './components/MainApplication';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './components/auth/ProfilePage';
import { NetworkDiagnostic } from './components/debug/NetworkDiagnostic';
import { LoginTest } from './components/debug/LoginTest';
import { RouteTest } from './components/debug/RouteTest';
import { SimpleAuthTest } from './components/debug/SimpleAuthTest';
import { LoginTestSimple } from './pages/LoginTestSimple';
import ChoiceGrading from './pages/ChoiceGrading';
import BarcodeGeneratorPage from './pages/BarcodeGeneratorPage.tsx';

import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Spin } from 'antd';

const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
      <p className="text-gray-600 mb-6">您没有权限访问此页面</p>
      <button 
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        返回上一页
      </button>
    </div>
  </div>
);

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-gray-600 mb-6">页面未找到</p>
      <button 
        onClick={() => window.location.href = '/'}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        返回首页
      </button>
    </div>
  </div>
);

export const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      {/* 认证页面 */}
      <Route 
        path="/auth" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <AuthPage />
        } 
      />
      
      {/* 主应用路由 - 需要认证 */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <MainApplication />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/exams" 
        element={
          <ProtectedRoute>
            <MainApplication />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/marking" 
        element={
          <ProtectedRoute>
            <MainApplication />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analysis" 
        element={
          <ProtectedRoute>
            <MainApplication />
          </ProtectedRoute>
        } 
      />
      
      {/* 选择题评分页面 */}
      <Route 
        path="/choice-grading" 
        element={
          <ProtectedRoute>
            <ChoiceGrading />
          </ProtectedRoute>
        } 
      />
      
      {/* 条形码生成器页面 */}
      <Route 
        path="/barcode-generator" 
        element={
          <ProtectedRoute>
            <BarcodeGeneratorPage />
          </ProtectedRoute>
        } 
      />
      


      
      {/* 个人资料页面 */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />
      
      {/* 网络诊断页面 - 无需认证 */}
      <Route path="/debug" element={<NetworkDiagnostic />} />
      
      {/* 登录测试页面 - 无需认证 */}
      <Route path="/login-test" element={<LoginTest />} />
      
      {/* 路由测试页面 - 无需认证 */}
      <Route path="/route-test" element={<RouteTest />} />
      
      {/* 认证测试页面 - 无需认证 */}
      <Route path="/auth-test" element={<SimpleAuthTest />} />
      
      {/* 简单登录测试页面 - 无需认证 */}
      <Route path="/simple-test" element={<LoginTestSimple />} />
      
      {/* 未授权页面 */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      {/* 默认重定向 */}
      <Route 
        path="/" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />
        } 
      />
      
      {/* 404页面 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};