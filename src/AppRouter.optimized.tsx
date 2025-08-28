/**
 * 优化后的路由配置
 * 使用代码分割和懒加载优化性能
 */

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LazyWrapper } from "./components/performance/LazyWrapper";
import { lazyWithRetry } from "./utils/performance";

// 核心组件 - 直接导入（关键路径）
import { AuthPage } from "./pages/AuthPage";

// 懒加载组件 - 按需加载
const MainApplication = lazyWithRetry(() => import("./components/MainApplication").then(m => ({ default: m.MainApplication })));
const ProfilePage = lazyWithRetry(() => import("./components/auth/ProfilePage").then(m => ({ default: m.ProfilePage })));

// 功能页面 - 懒加载
const ChoiceGrading = lazyWithRetry(() => import("./pages/ChoiceGrading"));
const BarcodeGeneratorPage = lazyWithRetry(() => import("./pages/BarcodeGeneratorPage"));
const QuestionSegmentationPage = lazyWithRetry(() => import("./pages/QuestionSegmentationPage"));
const TestEnhancedDesigner = lazyWithRetry(() => import("./pages/TestEnhancedDesigner"));
const AnswerSheetTemplateDesignerPage = lazyWithRetry(() => import("./pages/AnswerSheetTemplateDesignerPage"));
const AnswerSheetDesignerTestPage = lazyWithRetry(() => import("./pages/AnswerSheetDesignerTestPage"));
const OptimizedGradingDemo = lazyWithRetry(() => import("./pages/OptimizedGradingDemo").then(m => ({ default: m.OptimizedGradingDemo })));
const DesignSystemShowcase = lazyWithRetry(() => import("./components/design-system/DesignSystemShowcase").then(m => ({ default: m.DesignSystemShowcase })));

// 调试组件 - 开发环境才懒加载
const NetworkDiagnostic = lazyWithRetry(() => import("./components/debug/NetworkDiagnostic").then(m => ({ default: m.NetworkDiagnostic })));
const LoginTest = lazyWithRetry(() => import("./components/debug/LoginTest").then(m => ({ default: m.LoginTest })));
const RouteTest = lazyWithRetry(() => import("./components/debug/RouteTest").then(m => ({ default: m.RouteTest })));
const SimpleAuthTest = lazyWithRetry(() => import("./components/debug/SimpleAuthTest").then(m => ({ default: m.SimpleAuthTest })));
const LoginTestSimple = lazyWithRetry(() => import("./pages/LoginTestSimple").then(m => ({ default: m.LoginTestSimple })));

// 优化后的加载组件
const RouteSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spin size="large" tip="页面加载中..." />
  </div>
);

// 错误回退组件
const RouteErrorFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">页面加载失败</h1>
      <p className="text-gray-600 mb-6">页面加载时出现错误，请刷新重试</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
      >
        刷新页面
      </button>
    </div>
  );
);

const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h1>
      <p className="text-gray-600 mb-6">您没有权限访问此页面</p>
      <button 
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
      >
        返回上页
      </button>
    </div>
  );
);

export const AppRouterOptimized: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteSpinner />;
  }

  return (
    <Routes>
      {/* 认证路由 */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 主应用路由 - 需要认证 */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <LazyWrapper
              fallback={<RouteSpinner />}
              errorFallback={<RouteErrorFallback />}
              networkAware
            >
              <MainApplication />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      {/* 用户配置 */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <ProfilePage />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      {/* 功能页面 - 需要认证 */}
      <Route
        path="/choice-grading"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <ChoiceGrading />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/barcode-generator"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <BarcodeGeneratorPage />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/question-segmentation"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <QuestionSegmentationPage />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/test-enhanced-designer"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <TestEnhancedDesigner />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/answer-sheet-template-designer"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <AnswerSheetTemplateDesignerPage />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/answer-sheet-designer-test"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <AnswerSheetDesignerTestPage />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/optimized-grading"
        element={
          <ProtectedRoute>
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <OptimizedGradingDemo />
            </LazyWrapper>
          </ProtectedRoute>
        }
      />

      {/* 设计系统展示 - 开发环境 */}
      {process.env.NODE_ENV === 'development' && (
        <Route
          path="/design-system"
          element={
            <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
              <DesignSystemShowcase />
            </LazyWrapper>
          }
        />
      )}

      {/* 调试路由 - 仅开发环境 */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <Route
            path="/debug/network"
            element={
              <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
                <NetworkDiagnostic />
              </LazyWrapper>
            }
          />
          <Route
            path="/debug/login-test"
            element={
              <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
                <LoginTest />
              </LazyWrapper>
            }
          />
          <Route
            path="/debug/route-test"
            element={
              <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
                <RouteTest />
              </LazyWrapper>
            }
          />
          <Route
            path="/debug/simple-auth-test"
            element={
              <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
                <SimpleAuthTest />
              </LazyWrapper>
            }
          />
          <Route
            path="/debug/login-test-simple"
            element={
              <LazyWrapper fallback={<RouteSpinner />} errorFallback={<RouteErrorFallback />}>
                <LoginTestSimple />
              </LazyWrapper>
            }
          />
        </>
      )}

      {/* 根路径重定向 */}
      <Route
        path="/"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />
        }
      />

      {/* 404 页面 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-6">页面未找到</p>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                返回上页
              </button>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRouterOptimized;