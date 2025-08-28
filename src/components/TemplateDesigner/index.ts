/**
 * 答题卡模板设计器组件导出
 * 
 * 提供增强版的答题卡模板设计器，具备以下核心功能：
 * 1. 数字蓝图制定者 - 精确的坐标定义和区域划分
 * 2. 物理与数字世界的桥梁 - 纸质答题卡到结构化数据的转换
 * 3. 质量保障的源头 - 内嵌OMR设计规范，确保识别准确性
 */

export { default as EnhancedTemplateDesigner } from './EnhancedTemplateDesigner';
export { default as TemplateDesigner } from './TemplateDesigner';
export { default as AnswerSheetTemplateEditor } from './AnswerSheetTemplateEditor';

// 导出类型定义
export type {
  EnhancedRegion,
  EnhancedTemplateConfig,
  ToolType
} from './EnhancedTemplateDesigner';