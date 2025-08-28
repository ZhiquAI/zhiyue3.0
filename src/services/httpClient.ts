// 统一的HTTP客户端配置
import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { message } from '../utils/message';

// 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TIMEOUT = 30000;

// 统一的API响应接口
export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

// 分页响应接口
export interface PaginatedResponse<T> extends BaseApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  skipErrorHandler?: boolean;
  showSuccessMessage?: boolean;
  successMessage?: string;
}

// 错误响应接口
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  error_code?: string;
  status_code?: number;
  request_id?: string;
}

// 创建axios实例
const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  client.interceptors.request.use(
    (config) => {
      // 添加认证token
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 添加请求ID用于追踪
      config.headers['X-Request-ID'] = generateRequestId();

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config as RequestConfig;
      
      // 显示成功消息
      if (config.showSuccessMessage) {
        const successMessage = config.successMessage || response.data?.message || '操作成功';
        message.success(successMessage);
      }
      
      return response;
    },
    (error: AxiosError<ErrorResponse>) => {
      const config = error.config as RequestConfig;
      
      // 如果配置了跳过错误处理，则直接抛出错误
      if (config?.skipErrorHandler) {
        return Promise.reject(error);
      }
      
      handleApiError(error);
      return Promise.reject(error);
    }
  );

  return client;
};

// 错误处理函数
const handleApiError = (error: AxiosError<ErrorResponse>) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 401:
        message.error('登录已过期，请重新登录');
        localStorage.removeItem('auth_token');
        // 避免在登录页面重复跳转
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/auth';
        }
        break;
      case 403:
        message.error('权限不足，无法访问该资源');
        break;
      case 404:
        message.error('请求的资源不存在');
        break;
      case 422: {
        const validationErrors = data?.errors;
        if (validationErrors) {
          Object.values(validationErrors).forEach((errorMsg: string[]) => {
            errorMsg.forEach(msg => message.error(msg));
          });
        } else {
          message.error(data?.message || '请求参数有误');
        }
        break;
      }
      case 429:
        message.error('请求过于频繁，请稍后重试');
        break;
      case 500:
        message.error('服务器内部错误，请稍后重试');
        break;
      case 502:
      case 503:
      case 504:
        message.error('服务暂时不可用，请稍后重试');
        break;
      default:
        message.error(data?.message || `请求失败: ${status}`);
    }
  } else if (error.request) {
    message.error('网络连接失败，请检查网络设置');
  } else {
    message.error('请求配置错误');
  }
};

// 生成请求ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 创建HTTP客户端实例
const httpClient = createHttpClient();

// 封装常用的HTTP方法
export class ApiClient {
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  // GET请求
  async get<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<BaseApiResponse<T>> {
    const response = await this.client.get<BaseApiResponse<T>>(url, config);
    return response.data;
  }

  // POST请求
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<BaseApiResponse<T>> {
    const response = await this.client.post<BaseApiResponse<T>>(url, data, config);
    return response.data;
  }

  // PUT请求
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<BaseApiResponse<T>> {
    const response = await this.client.put<BaseApiResponse<T>>(url, data, config);
    return response.data;
  }

  // DELETE请求
  async delete<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<BaseApiResponse<T>> {
    const response = await this.client.delete<BaseApiResponse<T>>(url, config);
    return response.data;
  }

  // PATCH请求
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<BaseApiResponse<T>> {
    const response = await this.client.patch<BaseApiResponse<T>>(url, data, config);
    return response.data;
  }

  // 文件上传
  async upload<T = unknown>(
    url: string,
    formData: FormData,
    config?: RequestConfig & {
      onUploadProgress?: (progressEvent: ProgressEvent) => void;
    }
  ): Promise<BaseApiResponse<T>> {
    const uploadConfig: RequestConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    };
    
    const response = await this.client.post<BaseApiResponse<T>>(url, formData, uploadConfig);
    return response.data;
  }

  // 下载文件
  async download(
    url: string,
    config?: RequestConfig
  ): Promise<Blob> {
    const downloadConfig: RequestConfig = {
      ...config,
      responseType: 'blob',
    };
    
    const response = await this.client.get(url, downloadConfig);
    return response.data;
  }

  // 获取原始axios实例（用于特殊需求）
  getRawClient(): AxiosInstance {
    return this.client;
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient(httpClient);

// 导出原始axios实例（向后兼容）
export default httpClient;

// 工具函数
export const isApiSuccess = <T>(response: BaseApiResponse<T>): boolean => {
  return response.success === true;
};

export const getApiData = <T>(response: BaseApiResponse<T>): T => {
  if (!isApiSuccess(response)) {
    throw new Error(response.message || 'API请求失败');
  }
  return response.data;
};

// 重试机制
export const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        break;
      }
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError!;
};