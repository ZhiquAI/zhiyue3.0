/**
 * 答题卡模板质量验证工具
 * 确保模板符合OMR识别和阅卷系统的要求
 */

import type { TemplateConfig, TemplateRegion } from '../components/TemplateDesigner/OptimizedAnswerSheetDesigner';

export interface ValidationResult {
  valid: boolean;
  score: number;              // 质量评分 (0-100)
  level: 'excellent' | 'good' | 'fair' | 'poor';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  id: string;
  type: 'critical' | 'error' | 'warning';
  message: string;
  regionId?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  id: string;
  message: string;
  regionId?: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * OMR识别标准
 */
const OMR_STANDARDS = {
  // 最小尺寸要求
  MIN_BUBBLE_SIZE: 6,
  MAX_BUBBLE_SIZE: 20,
  MIN_REGION_SIZE: 20,
  MIN_SPACING: 3,
  
  // 定位点要求
  MIN_POSITIONING_POINTS: 3,
  POSITIONING_MIN_SIZE: 15,
  POSITIONING_MAX_SIZE: 30,
  
  // 边距要求
  MIN_MARGIN: 10,
  RECOMMENDED_MARGIN: 20,
  
  // 条码要求
  MIN_BARCODE_WIDTH: 50,
  MIN_BARCODE_HEIGHT: 20,
  
  // 区域重叠检查
  MIN_REGION_DISTANCE: 5
};

/**
 * 验证完整模板
 */
export function validateTemplate(template: TemplateConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  // 基本信息验证
  validateBasicInfo(template, errors, warnings);
  
  // 页面配置验证
  validatePageConfig(template.pageConfig, errors, warnings);
  
  // 区域验证
  validateRegions(template.regions, errors, warnings, suggestions);
  
  // 布局验证
  validateLayout(template.regions, template.pageConfig, errors, warnings, suggestions);
  
  // 工作流验证
  validateWorkflow(template.regions, errors, warnings, suggestions);

  // 计算质量评分
  const score = calculateQualityScore(errors, warnings, template.regions.length);
  const level = getQualityLevel(score);

  return {
    valid: errors.filter(e => e.type === 'critical' || e.type === 'error').length === 0,
    score,
    level,
    errors,
    warnings,
    suggestions
  };
}

/**
 * 验证基本信息
 */
function validateBasicInfo(template: TemplateConfig, errors: ValidationError[], warnings: ValidationWarning[]) {
  if (!template.name?.trim()) {
    errors.push({
      id: 'basic_name_required',
      type: 'error',
      message: '模板名称不能为空',
      suggestion: '请输入一个描述性的模板名称'
    });
  }

  if (!template.subject?.trim()) {
    warnings.push({
      id: 'basic_subject_missing',
      message: '建议设置科目信息以便分类管理',
      impact: 'low'
    });
  }

  if (!template.gradeLevel?.trim()) {
    warnings.push({
      id: 'basic_grade_missing',
      message: '建议设置年级信息以便分类管理',
      impact: 'low'
    });
  }
}

/**
 * 验证页面配置
 */
function validatePageConfig(pageConfig: TemplateConfig['pageConfig'], errors: ValidationError[], warnings: ValidationWarning[]) {
  if (pageConfig.width < 100 || pageConfig.width > 500) {
    errors.push({
      id: 'page_width_invalid',
      type: 'error',
      message: '页面宽度必须在100-500mm之间',
      suggestion: '标准A4纸宽度为210mm'
    });
  }

  if (pageConfig.height < 100 || pageConfig.height > 500) {
    errors.push({
      id: 'page_height_invalid',
      type: 'error',
      message: '页面高度必须在100-500mm之间',
      suggestion: '标准A4纸高度为297mm'
    });
  }

  if (pageConfig.dpi < 150 || pageConfig.dpi > 600) {
    warnings.push({
      id: 'page_dpi_nonstandard',
      message: 'DPI建议设置为300以获得最佳识别效果',
      impact: 'medium'
    });
  }
}

/**
 * 验证区域配置
 */
function validateRegions(regions: TemplateRegion[], errors: ValidationError[], warnings: ValidationWarning[], suggestions: string[]) {
  if (regions.length === 0) {
    errors.push({
      id: 'regions_empty',
      type: 'critical',
      message: '模板必须至少包含一个区域',
      suggestion: '请添加定位点、条码区或题目区域'
    });
    return;
  }

  // 检查必要区域
  const positioningRegions = regions.filter(r => r.type === 'positioning');
  const barcodeRegions = regions.filter(r => r.type === 'barcode');
  const questionRegions = regions.filter(r => r.type === 'objective' || r.type === 'subjective');

  if (positioningRegions.length < OMR_STANDARDS.MIN_POSITIONING_POINTS) {
    errors.push({
      id: 'positioning_insufficient',
      type: 'error',
      message: `至少需要${OMR_STANDARDS.MIN_POSITIONING_POINTS}个定位点以确保准确的图像校正`,
      suggestion: '建议在答题卡的四角添加定位点'
    });
  }

  if (barcodeRegions.length === 0) {
    warnings.push({
      id: 'barcode_missing',
      message: '缺少条码区域，将无法自动识别学生信息',
      impact: 'high'
    });
  }

  if (questionRegions.length === 0) {
    warnings.push({
      id: 'questions_missing',
      message: '缺少题目区域，模板可能不完整',
      impact: 'high'
    });
  }

  // 验证每个区域
  regions.forEach(region => {
    validateSingleRegion(region, errors, warnings);
  });

  // 检查区域重叠
  checkRegionOverlaps(regions, errors, warnings);
}

/**
 * 验证单个区域
 */
function validateSingleRegion(region: TemplateRegion, errors: ValidationError[], warnings: ValidationWarning[]) {
  // 基本尺寸检查
  if (region.width < OMR_STANDARDS.MIN_REGION_SIZE || region.height < OMR_STANDARDS.MIN_REGION_SIZE) {
    errors.push({
      id: `region_${region.id}_too_small`,
      type: 'error',
      message: `区域"${region.label}"尺寸过小，可能影响识别效果`,
      regionId: region.id,
      suggestion: `建议最小尺寸为${OMR_STANDARDS.MIN_REGION_SIZE}×${OMR_STANDARDS.MIN_REGION_SIZE}像素`
    });
  }

  // 类型特定验证
  switch (region.type) {
    case 'positioning':
      validatePositioningRegion(region, errors, warnings);
      break;
    case 'barcode':
      validateBarcodeRegion(region, errors, warnings);
      break;
    case 'objective':
      validateObjectiveRegion(region, errors, warnings);
      break;
    case 'subjective':
      validateSubjectiveRegion(region, errors, warnings);
      break;
  }
}

/**
 * 验证定位点区域
 */
function validatePositioningRegion(region: TemplateRegion, errors: ValidationError[], warnings: ValidationWarning[]) {
  const size = Math.min(region.width, region.height);
  
  if (size < OMR_STANDARDS.POSITIONING_MIN_SIZE) {
    errors.push({
      id: `positioning_${region.id}_too_small`,
      type: 'error',
      message: `定位点"${region.label}"尺寸过小，建议至少${OMR_STANDARDS.POSITIONING_MIN_SIZE}像素`,
      regionId: region.id
    });
  }

  if (size > OMR_STANDARDS.POSITIONING_MAX_SIZE) {
    warnings.push({
      id: `positioning_${region.id}_too_large`,
      message: `定位点"${region.label}"尺寸过大，可能影响识别精度`,
      regionId: region.id,
      impact: 'medium'
    });
  }

  // 检查长宽比
  const aspectRatio = region.width / region.height;
  if (aspectRatio < 0.8 || aspectRatio > 1.2) {
    warnings.push({
      id: `positioning_${region.id}_aspect_ratio`,
      message: `定位点"${region.label}"应接近正方形以获得最佳识别效果`,
      regionId: region.id,
      impact: 'medium'
    });
  }
}

/**
 * 验证条码区域
 */
function validateBarcodeRegion(region: TemplateRegion, errors: ValidationError[], warnings: ValidationWarning[]) {
  if (region.width < OMR_STANDARDS.MIN_BARCODE_WIDTH) {
    errors.push({
      id: `barcode_${region.id}_width_small`,
      type: 'error',
      message: `条码区域"${region.label}"宽度过小，建议至少${OMR_STANDARDS.MIN_BARCODE_WIDTH}像素`,
      regionId: region.id
    });
  }

  if (region.height < OMR_STANDARDS.MIN_BARCODE_HEIGHT) {
    errors.push({
      id: `barcode_${region.id}_height_small`,
      type: 'error',
      message: `条码区域"${region.label}"高度过小，建议至少${OMR_STANDARDS.MIN_BARCODE_HEIGHT}像素`,
      regionId: region.id
    });
  }

  // 检查条码类型配置
  if (!region.properties.barcodeType) {
    warnings.push({
      id: `barcode_${region.id}_type_missing`,
      message: `条码区域"${region.label}"未设置条码类型`,
      regionId: region.id,
      impact: 'medium'
    });
  }
}

/**
 * 验证客观题区域
 */
function validateObjectiveRegion(region: TemplateRegion, errors: ValidationError[], warnings: ValidationWarning[]) {
  const { questionCount, optionCount, bubbleSize } = region.properties;

  if (!questionCount || questionCount < 1) {
    errors.push({
      id: `objective_${region.id}_question_count`,
      type: 'error',
      message: `客观题区域"${region.label}"必须设置题目数量`,
      regionId: region.id
    });
  }

  if (!optionCount || optionCount < 2) {
    errors.push({
      id: `objective_${region.id}_option_count`,
      type: 'error',
      message: `客观题区域"${region.label}"必须设置选项数量（至少2个）`,
      regionId: region.id
    });
  }

  if (bubbleSize && (bubbleSize < OMR_STANDARDS.MIN_BUBBLE_SIZE || bubbleSize > OMR_STANDARDS.MAX_BUBBLE_SIZE)) {
    warnings.push({
      id: `objective_${region.id}_bubble_size`,
      message: `客观题区域"${region.label}"的泡泡大小建议在${OMR_STANDARDS.MIN_BUBBLE_SIZE}-${OMR_STANDARDS.MAX_BUBBLE_SIZE}像素之间`,
      regionId: region.id,
      impact: 'medium'
    });
  }
}

/**
 * 验证主观题区域
 */
function validateSubjectiveRegion(region: TemplateRegion, errors: ValidationError[], warnings: ValidationWarning[]) {
  const { questionNumber, maxScore } = region.properties;

  if (!questionNumber || questionNumber < 1) {
    errors.push({
      id: `subjective_${region.id}_question_number`,
      type: 'error',
      message: `主观题区域"${region.label}"必须设置题号`,
      regionId: region.id
    });
  }

  if (!maxScore || maxScore < 1) {
    warnings.push({
      id: `subjective_${region.id}_max_score`,
      message: `主观题区域"${region.label}"建议设置满分值`,
      regionId: region.id,
      impact: 'medium'
    });
  }

  // 检查区域大小是否合理
  const area = region.width * region.height;
  const expectedLines = region.properties.expectLines || 5;
  const minAreaPerLine = 1000; // 每行最小面积
  
  if (area < expectedLines * minAreaPerLine) {
    warnings.push({
      id: `subjective_${region.id}_area_small`,
      message: `主观题区域"${region.label}"可能过小，无法容纳预期的${expectedLines}行文字`,
      regionId: region.id,
      impact: 'medium'
    });
  }
}

/**
 * 检查区域重叠
 */
function checkRegionOverlaps(regions: TemplateRegion[], errors: ValidationError[], warnings: ValidationWarning[]) {
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const region1 = regions[i];
      const region2 = regions[j];

      if (isRegionsOverlapping(region1, region2)) {
        errors.push({
          id: `overlap_${region1.id}_${region2.id}`,
          type: 'error',
          message: `区域"${region1.label}"与"${region2.label}"存在重叠`,
          suggestion: '请调整区域位置避免重叠'
        });
      } else if (getRegionDistance(region1, region2) < OMR_STANDARDS.MIN_REGION_DISTANCE) {
        warnings.push({
          id: `distance_${region1.id}_${region2.id}`,
          message: `区域"${region1.label}"与"${region2.label}"距离过近，可能影响识别精度`,
          impact: 'medium'
        });
      }
    }
  }
}

