// 认证Hook - 管理用户认证状态
import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { authApi } from '../services/api';
import { useAsyncOperation } from './useAsyncOperation';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'teacher' | 'admin';
  permissions: string[];
  avatar?: string;
  school?: string;
  subject?: string;
  grades?: string[];
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { execute } = useAsyncOperation();

  // 检查本地存储的token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshAuth();
    }
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const response = await authApi.login({ username, password });
      
      // 检查响应格式 - 后端直接返回token和user，不是包装在success/data中
      if (response.access_token && response.user) {
        // 后端直接返回格式
        const token = response.access_token;
        const userData = {
          id: response.user.id,
          username: response.user.username,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          permissions: response.user.permissions || [],
          avatar: response.user.avatar,
          school: response.user.school,
          subject: response.user.subject,
          grades: response.user.grades
        };
        localStorage.setItem('auth_token', token);
        setUser(userData);
        console.log('用户状态已更新:', userData);
      } else if (response.success && response.data) {
        // 包装格式（备用）
        const { token, user: userData } = response.data;
        localStorage.setItem('auth_token', token);
        setUser(userData);
        console.log('用户状态已更新:', userData);
      } else {
        throw new Error('登录响应格式不正确');
      }
    } catch (error) {
      console.error('登录过程中出错:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // 即使API调用失败也要清除本地状态
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    setLoading(true);
    try {
      const response = await authApi.getCurrentUser();
      if (response.success) {
        setUser(response.data);
      } else {
        throw new Error('获取用户信息失败');
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.role === 'admin';
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshAuth,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};