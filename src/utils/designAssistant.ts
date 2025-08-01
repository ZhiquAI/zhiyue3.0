/**
 * 智能设计助手
 * 
 * 提供自动布局、智能对齐、设计建议等功能，
 * 帮助用户快速创建符合标准的答题卡模板。
 */

import { OMRStandards, getOMRStandards } from '../config/omrStandards';

// 设计建议接口
export interface DesignSuggestion {
  id: string;
  type: 'layout' | 'alignment' | 'spacing' | 'sizing' | 'positioning';
  title: string;
  description: string;
  action: () => void;
  preview?: string;
  confidence: number; // 0-1, 建议的可信度
}

// 布局模式
export type LayoutMode = 
  | 'grid'           // 网格布局
  | 'linear'         // 线性布局
  | 'adaptive'       // 自适应布局
  | 'custom';        // 自定义布局

// 对齐选项
export interface AlignmentOptions {
  horizontal: 'left' | 'center' | 'right' | 'distribute';
  vertical: 'top' | 'middle' | 'bottom' | 'distribute';
  spacing?: number;
}

// 布局配置
export interface LayoutConfig {
  mode: LayoutMode;
  columns?: number;
  rows?: number;
  spacing: {
    horizontal: number;
    vertical: number;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  alignment: AlignmentOptions;
}

// 区域约束
export interface RegionConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  aspectRatio?: number;
  snapToGrid?: boolean;
  keepAspectRatio?: boolean;
}

// 智能设计助手类
export class DesignAssistant {
  private standards: OMRStandards;
  private pageSize: { width: number; height: number };
  
  constructor(
    examType?: string,
    pageSize = { width: 210, height: 297 } // A4默认尺寸
  ) {
    this.standards = getOMRStandards(examType);
    this.pageSize = pageSize;
  }
  
  /**
   * 生成设计建议
   */
  generateSuggestions(
    regions: any[],
    selectedRegions: any[] = []
  ): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    // 布局建议
    suggestions.push(...this.generateLayoutSuggestions(regions));
    
    // 对齐建议
    if (selectedRegions.length > 1) {
      suggestions.push(...this.generateAlignmentSuggestions(selectedRegions));
    }
    
    // 间距建议
    suggestions.push(...this.generateSpacingSuggestions(regions));
    
    // 尺寸建议
    suggestions.push(...this.generateSizingSuggestions(regions));
    
    // 定位建议
    suggestions.push(...this.generatePositioningSuggestions(regions));
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * 自动布局
   */
  autoLayout(
    regions: any[],
    config: LayoutConfig
  ): any[] {
    const layoutRegions = [...regions];
    
    switch (config.mode) {
      case 'grid':
        return this.applyGridLayout(layoutRegions, config);
      case 'linear':
        return this.applyLinearLayout(layoutRegions, config);
      case 'adaptive':
        return this.applyAdaptiveLayout(layoutRegions, config);
      default:
        return layoutRegions;
    }
  }
  
  /**
   * 智能对齐
   */
  alignRegions(
    regions: any[],
    options: AlignmentOptions
  ): any[] {
    if (regions.length < 2) return regions;
    
    const alignedRegions = [...regions];
    
    // 水平对齐
    if (options.horizontal !== 'distribute') {
      const referenceX = this.calculateReferencePosition(
        regions,
        'horizontal',
        options.horizontal
      );
      
      alignedRegions.forEach(region => {
        switch (options.horizontal) {
          case 'left':
            region.x = referenceX;
            break;
          case 'center':
            region.x = referenceX - region.width / 2;
            break;
          case 'right':
            region.x = referenceX - region.width;
            break;
        }
      });
    } else {
      this.distributeHorizontally(alignedRegions, options.spacing);
    }
    
    // 垂直对齐
    if (options.vertical !== 'distribute') {
      const referenceY = this.calculateReferencePosition(
        regions,
        'vertical',
        options.vertical
      );
      
      alignedRegions.forEach(region => {
        switch (options.vertical) {
          case 'top':
            region.y = referenceY;
            break;
          case 'middle':
            region.y = referenceY - region.height / 2;
            break;
          case 'bottom':
            region.y = referenceY - region.height;
            break;
        }
      });
    } else {
      this.distributeVertically(alignedRegions, options.spacing);
    }
    
    return alignedRegions;
  }
  