/**
 * 验证布局
 */
function validateLayout(regions: TemplateRegion[], pageConfig: TemplateConfig['pageConfig'], errors: ValidationError[], warnings: ValidationWarning[], suggestions: string[]) {
  // 检查边距
  regions.forEach(region => {
    if (region.x < OMR_STANDARDS.MIN_MARGIN) {
      warnings.push({
        id: `layout_${region.id}_left_margin`,
        message: `区域"${region.label}"距离左边缘过近`,
        regionId: region.id,
        impact: 'medium'
      });
    }

    if (region.y < OMR_STANDARDS.MIN_MARGIN) {
      warnings.push({
        id: `layout_${region.id}_top_margin`,
        message: `区域"${region.label}"距离上边缘过近`,
        regionId: region.id,
        impact: 'medium'
      });
    }

    if (region.x + region.width > pageConfig.width - OMR_STANDARDS.MIN_MARGIN) {
      warnings.push({
        id: `layout_${region.id}_right_margin`,
        message: `区域"${region.label}"距离右边缘过近`,
        regionId: region.id,
        impact: 'medium'
      });
    }

    if (region.y + region.height > pageConfig.height - OMR_STANDARDS.MIN_MARGIN) {
      warnings.push({
        id: `layout_${region.id}_bottom_margin`,
        message: `区域"${region.label}"距离下边缘过近`,
        regionId: region.id,
        impact: 'medium'
      });
    }
  });

  // 布局建议
  const positioningRegions = regions.filter(r => r.type === 'positioning');
  if (positioningRegions.length >= 4) {
    const corners = checkCornerPositioning(positioningRegions, pageConfig);
    if (!corners.allCornersHavePositioning) {
      suggestions.push('建议在答题卡四角都放置定位点以获得最佳校正效果');
    }
  }
}

