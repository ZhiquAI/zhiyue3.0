/**
 * API业务类型定义
 * 定义具体的业务数据结构
 */

import { ApiResponse, PaginationInfo } from './standardApi';

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  school?: string;
  subject?: string;
  grades?: string[];
  avatar?: string;
  role: 'teacher' | 'admin' | 'student';
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  school?: string;
  subject?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

// 考试相关类型
export interface Exam {
  id: string;
  name: string;
  subject: string;
  grade: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  config: ExamConfig;
  statistics?: ExamStatistics;
}

export interface ExamConfig {
  totalQuestions: number;
  totalScore: number;
  duration: number; // minutes
  autoGrading: boolean;
  allowReview: boolean;
  showScore: boolean;
  questionTypes: QuestionType[];
}

export interface QuestionType {
  type: 'multiple_choice' | 'fill_blank' | 'essay' | 'calculation';
  count: number;
  score: number;
}

export interface ExamStatistics {
  totalSheets: number;
  gradedSheets: number;
  averageScore: number;
  completionRate: number;
  distributionData: ScoreDistribution[];
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

// 阅卷相关类型
export interface MarkingTask {
  id: string;
  examId: string;
  examName: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
  totalQuestions: number;
  completedQuestions: number;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
}

export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  score?: number;
  totalScore: number;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: string;
  answers: Answer[];
}

export interface Answer {
  questionId: string;
  questionType: string;
  studentAnswer: any;
  correctAnswer?: any;
  score: number;
  maxScore: number;
  feedback?: string;
  isCorrect?: boolean;
}

export interface MarkingProgress {
  examId: string;
  totalSheets: number;
  gradedSheets: number;
  completionRate: number;
  graderProgress: GraderProgress[];
  estimatedCompletion?: string;
}

export interface GraderProgress {
  graderId: string;
  graderName: string;
  assignedCount: number;
  completedCount: number;
  completionRate: number;
  averageGradingTime: number; // minutes
}

// 分析相关类型
export interface ExamAnalysis {
  examId: string;
  overview: {
    participantCount: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
  };
  scoreDistribution: ScoreDistribution[];
  questionAnalysis: QuestionAnalysis[];
  classComparison: ClassComparison[];
  trends: TrendData[];
}

export interface QuestionAnalysis {
  questionId: string;
  questionNumber: number;
  questionType: string;
  averageScore: number;
  maxScore: number;
  correctRate: number;
  commonErrors: CommonError[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CommonError {
  answer: string;
  count: number;
  percentage: number;
}

export interface ClassComparison {
  className: string;
  participantCount: number;
  averageScore: number;
  ranking: number;
}

export interface TrendData {
  date: string;
  value: number;
  metric: string;
}

// 条形码相关类型
export interface BarcodeData {
  studentId: string;
  name: string;
  className: string;
  examNumber?: string;
  paperType?: string;
  barcodeType: 'code128' | 'qr_code' | 'data_matrix';
  dataFormat: string;
}

export interface BarcodeTemplate {
  id: string;
  name: string;
  barcodeType: string;
  dataFormat: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  validationRules?: ValidationRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'pattern' | 'length';
  value: string | number;
  message: string;
}

export interface RecognitionResult {
  success: boolean;
  data: BarcodeData;
  confidence: number;
  processingTime: number;
  imageQuality: 'high' | 'medium' | 'low';
  errors?: string[];
}

// 文件上传相关类型
export interface UploadResult {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: UploadError[];
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export interface UploadError {
  filename: string;
  error: string;
  code: string;
}

// API响应类型别名
export type UserResponse = ApiResponse<User>;
export type AuthLoginResponse = ApiResponse<AuthResponse>;
export type ExamResponse = ApiResponse<Exam>;
export type ExamListResponse = ApiResponse<Exam[]> & { pagination: PaginationInfo };
export type MarkingTaskListResponse = ApiResponse<MarkingTask[]>;
export type SubmissionResponse = ApiResponse<Submission>;
export type AnalysisResponse = ApiResponse<ExamAnalysis>;
export type BarcodeResponse = ApiResponse<RecognitionResult>;
export type UploadResponse = ApiResponse<UploadResult>;
export type BatchUploadResponse = ApiResponse<BatchUploadResult>;

// 请求参数类型
export interface ExamListParams {
  page?: number;
  pageSize?: number;
  subject?: string;
  grade?: string;
  status?: string;
  search?: string;
}

export interface MarkingTaskParams {
  status?: string;
  examId?: string;
}

export interface AnalysisParams {
  subject: string;
  grade: string;
  timeRange?: string;
}