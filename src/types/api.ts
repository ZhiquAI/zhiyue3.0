// 统一的API类型定义

// 基础响应类型
export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> extends BaseApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 错误响应类型
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  error_code?: string;
  status_code?: number;
  request_id?: string;
}

// 文件上传响应类型
export interface FileUploadResponse {
  filename: string;
  original_name: string;
  url: string;
  size: number;
  content_type: string;
}

// 批量操作结果类型
export interface BatchOperationResult<T = unknown> {
  total: number;
  success_count: number;
  failed_count: number;
  success_records: T[];
  failed_records: Array<{
    index: number;
    data: Record<string, unknown>;
    error: string;
  }>;
}

// 统计信息类型
export interface StatisticsResponse {
  total: number;
  distribution: Record<string, number>;
  trends?: Array<{
    date: string;
    count: number;
  }>;
}

// 考试相关类型
export interface Exam {
  id: string;
  name: string;
  subject: string;
  grade: string;
  description?: string;
  status: "draft" | "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
  creator_id: string;
  total_questions?: number;
  objective_questions?: number;
  subjective_questions?: number;
  total_score?: number;
  duration?: number; // 考试时长（分钟）
  start_time?: string;
  end_time?: string;
}

export interface ExamCreateRequest {
  name: string;
  subject: string;
  grade: string;
  description?: string;
  total_questions?: number;
  objective_questions?: number;
  subjective_questions?: number;
  total_score?: number;
  duration?: number;
  start_time?: string;
  end_time?: string;
}

export interface ExamUpdateRequest extends Partial<ExamCreateRequest> {
  status?: "draft" | "active" | "completed" | "archived";
}

// 学生相关类型
export interface Student {
  uuid: string;
  student_id: string;
  student_name: string;
  class_name: string;
  grade?: string;
  school?: string;
  gender?: "male" | "female" | "other";
  contact_phone?: string;
  parent_phone?: string;
  address?: string;
  barcode_data?: string;
  exam_number?: string;
  seat_number?: string;
  exam_hall?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCreateRequest {
  student_id: string;
  student_name: string;
  class_name: string;
  grade?: string;
  school?: string;
  gender?: "male" | "female" | "other";
  contact_phone?: string;
  parent_phone?: string;
  address?: string;
}

export interface StudentUpdateRequest extends Partial<StudentCreateRequest> {
  is_active?: boolean;
}

// 答题卡模板相关类型
export interface TemplateRegion {
  id: string;
  type: "positioning" | "barcode" | "objective" | "subjective";
  x: number;
  y: number;
  width: number;
  height: number;
  properties: {
    questionNumber?: string;
    maxScore?: number;
    optionCount?: number;
    [key: string]: unknown;
  };
}

export interface TemplateData {
  regions: TemplateRegion[];
  pageConfig: {
    width: number;
    height: number;
    dpi: number;
  };
  backgroundImage?: string;
}

export interface Template {
  id: number;
  name: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  exam_type?: string;
  template_data: TemplateData;
  page_width: number;
  page_height: number;
  dpi: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface TemplateCreateRequest {
  name: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  exam_type?: string;
  template_data: TemplateData;
  page_width: number;
  page_height: number;
  dpi: number;
}

export interface TemplateUpdateRequest extends Partial<TemplateCreateRequest> {
  is_active?: boolean;
}

// 阅卷相关类型
export interface GradingTask {
  id: string;
  exam_id: string;
  question_id: string;
  question_type: "objective" | "subjective";
  status: "pending" | "in_progress" | "completed" | "failed";
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  total_submissions: number;
  completed_submissions: number;
}

export interface GradingResult {
  id: string;
  task_id: string;
  student_id: string;
  question_id: string;
  score: number;
  max_score: number;
  feedback?: string;
  grader_id: string;
  grading_method: "manual" | "ai" | "hybrid";
  confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface GradingRequest {
  question_type: "objective" | "subjective";
  question_text: string;
  student_answer?: string;
  correct_answer?: string;
  total_points: number;
  config?: Record<string, unknown>;
}

export interface BatchGradingRequest {
  questions: GradingRequest[];
  config?: Record<string, unknown>;
}

// 分析报告相关类型
export interface AnalysisReport {
  id: string;
  exam_id: string;
  type: "exam" | "class" | "student" | "question";
  title: string;
  summary: string;
  data: Record<string, unknown>;
  charts: Array<{
    type: string;
    title: string;
    data: unknown;
  }>;
  recommendations: string[];
  created_at: string;
  updated_at: string;
}

// 用户认证相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "teacher" | "student";
  school?: string;
  subject?: string;
  grades?: string[];
  avatar?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  school?: string;
  subject?: string;
  role?: "teacher" | "student";
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  code: string;
  new_password: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  school?: string;
  subject?: string;
  grades?: string[];
  avatar?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// 条形码相关类型
export interface BarcodeData {
  student_id: string;
  name: string;
  class_name: string;
  exam_number?: string;
  paper_type?: string;
}

export interface BarcodeGenerateRequest extends BarcodeData {
  barcode_type?: string;
  data_format?: string;
}

export interface BarcodeRecognitionResult {
  success: boolean;
  barcode_data: BarcodeData;
  confidence: number;
  raw_data: string;
  format: string;
}

// 质量检测相关类型
export interface QualityMetrics {
  overall_score: number;
  clarity: number;
  contrast: number;
  brightness: number;
  skew_angle: number;
  noise_level: number;
  resolution: number;
  issues: string[];
  recommendations: string[];
}

export interface QualityCheckResult {
  file_id: string;
  filename: string;
  quality: QualityMetrics;
  passed: boolean;
  enhanced?: boolean;
  processing_time: number;
}

// 批处理相关类型
export interface BatchJob {
  id: string;
  type: "upload" | "grading" | "analysis" | "export";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  total_items: number;
  processed_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
  error_message?: string;
}

export interface BatchJobResult<T = unknown> {
  job_id: string;
  status: string;
  results: T[];
  errors: Array<{
    item_id: string;
    error: string;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// 系统配置相关类型
export interface SystemConfig {
  ocr_config: {
    provider: string;
    api_key?: string;
    model?: string;
    confidence_threshold: number;
  };
  file_config: {
    max_file_size: number;
    allowed_extensions: string[];
    upload_path: string;
  };
  features: {
    ai_analysis_enabled: boolean;
    ai_suggestion_enabled: boolean;
    batch_processing_enabled: boolean;
  };
  limits: {
    max_concurrent_jobs: number;
    max_file_uploads: number;
    api_rate_limit: number;
  };
}

// 通用查询参数类型
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  filters?: Record<string, unknown>;
}

// 导出相关类型
export interface ExportRequest {
  format: "excel" | "csv" | "pdf" | "json";
  data_type: "students" | "results" | "analysis" | "templates";
  filters?: Record<string, unknown>;
  include_images?: boolean;
  include_statistics?: boolean;
}

export interface ExportResult {
  download_url: string;
  file_size: number;
  expires_at: string;
  format: string;
}