/**
 * 验证工作流
 */
function validateWorkflow(regions: TemplateRegion[], errors: ValidationError[], warnings: ValidationWarning[], suggestions: string[]) {
  const hasPositioning = regions.some(r => r.type === 'positioning');
  const hasBarcode = regions.some(r => r.type === 'barcode');
  const hasQuestions = regions.some(r => r.type === 'objective' || r.type === 'subjective');

  if (hasPositioning && hasBarcode && hasQuestions) {
    suggestions.push('模板包含完整的识别工作流：定位→身份识别→题目识别');
  } else {
    const missing = [];
    if (!hasPositioning) missing.push('定位点');
    if (!hasBarcode) missing.push('身份识别');
    if (!hasQuestions) missing.push('题目区域');
    
    suggestions.push(`建议补充以下区域以完善工作流：${missing.join('、')}`);
  }
}

/**
 * 计算质量评分
 */
function calculateQualityScore(errors: ValidationError[], warnings: ValidationWarning[], regionCount: number): number {
  let score = 100;

  // 错误扣分
  errors.forEach(error => {
    switch (error.type) {
      case 'critical':
        score -= 30;
        break;
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 5;
        break;
    }
  });

  // 警告扣分
  warnings.forEach(warning => {
    switch (warning.impact) {
      case 'high':
        score -= 8;
        break;
      case 'medium':
        score -= 4;
        break;
      case 'low':
        score -= 2;
        break;
    }
  });

  // 区域数量奖励
  if (regionCount >= 5) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 获取质量等级
 */
function getQualityLevel(score: number): ValidationResult['level'] {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'poor';
}

/**
 * 辅助函数：检查区域是否重叠
 */
function isRegionsOverlapping(region1: TemplateRegion, region2: TemplateRegion): boolean {
  return !(
    region1.x + region1.width <= region2.x ||
    region2.x + region2.width <= region1.x ||
    region1.y + region1.height <= region2.y ||
    region2.y + region2.height <= region1.y
  );
}

/**
 * 辅助函数：计算区域间距离
 */
function getRegionDistance(region1: TemplateRegion, region2: TemplateRegion): number {
  const centerX1 = region1.x + region1.width / 2;
  const centerY1 = region1.y + region1.height / 2;
  const centerX2 = region2.x + region2.width / 2;
  const centerY2 = region2.y + region2.height / 2;

  return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
}

/**
 * 辅助函数：检查四角定位
 */
function checkCornerPositioning(positioningRegions: TemplateRegion[], pageConfig: TemplateConfig['pageConfig']) {
  const cornerThreshold = 50; // 距离角落的阈值
  const corners = {
    topLeft: false,
    topRight: false,
    bottomLeft: false,
    bottomRight: false
  };

  positioningRegions.forEach(region => {
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;

    if (centerX < cornerThreshold && centerY < cornerThreshold) {
      corners.topLeft = true;
    } else if (centerX > pageConfig.width - cornerThreshold && centerY < cornerThreshold) {
      corners.topRight = true;
    } else if (centerX < cornerThreshold && centerY > pageConfig.height - cornerThreshold) {
      corners.bottomLeft = true;
    } else if (centerX > pageConfig.width - cornerThreshold && centerY > pageConfig.height - cornerThreshold) {
      corners.bottomRight = true;
    }
  });

  return {
    ...corners,
    allCornersHavePositioning: corners.topLeft && corners.topRight && corners.bottomLeft && corners.bottomRight
  };
}