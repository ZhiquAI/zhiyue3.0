/**
 * 简化的认证API - 直接处理登录请求，绕过复杂的HTTP客户端
 */

export interface SimpleLoginRequest {
  username: string;
  password: string;
}

export interface SimpleLoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: any;
    token: string;
    refreshToken: string;
    expiresAt: string;
  };
  access_token?: string;
  user?: any;
}

export const simpleAuthApi = {
  login: async (credentials: SimpleLoginRequest): Promise<SimpleLoginResponse> => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('简单认证API响应:', data);
      
      return data;
    } catch (error) {
      console.error('简单认证API错误:', error);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<any> => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('获取用户信息响应:', data);
      
      return data;
    } catch (error) {
      console.error('获取用户信息错误:', error);
      throw error;
    }
  },

  logout: async (): Promise<any> => {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return { success: true };
    } catch (error) {
      console.warn('登出API调用失败:', error);
      return { success: true }; // 即使失败也返回成功
    }
  }
};