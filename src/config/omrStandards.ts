/**
 * OMR (光学标记识别) 设计标准配置
 * 
 * 定义了答题卡设计的各项技术标准和质量要求，
 * 确保设计出的模板能够被OMR系统准确识别。
 */

// OMR设计标准接口
export interface OMRStandards {
  // 气泡/选择框标准
  bubble: {
    minSize: number;          // 最小尺寸 (mm)
    maxSize: number;          // 最大尺寸 (mm)
    optimalSize: number;      // 最佳尺寸 (mm)
    minSpacing: number;       // 最小间距 (mm)
    optimalSpacing: number;   // 最佳间距 (mm)
    strokeWidth: number;      // 边框粗细 (pt)
  };
  
  // 页面边距要求
  margins: {
    top: number;              // 上边距 (mm)
    bottom: number;           // 下边距 (mm)
    left: number;             // 左边距 (mm)
    right: number;            // 右边距 (mm)
    safe: number;             // 安全边距 (mm)
  };
  
  // 定位点标准
  positioning: {
    minSize: number;          // 最小尺寸 (mm)
    maxSize: number;          // 最大尺寸 (mm)
    optimalSize: number;      // 最佳尺寸 (mm)
    minCount: number;         // 最少数量
    optimalCount: number;     // 最佳数量
    cornerDistance: number;   // 距离角落的距离 (mm)
  };
  
  // 条码区域标准
  barcode: {
    minWidth: number;         // 最小宽度 (mm)
    minHeight: number;        // 最小高度 (mm)
    quietZone: number;        // 静区宽度 (mm)
    resolution: number;       // 最小分辨率 (DPI)
  };
  
  // 文本区域标准
  text: {
    minFontSize: number;      // 最小字体大小 (pt)
    maxFontSize: number;      // 最大字体大小 (pt)
    lineHeight: number;       // 行高倍数
    minLineSpacing: number;   // 最小行间距 (mm)
  };
  
  // 打印和扫描标准
  print: {
    minDPI: number;           // 最小分辨率
    optimalDPI: number;       // 最佳分辨率
    maxDPI: number;           // 最大分辨率
    colorMode: 'grayscale' | 'blackwhite';
    contrast: {
      min: number;            // 最小对比度
      optimal: number;        // 最佳对比度
    };
  };
}

// 质量评估阈值
export interface QualityThresholds {
  excellent: number;          // 优秀阈值 (90+)
  good: number;              // 良好阈值 (70-89)
  acceptable: number;        // 可接受阈值 (50-69)
  poor: number;              // 较差阈值 (<50)
  
  // 各项指标的权重
  weights: {
    position: number;        // 位置精度权重
    size: number;           // 尺寸规范权重
    spacing: number;        // 间距规范权重
    omr: number;           // OMR标准权重
    print: number;         // 打印适配权重
  };
}

// 默认OMR标准配置
export const DEFAULT_OMR_STANDARDS: OMRStandards = {
  bubble: {
    minSize: 8,              // 8mm
    maxSize: 12,             // 12mm
    optimalSize: 10,         // 10mm
    minSpacing: 15,          // 15mm
    optimalSpacing: 20,      // 20mm
    strokeWidth: 1,          // 1pt
  },
  
  margins: {
    top: 20,                 // 20mm
    bottom: 20,              // 20mm
    left: 15,                // 15mm
    right: 15,               // 15mm
    safe: 10,                // 10mm 安全边距
  },
  
  positioning: {
    minSize: 5,              // 5mm
    maxSize: 15,             // 15mm
    optimalSize: 8,          // 8mm
    minCount: 3,             // 至少3个
    optimalCount: 4,         // 最好4个(四角)
    cornerDistance: 10,      // 距离角落10mm
  },
  
  barcode: {
    minWidth: 25,            // 25mm
    minHeight: 10,           // 10mm
    quietZone: 2,            // 2mm静区
    resolution: 300,         // 300DPI
  },
  
  text: {
    minFontSize: 8,          // 8pt
    maxFontSize: 24,         // 24pt
    lineHeight: 1.2,         // 1.2倍行高
    minLineSpacing: 3,       // 3mm行间距
  },
  
  print: {
    minDPI: 200,             // 200DPI
    optimalDPI: 300,         // 300DPI
    maxDPI: 600,             // 600DPI
    colorMode: 'grayscale',
    contrast: {
      min: 70,               // 70%对比度
      optimal: 85,           // 85%对比度
    },
  },
};

