// 阅卷前处理相关的类型定义

// 质量评估指标
export interface QualityMetrics {
  clarity: number;        // 清晰度 0-100
  brightness: number;     // 亮度 0-100
  contrast: number;       // 对比度 0-100
  skew: number;          // 倾斜角度
  noise: number;         // 噪声水平 0-100
  overall_score: number; // 综合评分 0-1
  issues: string[];      // 质量问题列表
}

// 身份验证结果
export interface StudentIdentity {
  studentId: string;
  name: string;
  class: string;
  examNumber?: string;
  verificationStatus: 'verified' | 'pending' | 'failed' | 'conflict';
  confidence: number;
  verificationMethods: IdentificationMethod[];
}

// 身份识别方法
export interface IdentificationMethod {
  method: 'barcode' | 'qr_code' | 'handwritten_id' | 'ocr_name' | 'manual';
  confidence: number;
  extractedData: Record<string, unknown>;
  processingTime: number;
}

// 题目区域
export interface QuestionRegion {
  questionId: string;
  questionNumber: number;
  type: 'objective' | 'subjective' | 'mixed';
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  isManuallyAdjusted: boolean;
}

// 客观题结构
export interface ObjectiveQuestion {
  questionId: string;
  questionNumber: number;
  options: string[];
  correctAnswer?: string;
  studentAnswer?: string;
  confidence: number;
  bubbleRegions: BubbleRegion[];
}

// 涂卡区域
export interface BubbleRegion {
  option: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fillLevel: number;    // 涂卡程度 0-1
  isSelected: boolean;
}

// 主观题区域
export interface SubjectiveRegion {
  questionId: string;
  questionNumber: number;
  questionType: 'short_answer' | 'essay' | 'calculation' | 'analysis';
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  extractedText?: string;
  handwritingQuality: number;
  isBlank: boolean;
}

// 处理问题
export interface ProcessingIssue {
  type: 'warning' | 'error' | 'info';
  category: 'quality' | 'identity' | 'structure' | 'content';
  message: string;
  details?: Record<string, unknown>;
  suggestedAction?: string;
  canAutoResolve: boolean;
}

// 标准化答题卡数据结构
export interface StandardizedAnswerSheet {
  // 基础信息
  id: string;
  examId: string;
  uploadTime: string;
  processingTime: number;
  
  // 学生身份
  studentIdentity: StudentIdentity;
  
  // 图像信息
  imageData: {
    originalPath: string;
    processedPath?: string;
    thumbnailPath?: string;
    previewUrl: string;
    fileSize: number;
    dimensions: {
      width: number;
      height: number;
    };
    qualityMetrics: QualityMetrics;
  };
  
  // 题目结构
  questionStructure: {
    totalQuestions: number;
    objectiveQuestions: ObjectiveQuestion[];
    subjectiveRegions: SubjectiveRegion[];
    detectionConfidence: number;
  };
  
  // 处理状态
  processingStatus: {
    stage: 'uploaded' | 'quality_checked' | 'identity_verified' | 'segmented' | 'ready' | 'error';
    progress: number;
    lastProcessed: string;
    issues: ProcessingIssue[];
    retryCount: number;
  };
  
  // 元数据
  metadata: {
    originalFilename: string;
    uploadedBy: string;
    processingVersion: string;
    templateId?: string;
    batchId?: string;
  };
}

// 阅卷前处理阶段
export type PreGradingStage = 'upload' | 'processing' | 'validation' | 'completed';

// 工作流状态
export interface PreGradingWorkflowState {
  examId: string;
  currentStage: PreGradingStage;
  stages: {
    [key in PreGradingStage]: {
      status: 'pending' | 'in_progress' | 'completed' | 'error';
      startTime?: string;
      endTime?: string;
      progress: number;
      data?: Record<string, unknown>;
    };
  };
  answerSheets: StandardizedAnswerSheet[];
  statistics: {
    totalUploaded: number;
    processed: number;
    verified: number;
    hasIssues: number;
    ready: number;
  };
  configuration: {
    qualityThreshold: number;
    identityVerificationRequired: boolean;
    autoProcessEnabled: boolean;
    batchSize: number;
  };
}

// 批处理结果
export interface BatchProcessingResult {
  batchId: string;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  processingTime: number;
  results: StandardizedAnswerSheet[];
  summary: {
    qualityDistribution: Record<string, number>;
    identityVerificationStats: Record<string, number>;
    commonIssues: Array<{
      issue: string;
      count: number;
      percentage: number;
    }>;
  };
}

// 阅卷前处理配置
export interface PreGradingConfiguration {
  exam: {
    id: string;
    name: string;
    subject: string;
    grade: string;
    questionCount: number;
    objectiveQuestionCount: number;
    subjectiveQuestionCount: number;
  };
  processing: {
    enableQualityEnhancement: boolean;
    qualityThreshold: number;
    enableAutomaticCorrection: boolean;
    maxRetryAttempts: number;
    batchSize: number;
  };
  identity: {
    verificationMethod: 'barcode' | 'qr_code' | 'ocr' | 'manual' | 'multiple';
    confidenceThreshold: number;
    requireManualVerification: boolean;
    allowDuplicates: boolean;
  };
  structure: {
    useTemplate: boolean;
    templateId?: string;
    enableAISegmentation: boolean;
    segmentationConfidence: number;
    questionTypes: string[];
  };
  studentInfo?: {
    totalStudents: number;
    importedStudents: number;
    validStudents: number;
    lastImportTime?: string;
  };
  template?: {
    selectedTemplateId?: string;
    templateName?: string;
    generatedSheets: number;
    lastGenerationTime?: string;
  };
}

// API响应类型
export interface PreGradingApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    processingTime: number;
    timestamp: string;
    version: string;
  };
}

// 事件类型
export type PreGradingEvent = 
  | { type: 'STAGE_CHANGED'; payload: { from: PreGradingStage; to: PreGradingStage } }
  | { type: 'PROGRESS_UPDATED'; payload: { stage: PreGradingStage; progress: number } }
  | { type: 'SHEET_PROCESSED'; payload: { sheetId: string; result: StandardizedAnswerSheet } }
  | { type: 'BATCH_COMPLETED'; payload: { batchId: string; result: BatchProcessingResult } }
  | { type: 'ERROR_OCCURRED'; payload: { error: ProcessingIssue; sheetId?: string } }
  | { type: 'WORKFLOW_COMPLETED'; payload: { examId: string; statistics: PreGradingWorkflowState['statistics'] } };

// Hook类型
export interface UsePreGradingWorkflow {
  state: PreGradingWorkflowState;
  actions: {
    initializeWorkflow: (examId: string, config: PreGradingConfiguration) => Promise<void>;
    uploadAnswerSheets: (files: File[]) => Promise<BatchProcessingResult>;
    processAnswerSheets: (sheetIds: string[]) => Promise<void>;
    validateResults: () => Promise<void>;
    retryProcessing: (sheetId: string) => Promise<void>;
    updateConfiguration: (config: Partial<PreGradingConfiguration>) => void;
    resetWorkflow: () => void;
  };
  utils: {
    getStageProgress: (stage: PreGradingStage) => number;
    getOverallProgress: () => number;
    getIssuesByType: (type: ProcessingIssue['type']) => ProcessingIssue[];
    canProceedToNextStage: () => boolean;
    exportResults: (format: 'json' | 'csv' | 'excel') => Promise<Blob>;
  };
}