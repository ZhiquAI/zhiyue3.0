/**
 * 客观题矩阵生成工具
 * 根据参数自动生成标准的客观题选项泡泡布局
 */

export interface ObjectiveMatrixConfig {
  questionCount: number;          // 题目数量
  optionCount: number;           // 每题选项数量 (A,B,C,D...)
  layout: 'horizontal' | 'vertical' | 'matrix'; // 布局方式
  startQuestionNumber: number;   // 起始题号
  bubbleSize: number;           // 泡泡大小 (像素)
  spacing: number;              // 间距 (像素)
  rowCount?: number;            // 矩阵布局时的行数
  columnCount?: number;         // 矩阵布局时的列数
}

export interface BubblePosition {
  questionNumber: number;
  option: string;              // A, B, C, D...
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObjectiveMatrixResult {
  bubbles: BubblePosition[];
  totalWidth: number;
  totalHeight: number;
  metadata: {
    questionCount: number;
    optionCount: number;
    layout: string;
    generatedAt: string;
  };
}

/**
 * 生成客观题矩阵
 */
export function generateObjectiveMatrix(config: ObjectiveMatrixConfig): ObjectiveMatrixResult {
  const {
    questionCount,
    optionCount,
    layout,
    startQuestionNumber,
    bubbleSize,
    spacing
  } = config;

  const bubbles: BubblePosition[] = [];
  const optionLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, optionCount);

  let totalWidth = 0;
  let totalHeight = 0;

  switch (layout) {
    case 'horizontal':
      // 水平布局：每题的选项横向排列，题目纵向排列
      for (let q = 0; q < questionCount; q++) {
        const questionNumber = startQuestionNumber + q;
        const y = q * (bubbleSize + spacing);
        
        for (let o = 0; o < optionCount; o++) {
          const x = o * (bubbleSize + spacing);
          
          bubbles.push({
            questionNumber,
            option: optionLabels[o],
            x,
            y,
            width: bubbleSize,
            height: bubbleSize
          });
        }
      }
      
      totalWidth = optionCount * bubbleSize + (optionCount - 1) * spacing;
      totalHeight = questionCount * bubbleSize + (questionCount - 1) * spacing;
      break;

    case 'vertical':
      // 垂直布局：每题的选项纵向排列，题目横向排列
      for (let q = 0; q < questionCount; q++) {
        const questionNumber = startQuestionNumber + q;
        const x = q * (bubbleSize + spacing);
        
        for (let o = 0; o < optionCount; o++) {
          const y = o * (bubbleSize + spacing);
          
          bubbles.push({
            questionNumber,
            option: optionLabels[o],
            x,
            y,
            width: bubbleSize,
            height: bubbleSize
          });
        }
      }
      
      totalWidth = questionCount * bubbleSize + (questionCount - 1) * spacing;
      totalHeight = optionCount * bubbleSize + (optionCount - 1) * spacing;
      break;

    case 'matrix':
      // 矩阵布局：题目按行列排列，每个位置显示该题的所有选项
      const rowCount = config.rowCount || Math.ceil(Math.sqrt(questionCount));
      const columnCount = config.columnCount || Math.ceil(questionCount / rowCount);
      
      // 每个题目单元格的尺寸
      const cellWidth = optionCount * bubbleSize + (optionCount - 1) * spacing;
      const cellHeight = bubbleSize;
      const cellSpacingX = spacing * 2;
      const cellSpacingY = spacing * 2;
      
      for (let q = 0; q < questionCount; q++) {
        const questionNumber = startQuestionNumber + q;
        const row = Math.floor(q / columnCount);
        const col = q % columnCount;
        
        const cellX = col * (cellWidth + cellSpacingX);
        const cellY = row * (cellHeight + cellSpacingY);
        
        for (let o = 0; o < optionCount; o++) {
          const x = cellX + o * (bubbleSize + spacing);
          const y = cellY;
          
          bubbles.push({
            questionNumber,
            option: optionLabels[o],
            x,
            y,
            width: bubbleSize,
            height: bubbleSize
          });
        }
      }
      
      totalWidth = columnCount * cellWidth + (columnCount - 1) * cellSpacingX;
      totalHeight = rowCount * cellHeight + (rowCount - 1) * cellSpacingY;
      break;
  }

