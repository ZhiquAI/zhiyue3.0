/**
 * API服务层 - 统一管理所有后端交互
 * 使用标准化HTTP客户端和错误处理
 */

import { createServiceClient } from './standardHttpClient';
import { ApiResponse, PaginationInfo, ApiException, ApiErrorCode } from '../types/standardApi';
import { 
  User,
  Exam,
  Submission,
  BarcodeData,
  AuthLoginResponse,
  ExamListResponse,
  UserResponse,
  ExamResponse,
  MarkingTaskListResponse,
  SubmissionResponse,
  AnalysisResponse,
  BarcodeResponse,
  UploadResponse,
  BatchUploadResponse,
  ExamListParams,
  MarkingTaskParams,
  AnalysisParams,
  LoginRequest,
  RegisterRequest
} from '../types/apiTypes';

// 定义缺失的类型
interface BarcodeTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
import { message } from '../utils/message';

// API基础URL配置 - 使用代理路径
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 创建标准化API客户端
const apiClient = createServiceClient(API_BASE_URL, {
  timeout: 30000,
  request: {
    addAuthToken: true,
    addRequestId: true,
    addTimestamp: true
  },
  response: {
    validateResponse: true,
    logResponse: true,
    retryOnError: true,
    maxRetries: 3
  }
});

// 全局错误处理中间件
apiClient.getAxiosInstance().interceptors.response.use(
  (response) => response,
  (error) => {
    if (error instanceof ApiException) {
      // 根据错误类型显示不同的提示
      switch (error.code) {
        case ApiErrorCode.UNAUTHORIZED:
          message.error('登录已过期，请重新登录');
          // 清除token并跳转到登录页
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          window.location.href = '/auth';
          break;
        case ApiErrorCode.FORBIDDEN:
          message.error('权限不足，无法访问该资源');
          break;
        case ApiErrorCode.NOT_FOUND:
          message.error('请求的资源不存在');
          break;
        case ApiErrorCode.VALIDATION_ERROR:
          if (error.errors && error.errors.length > 0) {
            error.errors.forEach(err => message.error(err.message));
          } else {
            message.error('请求参数有误');
          }
          break;
        case ApiErrorCode.SERVICE_UNAVAILABLE:
          message.error('服务暂时不可用，请稍后重试');
          break;
        case ApiErrorCode.RATE_LIMITED:
          message.error('请求过于频繁，请稍后重试');
          break;
        default:
          message.error(error.message || '操作失败');
      }
    } else {
      message.error('网络连接失败，请检查网络设置');
    }
    return Promise.reject(error);
  }
);

// 分页响应接口
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

// 考试相关接口
export const examApi = {
  // 获取考试列表
  getExams: async (params?: ExamListParams): Promise<ExamListResponse> => {
    return await apiClient.paginate('/exams', {
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
      filters: {
        subject: params?.subject,
        grade: params?.grade,
        status: params?.status,
        search: params?.search
      }
    }) as ExamListResponse;
  },

  // 创建考试
  createExam: async (examData: Partial<Exam>): Promise<ExamResponse> => {
    return await apiClient.post('/exams', examData);
  },

  // 获取考试详情
  getExam: async (examId: string): Promise<ExamResponse> => {
    return await apiClient.get(`/exams/${examId}`);
  },

  // 更新考试配置
  updateExamConfig: async (
    examId: string,
    config: Partial<Exam>
  ): Promise<ExamResponse> => {
    return await apiClient.put(`/exams/${examId}/config`, config);
  },

  // 上传答题卡
  uploadAnswerSheets: async (
    examId: string,
    files: File[]
  ): Promise<UploadResponse | BatchUploadResponse> => {
    // 上传答题卡文件
    if (files.length === 1) {
      return await apiClient.upload(`/exams/${examId}/answer-sheets`, files[0]) as UploadResponse;
    } else {
      return await apiClient.batch(`/exams/${examId}/answer-sheets`, 
        files.map(file => ({ file })), 
        { stopOnError: false }
      ) as BatchUploadResponse;
    }
  },

  // 删除考试
  deleteExam: async (examId: string): Promise<ApiResponse<boolean>> => {
    return await apiClient.delete(`/exams/${examId}`);
  },
};

// 阅卷相关接口
export const markingApi = {
  // 获取阅卷任务
  getMarkingTasks: async (params?: MarkingTaskParams): Promise<MarkingTaskListResponse> => {
    return await apiClient.get('/marking/tasks', {
      status: params?.status,
      examId: params?.examId
    });
  },

  // 获取下一个待阅卷提交
  getNextSubmission: async (examId: string): Promise<SubmissionResponse> => {
    return await apiClient.get(`/marking/exams/${examId}/next-submission`);
  },

  // 提交阅卷结果
  submitMarkingResult: async (
    submissionId: string,
    result: Partial<Submission>
  ): Promise<SubmissionResponse> => {
    return await apiClient.post(`/marking/submissions/${submissionId}/result`, result);
  },

  // 获取阅卷进度
  getMarkingProgress: async (examId: string): Promise<ApiResponse<{ progress: number; completed: number; total: number }>> => {
    return await apiClient.get(`/marking/exams/${examId}/progress`);
  },
};