  /**
   * 智能调整尺寸
   */
  smartResize(
    region: any,
    constraints: RegionConstraints
  ): any {
    const resizedRegion = { ...region };
    
    // 应用尺寸约束
    resizedRegion.width = Math.max(
      constraints.minWidth,
      Math.min(constraints.maxWidth, resizedRegion.width)
    );
    
    resizedRegion.height = Math.max(
      constraints.minHeight,
      Math.min(constraints.maxHeight, resizedRegion.height)
    );
    
    // 保持宽高比
    if (constraints.keepAspectRatio && constraints.aspectRatio) {
      const currentRatio = resizedRegion.width / resizedRegion.height;
      
      if (Math.abs(currentRatio - constraints.aspectRatio) > 0.1) {
        if (currentRatio > constraints.aspectRatio) {
          resizedRegion.width = resizedRegion.height * constraints.aspectRatio;
        } else {
          resizedRegion.height = resizedRegion.width / constraints.aspectRatio;
        }
      }
    }
    
    // 网格对齐
    if (constraints.snapToGrid) {
      const gridSize = 5; // 5mm网格
      resizedRegion.x = Math.round(resizedRegion.x / gridSize) * gridSize;
      resizedRegion.y = Math.round(resizedRegion.y / gridSize) * gridSize;
      resizedRegion.width = Math.round(resizedRegion.width / gridSize) * gridSize;
      resizedRegion.height = Math.round(resizedRegion.height / gridSize) * gridSize;
    }
    
    return resizedRegion;
  }
  
