/**
 * 答题卡模板设计器 - 类型定义和 Schema
 * @version 1.0.0
 */

// 区域类型枚举
export enum RegionType {
  ANCHOR = 'anchor',
  BARCODE = 'barcode', 
  OBJECTIVE = 'objective',
  SUBJECTIVE = 'subjective'
}

// 基础区域接口
export interface BaseRegion {
  id: string;
  type: RegionType;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  visible: boolean;
  locked: boolean;
}

// 定位点区域
export interface AnchorRegion extends BaseRegion {
  type: RegionType.ANCHOR;
  properties: {
    anchorId: string;
    precision: 'high' | 'medium' | 'low';
    shape: 'circle' | 'square' | 'cross';
  };
}

// 条码区域
export interface BarcodeRegion extends BaseRegion {
  type: RegionType.BARCODE;
  properties: {
    barcodeType: 'code128' | 'qr' | 'datamatrix';
    orientation: 'horizontal' | 'vertical';
    encoding?: string;
  };
}

// 客观题区域
export interface ObjectiveRegion extends BaseRegion {
  type: RegionType.OBJECTIVE;
  properties: {
    startQuestionNumber: number;
    questionCount: number;
    optionsPerQuestion: number;
    questionsPerRow: number;
    questionsPerColumn?: number;
    layout: 'horizontal' | 'vertical' | 'matrix';
    scorePerQuestion: number;
    bubbleStyle: 'circle' | 'square' | 'oval';
    bubbleSize: number;
    spacing: {
      question: number;
      option: number;
    };
  };
}

// 主观题区域
export interface SubjectiveRegion extends BaseRegion {
  type: RegionType.SUBJECTIVE;
  properties: {
    questionNumber: number;
    totalScore: number;
    questionType: 'essay' | 'calculation' | 'analysis' | 'design' | 'other';
    hasLines: boolean;
    lineSpacing?: number;
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

// 联合类型
export type TemplateRegion = AnchorRegion | BarcodeRegion | ObjectiveRegion | SubjectiveRegion;

// 模板元数据
export interface TemplateMetadata {
  examName?: string;
  subject?: string;
  grade?: string;
  totalQuestions?: number;
  totalScore?: number;
  duration?: number; // 考试时长（分钟）
  instructions?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

// 画布设置
export interface CanvasSettings {
  width: number;
  height: number;
  dpi: number;
  unit: 'px' | 'mm' | 'inch';
  backgroundColor?: string;
  gridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
}

// 导出设置
export interface ExportSettings {
  format: 'pdf' | 'svg' | 'png' | 'jpg';
  quality: number; // 0-100
  dpi: number;
  includeBackground: boolean;
  includeRegions: boolean;
}

// 模板数据结构 v1.0
export interface TemplateData {
  // 基本信息
  id: string;
  name: string;
  description: string;
  version: '1.0.0';
  schemaVersion: '1.0.0';
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  lastModifiedBy?: string;
  
  // 画布设置
  canvas: CanvasSettings;
  
  // 背景图片
  backgroundImage?: {
    url: string;
    width: number;
    height: number;
    opacity: number;
    x: number;
    y: number;
  };
  
  // 区域列表
  regions: TemplateRegion[];
  
  // 元数据
  metadata: TemplateMetadata;
  
  // 导出设置
  exportSettings: ExportSettings;
}

// 工具模式
export enum ToolMode {
  SELECT = 'select',
  PAN = 'pan',
  ZOOM = 'zoom',
  ANCHOR = 'anchor',
  BARCODE = 'barcode', 
  OBJECTIVE = 'objective',
  SUBJECTIVE = 'subjective'
}

// 画布状态
export interface CanvasState {
  scale: number;
  position: { x: number; y: number };
  selectedRegionIds: string[];
  isDragging: boolean;
  isDrawing: boolean;
  drawingStart?: { x: number; y: number };
  toolMode: ToolMode;
  previewMode: boolean;
}

// 历史记录项
export interface HistoryItem {
  id: string;
  timestamp: string;
  action: string;
  data: TemplateData;
  description: string;
}

// 历史记录状态
export interface HistoryState {
  items: HistoryItem[];
  currentIndex: number;
  maxItems: number;
}

// 操作结果
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// 验证错误
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

// 默认值常量
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 794,  // A4 width at 96 DPI
  height: 1123, // A4 height at 96 DPI
  dpi: 96,
  unit: 'px',
  backgroundColor: '#ffffff',
  gridVisible: true,
  gridSize: 10,
  snapToGrid: true,
  showRulers: true
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'pdf',
  quality: 95,
  dpi: 300,
  includeBackground: true,
  includeRegions: false
};

// 区域颜色配置
export const REGION_COLORS = {
  [RegionType.ANCHOR]: '#ff4d4f',
  [RegionType.BARCODE]: '#1890ff',
  [RegionType.OBJECTIVE]: '#52c41a', 
  [RegionType.SUBJECTIVE]: '#faad14'
} as const;

// 区域名称映射
export const REGION_TYPE_NAMES = {
  [RegionType.ANCHOR]: '定位点',
  [RegionType.BARCODE]: '条码区',
  [RegionType.OBJECTIVE]: '客观题',
  [RegionType.SUBJECTIVE]: '主观题'
} as const;