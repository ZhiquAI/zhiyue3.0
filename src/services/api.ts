// API服务层 - 统一管理所有后端交互
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { message } from 'antd';

// API配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_TIMEOUT = 30000;

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
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
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    handleApiError(error);
    return Promise.reject(error);
  }
);

// 错误处理
const handleApiError = (error: AxiosError) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        message.error('登录已过期，请重新登录');
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        break;
      case 403:
        message.error('权限不足，无法访问该资源');
        break;
      case 404:
        message.error('请求的资源不存在');
        break;
      case 422:
        const validationErrors = (data as any)?.errors;
        if (validationErrors) {
          Object.values(validationErrors).forEach((errorMsg: any) => {
            message.error(errorMsg);
          });
        } else {
          message.error('请求参数有误');
        }
        break;
      case 500:
        message.error('服务器内部错误，请稍后重试');
        break;
      default:
        message.error(`请求失败: ${(data as any)?.message || '未知错误'}`);
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

// API接口定义
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 考试相关API
export const examApi = {
  // 获取考试列表
  getExams: async (params?: {
    page?: number;
    limit?: number;
    subject?: string;
    grade?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get('/exams', { params });
    return response.data;
  },

  // 创建考试
  createExam: async (examData: FormData): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/exams', examData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 获取考试详情
  getExam: async (examId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/exams/${examId}`);
    return response.data;
  },

  // 更新考试配置
  updateExamConfig: async (examId: string, config: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/exams/${examId}/config`, config);
    return response.data;
  },

  // 批量上传答题卡
  uploadAnswerSheets: async (examId: string, files: FormData): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/exams/${examId}/submissions/batch`, files, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2分钟超时
    });
    return response.data;
  },

  // 删除考试
  deleteExam: async (examId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/exams/${examId}`);
    return response.data;
  },
};

// 阅卷相关API
export const markingApi = {
  // 获取阅卷任务列表
  getMarkingTasks: async (params?: {
    status?: string;
    examId?: string;
  }): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/marking/tasks', { params });
    return response.data;
  },

  // 获取下一份待阅卷答卷
  getNextSubmission: async (examId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/exams/${examId}/marking/next_submission`);
    return response.data;
  },

  // 提交阅卷结果
  submitMarkingResult: async (submissionId: string, result: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/submissions/${submissionId}/review`, result);
    return response.data;
  },

  // 获取阅卷进度
  getMarkingProgress: async (examId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/exams/${examId}/marking/progress`);
    return response.data;
  },
};

// 分析相关API
export const analysisApi = {
  // 获取考试分析报告
  getExamAnalysis: async (examId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/analytics/exams/${examId}`);
    return response.data;
  },

  // 获取年级分析数据
  getGradeAnalysis: async (params: {
    subject: string;
    grade: string;
    timeRange?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/analytics/grade', { params });
    return response.data;
  },

  // 获取班级分析数据
  getClassAnalysis: async (examId: string, className: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/analytics/exams/${examId}/classes/${className}`);
    return response.data;
  },

  // 获取学生个人分析
  getStudentAnalysis: async (examId: string, studentId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/analytics/exams/${examId}/students/${studentId}`);
    return response.data;
  },
};

// 用户认证API
export const authApi = {
  // 登录
  login: async (credentials: { username: string; password: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  // 登出
  logout: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // 刷新token
  refreshToken: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
};

// 文件上传API
export const uploadApi = {
  // 上传单个文件
  uploadFile: async (file: File, type: 'paper' | 'answer' | 'submission'): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 批量上传文件
  uploadFiles: async (files: File[], type: string): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    formData.append('type', type);
    
    const response = await apiClient.post('/upload/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5分钟超时
    });
    return response.data;
  },
};

export default apiClient;