  /**
   * 检测碰撞
   */
  detectCollisions(regions: any[]): Array<{
    region1: any;
    region2: any;
    overlap: number;
  }> {
    const collisions: Array<{
      region1: any;
      region2: any;
      overlap: number;
    }> = [];
    
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const region1 = regions[i];
        const region2 = regions[j];
        
        const overlap = this.calculateOverlap(region1, region2);
        
        if (overlap > 0) {
          collisions.push({
            region1,
            region2,
            overlap,
          });
        }
      }
    }
    
    return collisions;
  }
  
  /**
   * 自动解决碰撞
   */
  resolveCollisions(regions: any[]): any[] {
    const resolvedRegions = [...regions];
    const collisions = this.detectCollisions(resolvedRegions);
    
    collisions.forEach(collision => {
      const { region1, region2 } = collision;
      
      // 简单策略：将第二个区域向右下方移动
      const minSpacing = this.standards.bubble.minSpacing;
      
      region2.x = region1.x + region1.width + minSpacing;
      
      // 如果超出页面边界，则换行
      if (region2.x + region2.width > this.pageSize.width - this.standards.margins.right) {
        region2.x = this.standards.margins.left;
        region2.y = region1.y + region1.height + minSpacing;
      }
    });
    
    return resolvedRegions;
  }
  
  /**
   * 生成布局建议
   */
  private generateLayoutSuggestions(regions: any[]): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    // 检查是否需要网格布局
    const questionRegions = regions.filter(r => r.type === 'question');
    if (questionRegions.length > 4) {
      suggestions.push({
        id: 'grid-layout',
        type: 'layout',
        title: '应用网格布局',
        description: '将题目区域排列成整齐的网格，提高可读性',
        action: () => {
          // 实现网格布局逻辑
        },
        confidence: 0.8,
      });
    }
    
    // 检查是否需要重新排列
    const collisions = this.detectCollisions(regions);
    if (collisions.length > 0) {
      suggestions.push({
        id: 'resolve-collisions',
        type: 'layout',
        title: '解决区域重叠',
        description: `发现${collisions.length}处区域重叠，建议重新排列`,
        action: () => {
          // 实现碰撞解决逻辑
        },
        confidence: 0.9,
      });
    }
    
    return suggestions;
  }
  
  /**
   * 生成对齐建议
   */
  private generateAlignmentSuggestions(regions: any[]): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    // 检查是否需要水平对齐
    const yPositions = regions.map(r => r.y);
    const yVariance = this.calculateVariance(yPositions);
    
    if (yVariance > 5) { // 5mm的容差
      suggestions.push({
        id: 'align-horizontal',
        type: 'alignment',
        title: '水平对齐',
        description: '将选中的区域水平对齐',
        action: () => {
          // 实现水平对齐逻辑
        },
        confidence: 0.7,
      });
    }
    
    // 检查是否需要垂直对齐
    const xPositions = regions.map(r => r.x);
    const xVariance = this.calculateVariance(xPositions);
    
    if (xVariance > 5) {
      suggestions.push({
        id: 'align-vertical',
        type: 'alignment',
        title: '垂直对齐',
        description: '将选中的区域垂直对齐',
        action: () => {
          // 实现垂直对齐逻辑
        },
        confidence: 0.7,
      });
    }
    
    return suggestions;
  }
  
  /**
   * 生成间距建议
   */
  private generateSpacingSuggestions(regions: any[]): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    // 检查间距是否过小
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const distance = this.calculateDistance(regions[i], regions[j]);
        
        if (distance < this.standards.bubble.minSpacing) {
          suggestions.push({
            id: `spacing-${i}-${j}`,
            type: 'spacing',
            title: '增加区域间距',
            description: `区域间距过小，建议增加到${this.standards.bubble.optimalSpacing}mm`,
            action: () => {
              // 实现间距调整逻辑
            },
            confidence: 0.8,
          });
          break; // 避免重复建议
        }
      }
    }
    
    return suggestions;
  }
  
  /**
   * 生成尺寸建议
   */
  private generateSizingSuggestions(regions: any[]): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    regions.forEach((region, index) => {
      if (region.type === 'question' && region.subType === 'choice') {
        const size = Math.min(region.width, region.height);
        
        if (size < this.standards.bubble.minSize) {
          suggestions.push({
            id: `resize-${index}`,
            type: 'sizing',
            title: '调整气泡尺寸',
            description: `气泡尺寸过小，建议调整到${this.standards.bubble.optimalSize}mm`,
            action: () => {
              // 实现尺寸调整逻辑
            },
            confidence: 0.9,
          });
        }
      }
    });
    
    return suggestions;
  }
  
  /**
   * 生成定位建议
   */
  private generatePositioningSuggestions(regions: any[]): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = [];
    
    const positioningRegions = regions.filter(r => r.type === 'positioning');
    
    if (positioningRegions.length < this.standards.positioning.minCount) {
      suggestions.push({
        id: 'add-positioning',
        type: 'positioning',
        title: '添加定位点',
        description: `建议添加${this.standards.positioning.optimalCount}个定位点以提高识别精度`,
        action: () => {
          // 实现添加定位点逻辑
        },
        confidence: 0.9,
      });
    }
    
    return suggestions;
  }
  
  /**
   * 应用网格布局
   */
  private applyGridLayout(regions: any[], config: LayoutConfig): any[] {
    const layoutRegions = [...regions];
    const { columns = 4, spacing, margins } = config;
    
    const availableWidth = this.pageSize.width - margins.left - margins.right;
    const availableHeight = this.pageSize.height - margins.top - margins.bottom;
    
    const cellWidth = (availableWidth - (columns - 1) * spacing.horizontal) / columns;
    const rows = Math.ceil(layoutRegions.length / columns);
    const cellHeight = (availableHeight - (rows - 1) * spacing.vertical) / rows;
    
    layoutRegions.forEach((region, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      region.x = margins.left + col * (cellWidth + spacing.horizontal);
      region.y = margins.top + row * (cellHeight + spacing.vertical);
      region.width = Math.min(region.width, cellWidth);
      region.height = Math.min(region.height, cellHeight);
    });
    
    return layoutRegions;
  }
  
  /**
   * 应用线性布局
   */
  private applyLinearLayout(regions: any[], config: LayoutConfig): any[] {
    const layoutRegions = [...regions];
    const { spacing, margins, alignment } = config;
    
    let currentX = margins.left;
    let currentY = margins.top;
    
    layoutRegions.forEach(region => {
      region.x = currentX;
      region.y = currentY;
      
      // 根据对齐方式调整位置
      if (alignment.horizontal === 'center') {
        region.x = (this.pageSize.width - region.width) / 2;
      } else if (alignment.horizontal === 'right') {
        region.x = this.pageSize.width - margins.right - region.width;
      }
      
      currentY += region.height + spacing.vertical;
      
      // 检查是否需要换列
      if (currentY + region.height > this.pageSize.height - margins.bottom) {
        currentX += Math.max(...layoutRegions.map(r => r.width)) + spacing.horizontal;
        currentY = margins.top;
      }
    });
    
    return layoutRegions;
  }
  
  /**
   * 应用自适应布局
   */
  private applyAdaptiveLayout(regions: any[], config: LayoutConfig): any[] {
    // 根据区域类型和数量自动选择最佳布局
    const questionRegions = regions.filter(r => r.type === 'question');
    const otherRegions = regions.filter(r => r.type !== 'question');
    
    if (questionRegions.length > 8) {
      // 使用网格布局
      return this.applyGridLayout(regions, {
        ...config,
        mode: 'grid',
        columns: Math.ceil(Math.sqrt(questionRegions.length)),
      });
    } else {
      // 使用线性布局
      return this.applyLinearLayout(regions, {
        ...config,
        mode: 'linear',
      });
    }
  }
  
  /**
   * 计算参考位置
   */
  private calculateReferencePosition(
    regions: any[],
    direction: 'horizontal' | 'vertical',
    alignment: string
  ): number {
    if (direction === 'horizontal') {
      const xPositions = regions.map(r => {
        switch (alignment) {
          case 'left': return r.x;
          case 'center': return r.x + r.width / 2;
          case 'right': return r.x + r.width;
          default: return r.x;
        }
      });
      
      switch (alignment) {
        case 'left': return Math.min(...xPositions);
        case 'center': return xPositions.reduce((a, b) => a + b, 0) / xPositions.length;
        case 'right': return Math.max(...xPositions);
        default: return xPositions[0];
      }
    } else {
      const yPositions = regions.map(r => {
        switch (alignment) {
          case 'top': return r.y;
          case 'middle': return r.y + r.height / 2;
          case 'bottom': return r.y + r.height;
          default: return r.y;
        }
      });
      
      switch (alignment) {
        case 'top': return Math.min(...yPositions);
        case 'middle': return yPositions.reduce((a, b) => a + b, 0) / yPositions.length;
        case 'bottom': return Math.max(...yPositions);
        default: return yPositions[0];
      }
    }
  }
  
  /**
   * 水平分布
   */
  private distributeHorizontally(regions: any[], spacing?: number): void {
    if (regions.length < 2) return;
    
    regions.sort((a, b) => a.x - b.x);
    
    const totalWidth = regions[regions.length - 1].x + regions[regions.length - 1].width - regions[0].x;
    const availableSpace = totalWidth - regions.reduce((sum, r) => sum + r.width, 0);
    const gap = spacing || availableSpace / (regions.length - 1);
    
    let currentX = regions[0].x;
    regions.forEach(region => {
      region.x = currentX;
      currentX += region.width + gap;
    });
  }
  
  /**
   * 垂直分布
   */
  private distributeVertically(regions: any[], spacing?: number): void {
    if (regions.length < 2) return;
    
    regions.sort((a, b) => a.y - b.y);
    
    const totalHeight = regions[regions.length - 1].y + regions[regions.length - 1].height - regions[0].y;
    const availableSpace = totalHeight - regions.reduce((sum, r) => sum + r.height, 0);
    const gap = spacing || availableSpace / (regions.length - 1);
    
    let currentY = regions[0].y;
    regions.forEach(region => {
      region.y = currentY;
      currentY += region.height + gap;
    });
  }
  
  /**
   * 计算重叠面积
   */
  private calculateOverlap(region1: any, region2: any): number {
    const left = Math.max(region1.x, region2.x);
    const right = Math.min(region1.x + region1.width, region2.x + region2.width);
    const top = Math.max(region1.y, region2.y);
    const bottom = Math.min(region1.y + region1.height, region2.y + region2.height);
    
    if (left < right && top < bottom) {
      return (right - left) * (bottom - top);
    }
    
    return 0;
  }
  
  /**
   * 计算距离
   */
  private calculateDistance(region1: any, region2: any): number {
    const center1 = {
      x: region1.x + region1.width / 2,
      y: region1.y + region1.height / 2,
    };
    
    const center2 = {
      x: region2.x + region2.width / 2,
      y: region2.y + region2.height / 2,
    };
    
    return Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + 
      Math.pow(center1.y - center2.y, 2)
    );
  }
  
  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
}

// 导出便捷函数
export function createDesignAssistant(examType?: string) {
  return new DesignAssistant(examType);
}

export default DesignAssistant;