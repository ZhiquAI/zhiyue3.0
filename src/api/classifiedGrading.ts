import axios from 'axios';

// 创建API客户端实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== 类型定义 ====================

interface QuestionGradingRequest {
  question_type: string;
  question_text: string;
  student_answer?: string;
  correct_answer?: string;
  total_points: number;
  config?: Record<string, any>;
}

interface BatchGradingRequest {
  questions: QuestionGradingRequest[];
  config?: Record<string, any>;
}

interface AIAnalysisRequest {
  question: Record<string, any>;
  grading_result: Record<string, any>;
}

interface QualityAssessmentRequest {
  questions: Record<string, any>[];
  grading_results: Record<string, any>[];
}

interface ScoreAdjustmentRequest {
  question_id: string;
  new_score: number;
  reason: string;
}

interface GradingConfigRequest {
  exam_type?: string;
  mode?: string;
  partial_credit?: boolean;
  ai_assisted?: boolean;
  keyword_weight?: number;
  structure_weight?: number;
  quality_weight?: number;
  ai_weight?: number;
}

interface QuestionSegmentationRequest {
  ocr_result: Record<string, any>;
  exam_config?: Record<string, any>;
}

interface QuestionClassificationRequest {
  question_text: string;
  context?: Record<string, any>;
}

interface BatchClassificationRequest {
  questions: string[];
}

interface StandardResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

// ==================== 分类评分 API ====================