  return {
    bubbles,
    totalWidth,
    totalHeight,
    metadata: {
      questionCount,
      optionCount,
      layout,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * 生成标准客观题模板
 * 常用的标准配置
 */
export const STANDARD_OBJECTIVE_TEMPLATES = {
  // 5题4选项，垂直布局
  small_vertical: {
    questionCount: 5,
    optionCount: 4,
    layout: 'vertical' as const,
    startQuestionNumber: 1,
    bubbleSize: 12,
    spacing: 8
  },
  
  // 10题4选项，水平布局
  medium_horizontal: {
    questionCount: 10,
    optionCount: 4,
    layout: 'horizontal' as const,
    startQuestionNumber: 1,
    bubbleSize: 10,
    spacing: 6
  },
  
  // 20题4选项，矩阵布局
  large_matrix: {
    questionCount: 20,
    optionCount: 4,
    layout: 'matrix' as const,
    startQuestionNumber: 1,
    bubbleSize: 8,
    spacing: 4,
    rowCount: 4,
    columnCount: 5
  },
  
  // 50题5选项，矩阵布局
  exam_matrix: {
    questionCount: 50,
    optionCount: 5,
    layout: 'matrix' as const,
    startQuestionNumber: 1,
    bubbleSize: 6,
    spacing: 3,
    rowCount: 10,
    columnCount: 5
  }
};

/**
 * 验证客观题矩阵配置
 */
export function validateObjectiveMatrixConfig(config: ObjectiveMatrixConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本验证
  if (config.questionCount <= 0 || config.questionCount > 100) {
    errors.push('题目数量必须在1-100之间');
  }

  if (config.optionCount < 2 || config.optionCount > 8) {
    errors.push('选项数量必须在2-8之间');
  }

  if (config.bubbleSize < 4 || config.bubbleSize > 20) {
    errors.push('泡泡大小必须在4-20像素之间');
  }

  if (config.spacing < 1 || config.spacing > 20) {
    errors.push('间距必须在1-20像素之间');
  }

  // 布局特定验证
  if (config.layout === 'matrix') {
    if (config.rowCount && config.columnCount) {
      if (config.rowCount * config.columnCount < config.questionCount) {
        errors.push('矩阵的行数×列数必须大于等于题目数量');
      }
    }
  }

  // 警告检查
  if (config.questionCount > 50) {
    warnings.push('题目数量较多，建议使用矩阵布局以节省空间');
  }

  if (config.bubbleSize < 6) {
    warnings.push('泡泡大小较小，可能影响识别准确率');
  }

  if (config.spacing < 3) {
    warnings.push('间距较小，可能影响识别准确率');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 计算建议的区域尺寸
 */
export function calculateRecommendedSize(config: ObjectiveMatrixConfig): {
  width: number;
  height: number;
  padding: number;
} {
  const result = generateObjectiveMatrix(config);
  const padding = Math.max(config.bubbleSize, 10);
  
  return {
    width: result.totalWidth + padding * 2,
    height: result.totalHeight + padding * 2,
    padding
  };
}

/**
 * 生成OMR识别配置
 * 用于后续的光学标记识别
 */
export function generateOMRConfig(matrixResult: ObjectiveMatrixResult) {
  return {
    type: 'objective_questions',
    bubble_detection: {
      min_size: matrixResult.bubbles[0]?.width * 0.8 || 6,
      max_size: matrixResult.bubbles[0]?.width * 1.2 || 15,
      threshold: 0.7,
      expected_shape: 'circle'
    },
    questions: matrixResult.bubbles.reduce((acc, bubble) => {
      if (!acc[bubble.questionNumber]) {
        acc[bubble.questionNumber] = {
          question_number: bubble.questionNumber,
          options: []
        };
      }
      
      acc[bubble.questionNumber].options.push({
        option: bubble.option,
        position: {
          x: bubble.x,
          y: bubble.y,
          width: bubble.width,
          height: bubble.height
        }
      });
      
      return acc;
    }, {} as any),
    metadata: matrixResult.metadata
  };
}