// 路由保护组件 - 处理认证和权限控制
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  fallback,
}) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  // 正在加载认证状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="正在验证身份..." />
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 检查权限
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Result
          status="403"
          title="权限不足"
          subTitle="抱歉，您没有访问此页面的权限。"
          extra={
            <Navigate to="/" replace />
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;