export const classifiedGradingApi = {
  // 评分单个题目
  gradeQuestion: async (request: QuestionGradingRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/grade-question', request);
    return response.data;
  },

  // 批量评分题目
  batchGrade: async (request: BatchGradingRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/batch-grade', request);
    return response.data;
  },

  // 获取AI分析
  getAIAnalysis: async (request: AIAnalysisRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/ai-analysis', request);
    return response.data;
  },

  // 评估评分质量
  assessQuality: async (request: QualityAssessmentRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/assess-quality', request);
    return response.data;
  },

  // 生成评分报告
  generateReport: async (request: Record<string, any>): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/generate-report', request);
    return response.data;
  },

  // 获取评分配置
  getConfig: async (examType: string = 'default'): Promise<StandardResponse> => {
    const response = await apiClient.get(`/api/grading/classified/config?exam_type=${examType}`);
    return response.data;
  },

  // 保存评分配置
  saveConfig: async (request: GradingConfigRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/config', request);
    return response.data;
  },

  // 调整题目分数
  adjustScore: async (request: ScoreAdjustmentRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/adjust-score', request);
    return response.data;
  },

  // 获取评分统计信息
  getStatistics: async (examId?: string, questionType?: string): Promise<StandardResponse> => {
    const params = new URLSearchParams();
    if (examId) params.append('exam_id', examId);
    if (questionType) params.append('question_type', questionType);
    
    const response = await apiClient.get(`/api/grading/classified/statistics?${params.toString()}`);
    return response.data;
  },

  // 重新评分
  regrade: async (questionIds: string[]): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/grading/classified/regrade', { question_ids: questionIds });
    return response.data;
  },

  // 导出评分结果
  exportResults: async (examId: string, format: string = 'excel'): Promise<Blob> => {
    const response = await apiClient.get(`/api/grading/classified/export?exam_id=${examId}&format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // 获取评分建议
  getSuggestions: async (questionId: string): Promise<StandardResponse> => {
    const response = await apiClient.get(`/api/grading/classified/suggestions?question_id=${questionId}`);
    return response.data;
  },

  // 健康检查
  healthCheck: async (): Promise<StandardResponse> => {
    const response = await apiClient.get('/api/grading/classified/health');
    return response.data;
  }
};

// ==================== 题目分割 API ====================

export const questionSegmentationApi = {
  // 智能切题
  segmentQuestions: async (request: QuestionSegmentationRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-segmentation/segment', request);
    return response.data;
  },

  // 验证切题结果
  validateSegmentation: async (request: Record<string, any>): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-segmentation/validate', request);
    return response.data;
  },

  // 获取切题配置
  getConfig: async (examType: string = 'default'): Promise<StandardResponse> => {
    const response = await apiClient.get(`/api/question-segmentation/config?exam_type=${examType}`);
    return response.data;
  },

  // 保存切题配置
  saveConfig: async (config: Record<string, any>): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-segmentation/config', config);
    return response.data;
  },

  // 获取切题历史
  getHistory: async (examId?: string): Promise<StandardResponse> => {
    const params = examId ? `?exam_id=${examId}` : '';
    const response = await apiClient.get(`/api/question-segmentation/history${params}`);
    return response.data;
  },

  // 删除切题结果
  deleteResult: async (resultId: string): Promise<StandardResponse> => {
    const response = await apiClient.delete(`/api/question-segmentation/result/${resultId}`);
    return response.data;
  },

  // 导出切题结果
  exportResult: async (resultId: string, format: string = 'json'): Promise<Blob> => {
    const response = await apiClient.get(`/api/question-segmentation/export/${resultId}?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // 健康检查
  healthCheck: async (): Promise<StandardResponse> => {
    const response = await apiClient.get('/api/question-segmentation/health');
    return response.data;
  }
};

// ==================== 题型分类 API ====================

export const questionClassifierApi = {
  // 分类单个题目
  classifyQuestion: async (request: QuestionClassificationRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-classifier/classify', request);
    return response.data;
  },

  // 批量分类题目
  batchClassify: async (request: BatchClassificationRequest): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-classifier/batch-classify', request);
    return response.data;
  },

  // 获取支持的题目类型
  getSupportedTypes: async (): Promise<StandardResponse> => {
    const response = await apiClient.get('/api/question-classifier/supported-types');
    return response.data;
  },

  // 获取分类统计信息
  getStatistics: async (): Promise<StandardResponse> => {
    const response = await apiClient.get('/api/question-classifier/statistics');
    return response.data;
  },

  // 更新分类器配置
  updateConfig: async (config: Record<string, any>): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-classifier/config', config);
    return response.data;
  },

  // 获取分类器配置
  getConfig: async (): Promise<StandardResponse> => {
    const response = await apiClient.get('/api/question-classifier/config');
    return response.data;
  },

  // 训练分类器
  trainClassifier: async (trainingData: Record<string, any>): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-classifier/train', trainingData);
    return response.data;
  },

  // 评估分类器性能
  evaluateClassifier: async (testData: Record<string, any>): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-classifier/evaluate', testData);
    return response.data;
  },

  // 获取分类历史
  getHistory: async (limit: number = 100): Promise<StandardResponse> => {
    const response = await apiClient.get(`/api/question-classifier/history?limit=${limit}`);
    return response.data;
  },

  // 比较分类结果
  compareResults: async (resultIds: string[]): Promise<StandardResponse> => {
    const response = await apiClient.post('/api/question-classifier/compare', { result_ids: resultIds });
    return response.data;
  },

  // 健康检查
  healthCheck: async (): Promise<StandardResponse> => {
    const response = await apiClient.get('/api/question-classifier/health');
    return response.data;
  }
};

// ==================== 通用工具函数 ====================

/**
 * 处理API错误
 */
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return '请求失败，请稍后重试';
};

/**
 * 检查API响应是否成功
 */
export const isApiSuccess = (response: StandardResponse): boolean => {
  return response.success === true;
};

/**
 * 格式化API响应数据
 */
export const formatApiResponse = <T>(response: StandardResponse<T>): T | null => {
  if (isApiSuccess(response)) {
    return response.data || null;
  }
  return null;
};

/**
 * 下载文件
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default {
  classifiedGradingApi,
  questionSegmentationApi,
  questionClassifierApi,
  handleApiError,
  isApiSuccess,
  formatApiResponse,
  downloadFile
};