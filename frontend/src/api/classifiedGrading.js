import request from '@/utils/request'

/**
 * 分类评分API接口
 */
export const classifiedGradingApi = {
  /**
   * 对单个题目进行评分
   * @param {Object} data - 评分数据
   * @param {string} data.question_type - 题目类型
   * @param {string} data.question_text - 题目内容
   * @param {string} data.student_answer - 学生答案
   * @param {string} data.correct_answer - 正确答案
   * @param {number} data.total_points - 总分
   * @param {Object} data.config - 评分配置
   * @returns {Promise} API响应
   */
  gradeQuestion(data) {
    return request({
      url: '/api/grading/classified/grade-question',
      method: 'post',
      data
    })
  },

  /**
   * 批量评分题目
   * @param {Object} data - 批量评分数据
   * @param {Array} data.questions - 题目列表
   * @param {Object} data.config - 评分配置
   * @returns {Promise} API响应
   */
  batchGradeQuestions(data) {
    return request({
      url: '/api/grading/classified/batch-grade',
      method: 'post',
      data
    })
  },

  /**
   * 获取AI分析结果
   * @param {Object} data - 分析数据
   * @param {Object} data.question - 题目信息
   * @param {Object} data.gradingResult - 评分结果
   * @returns {Promise} API响应
   */
  getAiAnalysis(data) {
    return request({
      url: '/api/grading/classified/ai-analysis',
      method: 'post',
      data
    })
  },

  /**
   * 评估评分质量
   * @param {Object} data - 质量评估数据
   * @param {Array} data.questions - 题目列表
   * @param {Array} data.gradingResults - 评分结果列表
   * @returns {Promise} API响应
   */
  assessGradingQuality(data) {
    return request({
      url: '/api/grading/classified/assess-quality',
      method: 'post',
      data
    })
  },

  /**
   * 生成评分报告
   * @param {Object} data - 报告数据
   * @param {Array} data.questions - 题目列表
   * @param {Object} data.answerSheet - 答题卡信息
   * @returns {Promise} API响应
   */
  generateReport(data) {
    return request({
      url: '/api/grading/classified/generate-report',
      method: 'post',
      data
    })
  },

  /**
   * 获取评分配置
   * @param {string} examType - 考试类型
   * @returns {Promise} API响应
   */
  getGradingConfig(examType) {
    return request({
      url: '/api/grading/classified/config',
      method: 'get',
      params: { exam_type: examType }
    })
  },

  /**
   * 保存评分配置
   * @param {Object} data - 配置数据
   * @returns {Promise} API响应
   */
  saveGradingConfig(data) {
    return request({
      url: '/api/grading/classified/config',
      method: 'post',
      data
    })
  },

  /**
   * 获取评分统计信息
   * @param {Object} params - 查询参数
   * @param {string} params.exam_id - 考试ID
   * @param {string} params.question_type - 题目类型（可选）
   * @returns {Promise} API响应
   */
  getGradingStatistics(params) {
    return request({
      url: '/api/grading/classified/statistics',
      method: 'get',
      params
    })
  },

  /**
   * 调整题目分数
   * @param {Object} data - 调整数据
   * @param {string} data.question_id - 题目ID
   * @param {number} data.new_score - 新分数
   * @param {string} data.reason - 调整原因
   * @returns {Promise} API响应
   */
  adjustQuestionScore(data) {
    return request({
      url: '/api/grading/classified/adjust-score',
      method: 'post',
      data
    })
  },

  /**
   * 重新评分题目
   * @param {Object} data - 重新评分数据
   * @param {string} data.question_id - 题目ID
   * @param {Object} data.config - 评分配置（可选）
   * @returns {Promise} API响应
   */
  retryGrading(data) {
    return request({
      url: '/api/grading/classified/retry',
      method: 'post',
      data
    })
  },

  /**
   * 导出评分结果
   * @param {Object} params - 导出参数
   * @param {string} params.exam_id - 考试ID
   * @param {string} params.format - 导出格式（json, excel, pdf）
   * @returns {Promise} API响应
   */
  exportGradingResults(params) {
    return request({
      url: '/api/grading/classified/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
  },

  /**
   * 获取题型分类器信息
   * @returns {Promise} API响应
   */
  getClassifierInfo() {
    return request({
      url: '/api/grading/classified/classifier-info',
      method: 'get'
    })
  },

  /**
   * 更新题型分类器
   * @param {Object} data - 更新数据
   * @returns {Promise} API响应
   */
  updateClassifier(data) {
    return request({
      url: '/api/grading/classified/update-classifier',
      method: 'post',
      data
    })
  },

  /**
   * 获取评分器配置
   * @param {string} questionType - 题目类型
   * @returns {Promise} API响应
   */
  getGraderConfig(questionType) {
    return request({
      url: `/api/grading/classified/grader-config/${questionType}`,
      method: 'get'
    })
  },

  /**
   * 更新评分器配置
   * @param {string} questionType - 题目类型
   * @param {Object} data - 配置数据
   * @returns {Promise} API响应
   */
  updateGraderConfig(questionType, data) {
    return request({
      url: `/api/grading/classified/grader-config/${questionType}`,
      method: 'post',
      data
    })
  },

  /**
   * 验证评分结果
   * @param {Object} data - 验证数据
   * @param {Array} data.questions - 题目列表
   * @param {Array} data.gradingResults - 评分结果列表
   * @returns {Promise} API响应
   */
  validateGradingResults(data) {
    return request({
      url: '/api/grading/classified/validate',
      method: 'post',
      data
    })
  },

  /**
   * 获取评分历史
   * @param {Object} params - 查询参数
   * @param {string} params.question_id - 题目ID
   * @param {number} params.page - 页码
   * @param {number} params.size - 每页大小
   * @returns {Promise} API响应
   */
  getGradingHistory(params) {
    return request({
      url: '/api/grading/classified/history',
      method: 'get',
      params
    })
  },

  /**
   * 比较评分结果
   * @param {Object} data - 比较数据
   * @param {Array} data.results - 评分结果列表
   * @returns {Promise} API响应
   */
  compareGradingResults(data) {
    return request({
      url: '/api/grading/classified/compare',
      method: 'post',
      data
    })
  },

  /**
   * 获取评分建议
   * @param {Object} data - 建议数据
   * @param {Object} data.question - 题目信息
   * @param {string} data.student_answer - 学生答案
   * @returns {Promise} API响应
   */
  getGradingSuggestions(data) {
    return request({
      url: '/api/grading/classified/suggestions',
      method: 'post',
      data
    })
  },

  /**
   * 训练评分模型
   * @param {Object} data - 训练数据
   * @param {Array} data.training_samples - 训练样本
   * @param {Object} data.config - 训练配置
   * @returns {Promise} API响应
   */
  trainGradingModel(data) {
    return request({
      url: '/api/grading/classified/train-model',
      method: 'post',
      data
    })
  },

  /**
   * 获取模型训练状态
   * @param {string} taskId - 训练任务ID
   * @returns {Promise} API响应
   */
  getTrainingStatus(taskId) {
    return request({
      url: `/api/grading/classified/training-status/${taskId}`,
      method: 'get'
    })
  },

  /**
   * 评估模型性能
   * @param {Object} data - 评估数据
   * @param {string} data.model_id - 模型ID
   * @param {Array} data.test_samples - 测试样本
   * @returns {Promise} API响应
   */
  evaluateModel(data) {
    return request({
      url: '/api/grading/classified/evaluate-model',
      method: 'post',
      data
    })
  }
}

/**
 * 题目分割API接口
 */
export const questionSegmentationApi = {
  /**
   * 智能切题
   * @param {Object} data - 切题数据
   * @param {Object} data.ocr_result - OCR结果
   * @param {Object} data.exam_config - 考试配置
   * @returns {Promise} API响应
   */
  segmentQuestions(data) {
    return request({
      url: '/api/question-segmentation/segment',
      method: 'post',
      data
    })
  },

  /**
   * 验证切题结果
   * @param {Object} data - 验证数据
   * @param {Array} data.questions - 切题结果
   * @param {Object} data.original_ocr - 原始OCR结果
   * @returns {Promise} API响应
   */
  validateSegmentation(data) {
    return request({
      url: '/api/question-segmentation/validate',
      method: 'post',
      data
    })
  },

  /**
   * 手动调整切题结果
   * @param {Object} data - 调整数据
   * @param {string} data.question_id - 题目ID
   * @param {Object} data.new_boundaries - 新的边界信息
   * @returns {Promise} API响应
   */
  adjustSegmentation(data) {
    return request({
      url: '/api/question-segmentation/adjust',
      method: 'post',
      data
    })
  },

  /**
   * 获取切题配置
   * @param {string} examType - 考试类型
   * @returns {Promise} API响应
   */
  getSegmentationConfig(examType) {
    return request({
      url: '/api/question-segmentation/config',
      method: 'get',
      params: { exam_type: examType }
    })
  },

  /**
   * 保存切题配置
   * @param {Object} data - 配置数据
   * @returns {Promise} API响应
   */
  saveSegmentationConfig(data) {
    return request({
      url: '/api/question-segmentation/config',
      method: 'post',
      data
    })
  },

  /**
   * 导出切题结果
   * @param {Object} params - 导出参数
   * @returns {Promise} API响应
   */
  exportSegmentationResults(params) {
    return request({
      url: '/api/question-segmentation/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
  }
}

/**
 * 题型分类API接口
 */
export const questionClassifierApi = {
  /**
   * 分类单个题目
   * @param {Object} data - 分类数据
   * @param {string} data.question_text - 题目文本
   * @param {Object} data.context - 上下文信息
   * @returns {Promise} API响应
   */
  classifyQuestion(data) {
    return request({
      url: '/api/question-classifier/classify',
      method: 'post',
      data
    })
  },

  /**
   * 批量分类题目
   * @param {Object} data - 批量分类数据
   * @param {Array} data.questions - 题目列表
   * @returns {Promise} API响应
   */
  batchClassifyQuestions(data) {
    return request({
      url: '/api/question-classifier/batch-classify',
      method: 'post',
      data
    })
  },

  /**
   * 获取分类统计信息
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  getClassificationStatistics(params) {
    return request({
      url: '/api/question-classifier/statistics',
      method: 'get',
      params
    })
  },

  /**
   * 更新分类规则
   * @param {Object} data - 规则数据
   * @returns {Promise} API响应
   */
  updateClassificationRules(data) {
    return request({
      url: '/api/question-classifier/rules',
      method: 'post',
      data
    })
  },

  /**
   * 获取支持的题目类型
   * @returns {Promise} API响应
   */
  getSupportedQuestionTypes() {
    return request({
      url: '/api/question-classifier/supported-types',
      method: 'get'
    })
  },

  /**
   * 训练分类模型
   * @param {Object} data - 训练数据
   * @returns {Promise} API响应
   */
  trainClassificationModel(data) {
    return request({
      url: '/api/question-classifier/train',
      method: 'post',
      data
    })
  },

  /**
   * 评估分类模型
   * @param {Object} data - 评估数据
   * @returns {Promise} API响应
   */
  evaluateClassificationModel(data) {
    return request({
      url: '/api/question-classifier/evaluate',
      method: 'post',
      data
    })
  }
}

export default {
  classifiedGradingApi,
  questionSegmentationApi,
  questionClassifierApi
}