/**
 * 答题卡模板质量分析工具
 * 
 * 提供全面的模板质量评估、问题诊断和优化建议，
 * 确保设计的模板符合OMR识别标准和最佳实践。
 */

import {
  OMRStandards,
  QualityThresholds,
  DEFAULT_OMR_STANDARDS,
  DEFAULT_QUALITY_THRESHOLDS,
  getOMRStandards,
  validateRegionOMR,
  calculateTemplateQuality,
} from '../config/omrStandards';

// 质量分析结果接口
export interface QualityAnalysisResult {
  // 总体评估
  overall: {
    score: number;                    // 总分 (0-100)
    grade: 'excellent' | 'good' | 'acceptable' | 'poor';  // 等级
    status: 'pass' | 'warning' | 'fail';  // 状态
  };
  
  // 分类评分
  categories: {
    position: QualityCategoryResult;   // 位置精度
    size: QualityCategoryResult;      // 尺寸规范
    spacing: QualityCategoryResult;   // 间距规范
    omr: QualityCategoryResult;       // OMR标准
    print: QualityCategoryResult;     // 打印适配
  };
  
  // 问题和建议
  issues: QualityIssue[];            // 发现的问题
  suggestions: QualitySuggestion[];  // 优化建议
  
  // 统计信息
  statistics: {
    totalRegions: number;            // 总区域数
    regionsByType: Record<string, number>;  // 按类型统计
    coverage: number;                // 页面覆盖率
    density: number;                 // 区域密度
  };
  
  // 合规性检查
  compliance: {
    omrStandard: boolean;           // OMR标准合规
    printReady: boolean;            // 打印就绪
    scanOptimized: boolean;         // 扫描优化
  };
}

// 质量分类结果
export interface QualityCategoryResult {
  score: number;                     // 分数 (0-100)
  status: 'pass' | 'warning' | 'fail';  // 状态
  issues: string[];                  // 问题列表
  suggestions: string[];             // 建议列表
}

// 质量问题
export interface QualityIssue {
  id: string;                        // 问题ID
  type: 'error' | 'warning' | 'info';  // 问题类型
  category: string;                  // 问题分类
  title: string;                     // 问题标题
  description: string;               // 问题描述
  regionId?: string;                 // 相关区域ID
  severity: 'high' | 'medium' | 'low';  // 严重程度
  autoFixable: boolean;              // 是否可自动修复
}

// 质量建议
export interface QualitySuggestion {
  id: string;                        // 建议ID
  category: string;                  // 建议分类
  title: string;                     // 建议标题
  description: string;               // 建议描述
  action: string;                    // 建议操作
  priority: 'high' | 'medium' | 'low';  // 优先级
  impact: string;                    // 预期影响
}

// 质量分析器类
export class QualityAnalyzer {
  private standards: OMRStandards;
  private thresholds: QualityThresholds;
  
  constructor(
    examType?: string,
    customStandards?: Partial<OMRStandards>,
    customThresholds?: Partial<QualityThresholds>
  ) {
    this.standards = {
      ...getOMRStandards(examType),
      ...customStandards,
    };
    
    this.thresholds = {
      ...DEFAULT_QUALITY_THRESHOLDS,
      ...customThresholds,
    };
  }
  
