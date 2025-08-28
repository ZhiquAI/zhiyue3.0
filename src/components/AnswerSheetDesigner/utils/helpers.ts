/**
 * 工具函数集合
 */

import { TemplateRegion, RegionType, AnchorRegion, BarcodeRegion, ObjectiveRegion, SubjectiveRegion } from '../types/schema';

// 生成唯一ID
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 创建默认区域属性
export const createDefaultRegionProperties = (type: RegionType) => {
  switch (type) {
    case RegionType.ANCHOR:
      return {
        anchorId: 'A1',
        precision: 'high' as const,
        shape: 'circle' as const
      };
      
    case RegionType.BARCODE:
      return {
        barcodeType: 'code128' as const,
        orientation: 'horizontal' as const
      };
      
    case RegionType.OBJECTIVE:
      return {
        startQuestionNumber: 1,
        questionCount: 10,
        optionsPerQuestion: 4,
        questionsPerRow: 5,
        questionsPerColumn: 2,
        layout: 'horizontal' as const,
        scorePerQuestion: 2,
        bubbleStyle: 'circle' as const,
        bubbleSize: 12,
        spacing: {
          question: 30,
          option: 20
        }
      };
      
    case RegionType.SUBJECTIVE:
      return {
        questionNumber: 1,
        totalScore: 10,
        questionType: 'essay' as const,
        hasLines: true,
        lineSpacing: 24,
        margin: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10
        }
      };
      
    default:
      return {};
  }
};

// 创建新区域
export const createRegion = (
  type: RegionType,
  x: number,
  y: number,
  width: number,
  height: number,
  name?: string
): TemplateRegion => {
  const baseRegion = {
    id: generateId(),
    type,
    x,
    y,
    width,
    height,
    name: name || `${getRegionTypeName(type)}_${Date.now()}`,
    visible: true,
    locked: false
  };
  
  const properties = createDefaultRegionProperties(type);
  
  return {
    ...baseRegion,
    properties
  } as TemplateRegion;
};

// 获取区域类型名称
export const getRegionTypeName = (type: RegionType): string => {
  const names = {
    [RegionType.ANCHOR]: '定位点',
    [RegionType.BARCODE]: '条码区',
    [RegionType.OBJECTIVE]: '客观题',
    [RegionType.SUBJECTIVE]: '主观题'
  };
  return names[type];
};

// 获取区域颜色
export const getRegionColor = (type: RegionType): string => {
  const colors = {
    [RegionType.ANCHOR]: '#ff4d4f',
    [RegionType.BARCODE]: '#1890ff',
    [RegionType.OBJECTIVE]: '#52c41a',
    [RegionType.SUBJECTIVE]: '#faad14'
  };
  return colors[type];
};

// 计算两点间距离
export const getDistance = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// 计算矩形是否相交
export const rectanglesIntersect = (
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean => {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
};

// 检查点是否在矩形内
export const pointInRectangle = (
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

// 获取矩形的边界框
export const getBoundingBox = (
  rectangles: Array<{ x: number; y: number; width: number; height: number }>
): { x: number; y: number; width: number; height: number } => {
  if (rectangles.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  const left = Math.min(...rectangles.map(r => r.x));
  const top = Math.min(...rectangles.map(r => r.y));
  const right = Math.max(...rectangles.map(r => r.x + r.width));
  const bottom = Math.max(...rectangles.map(r => r.y + r.height));
  
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
};

// 网格对齐
export const snapToGrid = (
  value: number,
  gridSize: number,
  enabled: boolean = true
): number => {
  if (!enabled || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
};

// 限制值在范围内
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// 深拷贝
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
  if (typeof obj === 'object') {
    const copy = {} as T;
    Object.keys(obj).forEach(key => {
      (copy as any)[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
};

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 下载文件
export const downloadFile = (content: string, filename: string, type: string = 'application/json'): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 验证区域名称
export const isValidRegionName = (name: string): boolean => {
  return name.trim().length > 0 && name.length <= 50;
};

// 验证区域位置
export const isValidRegionPosition = (
  region: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  return (
    region.x >= 0 &&
    region.y >= 0 &&
    region.width > 0 &&
    region.height > 0 &&
    region.x + region.width <= canvasWidth &&
    region.y + region.height <= canvasHeight
  );
};

// 获取区域中心点
export const getRegionCenter = (region: { x: number; y: number; width: number; height: number }) => {
  return {
    x: region.x + region.width / 2,
    y: region.y + region.height / 2
  };
};

// 计算缩放以适应区域
export const calculateFitScale = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 20
): number => {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;
  
  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;
  
  return Math.min(scaleX, scaleY, 1); // 不放大，只缩小
};

// 角度转弧度
export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// 弧度转角度
export const radiansToDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

// 生成简短的描述性ID
export const generateShortId = (prefix: string = ''): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};