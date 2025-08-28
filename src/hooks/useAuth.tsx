// 认证Hook - 管理用户认证状态
import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { simpleAuthApi } from '../services/simpleAuthApi';

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
  // 暂时屏蔽认证 - 直接设置虚拟用户
  const [user, setUser] = useState<User | null>({
    id: 'demo-user',
    username: 'demo',
    name: '演示用户',
    email: 'demo@example.com',
    role: 'admin',
    permissions: ['read', 'write', 'admin'],
    avatar: '',
    school: '演示学校',
    subject: '演示科目',
    grades: ['高一', '高二', '高三']
  });
  const [loading, setLoading] = useState<boolean>(false);

  // 暂时注释掉token检查逻辑
  /*
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      refreshAuth();
    }
  }, []);
  */

  const login = async (username: string, password: string) => {
    // 暂时屏蔽认证 - 直接成功
    setLoading(true);
    console.log('演示模式：跳过实际登录，直接成功');
    setTimeout(() => {
      setLoading(false);
      console.log('演示模式登录完成');
    }, 500); // 模拟一点延迟
    
    /* 原始登录逻辑已暂时屏蔽
    try {
      const response = await simpleAuthApi.login({ username, password });
      
      // 检查响应格式 - 后端现在返回标准API格式
      if (response.success && response.data) {
        // 标准API格式
        const { token, user: userData } = response.data;
        localStorage.setItem('authToken', token);
        setUser(userData);
        console.log('用户状态已更新:', userData);
        console.log('登录成功，用户状态更新完成，AppRouter应该会重新渲染');
      } else if (response.access_token && response.user) {
        // 兼容旧的直接返回格式
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
        localStorage.setItem('authToken', token);
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
    */
  };

  const logout = async () => {
    // 暂时屏蔽认证 - 演示模式下不实际退出
    console.log('演示模式：跳过实际退出登录');
    /* 原始退出逻辑已暂时屏蔽
    try {
      await simpleAuthApi.logout();
    } catch {
      // 即使API调用失败也要清除本地状态
      console.warn('Logout API call failed');
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
    */
  };

  const refreshAuth = async () => {
    // 暂时屏蔽认证 - 演示模式下直接返回
    console.log('演示模式：跳过刷新用户信息');
    /* 原始刷新逻辑已暂时屏蔽
    setLoading(true);
    try {
      const response = await simpleAuthApi.getCurrentUser();
      if (response.success) {
        setUser(response.data);
      } else {
        throw new Error('获取用户信息失败');
      }
    } catch {
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
    */
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