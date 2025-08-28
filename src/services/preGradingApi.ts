import { 
  PreGradingConfiguration, 
  StandardizedAnswerSheet, 
  BatchProcessingResult,
  QualityMetrics,
  StudentIdentity
} from '../types/preGrading';
import { apiClient } from './httpClient';
import { BaseApiResponse } from '../types/api';

class PreGradingApiClient {

  // ==================== 工作流管理 API ====================

  /**
   * 初始化阅卷前处理工作流
   */
  async initializeWorkflow(
    examId: string, 
    configuration: PreGradingConfiguration
  ): Promise<{ workflowId: string }> {
    const response = await apiClient.post<BaseApiResponse<{ workflowId: string }>>('/pre-grading/workflows', {
      examId,
      configuration
    });
    return response.data.data;
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(
    workflowId: string
  ): Promise<{
    status: string;
    progress: number;
    currentStage: string;
    statistics: Record<string, number>;
  }> {
    const response = await apiClient.get<BaseApiResponse<{
      status: string;
      progress: number;
      currentStage: string;
      statistics: Record<string, number>;
    }>>(`/pre-grading/workflows/${workflowId}/status`);
    return response.data.data;
  }

  /**
   * 更新工作流配置
   */
  async updateWorkflowConfiguration(
    workflowId: string,
    configuration: Partial<PreGradingConfiguration>
  ): Promise<void> {
    await apiClient.patch(`/pre-grading/workflows/${workflowId}/configuration`, configuration);
  }

  // ==================== 学生信息管理 API ====================

  /**
   * 批量导入学生信息
   */
  async importStudents(
    examId: string,
    file: File
  ): Promise<{
    imported: number;
    failed: number;
    duplicates: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('examId', examId);
    
    const response = await apiClient.upload<BaseApiResponse<{
      imported: number;
      failed: number;
      duplicates: number;
      errors: string[];
    }>>('/pre-grading/students/import', formData);
    return response.data.data;
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
  ): Promise<{
    students: StudentIdentity[];
    total: number;
    statistics: Record<string, number>;
  }> {
    const params = new URLSearchParams({ examId });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const response = await apiClient.get<BaseApiResponse<{
      students: StudentIdentity[];
      total: number;
      statistics: Record<string, number>;
    }>>(`/pre-grading/students?${params}`);
    return response.data.data;
  }

  /**
   * 添加单个学生
   */
  async addStudent(
    examId: string,
    student: Omit<StudentIdentity, 'verificationStatus' | 'confidence' | 'verificationMethods'>
  ): Promise<StudentIdentity> {
    const response = await apiClient.post<BaseApiResponse<StudentIdentity>>('/pre-grading/students', {
      examId,
      ...student
    });
    return response.data.data;
  }

  /**
   * 更新学生信息
   */
  async updateStudent(
    examId: string,
    studentId: string,
    updates: Partial<StudentIdentity>
  ): Promise<StudentIdentity> {
    const response = await apiClient.put<BaseApiResponse<StudentIdentity>>(`/pre-grading/students/${studentId}`, {
      examId,
      ...updates
    });
    return response.data.data;
  }

  /**
   * 删除学生
   */
  async deleteStudent(
    examId: string,
    studentId: string
  ): Promise<void> {
    await apiClient.delete(`/pre-grading/students/${studentId}?examId=${examId}`);
  }

  // ==================== 答题卡模板管理 API ====================

  /**
   * 获取模板列表
   */
  async getTemplates(): Promise<{
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
  }> {
    const response = await apiClient.get<BaseApiResponse<{
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
    }>>('/pre-grading/templates');
    return response.data.data;
  }

  /**
   * 创建新模板
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
  ): Promise<{ templateId: string }> {
    const response = await apiClient.post<BaseApiResponse<{ templateId: string }>>('/pre-grading/templates', template);
    return response.data.data;
  }

  // ==================== 答题卡生成与上传 API ====================

  /**
   * 生成答题卡
   */
  async generateAnswerSheets(
    examId: string,
    templateId: string,
    options?: {
      studentIds?: string[];
      includeBarcode?: boolean;
      includeQRCode?: boolean;
    }
  ): Promise<{
    jobId: string;
    downloadUrl?: string;
    estimatedTime: number;
  }> {
    const response = await apiClient.post<BaseApiResponse<{
      jobId: string;
      downloadUrl?: string;
      estimatedTime: number;
    }>>('/pre-grading/answer-sheets/generate', {
      examId,
      templateId,
      ...options
    });
    return response.data.data;
  }

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
  ): Promise<BatchProcessingResult> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('examId', examId);
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }
    
    const response = await apiClient.upload<BaseApiResponse<BatchProcessingResult>>('/pre-grading/answer-sheets/upload', formData);
    return response.data.data;
  }

  /**
   * 获取上传进度
   */
  async getUploadProgress(
    batchId: string
  ): Promise<{
    progress: number;
    completed: number;
    failed: number;
    processing: number;
    estimatedRemaining: number;
  }> {
    const response = await apiClient.get<BaseApiResponse<{
      progress: number;
      completed: number;
      failed: number;
      processing: number;
      estimatedRemaining: number;
    }>>(`/pre-grading/upload/progress/${batchId}`);
    return response.data.data;
  }

  /**
   * 取消上传
   */
  async cancelUpload(batchId: string): Promise<void> {
    await apiClient.delete(`/pre-grading/upload/${batchId}`);
  }

  // ==================== 图像质量分析 API ====================

  /**
   * 单张图像质量分析
   */
  async analyzeImageQuality(file: File): Promise<QualityMetrics> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload<BaseApiResponse<QualityMetrics>>('/pre-grading/quality/analyze', formData);
    return response.data.data;
  }

  /**
   * 批量质量分析
   */
  async batchAnalyzeQuality(
    sheetIds: string[],
    options?: {
      enableEnhancement?: boolean;
      qualityThreshold?: number;
    }
  ): Promise<{
    jobId: string;
    results: Array<{
      sheetId: string;
      quality: QualityMetrics;
      enhanced?: boolean;
    }>;
  }> {
    const response = await apiClient.post<BaseApiResponse<{
      jobId: string;
      results: Array<{
        sheetId: string;
        quality: QualityMetrics;
        enhanced?: boolean;
      }>;
    }>>('/pre-grading/quality/batch-analyze', {
      sheetIds,
      ...options
    });
    return response.data.data;
  }

  /**
   * 图像增强
   */
  async enhanceImage(
    sheetId: string,
    options?: {
      enhanceContrast?: boolean;
      reduceNoise?: boolean;
      correctSkew?: boolean;
    }
  ): Promise<{
    enhancedImageUrl: string;
    qualityImprovement: number;
    processingTime: number;
  }> {
    const response = await apiClient.post<BaseApiResponse<{
      enhancedImageUrl: string;
      qualityImprovement: number;
      processingTime: number;
    }>>(`/pre-grading/quality/enhance/${sheetId}`, options);
    return response.data.data;
  }

  // ==================== 身份识别 API ====================

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
  ): Promise<{
    jobId: string;
    results: Array<{
      sheetId: string;
      identity: StudentIdentity;
      matchedStudent?: StudentIdentity;
    }>;
  }> {
    const response = await apiClient.post<BaseApiResponse<{
      jobId: string;
      results: Array<{
        sheetId: string;
        identity: StudentIdentity;
        matchedStudent?: StudentIdentity;
      }>;
    }>>('/pre-grading/identity/batch-recognize', {
      sheetIds,
      ...options
    });
    return response.data.data;
  }

  /**
   * 手动验证身份
   */
  async manualVerifyIdentity(
    sheetId: string,
    studentId: string,
    verificationNote?: string
  ): Promise<void> {
    await apiClient.post(`/pre-grading/identity/manual-verify/${sheetId}`, {
      studentId,
      verificationNote
    });
  }

  // ==================== 结构分析 API ====================

  /**
   * 批量结构分析
   */
  async batchStructureAnalysis(
    sheetIds: string[],
    options?: {
      templateId?: string;
      enableAISegmentation?: boolean;
      confidenceThreshold?: number;
    }
  ): Promise<{
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
  }> {
    const response = await apiClient.post<BaseApiResponse<{
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
    }>>('/pre-grading/structure/batch-analyze', {
      sheetIds,
      ...options
    });
    return response.data.data;
  }

  /**
   * 调整题目分割
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
  ): Promise<void> {
    await apiClient.post(`/pre-grading/structure/adjust/${sheetId}`, {
      adjustments
    });
  }

  // ==================== 验证与导出 API ====================

  /**
   * 验证答题卡
   */
  async validateAnswerSheets(
    examId: string,
    options?: {
      qualityThreshold?: number;
      identityVerificationRequired?: boolean;
      structureValidationRequired?: boolean;
    }
  ): Promise<{
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
  }> {
    const response = await apiClient.post<BaseApiResponse<{
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
    }>>(`/pre-grading/validate/${examId}`, options);
    return response.data.data;
  }

  /**
   * 获取处理后的答题卡
   */
  async getProcessedAnswerSheets(
    examId: string,
    filters?: {
      status?: string;
      hasIssues?: boolean;
      qualityRange?: [number, number];
    }
  ): Promise<{
    sheets: StandardizedAnswerSheet[];
    total: number;
    statistics: Record<string, number>;
  }> {
    const params = new URLSearchParams({ examId });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    const response = await apiClient.get<BaseApiResponse<{
      sheets: StandardizedAnswerSheet[];
      total: number;
      statistics: Record<string, number>;
    }>>(`/pre-grading/processed-sheets?${params}`);
    return response.data.data;
  }

  /**
   * 重试处理
   */
  async retryProcessing(
    sheetId: string,
    options?: {
      stage?: 'quality' | 'identity' | 'structure' | 'all';
      forceReprocess?: boolean;
    }
  ): Promise<{
    jobId: string;
    estimatedTime: number;
  }> {
    const response = await apiClient.post<BaseApiResponse<{
      jobId: string;
      estimatedTime: number;
    }>>(`/pre-grading/retry/${sheetId}`, options);
    return response.data.data;
  }

  /**
   * 导出结果
   */
  async exportResults(
    examId: string,
    format: 'json' | 'csv' | 'excel',
    options?: {
      includeImages?: boolean;
      includeStatistics?: boolean;
      filterOptions?: Record<string, unknown>;
    }
  ): Promise<{
    downloadUrl: string;
    fileSize: number;
    expiresAt: string;
  }> {
    const response = await apiClient.post<BaseApiResponse<{
      downloadUrl: string;
      fileSize: number;
      expiresAt: string;
    }>>(`/pre-grading/export/${examId}`, {
      format,
      ...options
    });
    return response.data.data;
  }

  // ==================== 统计分析 API ====================

  /**
   * 获取处理统计
   */
  async getProcessingStatistics(
    examId: string,
    timeRange?: {
      startTime: string;
      endTime: string;
    }
  ): Promise<{
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
  }> {
    const params = new URLSearchParams({ examId });
    if (timeRange) {
      params.append('startTime', timeRange.startTime);
      params.append('endTime', timeRange.endTime);
    }
    
    const response = await apiClient.get<BaseApiResponse<{
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
    }>>(`/pre-grading/statistics?${params}`);
    return response.data.data;
  }
}

// 导出实例
export const preGradingApi = new PreGradingApiClient();

// 导出类型
export type { PreGradingApiClient };
export default preGradingApi;