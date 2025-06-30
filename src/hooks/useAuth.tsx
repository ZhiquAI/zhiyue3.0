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
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { state: authState, execute } = useAsyncOperation();

  // 检查本地存储的token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshAuth();
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await execute(() => authApi.login({ username, password }));
    
    if (response.success) {
      const { token, user: userData } = response.data;
      localStorage.setItem('auth_token', token);
      setUser(userData);
    } else {
      throw new Error(response.message || '登录失败');
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
    try {
      const response = await execute(() => authApi.getCurrentUser());
      if (response.success) {
        setUser(response.data);
      } else {
        throw new Error('获取用户信息失败');
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.role === 'admin';
  };

  const value: AuthContextType = {
    user,
    loading: authState.loading,
    login,
    logout,
    refreshAuth,
    hasPermission,
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