// 分析相关接口
export const analysisApi = {
  // 获取考试分析
  getExamAnalysis: async (examId: string): Promise<AnalysisResponse> => {
    return await apiClient.get(`/analysis/exams/${examId}`);
  },

  // 获取年级分析
  getGradeAnalysis: async (params: AnalysisParams): Promise<AnalysisResponse> => {
    return await apiClient.get('/analysis/grade', {
      subject: params.subject,
      grade: params.grade,
      timeRange: params.timeRange
    });
  },

  // 获取班级分析
  getClassAnalysis: async (
    examId: string,
    className: string
  ): Promise<AnalysisResponse> => {
    return await apiClient.get(`/analysis/exams/${examId}/classes/${className}`);
  },

  // 获取学生分析
  getStudentAnalysis: async (
    examId: string,
    studentId: string
  ): Promise<AnalysisResponse> => {
    return await apiClient.get(`/analysis/exams/${examId}/students/${studentId}`);
  },
};

// 认证相关接口
export const authApi = {
  // 登录
  login: async (credentials: LoginRequest): Promise<AuthLoginResponse> => {
    const response = await apiClient.post('/auth/login', credentials) as AuthLoginResponse;
    // 登录成功后保存token
    if (response.success && response.data?.token) {
      apiClient.setAuthToken(response.data.token, true);
    }
    return response;
  },

  // 注册
  register: async (userData: RegisterRequest): Promise<UserResponse> => {
    return await apiClient.post('/auth/register', userData);
  },

  // 登出
  logout: async (): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.post<boolean>('/auth/logout');
    // 清除本地token
    apiClient.clearAuthToken();
    return response;
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<UserResponse> => {
    return await apiClient.get('/auth/me');
  },

  // 刷新token
  refreshToken: async (): Promise<AuthLoginResponse> => {
    const response = await apiClient.post('/auth/refresh') as AuthLoginResponse;
    if (response.success && response.data?.token) {
      apiClient.setAuthToken(response.data.token, true);
    }
    return response;
  },

  // 更新用户资料
  updateProfile: async (profileData: Partial<User>): Promise<UserResponse> => {
    return await apiClient.put('/auth/profile', profileData);
  },

  // 更新密码
  updatePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<boolean>> => {
    return await apiClient.put('/auth/password', passwordData);
  },

  // 请求密码重置
  requestPasswordReset: async (email: string): Promise<ApiResponse<boolean>> => {
    return await apiClient.post('/auth/password-reset/request', { email });
  },

  // 确认密码重置
  confirmPasswordReset: async (data: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<ApiResponse<boolean>> => {
    return await apiClient.post('/auth/password-reset/confirm', data);
  },
};

// 条形码相关接口
export const barcodeApi = {
  // 生成条形码
  generateBarcode: async (data: BarcodeData): Promise<BarcodeResponse> => {
    return await apiClient.post('/barcode/generate', {
      student_id: data.studentId,
      name: data.name,
      class_name: data.className,
      exam_number: data.examNumber,
      paper_type: data.paperType,
      barcode_type: data.barcodeType,
      data_format: data.dataFormat
    });
  },

  // 识别条形码
  recognizeBarcode: async (file: File): Promise<BarcodeResponse> => {
    return await apiClient.upload('/barcode/recognize', file);
  },

  // 通过路径识别条形码
  recognizeBarcodeByPath: async (
    imagePath: string
  ): Promise<BarcodeResponse> => {
    return await apiClient.post('/barcode/recognize-by-path', {
      image_path: imagePath
    });
  },

  // 创建条形码模板
  createTemplate: async (templateData: Omit<BarcodeTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<BarcodeTemplate>> => {
    return await apiClient.post('/barcode/templates', templateData);
  },

  // 获取模板列表
  getTemplates: async (): Promise<ApiResponse<BarcodeTemplate[]>> => {
    return await apiClient.get('/barcode/templates');
  },

  // 验证区域
  validateRegion: async (data: {
    image_path: string;
    region: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }): Promise<ApiResponse<{ valid: boolean; confidence: number }>> => {
    return await apiClient.post('/barcode/validate-region', data);
  },

  // 获取状态
  getStatus: async (): Promise<ApiResponse<{ status: string; version: string }>> => {
    return await apiClient.get('/barcode/status');
  },

  // 健康检查
  healthCheck: async (): Promise<boolean> => {
    return await apiClient.healthCheck();
  },
};

// 文件上传相关接口
export const uploadApi = {
  // 上传单个文件
  uploadFile: async (
    file: File,
    type: 'paper' | 'answer' | 'submission',
    options?: {
      onProgress?: (progressEvent: ProgressEvent) => void;
    }
  ): Promise<UploadResponse> => {
    return await apiClient.upload('/upload', file, {
      onProgress: options?.onProgress,
      metadata: { type }
    }) as UploadResponse;
  },

  // 上传多个文件
  uploadFiles: async (
    files: File[],
    type: string,
    options?: {
      batchSize?: number;
      stopOnError?: boolean;
    }
  ): Promise<BatchUploadResponse> => {
    return await apiClient.batch('/upload/batch', 
      files.map(file => ({ file, type })), 
      options
    ) as BatchUploadResponse;
  },
};

// 导出标准化API客户端实例
export { apiClient };
export default apiClient;
