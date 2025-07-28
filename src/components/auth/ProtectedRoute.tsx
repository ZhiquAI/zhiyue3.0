import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRoles = [],
  fallback
}) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  // 显示加载状态
  if (loading) {
    return (
      fallback || (
        <div className={cn(
          'min-h-screen flex items-center justify-center',
          'bg-gradient-to-br from-primary-50 via-white to-primary-100'
        )}>
          <div className="text-center">
            <Spin size="large" className="mb-4" />
            <div className="text-gray-600">正在验证身份...</div>
          </div>
        </div>
      )
    );
  }

  // 需要认证但用户未登录
  if (requireAuth && !user) {
    return (
      <Navigate 
        to="/auth?mode=login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 检查角色权限
  if (user && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ from: location }} 
          replace 
        />
      );
    }
  }

  // 用户已登录且有权限，渲染子组件
  return <>{children}</>;
};