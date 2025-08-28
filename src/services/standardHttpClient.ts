/**
 * 标准化HTTP客户端
 * 提供统一的API调用接口和错误处理
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios';
import { 
  ApiResponse, 
  ApiErrorCode, 
  ApiException, 
  PaginationRequest
} from '../types/standardApi';

// 请求拦截器配置
interface RequestInterceptorConfig {
  addAuthToken?: boolean;
  addRequestId?: boolean;
  addTimestamp?: boolean;
  timeout?: number;
}

// 响应拦截器配置
interface ResponseInterceptorConfig {
  validateResponse?: boolean;
  logResponse?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

// HTTP客户端配置
interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  request?: RequestInterceptorConfig;
  response?: ResponseInterceptorConfig;
}

// 重试配置
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

// 默认配置
const DEFAULT_CONFIG: HttpClientConfig = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  request: {
    addAuthToken: true,
    addRequestId: true,
    addTimestamp: true
  },
  response: {
    validateResponse: true,
    logResponse: false,
    retryOnError: true,
    maxRetries: 3
  }
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    return !error.response || (error.response.status >= 500 && error.response.status <= 599);
  }
};

/**
 * 标准化HTTP客户端类
 */
export class StandardHttpClient {
  private axiosInstance: AxiosInstance;
  private config: HttpClientConfig;
  private retryConfig: RetryConfig;
  private requestIdCounter = 0;