// 默认质量阈值配置
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  excellent: 90,
  good: 70,
  acceptable: 50,
  poor: 0,
  
  weights: {
    position: 0.25,          // 位置精度 25%
    size: 0.25,             // 尺寸规范 25%
    spacing: 0.20,          // 间距规范 20%
    omr: 0.20,             // OMR标准 20%
    print: 0.10,           // 打印适配 10%
  },
};

// 不同考试类型的标准配置
export const EXAM_TYPE_STANDARDS: Record<string, Partial<OMRStandards>> = {
  // 高考标准 - 更严格的要求
  'gaokao': {
    bubble: {
      minSize: 9,
      maxSize: 11,
      optimalSize: 10,
      minSpacing: 18,
      optimalSpacing: 22,
      strokeWidth: 1.2,
    },
    margins: {
      top: 25,
      bottom: 25,
      left: 20,
      right: 20,
      safe: 15,
    },
    print: {
      minDPI: 300,
      optimalDPI: 400,
      maxDPI: 600,
      colorMode: 'blackwhite',
      contrast: {
        min: 80,
        optimal: 90,
      },
    },
  },
  
  // 中考标准 - 标准要求
  'zhongkao': {
    bubble: {
      minSize: 8,
      maxSize: 12,
      optimalSize: 10,
      minSpacing: 16,
      optimalSpacing: 20,
      strokeWidth: 1,
    },
  },
  
  // 期末考试 - 相对宽松
  'final': {
    bubble: {
      minSize: 7,
      maxSize: 13,
      optimalSize: 10,
      minSpacing: 14,
      optimalSpacing: 18,
      strokeWidth: 0.8,
    },
    margins: {
      top: 15,
      bottom: 15,
      left: 12,
      right: 12,
      safe: 8,
    },
  },
  
  // 练习测试 - 最宽松
  'practice': {
    bubble: {
      minSize: 6,
      maxSize: 14,
      optimalSize: 10,
      minSpacing: 12,
      optimalSpacing: 16,
      strokeWidth: 0.8,
    },
    margins: {
      top: 12,
      bottom: 12,
      left: 10,
      right: 10,
      safe: 6,
    },
  },
};

// 获取指定考试类型的OMR标准
export function getOMRStandards(examType?: string): OMRStandards {
  if (!examType || !EXAM_TYPE_STANDARDS[examType]) {
    return DEFAULT_OMR_STANDARDS;
  }
  
  // 深度合并默认标准和特定类型标准
  return mergeDeep(DEFAULT_OMR_STANDARDS, EXAM_TYPE_STANDARDS[examType]);
}

