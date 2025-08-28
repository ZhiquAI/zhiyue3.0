import { apiClient } from '../services/httpClient';

// ==================== 类型定义 ====================

interface QuestionGradingRequest {
  question_id: string;
  student_answer: string;
  correct_answer?: string;
  total_points: number;
  config?: Record<string, unknown>;
}

interface BatchGradingRequest {
  questions: QuestionGradingRequest[];
  config?: Record<string, unknown>;
}

interface AIAnalysisRequest {
  question: Record<string, unknown>;
  grading_result: Record<string, unknown>;
}

interface QualityAssessmentRequest {
  questions: Record<string, unknown>[];
  grading_results: Record<string, unknown>[];
}

interface QuestionSegmentationRequest {
  ocr_result: Record<string, unknown>;
  exam_config?: Record<string, unknown>;
}

interface QuestionClassificationRequest {
  question_text: string;
  context?: Record<string, unknown>;
}

interface StandardResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

// ==================== API服务 ====================

// 分类评分API
export const classifiedGradingApi = {
  // 评分单个题目
  gradeQuestion: async (request: QuestionGradingRequest): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/classified-grading/grade', request);
    return response.data;
  },

  // 批量评分题目
  batchGrade: async (request: BatchGradingRequest): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/classified-grading/batch-grade', request);
    return response.data;
  },

  // 获取AI分析
  getAIAnalysis: async (request: AIAnalysisRequest): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/classified-grading/ai-analysis', request);
    return response.data;
  },

  // 评估评分质量
  assessQuality: async (request: QualityAssessmentRequest): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/classified-grading/quality-assessment', request);
    return response.data;
  },

  // 生成评分报告
  generateReport: async (request: Record<string, unknown>): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/grading/classified/generate-report', request);
    return response.data;
  },

  // 导出评分结果
  exportResults: async (examId: string, format: string = 'excel'): Promise<Blob> => {
    return await apiClient.download(`/api/grading/classified/export?exam_id=${examId}&format=${format}`);
  },

  // 获取历史记录
  getHistory: async (): Promise<StandardResponse<unknown>> => {
    const response = await apiClient.get<StandardResponse<unknown>>('/api/grading/classified/history');
    return response.data;
  },
};

// 题目切分API
export const questionSegmentationApi = {
  // 切分题目
  segmentQuestions: async (request: QuestionSegmentationRequest): Promise<StandardResponse<unknown>> => {
    const response = await apiClient.post<StandardResponse<unknown>>('/api/question-segmentation/segment', request);
    return response.data;
  },

  // 验证切题结果
  validateSegmentation: async (request: Record<string, unknown>): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/question-segmentation/validate', request);
    return response.data;
  },

  // 保存切题配置
  saveConfig: async (config: Record<string, unknown>): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/question-segmentation/config', config);
    return response.data;
  },
};

// 题目分类API
export const questionClassificationApi = {
  // 分类题目
  classifyQuestions: async (request: QuestionClassificationRequest): Promise<StandardResponse<unknown>> => {
    const response = await apiClient.post<StandardResponse<unknown>>('/api/question-classification/classify', request);
    return response.data;
  },

  // 更新分类器配置
  updateConfig: async (config: Record<string, unknown>): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/question-classifier/config', config);
    return response.data;
  },

  // 训练分类器
  trainClassifier: async (trainingData: Record<string, unknown>): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/question-classifier/train', trainingData);
    return response.data;
  },

  // 评估分类器性能
  evaluateClassifier: async (testData: Record<string, unknown>): Promise<StandardResponse> => {
    const response = await apiClient.post<StandardResponse>('/api/question-classifier/evaluate', testData);
    return response.data;
  },
};

// 导出所有API
export default {
  classifiedGradingApi,
  questionSegmentationApi,
  questionClassificationApi,
};