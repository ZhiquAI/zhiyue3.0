/**
 * 统一API类型定义
 * 标准化请求和响应格式
 */

// 统一API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
  errors?: ApiError[];
  pagination?: PaginationInfo;
  metadata?: Record<string, any>;
}

// API错误信息
export interface ApiError {
  field?: string;
  code: string;
  message: string;
  details?: any;
}

// 分页信息
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 请求基类
export interface BaseRequest {
  requestId?: string;
  timestamp?: string;
}

// 分页请求
export interface PaginationRequest extends BaseRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// 批量操作请求
export interface BatchRequest<T> extends BaseRequest {
  items: T[];
  options?: {
    stopOnError?: boolean;
    parallel?: boolean;
    batchSize?: number;
  };
}

// 文件上传请求
export interface FileUploadRequest extends BaseRequest {
  file: File;
  metadata?: Record<string, any>;
  options?: {
    chunkSize?: number;
    timeout?: number;
    retryAttempts?: number;
  };
}

// API错误码枚举
export enum ApiErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  
  // 业务错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_IN_USE = 'RESOURCE_IN_USE',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // 文件处理错误
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_SUPPORTED = 'FILE_TYPE_NOT_SUPPORTED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_PROCESSING_FAILED = 'FILE_PROCESSING_FAILED',
  
  // 阅卷相关错误
  GRADING_TASK_NOT_FOUND = 'GRADING_TASK_NOT_FOUND',
  GRADER_NOT_AVAILABLE = 'GRADER_NOT_AVAILABLE',
  GRADING_IN_PROGRESS = 'GRADING_IN_PROGRESS',
  INVALID_SCORE = 'INVALID_SCORE',
  
  // OCR相关错误
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED',
  IMAGE_QUALITY_TOO_LOW = 'IMAGE_QUALITY_TOO_LOW',
  TEXT_RECOGNITION_FAILED = 'TEXT_RECOGNITION_FAILED'
}

// HTTP状态码映射
export const ERROR_CODE_TO_HTTP_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.UNKNOWN_ERROR]: 500,
  [ApiErrorCode.INVALID_REQUEST]: 400,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.SERVER_ERROR]: 500,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.REQUIRED_FIELD_MISSING]: 400,
  [ApiErrorCode.INVALID_FORMAT]: 400,
  [ApiErrorCode.OUT_OF_RANGE]: 400,
  
  [ApiErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ApiErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ApiErrorCode.RESOURCE_IN_USE]: 409,
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ApiErrorCode.QUOTA_EXCEEDED]: 429,
  
  [ApiErrorCode.FILE_TOO_LARGE]: 413,
  [ApiErrorCode.FILE_TYPE_NOT_SUPPORTED]: 415,
  [ApiErrorCode.FILE_UPLOAD_FAILED]: 500,
  [ApiErrorCode.FILE_PROCESSING_FAILED]: 500,
  
  [ApiErrorCode.GRADING_TASK_NOT_FOUND]: 404,
  [ApiErrorCode.GRADER_NOT_AVAILABLE]: 409,
  [ApiErrorCode.GRADING_IN_PROGRESS]: 409,
  [ApiErrorCode.INVALID_SCORE]: 400,
  
  [ApiErrorCode.OCR_PROCESSING_FAILED]: 500,
  [ApiErrorCode.IMAGE_QUALITY_TOO_LOW]: 400,
  [ApiErrorCode.TEXT_RECOGNITION_FAILED]: 500
};

// 成功响应构建器
export class ApiResponseBuilder {
  static success<T>(data?: T, message = '操作成功'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      code: 'SUCCESS',
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };
  }
  
  static error(
    code: ApiErrorCode, 
    message?: string, 
    errors?: ApiError[]
  ): ApiResponse {
    return {
      success: false,
      message: message || this.getDefaultErrorMessage(code),
      code,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      errors
    };
  }
  
  static paginated<T>(
    data: T[], 
    pagination: PaginationInfo, 
    message = '查询成功'
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      message,
      code: 'SUCCESS',
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      pagination
    };
  }
  
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private static getDefaultErrorMessage(code: ApiErrorCode): string {
    const messages: Record<ApiErrorCode, string> = {
      [ApiErrorCode.UNKNOWN_ERROR]: '未知错误',
      [ApiErrorCode.INVALID_REQUEST]: '请求格式错误',
      [ApiErrorCode.UNAUTHORIZED]: '未授权访问',
      [ApiErrorCode.FORBIDDEN]: '访问被禁止',
      [ApiErrorCode.NOT_FOUND]: '资源未找到',
      [ApiErrorCode.METHOD_NOT_ALLOWED]: '请求方法不允许',
      [ApiErrorCode.RATE_LIMITED]: '请求过于频繁',
      [ApiErrorCode.SERVER_ERROR]: '服务器内部错误',
      [ApiErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用',
      
      [ApiErrorCode.VALIDATION_ERROR]: '数据验证失败',
      [ApiErrorCode.REQUIRED_FIELD_MISSING]: '缺少必填字段',
      [ApiErrorCode.INVALID_FORMAT]: '数据格式错误',
      [ApiErrorCode.OUT_OF_RANGE]: '数据超出允许范围',
      
      [ApiErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
      [ApiErrorCode.RESOURCE_ALREADY_EXISTS]: '资源已存在',
      [ApiErrorCode.RESOURCE_IN_USE]: '资源正在使用中',
      [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
      [ApiErrorCode.QUOTA_EXCEEDED]: '已超出配额限制',
      
      [ApiErrorCode.FILE_TOO_LARGE]: '文件过大',
      [ApiErrorCode.FILE_TYPE_NOT_SUPPORTED]: '不支持的文件类型',
      [ApiErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
      [ApiErrorCode.FILE_PROCESSING_FAILED]: '文件处理失败',
      
      [ApiErrorCode.GRADING_TASK_NOT_FOUND]: '阅卷任务未找到',
      [ApiErrorCode.GRADER_NOT_AVAILABLE]: '阅卷员不可用',
      [ApiErrorCode.GRADING_IN_PROGRESS]: '阅卷正在进行中',
      [ApiErrorCode.INVALID_SCORE]: '评分无效',
      
      [ApiErrorCode.OCR_PROCESSING_FAILED]: 'OCR识别失败',
      [ApiErrorCode.IMAGE_QUALITY_TOO_LOW]: '图像质量过低',
      [ApiErrorCode.TEXT_RECOGNITION_FAILED]: '文字识别失败'
    };
    
    return messages[code] || '操作失败';
  }
}

// API异常类
export class ApiException extends Error {
  constructor(
    public code: ApiErrorCode,
    message?: string,
    public errors?: ApiError[],
    public statusCode?: number
  ) {
    super(message || ApiResponseBuilder.getDefaultErrorMessage(code));
    this.name = 'ApiException';
    this.statusCode = statusCode || ERROR_CODE_TO_HTTP_STATUS[code] || 500;
  }
  
  toResponse(): ApiResponse {
    return ApiResponseBuilder.error(this.code, this.message, this.errors);
  }
}