// 深度合并对象的工具函数
function mergeDeep(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// 验证区域是否符合OMR标准
export function validateRegionOMR(
  region: any,
  standards: OMRStandards = DEFAULT_OMR_STANDARDS
): {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // 验证尺寸
  if (region.type === 'question' && region.subType === 'choice') {
    const size = Math.min(region.width, region.height);
    
    if (size < standards.bubble.minSize) {
      issues.push(`气泡尺寸过小 (${size.toFixed(1)}mm < ${standards.bubble.minSize}mm)`);
      suggestions.push(`建议将气泡尺寸调整至 ${standards.bubble.optimalSize}mm`);
      score -= 20;
    } else if (size > standards.bubble.maxSize) {
      issues.push(`气泡尺寸过大 (${size.toFixed(1)}mm > ${standards.bubble.maxSize}mm)`);
      suggestions.push(`建议将气泡尺寸调整至 ${standards.bubble.optimalSize}mm`);
      score -= 15;
    }
  }
  
  // 验证边距
  if (region.x < standards.margins.left) {
    issues.push(`左边距不足 (${region.x.toFixed(1)}mm < ${standards.margins.left}mm)`);
    suggestions.push(`建议增加左边距至 ${standards.margins.left}mm`);
    score -= 10;
  }
  
  if (region.y < standards.margins.top) {
    issues.push(`上边距不足 (${region.y.toFixed(1)}mm < ${standards.margins.top}mm)`);
    suggestions.push(`建议增加上边距至 ${standards.margins.top}mm`);
    score -= 10;
  }
  
  // 验证定位点
  if (region.type === 'positioning') {
    const size = Math.min(region.width, region.height);
    
    if (size < standards.positioning.minSize) {
      issues.push(`定位点过小 (${size.toFixed(1)}mm < ${standards.positioning.minSize}mm)`);
      suggestions.push(`建议将定位点尺寸调整至 ${standards.positioning.optimalSize}mm`);
      score -= 15;
    } else if (size > standards.positioning.maxSize) {
      issues.push(`定位点过大 (${size.toFixed(1)}mm > ${standards.positioning.maxSize}mm)`);
      suggestions.push(`建议将定位点尺寸调整至 ${standards.positioning.optimalSize}mm`);
      score -= 10;
    }
  }
  
  return {
    isValid: issues.length === 0,
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

// 计算模板整体质量分数
export function calculateTemplateQuality(
  regions: any[],
  standards: OMRStandards = DEFAULT_OMR_STANDARDS,
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS
): {
  overallScore: number;
  categoryScores: {
    position: number;
    size: number;
    spacing: number;
    omr: number;
    print: number;
  };
  issues: string[];
  suggestions: string[];
} {
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];
  
  let positionScore = 100;
  let sizeScore = 100;
  let spacingScore = 100;
  let omrScore = 100;
  let printScore = 100;
  
  // 验证每个区域
  regions.forEach((region, index) => {
    const validation = validateRegionOMR(region, standards);
    
    if (!validation.isValid) {
      allIssues.push(...validation.issues.map(issue => `区域${index + 1}: ${issue}`));
      allSuggestions.push(...validation.suggestions.map(suggestion => `区域${index + 1}: ${suggestion}`));
    }
    
    // 累计各项分数
    omrScore = Math.min(omrScore, validation.score);
  });
  
  // 检查定位点数量
  const positioningCount = regions.filter(r => r.type === 'positioning').length;
  if (positioningCount < standards.positioning.minCount) {
    allIssues.push(`定位点数量不足 (${positioningCount} < ${standards.positioning.minCount})`);
    allSuggestions.push(`建议添加更多定位点，推荐${standards.positioning.optimalCount}个`);
    positionScore -= 30;
  }
  
  // 检查区域间距
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const region1 = regions[i];
      const region2 = regions[j];
      
      const distance = Math.sqrt(
        Math.pow(region1.x - region2.x, 2) + 
        Math.pow(region1.y - region2.y, 2)
      );
      
      if (distance < standards.bubble.minSpacing) {
        spacingScore -= 5;
      }
    }
  }
  
  const categoryScores = {
    position: Math.max(0, positionScore),
    size: Math.max(0, sizeScore),
    spacing: Math.max(0, spacingScore),
    omr: Math.max(0, omrScore),
    print: Math.max(0, printScore),
  };
  
  // 计算加权总分
  const overallScore = 
    categoryScores.position * thresholds.weights.position +
    categoryScores.size * thresholds.weights.size +
    categoryScores.spacing * thresholds.weights.spacing +
    categoryScores.omr * thresholds.weights.omr +
    categoryScores.print * thresholds.weights.print;
  
  return {
    overallScore: Math.round(overallScore),
    categoryScores,
    issues: [...new Set(allIssues)],
    suggestions: [...new Set(allSuggestions)],
  };
}

// 导出所有配置
export default {
  DEFAULT_OMR_STANDARDS,
  DEFAULT_QUALITY_THRESHOLDS,
  EXAM_TYPE_STANDARDS,
  getOMRStandards,
  validateRegionOMR,
  calculateTemplateQuality,
};