  /**
   * 分析模板质量
   */
  analyzeTemplate(
    regions: any[],
    templateConfig: any
  ): QualityAnalysisResult {
    // 基础质量计算
    const baseQuality = calculateTemplateQuality(
      regions,
      this.standards,
      this.thresholds
    );
    
    // 详细分析各个方面
    const positionAnalysis = this.analyzePositioning(regions);
    const sizeAnalysis = this.analyzeSizing(regions);
    const spacingAnalysis = this.analyzeSpacing(regions);
    const omrAnalysis = this.analyzeOMRCompliance(regions);
    const printAnalysis = this.analyzePrintReadiness(regions, templateConfig);
    
    // 统计信息
    const statistics = this.calculateStatistics(regions, templateConfig);
    
    // 合规性检查
    const compliance = this.checkCompliance(regions, templateConfig);
    
    // 收集所有问题和建议
    const allIssues: QualityIssue[] = [];
    const allSuggestions: QualitySuggestion[] = [];
    
    // 从各个分析结果中收集问题和建议
    const analyses = [positionAnalysis, sizeAnalysis, spacingAnalysis, omrAnalysis, printAnalysis];
    analyses.forEach(analysis => {
      // 这里需要从实际的问题对象中提取，而不是字符串描述
      // 暂时创建基础的问题和建议对象
      analysis.issues.forEach((issue, index) => {
        allIssues.push({
          id: `issue-${Date.now()}-${index}`,
          type: 'warning',
          category: 'general',
          title: '质量问题',
          description: issue,
          severity: 'medium',
          autoFixable: false,
        });
      });
      
      analysis.suggestions.forEach((suggestion, index) => {
        allSuggestions.push({
          id: `suggestion-${Date.now()}-${index}`,
          category: 'general',
          title: '优化建议',
          description: suggestion,
          action: '手动调整',
          priority: 'medium',
          impact: '提升质量',
        });
      });
    });
    
    // 确定总体等级和状态
    const overall = this.determineOverallQuality(baseQuality.overallScore);
    
    return {
      overall,
      categories: {
        position: positionAnalysis,
        size: sizeAnalysis,
        spacing: spacingAnalysis,
        omr: omrAnalysis,
        print: printAnalysis,
      },
      issues: allIssues,
      suggestions: allSuggestions,
      statistics,
      compliance,
    };
  }
  
