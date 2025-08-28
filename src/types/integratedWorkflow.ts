import { Exam } from './exam';
import { PreGradingConfiguration } from './preGrading';

export interface IntegratedWorkflowState {
  examId: string;
  currentStage: IntegratedWorkflowStage;
  stageStatus: Record<IntegratedWorkflowStage, WorkflowStageStatus>;
  studentInfo: StudentWorkflowInfo;
  templateInfo: TemplateWorkflowInfo;
  processingInfo: ProcessingWorkflowInfo;
  configuration: IntegratedWorkflowConfiguration;
}

export type IntegratedWorkflowStage = 
  | 'student_setup' 
  | 'template_setup' 
  | 'upload_processing' 
  | 'marking' 
  | 'review' 
  | 'completed';

export type WorkflowStageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface StudentWorkflowInfo {
  totalStudents: number;
  importedStudents: number;
  verifiedStudents: number;
  classesList: string[];
  importMethod: 'manual' | 'batch_import' | 'barcode_scan';
  lastUpdated?: string;
}

export interface TemplateWorkflowInfo {
  selectedTemplateId?: string;
  templateName?: string;
  isCustomTemplate: boolean;
  templatePreview?: string;
  regionCount?: number;
  templateValidated: boolean;
  lastModified?: string;
}

export interface ProcessingWorkflowInfo {
  uploadedSheets: number;
  processedSheets: number;
  readyForMarking: number;
  qualityIssues: number;
  identityIssues: number;
  processingProgress: number;
  estimatedTimeRemaining?: number;
}

export interface IntegratedWorkflowConfiguration extends PreGradingConfiguration {
  studentManagement: {
    requireAllStudentsImported: boolean;
    enableBarcodeVerification: boolean;
    duplicateHandling: 'reject' | 'overwrite' | 'merge';
  };

  qualityAssurance: {
    minimumQualityScore: number;
    requireManualReview: boolean;
    autoRetryFailedProcessing: boolean;
  };
}

export interface WorkflowStageAction {
  stage: IntegratedWorkflowStage;
  action: 'start' | 'complete' | 'skip' | 'retry';
  data?: any;
}

export interface WorkflowTransition {
  from: IntegratedWorkflowStage;
  to: IntegratedWorkflowStage;
  condition: (state: IntegratedWorkflowState) => boolean;
  validation?: (state: IntegratedWorkflowState) => string | null;
}

export interface IntegratedWorkflowActions {
  initializeWorkflow: (exam: Exam, config?: Partial<IntegratedWorkflowConfiguration>) => Promise<void>;
  updateStageStatus: (stage: IntegratedWorkflowStage, status: WorkflowStageStatus) => void;
  completeStudentSetup: (data: StudentWorkflowInfo) => Promise<void>;
  completeTemplateSetup: (data: TemplateWorkflowInfo) => Promise<void>;
  completeUploadProcessing: (data: ProcessingWorkflowInfo) => Promise<void>;
  completeMarking: () => Promise<void>;
  completeReview: () => Promise<void>;
  goToStage: (stage: IntegratedWorkflowStage) => Promise<boolean>;
  resetWorkflow: () => void;
  exportWorkflowReport: () => Promise<Blob>;
}

export interface IntegratedWorkflowUtils {
  canProceedToStage: (stage: IntegratedWorkflowStage) => boolean;
  getStageProgress: (stage: IntegratedWorkflowStage) => number;
  getOverallProgress: () => number;
  validateStageCompletion: (stage: IntegratedWorkflowStage) => string | null;
  getNextStage: () => IntegratedWorkflowStage | null;
  getPreviousStage: () => IntegratedWorkflowStage | null;
  getWorkflowSummary: () => WorkflowSummary;
}

export interface WorkflowSummary {
  exam: {
    id: string;
    name: string;
    subject: string;
    grade: string;
  };
  timeline: {
    startTime: string;
    endTime?: string;
    totalDuration?: number;
    stageTimings: Record<IntegratedWorkflowStage, { start?: string; end?: string; duration?: number }>;
  };
  statistics: {
    students: StudentWorkflowInfo;
    processing: ProcessingWorkflowInfo;
    quality: {
      averageQualityScore: number;
      passRate: number;
      issueCount: number;
    };
  };
  status: {
    currentStage: IntegratedWorkflowStage;
    completedStages: IntegratedWorkflowStage[];
    overallProgress: number;
    isCompleted: boolean;
  };
}

export interface UseIntegratedWorkflow {
  state: IntegratedWorkflowState;
  actions: IntegratedWorkflowActions;
  utils: IntegratedWorkflowUtils;
}

// 工作流阶段配置
export const WORKFLOW_STAGES: Array<{
  key: IntegratedWorkflowStage;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  dependencies: IntegratedWorkflowStage[];
}> = [
  {
    key: 'student_setup',
    title: '学生信息管理',
    description: '导入和管理考试学生信息',
    icon: 'UserOutlined',
    required: true,
    dependencies: []
  },
  {
    key: 'template_setup',
    title: '模板配置',
    description: '选择模板或使用答题卡模板设计器',
    icon: 'FileTextOutlined',
    required: true,
    dependencies: ['student_setup']
  },
  {
    key: 'upload_processing',
    title: '答题卡处理',
    description: '上传和预处理答题卡',
    icon: 'UploadOutlined',
    required: true,
    dependencies: ['template_setup']
  },
  {
    key: 'marking',
    title: '在线阅卷',
    description: '进行主观题评分',
    icon: 'EditOutlined',
    required: true,
    dependencies: ['upload_processing']
  },
  {
    key: 'review',
    title: '成绩复核',
    description: '复核和确认最终成绩',
    icon: 'CheckCircleOutlined',
    required: false,
    dependencies: ['marking']
  },
  {
    key: 'completed',
    title: '完成',
    description: '阅卷流程已完成',
    icon: 'CheckCircleOutlined',
    required: true,
    dependencies: ['review']
  }
];

// 默认配置
export const DEFAULT_INTEGRATED_WORKFLOW_CONFIG: IntegratedWorkflowConfiguration = {
  exam: {
    id: '',
    name: '',
    subject: '',
    grade: '',
    questionCount: 25,
    objectiveQuestionCount: 20,
    subjectiveQuestionCount: 5
  },
  processing: {
    enableQualityEnhancement: true,
    qualityThreshold: 0.7,
    enableAutomaticCorrection: true,
    maxRetryAttempts: 3,
    batchSize: 10
  },
  identity: {
    verificationMethod: 'multiple',
    confidenceThreshold: 0.8,
    requireManualVerification: false,
    allowDuplicates: false
  },
  structure: {
    useTemplate: true,
    enableAISegmentation: true,
    segmentationConfidence: 0.8,
    questionTypes: ['choice', 'fill_blank', 'short_answer', 'essay']
  },
  studentManagement: {
    requireAllStudentsImported: true,
    enableBarcodeVerification: true,
    duplicateHandling: 'reject'
  },

  qualityAssurance: {
    minimumQualityScore: 0.7,
    requireManualReview: false,
    autoRetryFailedProcessing: true
  }
};