  constructor(config: Partial<HttpClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG };
    
    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL || import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: this.config.timeout,
      headers: this.config.headers
    });

    this.setupRequestInterceptors();
    this.setupResponseInterceptors();
  }

  /**
   * 设置请求拦截器
   */
  private setupRequestInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const requestConfig = this.config.request;

        // 添加认证令牌
        if (requestConfig?.addAuthToken) {
          const token = this.getAuthToken();
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // 添加请求ID
        if (requestConfig?.addRequestId && config.headers) {
          config.headers['X-Request-ID'] = this.generateRequestId();
        }

        // 添加时间戳
        if (requestConfig?.addTimestamp && config.headers) {
          config.headers['X-Request-Timestamp'] = new Date().toISOString();
        }

        // 请求日志
        if (process.env.NODE_ENV === 'development') {
          console.group(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
          console.log('Headers:', config.headers);
          console.log('Data:', config.data);
          console.groupEnd();
        }

        return config;
      },
      (error: AxiosError) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 设置响应拦截器
   */
  private setupResponseInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // 响应日志
        if (process.env.NODE_ENV === 'development') {
          console.group(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
          console.log('Status:', response.status);
          console.log('Data:', response.data);
          console.groupEnd();
        }

        // 验证响应格式
        if (this.config.response?.validateResponse && !this.isValidApiResponse(response.data)) {
          throw new ApiException(
            ApiErrorCode.INVALID_REQUEST,
            '服务器响应格式错误'
          );
        }

        // 检查业务逻辑错误
        if (response.data && !response.data.success) {
          throw new ApiException(
            response.data.code as ApiErrorCode || ApiErrorCode.SERVER_ERROR,
            response.data.message || '操作失败',
            response.data.errors
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        // 错误日志
        console.group(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        console.log('Status:', error.response?.status);
        console.log('Error:', error.message);
        console.log('Response:', error.response?.data);
        console.groupEnd();

        // 重试机制
        if (this.config.response?.retryOnError && this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        // 转换为标准异常
        throw this.transformError(error);
      }
    );
  }

  /**
   * 获取认证令牌
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    this.requestIdCounter += 1;
    return `req_${Date.now()}_${this.requestIdCounter}`;
  }

  /**
   * 验证API响应格式
   */
  private isValidApiResponse(data: unknown): data is ApiResponse {
    return data && 
           typeof data === 'object' && 
           'success' in data && 
           'message' in data && 
           'code' in data &&
           'timestamp' in data;
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.config || (error.config as InternalAxiosRequestConfig & { _retryCount?: number })._retryCount >= this.retryConfig.maxRetries) {
      return false;
    }
    return this.retryConfig.retryCondition(error);
  }

  /**
   * 重试请求
   */
  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    config._retryCount = (config._retryCount || 0) + 1;

    // 计算延迟时间（指数退避）
    const delay = this.retryConfig.retryDelay * Math.pow(2, config._retryCount - 1);
    
    console.log(`Retrying request (${config._retryCount}/${this.retryConfig.maxRetries}) after ${delay}ms...`);
    
    await this.sleep(delay);
    return this.axiosInstance(config);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 转换错误为标准异常
   */
  private transformError(error: AxiosError): ApiException {
    // 网络错误
    if (!error.response) {
      return new ApiException(
        ApiErrorCode.SERVICE_UNAVAILABLE,
        '网络连接失败，请检查网络设置'
      );
    }

    // HTTP错误状态码映射
    const status = error.response.status;
    let code: ApiErrorCode;
    let message: string;

    switch (status) {
      case 400:
        code = ApiErrorCode.INVALID_REQUEST;
        message = '请求参数错误';
        break;
      case 401:
        code = ApiErrorCode.UNAUTHORIZED;
        message = '认证失败，请重新登录';
        // 清除过期的token
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        break;
      case 403:
        code = ApiErrorCode.FORBIDDEN;
        message = '权限不足';
        break;
      case 404:
        code = ApiErrorCode.NOT_FOUND;
        message = '请求的资源不存在';
        break;
      case 409:
        code = ApiErrorCode.RESOURCE_ALREADY_EXISTS;
        message = '资源冲突';
        break;
      case 413:
        code = ApiErrorCode.FILE_TOO_LARGE;
        message = '请求数据过大';
        break;
      case 415:
        code = ApiErrorCode.FILE_TYPE_NOT_SUPPORTED;
        message = '不支持的媒体类型';
        break;
      case 429:
        code = ApiErrorCode.RATE_LIMITED;
        message = '请求过于频繁';
        break;
      case 500:
        code = ApiErrorCode.SERVER_ERROR;
        message = '服务器内部错误';
        break;
      case 502:
      case 503:
      case 504:
        code = ApiErrorCode.SERVICE_UNAVAILABLE;
        message = '服务暂时不可用';
        break;
      default:
        code = ApiErrorCode.UNKNOWN_ERROR;
        message = '未知错误';
    }

    // 尝试从响应中获取详细错误信息
    const responseData = error.response.data;
    if (responseData && typeof responseData === 'object') {
      const errorData = responseData as Record<string, unknown>;
      if (typeof errorData.message === 'string') {
        message = errorData.message;
      }
      if (typeof errorData.code === 'string') {
        code = errorData.code as ApiErrorCode;
      }
    }

    return new ApiException(code, message, undefined, status);
  }

  /**
   * GET请求
   */
  async get<T = unknown>(
    url: string, 
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get<ApiResponse<T>>(url, { 
      params, 
      ...config 
    });
    return response.data;
  }

  /**
   * POST请求
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PUT请求
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PATCH请求
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * DELETE请求
   */
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * 分页查询
   */
  async paginate<T = unknown>(
    url: string,
    request: PaginationRequest,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T[]>> {
    const params = {
      page: request.page || 1,
      pageSize: request.pageSize || 20,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder,
      ...request.filters
    };

    return this.get<T[]>(url, params, config);
  }

  /**
   * 文件上传
   */
  async upload<T = unknown>(
    url: string,
    file: File,
    options?: {
      onProgress?: (progressEvent: ProgressEvent) => void;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: options?.onProgress,
    };

    return this.post<T>(url, formData, config);
  }

  /**
   * 批量操作
   */
  async batch<T = unknown>(
    url: string,
    items: unknown[],
    options?: {
      batchSize?: number;
      stopOnError?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const batchData = {
      items,
      options: {
        stopOnError: options?.stopOnError ?? false,
        batchSize: options?.batchSize ?? 100
      }
    };

    return this.post<T>(url, batchData);
  }

  /**
   * 流式数据处理
   */
  async stream<T = unknown>(
    url: string,
    onData: (chunk: T) => void,
    config?: AxiosRequestConfig
  ): Promise<void> {
    const response = await this.axiosInstance.get(url, {
      ...config,
      responseType: 'stream'
    });

    response.data.on('data', (chunk: Buffer) => {
      try {
        const data = JSON.parse(chunk.toString()) as T;
        onData(data);
      } catch (error) {
        console.error('Failed to parse stream data:', error);
      }
    });

    return new Promise((resolve, reject) => {
      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string, persistent = false): void {
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem('authToken', token);
  }

  /**
   * 清除认证令牌
   */
  clearAuthToken(): void {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  }

  /**
   * 获取原始axios实例（用于特殊场景）
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// 默认实例
export const httpClient = new StandardHttpClient();

// 针对特定服务的客户端实例
export const createServiceClient = (baseURL: string, config?: Partial<HttpClientConfig>) => {
  return new StandardHttpClient({
    ...config,
    baseURL
  });
};

// 导出常用类型
export type { ApiResponse } from '../types/standardApi';