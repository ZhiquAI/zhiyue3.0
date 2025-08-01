import { 
  PreGradingConfiguration, 
  StandardizedAnswerSheet, 
  BatchProcessingResult,
  PreGradingApiResponse,
  QualityMetrics,
  StudentIdentity
} from '../types/preGrading';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class PreGradingApiClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<PreGradingApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // 获取认证token
    const token = localStorage.getItem('auth_token');
    const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...authHeaders,
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // 文件上传请求
  private async uploadRequest<T>(
    endpoint: string,
    files: File[],
    additionalData?: Record<string, unknown>
  ): Promise<PreGradingApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();

    // 添加文件
    files.forEach((file) => {
      formData.append(`files`, file);
    });

    // 添加额外数据
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          formData.append(key, stringValue);
        }
      });
    }

    // 获取认证token
    const token = localStorage.getItem('auth_token');
    const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Upload request failed:', error);
      throw error;
    }
  }

  // ==================== 工作流管理 API ====================

  /**
   * 初始化阅卷前处理工作流
   */
  async initializeWorkflow(
    examId: string, 
    configuration: PreGradingConfiguration
  ): Promise<PreGradingApiResponse<{ workflowId: string }>> {
    return this.request(`/pre-grading/workflows`, {
      method: 'POST',
      body: JSON.stringify({
        examId,
        configuration
      })
    });
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(
    workflowId: string
  ): Promise<PreGradingApiResponse<{
    status: string;
    progress: number;
    currentStage: string;
    statistics: Record<string, number>;
  }>> {
    return this.request(`/pre-grading/workflows/${workflowId}/status`);
  }

  /**
   * 更新工作流配置
   */
  async updateWorkflowConfiguration(
    workflowId: string,
    configuration: Partial<PreGradingConfiguration>
  ): Promise<PreGradingApiResponse<void>> {
    return this.request(`/pre-grading/workflows/${workflowId}/configuration`, {
      method: 'PATCH',
      body: JSON.stringify(configuration)
    });
  }

  // ==================== 学生信息管理 API ====================

  /**
   * 批量导入学生信息
   */
  async importStudents(
    examId: string,
    file: File
  ): Promise<PreGradingApiResponse<{
    imported: number;
    failed: number;
    duplicates: number;
    errors: string[];
  }>> {
    return this.uploadRequest(`/pre-grading/students/import`, [file], { examId });
  }

  /**
   * 获取学生信息列表
   */
  async getStudents(
    examId: string,
    filters?: {
      class?: string;
      status?: string;
      search?: string;
    }
  ): Promise<PreGradingApiResponse<{
    students: StudentIdentity[];
    total: number;
    statistics: Record<string, number>;
  }>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    return this.request(`/pre-grading/students/${examId}?${params.toString()}`);
  }

  /**
   * 添加单个学生
   */
  async addStudent(
    examId: string,
    student: Omit<StudentIdentity, 'verificationStatus' | 'confidence' | 'verificationMethods'>
  ): Promise<PreGradingApiResponse<StudentIdentity>> {
    return this.request(`/pre-grading/students/${examId}`, {
      method: 'POST',
      body: JSON.stringify(student)
    });
  }

  /**
   * 更新学生信息
   */
  async updateStudent(
    examId: string,
    studentId: string,
    updates: Partial<StudentIdentity>
  ): Promise<PreGradingApiResponse<StudentIdentity>> {
    return this.request(`/pre-grading/students/${examId}/${studentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  /**
   * 删除学生
   */
  async deleteStudent(
    examId: string,
    studentId: string
  ): Promise<PreGradingApiResponse<void>> {
    return this.request(`/pre-grading/students/${examId}/${studentId}`, {
      method: 'DELETE'
    });
  }

  // ==================== 答题卡模板管理 API ====================

  /**
   * 获取答题卡模板列表
   */
  async getTemplates(): Promise<PreGradingApiResponse<{
    templates: Array<{
      id: string;
      name: string;
      type: 'standard' | 'custom';
      questionCount: number;
      objectiveCount: number;
      subjectiveCount: number;
      layout: string;
      status: 'active' | 'draft';
      createdAt: string;
    }>;
  }>> {
    return this.request('/pre-grading/templates');
  }

  /**
   * 创建答题卡模板
   */
  async createTemplate(
    template: {
      name: string;
      type: 'standard' | 'custom';
      questionCount: number;
      objectiveCount: number;
      subjectiveCount: number;
      layout: string;
             configuration: Record<string, unknown>;
    }
  ): Promise<PreGradingApiResponse<{ templateId: string }>> {
    return this.request('/pre-grading/templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }

  /**
   * 生成答题卡PDF
   */
  async generateAnswerSheets(
    examId: string,
    templateId: string,
    options?: {
      studentIds?: string[];
      includeBarcode?: boolean;
      includeQRCode?: boolean;
    }
  ): Promise<PreGradingApiResponse<{
    jobId: string;
    downloadUrl?: string;
    estimatedTime: number;
  }>> {
    return this.request('/pre-grading/templates/generate', {
      method: 'POST',
      body: JSON.stringify({
        examId,
        templateId,
        ...options
      })
    });
  }

  // ==================== 答题卡上传处理 API ====================

  /**
   * 批量上传答题卡
   */
  async uploadAnswerSheets(
    examId: string,
    files: File[],
    options?: {
      enableQualityCheck?: boolean;
      enableIdentityRecognition?: boolean;
      qualityThreshold?: number;
    }
  ): Promise<PreGradingApiResponse<BatchProcessingResult>> {
    return this.uploadRequest('/pre-grading/upload', files, {
      examId,
      ...options
    });
  }

  /**
   * 获取上传进度
   */
  async getUploadProgress(
    batchId: string
  ): Promise<PreGradingApiResponse<{
    progress: number;
    completed: number;
    failed: number;
    processing: number;
    estimatedRemaining: number;
  }>> {
    return this.request(`/pre-grading/upload/${batchId}/progress`);
  }

  /**
   * 取消上传任务
   */
  async cancelUpload(
    batchId: string
  ): Promise<PreGradingApiResponse<void>> {
    return this.request(`/pre-grading/upload/${batchId}/cancel`, {
      method: 'POST'
    });
  }

  // ==================== 图像质量检测 API ====================

  /**
   * 单个文件质量检测
   */
  async analyzeImageQuality(
    file: File
  ): Promise<PreGradingApiResponse<QualityMetrics>> {
    return this.uploadRequest('/pre-grading/quality/analyze', [file]);
  }

  /**
   * 批量质量检测
   */
  async batchAnalyzeQuality(
    sheetIds: string[],
    options?: {
      enableEnhancement?: boolean;
      qualityThreshold?: number;
    }
  ): Promise<PreGradingApiResponse<{
    jobId: string;
    results: Array<{
      sheetId: string;
      quality: QualityMetrics;
      enhanced?: boolean;
    }>;
  }>> {
    return this.request('/pre-grading/quality/batch-analyze', {
      method: 'POST',
      body: JSON.stringify({
        sheetIds,
        ...options
      })
    });
  }

  /**
   * 图像增强处理
   */
  async enhanceImage(
    sheetId: string,
    options?: {
      enhanceContrast?: boolean;
      reducenoise?: boolean;
      correctSkew?: boolean;
    }
  ): Promise<PreGradingApiResponse<{
    enhancedImageUrl: string;
    qualityImprovement: number;
    processingTime: number;
  }>> {
    return this.request(`/pre-grading/quality/${sheetId}/enhance`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  // ==================== 身份识别验证 API ====================

  /**
   * 批量身份识别
   */
  async batchIdentityRecognition(
    sheetIds: string[],
    options?: {
      method?: 'barcode' | 'qr_code' | 'ocr' | 'multiple';
      confidenceThreshold?: number;
      enableManualVerification?: boolean;
    }
  ): Promise<PreGradingApiResponse<{
    jobId: string;
    results: Array<{
      sheetId: string;
      identity: StudentIdentity;
      matchedStudent?: StudentIdentity;
    }>;
  }>> {
    return this.request('/pre-grading/identity/batch-recognize', {
      method: 'POST',
      body: JSON.stringify({
        sheetIds,
        ...options
      })
    });
  }

  /**
   * 手动验证身份
   */
  async manualVerifyIdentity(
    sheetId: string,
    studentId: string,
    verificationNote?: string
  ): Promise<PreGradingApiResponse<void>> {
    return this.request(`/pre-grading/identity/${sheetId}/manual-verify`, {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        verificationNote
      })
    });
  }

  // ==================== 结构分析 API ====================

  /**
   * 批量结构分析（题目分割）
   */
  async batchStructureAnalysis(
    sheetIds: string[],
    options?: {
      templateId?: string;
      enableAISegmentation?: boolean;
      confidenceThreshold?: number;
    }
  ): Promise<PreGradingApiResponse<{
    jobId: string;
    results: Array<{
      sheetId: string;
      questionStructure: {
        totalQuestions: number;
                 objectiveQuestions: unknown[];
         subjectiveRegions: unknown[];
        detectionConfidence: number;
      };
    }>;
  }>> {
    return this.request('/pre-grading/structure/batch-analyze', {
      method: 'POST',
      body: JSON.stringify({
        sheetIds,
        ...options
      })
    });
  }

  /**
   * 手动调整题目分割
   */
  async adjustQuestionSegmentation(
    sheetId: string,
    adjustments: {
      questionId: string;
      coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }[]
  ): Promise<PreGradingApiResponse<void>> {
    return this.request(`/pre-grading/structure/${sheetId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ adjustments })
    });
  }

  // ==================== 数据验证 API ====================

  /**
   * 综合数据验证
   */
  async validateAnswerSheets(
    examId: string,
    options?: {
      qualityThreshold?: number;
      identityVerificationRequired?: boolean;
      structureValidationRequired?: boolean;
    }
  ): Promise<PreGradingApiResponse<{
    validationReport: {
      totalSheets: number;
      validSheets: number;
      invalidSheets: number;
      issues: Array<{
        sheetId: string;
        type: string;
        severity: string;
        message: string;
        suggestion: string;
      }>;
      qualityDistribution: Record<string, number>;
      recommendations: string[];
    };
  }>> {
    return this.request(`/pre-grading/validation/${examId}`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  /**
   * 获取处理过的答题卡列表
   */
  async getProcessedAnswerSheets(
    examId: string,
    filters?: {
      status?: string;
      hasIssues?: boolean;
      qualityRange?: [number, number];
    }
  ): Promise<PreGradingApiResponse<{
    sheets: StandardizedAnswerSheet[];
    total: number;
    statistics: Record<string, number>;
  }>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, Array.isArray(value) ? value.join(',') : String(value));
        }
      });
    }
    
    return this.request(`/pre-grading/sheets/${examId}?${params.toString()}`);
  }

  /**
   * 重新处理答题卡
   */
  async retryProcessing(
    sheetId: string,
    options?: {
      stage?: 'quality' | 'identity' | 'structure' | 'all';
      forceReprocess?: boolean;
    }
  ): Promise<PreGradingApiResponse<{
    jobId: string;
    estimatedTime: number;
  }>> {
    return this.request(`/pre-grading/sheets/${sheetId}/retry`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  // ==================== 导出功能 API ====================

  /**
   * 导出处理结果
   */
  async exportResults(
    examId: string,
    format: 'json' | 'csv' | 'excel',
    options?: {
      includeImages?: boolean;
      includeStatistics?: boolean;
             filterOptions?: Record<string, unknown>;
    }
  ): Promise<PreGradingApiResponse<{
    downloadUrl: string;
    fileSize: number;
    expiresAt: string;
  }>> {
    return this.request(`/pre-grading/export/${examId}`, {
      method: 'POST',
      body: JSON.stringify({
        format,
        ...options
      })
    });
  }

  // ==================== 监控和统计 API ====================

  /**
   * 获取处理统计信息
   */
  async getProcessingStatistics(
    examId: string,
    timeRange?: {
      startTime: string;
      endTime: string;
    }
  ): Promise<PreGradingApiResponse<{
    overview: {
      totalProcessed: number;
      successRate: number;
      avgProcessingTime: number;
      avgQualityScore: number;
    };
    timeline: Array<{
      timestamp: string;
      processed: number;
      errors: number;
    }>;
    qualityDistribution: Record<string, number>;
    issueAnalysis: Record<string, number>;
  }>> {
    const params = new URLSearchParams();
    if (timeRange) {
      params.append('startTime', timeRange.startTime);
      params.append('endTime', timeRange.endTime);
    }
    
    return this.request(`/pre-grading/statistics/${examId}?${params.toString()}`);
  }
}

// 创建单例实例
export const preGradingApi = new PreGradingApiClient();

// 导出类型供其他地方使用
export type { PreGradingApiClient };
export default preGradingApi;