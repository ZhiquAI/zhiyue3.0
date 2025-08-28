/**
 * 答题卡设计器 - 入口文件
 */

// 主组件
export { default as AnswerSheetDesignerRefactored } from './AnswerSheetDesignerRefactored';

// 核心组件
export { default as CanvasProvider } from './providers/CanvasProvider';
export { default as ToolbarComponent } from './components/ToolbarComponent';
export { default as PropertiesPanel } from './components/PropertiesPanel';
export { default as RegionRenderer } from './components/RegionRenderer';

// 状态管理
export {
  useTemplateStore,
  useTemplate,
  useTemplateActions,
  useTemplateHistory,
  useTemplateLoading,
  useTemplateError
} from './stores/templateStore';

export {
  useCanvasStore,
  useCanvasState,
  useCanvasActions,
  useCanvasSelection,
  useCanvasToolMode,
  useCanvasScale,
  useCanvasGrid
} from './stores/canvasStore';

// 类型定义
export type {
  TemplateData,
  TemplateRegion,
  AnchorRegion,
  BarcodeRegion,
  ObjectiveRegion,
  SubjectiveRegion,
  CanvasSettings,
  TemplateMetadata,
  HistoryItem,
  HistoryState,
  OperationResult,
  ValidationError
} from './types/schema';

export {
  RegionType,
  ToolMode,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  REGION_COLORS,
  REGION_TYPE_NAMES
} from './types/schema';

// 工具函数
export {
  generateId,
  createDefaultRegionProperties,
  createRegion,
  getRegionTypeName,
  getRegionColor,
  getDistance,
  rectanglesIntersect,
  pointInRectangle,
  getBoundingBox,
  snapToGrid,
  clamp,
  throttle,
  debounce,
  deepClone,
  formatFileSize,
  downloadFile,
  isValidRegionName,
  isValidRegionPosition,
  getRegionCenter,
  calculateFitScale
} from './utils/helpers';

// 默认导出主组件
export { default } from './AnswerSheetDesignerRefactored';