  /**
   * 分析定位精度
   */
  private analyzePositioning(regions: any[]): QualityCategoryResult {
    const issues: QualityIssue[] = [];
    const suggestions: QualitySuggestion[] = [];
    let score = 100;
    
    // 检查定位点
    const positioningRegions = regions.filter(r => r.type === 'positioning');
    
    if (positioningRegions.length < this.standards.positioning.minCount) {
      issues.push({
        id: 'insufficient-positioning-points',
        type: 'error',
        category: 'positioning',
        title: '定位点数量不足',
        description: `当前有${positioningRegions.length}个定位点，建议至少${this.standards.positioning.minCount}个`,
        severity: 'high',
        autoFixable: true,
      });
      
      suggestions.push({
        id: 'add-positioning-points',
        category: 'positioning',
        title: '添加定位点',
        description: '在页面四角添加定位点以提高识别精度',
        action: '点击定位点工具，在页面角落添加定位点',
        priority: 'high',
        impact: '显著提高扫描识别准确率',
      });
      
      score -= 30;
    }
    
    // 检查定位点位置
    positioningRegions.forEach((region, index) => {
      const distanceFromCorner = Math.min(
        region.x,
        region.y,
        // 假设页面尺寸为A4 (210x297mm)
        210 - (region.x + region.width),
        297 - (region.y + region.height)
      );
      
      if (distanceFromCorner > this.standards.positioning.cornerDistance) {
        issues.push({
          id: `positioning-point-${index}-far-from-corner`,
          type: 'warning',
          category: 'positioning',
          title: '定位点距离角落过远',
          description: `定位点${index + 1}距离最近角落${distanceFromCorner.toFixed(1)}mm`,
          regionId: region.id,
          severity: 'medium',
          autoFixable: true,
        });
        
        score -= 10;
      }
    });
    
    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      issues: issues.map(i => i.description),
      suggestions: suggestions.map(s => s.description),
    };
  }
  
  /**
   * 分析尺寸规范
   */
  private analyzeSizing(regions: any[]): QualityCategoryResult {
    const issues: QualityIssue[] = [];
    const suggestions: QualitySuggestion[] = [];
    let score = 100;
    
    regions.forEach((region, index) => {
      const validation = validateRegionOMR(region, this.standards);
      
      if (!validation.isValid) {
        validation.issues.forEach(issue => {
          issues.push({
            id: `size-issue-${region.id || index}`,
            type: 'warning',
            category: 'sizing',
            title: '尺寸不符合标准',
            description: issue,
            regionId: region.id,
            severity: 'medium',
            autoFixable: true,
          });
        });
        
        validation.suggestions.forEach(suggestion => {
          suggestions.push({
            id: `size-suggestion-${region.id || index}`,
            category: 'sizing',
            title: '尺寸优化建议',
            description: suggestion,
            action: '调整区域尺寸',
            priority: 'medium',
            impact: '提高识别准确率',
          });
        });
        
        score = Math.min(score, validation.score);
      }
    });
    
    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      issues: issues.map(i => i.description),
      suggestions: suggestions.map(s => s.description),
    };
  }
  
  /**
   * 分析间距规范
   */
  private analyzeSpacing(regions: any[]): QualityCategoryResult {
    const issues: QualityIssue[] = [];
    const suggestions: QualitySuggestion[] = [];
    let score = 100;
    
    // 检查区域间距
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const region1 = regions[i];
        const region2 = regions[j];
        
        const distance = this.calculateDistance(region1, region2);
        
        if (distance < this.standards.bubble.minSpacing) {
          issues.push({
            id: `spacing-issue-${i}-${j}`,
            type: 'warning',
            category: 'spacing',
            title: '区域间距过小',
            description: `区域间距${distance.toFixed(1)}mm小于最小要求${this.standards.bubble.minSpacing}mm`,
            severity: 'medium',
            autoFixable: true,
          });
          
          score -= 5;
        }
      }
    }
    
    if (issues.length > 0) {
      suggestions.push({
        id: 'increase-spacing',
        category: 'spacing',
        title: '增加区域间距',
        description: '调整区域位置以增加间距，避免识别干扰',
        action: '拖拽区域调整位置',
        priority: 'medium',
        impact: '减少识别错误',
      });
    }
    
    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      issues: issues.map(i => i.description),
      suggestions: suggestions.map(s => s.description),
    };
  }
  
  /**
   * 分析OMR合规性
   */
  private analyzeOMRCompliance(regions: any[]): QualityCategoryResult {
    const issues: QualityIssue[] = [];
    const suggestions: QualitySuggestion[] = [];
    let score = 100;
    
    // 检查必要的区域类型
    const hasPositioning = regions.some(r => r.type === 'positioning');
    const hasQuestions = regions.some(r => r.type === 'question');
    const hasStudentInfo = regions.some(r => r.type === 'studentInfo');
    
    if (!hasPositioning) {
      issues.push({
        id: 'missing-positioning',
        type: 'error',
        category: 'omr',
        title: '缺少定位点',
        description: 'OMR识别需要定位点来确定页面方向和位置',
        severity: 'high',
        autoFixable: true,
      });
      score -= 40;
    }
    
    if (!hasQuestions) {
      issues.push({
        id: 'missing-questions',
        type: 'warning',
        category: 'omr',
        title: '缺少题目区域',
        description: '建议添加题目区域以完善答题卡功能',
        severity: 'medium',
        autoFixable: false,
      });
      score -= 20;
    }
    
    if (!hasStudentInfo) {
      suggestions.push({
        id: 'add-student-info',
        category: 'omr',
        title: '添加学生信息区域',
        description: '添加学生信息区域以便识别答题者身份',
        action: '使用学生信息工具添加相关区域',
        priority: 'medium',
        impact: '完善答题卡功能',
      });
    }
    
    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      issues: issues.map(i => i.description),
      suggestions: suggestions.map(s => s.description),
    };
  }
  
  /**
   * 分析打印就绪性
   */
  private analyzePrintReadiness(regions: any[], templateConfig: any): QualityCategoryResult {
    const issues: QualityIssue[] = [];
    const suggestions: QualitySuggestion[] = [];
    let score = 100;
    
    // 检查DPI设置
    const dpi = templateConfig.dpi || 300;
    if (dpi < this.standards.print.minDPI) {
      issues.push({
        id: 'low-dpi',
        type: 'warning',
        category: 'print',
        title: 'DPI设置过低',
        description: `当前DPI ${dpi}低于建议值${this.standards.print.minDPI}`,
        severity: 'medium',
        autoFixable: true,
      });
      score -= 20;
    }
    
    // 检查页面尺寸
    const pageSize = templateConfig.pageSize;
    if (!pageSize || (pageSize.width <= 0 || pageSize.height <= 0)) {
      issues.push({
        id: 'invalid-page-size',
        type: 'error',
        category: 'print',
        title: '页面尺寸无效',
        description: '请设置有效的页面尺寸',
        severity: 'high',
        autoFixable: false,
      });
      score -= 30;
    }
    
    // 检查边距
    regions.forEach((region, index) => {
      if (region.x < this.standards.margins.left ||
          region.y < this.standards.margins.top) {
        issues.push({
          id: `margin-violation-${index}`,
          type: 'warning',
          category: 'print',
          title: '区域超出安全边距',
          description: `区域${index + 1}可能在打印时被裁切`,
          regionId: region.id,
          severity: 'medium',
          autoFixable: true,
        });
        score -= 10;
      }
    });
    
    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
      issues: issues.map(i => i.description),
      suggestions: suggestions.map(s => s.description),
    };
  }
  
  /**
   * 计算统计信息
   */
  private calculateStatistics(regions: any[], templateConfig: any) {
    const regionsByType: Record<string, number> = {};
    
    regions.forEach(region => {
      const type = region.type || 'unknown';
      regionsByType[type] = (regionsByType[type] || 0) + 1;
    });
    
    // 计算页面覆盖率
    const pageArea = (templateConfig.pageSize?.width || 210) * 
                    (templateConfig.pageSize?.height || 297);
    const regionArea = regions.reduce((total, region) => 
      total + (region.width * region.height), 0);
    const coverage = (regionArea / pageArea) * 100;
    
    // 计算区域密度
    const density = regions.length / pageArea * 10000; // 每平方厘米的区域数
    
    return {
      totalRegions: regions.length,
      regionsByType,
      coverage: Math.round(coverage * 100) / 100,
      density: Math.round(density * 100) / 100,
    };
  }
  
  /**
   * 检查合规性
   */
  private checkCompliance(regions: any[], templateConfig: any) {
    const hasPositioning = regions.some(r => r.type === 'positioning');
    const hasValidDPI = (templateConfig.dpi || 300) >= this.standards.print.minDPI;
    const hasValidPageSize = templateConfig.pageSize && 
                            templateConfig.pageSize.width > 0 && 
                            templateConfig.pageSize.height > 0;
    
    return {
      omrStandard: hasPositioning && regions.length > 0,
      printReady: hasValidDPI && hasValidPageSize,
      scanOptimized: hasPositioning && hasValidDPI,
    };
  }
  
  /**
   * 确定总体质量等级
   */
  private determineOverallQuality(score: number) {
    let grade: 'excellent' | 'good' | 'acceptable' | 'poor';
    let status: 'pass' | 'warning' | 'fail';
    
    if (score >= this.thresholds.excellent) {
      grade = 'excellent';
      status = 'pass';
    } else if (score >= this.thresholds.good) {
      grade = 'good';
      status = 'pass';
    } else if (score >= this.thresholds.acceptable) {
      grade = 'acceptable';
      status = 'warning';
    } else {
      grade = 'poor';
      status = 'fail';
    }
    
    return { score, grade, status };
  }
  
  /**
   * 计算两个区域之间的距离
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
}

// 导出便捷函数
export function analyzeTemplateQuality(
  regions: any[],
  templateConfig: any,
  examType?: string
): QualityAnalysisResult {
  const analyzer = new QualityAnalyzer(examType);
  return analyzer.analyzeTemplate(regions, templateConfig);
}

// 导出质量等级判断函数
export function getQualityGrade(score: number): {
  grade: string;
  color: string;
  description: string;
} {
  if (score >= 90) {
    return {
      grade: '优秀',
      color: '#52c41a',
      description: '模板质量优秀，完全符合OMR标准',
    };
  } else if (score >= 70) {
    return {
      grade: '良好',
      color: '#1890ff',
      description: '模板质量良好，基本符合要求',
    };
  } else if (score >= 50) {
    return {
      grade: '可接受',
      color: '#faad14',
      description: '模板质量可接受，建议优化',
    };
  } else {
    return {
      grade: '较差',
      color: '#f5222d',
      description: '模板质量较差，需要重新设计',
    };
  }
}

export default QualityAnalyzer;