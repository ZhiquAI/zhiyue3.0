<template>
  <div class="classified-grading">
    <!-- 头部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2>智能评分</h2>
        <span class="subtitle">基于题型分类的专业评分系统</span>
      </div>
      <div class="toolbar-right">
        <el-button 
          type="primary" 
          :loading="grading" 
          @click="startGrading"
          :disabled="!hasQuestions"
        >
          <i class="el-icon-cpu"></i>
          开始评分
        </el-button>
        <el-button 
          v-if="gradingResult"
          type="success" 
          @click="exportGradingResult"
        >
          <i class="el-icon-download"></i>
          导出结果
        </el-button>
        <el-button 
          v-if="gradingResult"
          type="warning" 
          @click="showGradingReport"
        >
          <i class="el-icon-data-analysis"></i>
          评分报告
        </el-button>
      </div>
    </div>

    <!-- 评分配置 -->
    <div class="grading-config">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>评分配置</span>
            <el-button type="text" @click="showAdvancedConfig = !showAdvancedConfig">
              {{ showAdvancedConfig ? '收起' : '展开' }}高级配置
            </el-button>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="评分模式">
              <el-select v-model="gradingConfig.mode" placeholder="选择评分模式">
                <el-option label="标准评分" value="standard"></el-option>
                <el-option label="严格评分" value="strict"></el-option>
                <el-option label="宽松评分" value="lenient"></el-option>
                <el-option label="自定义" value="custom"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="部分分数">
              <el-switch 
                v-model="gradingConfig.partialCredit" 
                active-text="启用" 
                inactive-text="禁用"
              ></el-switch>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="AI辅助">
              <el-switch 
                v-model="gradingConfig.aiAssisted" 
                active-text="启用" 
                inactive-text="禁用"
              ></el-switch>
            </el-form-item>
          </el-col>
        </el-row>

        <div v-if="showAdvancedConfig" class="advanced-config">
          <el-divider>高级配置</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="关键词权重">
                <el-slider v-model="gradingConfig.keywordWeight" :min="0" :max="1" :step="0.1" show-input></el-slider>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结构权重">
                <el-slider v-model="gradingConfig.structureWeight" :min="0" :max="1" :step="0.1" show-input></el-slider>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="质量权重">
                <el-slider v-model="gradingConfig.qualityWeight" :min="0" :max="1" :step="0.1" show-input></el-slider>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="AI权重">
                <el-slider v-model="gradingConfig.aiWeight" :min="0" :max="1" :step="0.1" show-input></el-slider>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </div>

    <!-- 题目列表和评分进度 -->
    <div class="questions-grading">
      <el-row :gutter="20">
        <!-- 题目列表 -->
        <el-col :span="16">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>题目列表 ({{ questions.length }}道)</span>
                <div class="header-actions">
                  <el-select v-model="filterType" placeholder="筛选题型" clearable size="small">
                    <el-option 
                      v-for="type in questionTypes" 
                      :key="type.value" 
                      :label="type.label" 
                      :value="type.value"
                    ></el-option>
                  </el-select>
                </div>
              </div>
            </template>
            
            <div class="questions-list">
              <div 
                v-for="(question, index) in filteredQuestions" 
                :key="index"
                class="question-item"
                :class="{ 
                  'grading': question.status === 'grading',
                  'completed': question.status === 'completed',
                  'error': question.status === 'error'
                }"
              >
                <div class="question-header">
                  <div class="question-info">
                    <span class="question-number">{{ question.question_number }}</span>
                    <el-tag 
                      :type="getQuestionTypeColor(question.question_type)"
                      size="small"
                    >
                      {{ getQuestionTypeName(question.question_type) }}
                    </el-tag>
                    <span class="question-points">{{ question.points }}分</span>
                  </div>
                  <div class="question-status">
                    <el-tag 
                      :type="getStatusColor(question.status)"
                      size="small"
                    >
                      {{ getStatusText(question.status) }}
                    </el-tag>
                  </div>
                </div>
                
                <div class="question-content">
                  <div class="question-text">
                    {{ question.question_text }}
                  </div>
                  <div v-if="question.student_answer" class="student-answer">
                    <strong>学生答案:</strong> {{ question.student_answer }}
                  </div>
                </div>
                
                <!-- 评分结果 -->
                <div v-if="question.gradingResult" class="grading-result">
                  <div class="score-display">
                    <span class="score">{{ question.gradingResult.score }}</span>
                    <span class="max-score">/ {{ question.gradingResult.max_score }}</span>
                    <span class="percentage">({{ getScorePercentage(question.gradingResult) }}%)</span>
                  </div>
                  <div v-if="question.gradingResult.feedback" class="feedback">
                    {{ question.gradingResult.feedback }}
                  </div>
                </div>
                
                <!-- 评分进度 -->
                <div v-if="question.status === 'grading'" class="grading-progress">
                  <el-progress 
                    :percentage="question.progress || 0" 
                    :stroke-width="4"
                    status="active"
                  ></el-progress>
                </div>
                
                <div class="question-actions">
                  <el-button 
                    v-if="question.status === 'completed'"
                    type="text" 
                    size="small" 
                    @click="viewGradingDetail(question)"
                  >
                    查看详情
                  </el-button>
                  <el-button 
                    v-if="question.status === 'completed'"
                    type="text" 
                    size="small" 
                    @click="adjustScore(question)"
                  >
                    调整分数
                  </el-button>
                  <el-button 
                    v-if="question.status === 'error'"
                    type="text" 
                    size="small" 
                    @click="retryGrading(question)"
                  >
                    重新评分
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <!-- 评分统计 -->
        <el-col :span="8">
          <el-card>
            <template #header>
              <span>评分统计</span>
            </template>
            
            <div class="grading-stats">
              <div class="stat-item">
                <div class="stat-label">总题目数</div>
                <div class="stat-value">{{ questions.length }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">已评分</div>
                <div class="stat-value">{{ completedCount }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">评分中</div>
                <div class="stat-value">{{ gradingCount }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">总分</div>
                <div class="stat-value">{{ totalScore }} / {{ totalMaxScore }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">得分率</div>
                <div class="stat-value">{{ overallPercentage }}%</div>
              </div>
            </div>
            
            <!-- 题型分布 -->
            <div class="type-distribution">
              <h4>题型分布</h4>
              <div class="distribution-chart">
                <div 
                  v-for="(count, type) in typeDistribution" 
                  :key="type"
                  class="distribution-item"
                >
                  <span class="type-name">{{ getQuestionTypeName(type) }}</span>
                  <el-progress 
                    :percentage="(count / questions.length) * 100"
                    :stroke-width="15"
                    :show-text="false"
                  ></el-progress>
                  <span class="type-count">{{ count }}</span>
                </div>
              </div>
            </div>
            
            <!-- 评分质量 -->
            <div v-if="gradingQuality" class="grading-quality">
              <h4>评分质量</h4>
              <div class="quality-indicators">
                <div class="quality-item">
                  <span class="quality-label">准确性</span>
                  <el-progress 
                    :percentage="gradingQuality.accuracy * 100"
                    :stroke-width="8"
                    :color="getQualityColor(gradingQuality.accuracy)"
                  ></el-progress>
                </div>
                <div class="quality-item">
                  <span class="quality-label">一致性</span>
                  <el-progress 
                    :percentage="gradingQuality.consistency * 100"
                    :stroke-width="8"
                    :color="getQualityColor(gradingQuality.consistency)"
                  ></el-progress>
                </div>
                <div class="quality-item">
                  <span class="quality-label">完整性</span>
                  <el-progress 
                    :percentage="gradingQuality.completeness * 100"
                    :stroke-width="8"
                    :color="getQualityColor(gradingQuality.completeness)"
                  ></el-progress>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 评分详情对话框 -->
    <el-dialog
      v-model="showGradingDetail"
      title="评分详情"
      width="70%"
      :before-close="handleDetailClose"
    >
      <div v-if="selectedQuestion" class="grading-detail">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <div class="basic-info">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="题目编号">{{ selectedQuestion.question_number }}</el-descriptions-item>
                <el-descriptions-item label="题目类型">
                  <el-tag :type="getQuestionTypeColor(selectedQuestion.question_type)">
                    {{ getQuestionTypeName(selectedQuestion.question_type) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="分值">{{ selectedQuestion.points }}分</el-descriptions-item>
                <el-descriptions-item label="得分">{{ selectedQuestion.gradingResult?.score || 0 }}分</el-descriptions-item>
                <el-descriptions-item label="得分率">{{ getScorePercentage(selectedQuestion.gradingResult) }}%</el-descriptions-item>
                <el-descriptions-item label="评分状态">
                  <el-tag :type="getStatusColor(selectedQuestion.status)">
                    {{ getStatusText(selectedQuestion.status) }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
              
              <div class="content-section">
                <h4>题目内容</h4>
                <div class="content-box">{{ selectedQuestion.question_text }}</div>
              </div>
              
              <div class="content-section">
                <h4>学生答案</h4>
                <div class="content-box">{{ selectedQuestion.student_answer || '无答案' }}</div>
              </div>
              
              <div v-if="selectedQuestion.gradingResult?.feedback" class="content-section">
                <h4>评分反馈</h4>
                <div class="content-box">{{ selectedQuestion.gradingResult.feedback }}</div>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="评分细节" name="details">
            <div v-if="selectedQuestion.gradingResult" class="grading-details">
              <!-- 客观题详情 -->
              <div v-if="isObjectiveQuestion(selectedQuestion)" class="objective-details">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="正确答案">{{ selectedQuestion.gradingResult.correct_answer }}</el-descriptions-item>
                  <el-descriptions-item label="学生答案">{{ selectedQuestion.gradingResult.student_answer }}</el-descriptions-item>
                  <el-descriptions-item label="是否正确">
                    <el-tag :type="selectedQuestion.gradingResult.is_correct ? 'success' : 'danger'">
                      {{ selectedQuestion.gradingResult.is_correct ? '正确' : '错误' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="匹配方式">{{ selectedQuestion.gradingResult.match_type || '精确匹配' }}</el-descriptions-item>
                </el-descriptions>
              </div>
              
              <!-- 主观题详情 -->
              <div v-else class="subjective-details">
                <div v-if="selectedQuestion.gradingResult.rubric_scores" class="rubric-scores">
                  <h4>评分标准得分</h4>
                  <div class="rubric-list">
                    <div 
                      v-for="(score, criterion) in selectedQuestion.gradingResult.rubric_scores" 
                      :key="criterion"
                      class="rubric-item"
                    >
                      <span class="criterion-name">{{ getCriterionName(criterion) }}</span>
                      <el-progress 
                        :percentage="score * 100"
                        :stroke-width="12"
                        :show-text="false"
                      ></el-progress>
                      <span class="criterion-score">{{ (score * 100).toFixed(1) }}%</span>
                    </div>
                  </div>
                </div>
                
                <div v-if="selectedQuestion.gradingResult.quality_indicators" class="quality-indicators">
                  <h4>质量指标</h4>
                  <div class="indicator-list">
                    <div 
                      v-for="(value, indicator) in selectedQuestion.gradingResult.quality_indicators" 
                      :key="indicator"
                      class="indicator-item"
                    >
                      <span class="indicator-name">{{ getIndicatorName(indicator) }}</span>
                      <el-progress 
                        :percentage="value * 100"
                        :stroke-width="8"
                        :color="getQualityColor(value)"
                      ></el-progress>
                      <span class="indicator-value">{{ (value * 100).toFixed(1) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="AI分析" name="ai">
            <div v-if="selectedQuestion.aiAnalysis" class="ai-analysis">
              <div class="analysis-section">
                <h4>AI评分建议</h4>
                <div class="analysis-content">{{ selectedQuestion.aiAnalysis.suggestion }}</div>
              </div>
              
              <div class="analysis-section">
                <h4>关键词匹配</h4>
                <div class="keyword-matches">
                  <el-tag 
                    v-for="keyword in selectedQuestion.aiAnalysis.matched_keywords" 
                    :key="keyword"
                    type="success"
                    class="keyword-tag"
                  >
                    {{ keyword }}
                  </el-tag>
                </div>
              </div>
              
              <div class="analysis-section">
                <h4>改进建议</h4>
                <ul class="improvement-list">
                  <li v-for="suggestion in selectedQuestion.aiAnalysis.improvements" :key="suggestion">
                    {{ suggestion }}
                  </li>
                </ul>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 分数调整对话框 -->
    <el-dialog
      v-model="showScoreAdjustment"
      title="调整分数"
      width="50%"
    >
      <div v-if="adjustingQuestion" class="score-adjustment">
        <el-form :model="scoreAdjustment" label-width="100px">
          <el-form-item label="当前分数">
            <span class="current-score">{{ adjustingQuestion.gradingResult?.score || 0 }} / {{ adjustingQuestion.points }}</span>
          </el-form-item>
          <el-form-item label="调整后分数">
            <el-input-number 
              v-model="scoreAdjustment.newScore" 
              :min="0" 
              :max="adjustingQuestion.points"
              :step="0.5"
              :precision="1"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="调整原因">
            <el-input 
              v-model="scoreAdjustment.reason" 
              type="textarea" 
              :rows="3"
              placeholder="请输入调整原因"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showScoreAdjustment = false">取消</el-button>
          <el-button type="primary" @click="saveScoreAdjustment">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 评分报告对话框 -->
    <el-dialog
      v-model="showReport"
      title="评分报告"
      width="80%"
      :before-close="handleReportClose"
    >
      <div v-if="gradingReport" class="grading-report">
        <!-- 报告内容将在这里实现 -->
        <div class="report-summary">
          <h3>评分总结</h3>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-value">{{ gradingReport.total_questions }}</div>
                <div class="summary-label">总题目数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-value">{{ gradingReport.total_score }}</div>
                <div class="summary-label">总得分</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-value">{{ gradingReport.average_score }}%</div>
                <div class="summary-label">平均得分率</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <div class="summary-value">{{ gradingReport.grade_level }}</div>
                <div class="summary-label">等级</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { classifiedGradingApi } from '@/api/classifiedGrading'

export default {
  name: 'ClassifiedGrading',
  props: {
    questions: {
      type: Array,
      default: () => []
    },
    answerSheet: {
      type: Object,
      default: null
    }
  },
  emits: ['grading-complete', 'score-updated'],
  setup(props, { emit }) {
    // 响应式数据
    const grading = ref(false)
    const gradingResult = ref(null)
    const gradingConfig = ref({
      mode: 'standard',
      partialCredit: true,
      aiAssisted: true,
      keywordWeight: 0.3,
      structureWeight: 0.2,
      qualityWeight: 0.2,
      aiWeight: 0.3
    })
    const showAdvancedConfig = ref(false)
    const filterType = ref('')
    const showGradingDetail = ref(false)
    const showScoreAdjustment = ref(false)
    const showReport = ref(false)
    const selectedQuestion = ref(null)
    const adjustingQuestion = ref(null)
    const activeTab = ref('basic')
    const gradingQuality = ref(null)
    const gradingReport = ref(null)
    
    const scoreAdjustment = ref({
      newScore: 0,
      reason: ''
    })

    // 题目类型配置
    const questionTypes = ref([
      { value: 'choice', label: '选择题' },
      { value: 'multiple_choice', label: '多选题' },
      { value: 'true_false', label: '判断题' },
      { value: 'fill_blank', label: '填空题' },
      { value: 'short_answer', label: '简答题' },
      { value: 'essay', label: '论述题' },
      { value: 'calculation', label: '计算题' },
      { value: 'proof', label: '证明题' },
      { value: 'analysis', label: '分析题' },
      { value: 'design', label: '设计题' }
    ])

    // 计算属性
    const hasQuestions = computed(() => {
      return props.questions && props.questions.length > 0
    })

    const filteredQuestions = computed(() => {
      if (!filterType.value) {
        return props.questions
      }
      return props.questions.filter(q => q.question_type === filterType.value)
    })

    const completedCount = computed(() => {
      return props.questions.filter(q => q.status === 'completed').length
    })

    const gradingCount = computed(() => {
      return props.questions.filter(q => q.status === 'grading').length
    })

    const totalScore = computed(() => {
      return props.questions.reduce((sum, q) => {
        return sum + (q.gradingResult?.score || 0)
      }, 0)
    })

    const totalMaxScore = computed(() => {
      return props.questions.reduce((sum, q) => sum + q.points, 0)
    })

    const overallPercentage = computed(() => {
      if (totalMaxScore.value === 0) return 0
      return ((totalScore.value / totalMaxScore.value) * 100).toFixed(1)
    })

    const typeDistribution = computed(() => {
      const distribution = {}
      props.questions.forEach(q => {
        distribution[q.question_type] = (distribution[q.question_type] || 0) + 1
      })
      return distribution
    })

    // 方法
    const startGrading = async () => {
      if (!props.questions || props.questions.length === 0) {
        ElMessage.error('没有可评分的题目')
        return
      }

      grading.value = true
      
      try {
        // 重置所有题目状态
        props.questions.forEach(q => {
          q.status = 'pending'
          q.progress = 0
          q.gradingResult = null
        })

        // 批量评分
        await batchGradeQuestions()
        
        // 生成评分质量报告
        await generateGradingQuality()
        
        ElMessage.success('评分完成！')
        emit('grading-complete', {
          questions: props.questions,
          totalScore: totalScore.value,
          totalMaxScore: totalMaxScore.value,
          percentage: overallPercentage.value
        })
        
      } catch (error) {
        console.error('评分失败:', error)
        ElMessage.error('评分失败: ' + (error.message || '未知错误'))
      } finally {
        grading.value = false
      }
    }

    const batchGradeQuestions = async () => {
      const batchSize = 5 // 每批处理5道题
      const batches = []
      
      for (let i = 0; i < props.questions.length; i += batchSize) {
        batches.push(props.questions.slice(i, i + batchSize))
      }

      for (const batch of batches) {
        const promises = batch.map(question => gradeQuestion(question))
        await Promise.all(promises)
      }
    }

    const gradeQuestion = async (question) => {
      try {
        question.status = 'grading'
        question.progress = 0

        // 模拟评分进度
        const progressInterval = setInterval(() => {
          if (question.progress < 90) {
            question.progress += 10
          }
        }, 200)

        // 调用评分API
        const response = await classifiedGradingApi.gradeQuestion({
          question_type: question.question_type,
          question_text: question.question_text,
          student_answer: question.student_answer,
          correct_answer: question.correct_answer,
          total_points: question.points,
          config: gradingConfig.value
        })

        clearInterval(progressInterval)
        question.progress = 100
        question.status = 'completed'
        question.gradingResult = response.data

        // 如果启用AI辅助，获取AI分析
        if (gradingConfig.value.aiAssisted) {
          try {
            const aiResponse = await classifiedGradingApi.getAiAnalysis({
              question: question,
              gradingResult: response.data
            })
            question.aiAnalysis = aiResponse.data
          } catch (aiError) {
            console.warn('AI分析失败:', aiError)
          }
        }

      } catch (error) {
        console.error('题目评分失败:', error)
        question.status = 'error'
        question.progress = 0
        question.gradingResult = {
          score: 0,
          max_score: question.points,
          feedback: '评分失败: ' + (error.message || '未知错误')
        }
      }
    }

    const generateGradingQuality = async () => {
      try {
        const response = await classifiedGradingApi.assessGradingQuality({
          questions: props.questions,
          gradingResults: props.questions.map(q => q.gradingResult).filter(Boolean)
        })
        gradingQuality.value = response.data
      } catch (error) {
        console.warn('质量评估失败:', error)
      }
    }

    const viewGradingDetail = (question) => {
      selectedQuestion.value = question
      showGradingDetail.value = true
      activeTab.value = 'basic'
    }

    const adjustScore = (question) => {
      adjustingQuestion.value = question
      scoreAdjustment.value.newScore = question.gradingResult?.score || 0
      scoreAdjustment.value.reason = ''
      showScoreAdjustment.value = true
    }

    const saveScoreAdjustment = () => {
      if (!adjustingQuestion.value || !scoreAdjustment.value.reason.trim()) {
        ElMessage.error('请填写调整原因')
        return
      }

      const oldScore = adjustingQuestion.value.gradingResult.score
      adjustingQuestion.value.gradingResult.score = scoreAdjustment.value.newScore
      adjustingQuestion.value.gradingResult.feedback += `\n\n[人工调整] ${scoreAdjustment.value.reason}`
      adjustingQuestion.value.gradingResult.manual_adjustment = {
        old_score: oldScore,
        new_score: scoreAdjustment.value.newScore,
        reason: scoreAdjustment.value.reason,
        timestamp: new Date().toISOString()
      }

      showScoreAdjustment.value = false
      ElMessage.success('分数已调整')
      
      emit('score-updated', {
        question: adjustingQuestion.value,
        oldScore,
        newScore: scoreAdjustment.value.newScore
      })
    }

    const retryGrading = async (question) => {
      try {
        await gradeQuestion(question)
        ElMessage.success('重新评分完成')
      } catch (error) {
        ElMessage.error('重新评分失败')
      }
    }

    const showGradingReport = async () => {
      try {
        const response = await classifiedGradingApi.generateReport({
          questions: props.questions,
          answerSheet: props.answerSheet
        })
        gradingReport.value = response.data
        showReport.value = true
      } catch (error) {
        ElMessage.error('生成报告失败')
      }
    }

    const exportGradingResult = () => {
      const exportData = {
        questions: props.questions,
        summary: {
          totalQuestions: props.questions.length,
          totalScore: totalScore.value,
          totalMaxScore: totalMaxScore.value,
          percentage: overallPercentage.value,
          typeDistribution: typeDistribution.value
        },
        config: gradingConfig.value,
        timestamp: new Date().toISOString()
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `评分结果_${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      
      ElMessage.success('结果已导出')
    }

    const handleDetailClose = () => {
      showGradingDetail.value = false
      selectedQuestion.value = null
    }

    const handleReportClose = () => {
      showReport.value = false
      gradingReport.value = null
    }

    // 工具方法
    const getQuestionTypeName = (type) => {
      const typeMap = {
        'choice': '选择题',
        'multiple_choice': '多选题',
        'true_false': '判断题',
        'fill_blank': '填空题',
        'short_answer': '简答题',
        'essay': '论述题',
        'calculation': '计算题',
        'proof': '证明题',
        'analysis': '分析题',
        'design': '设计题',
        'unknown': '未知类型'
      }
      return typeMap[type] || type
    }

    const getQuestionTypeColor = (type) => {
      const colorMap = {
        'choice': 'primary',
        'multiple_choice': 'success',
        'true_false': 'info',
        'fill_blank': 'warning',
        'short_answer': 'danger',
        'essay': 'primary',
        'calculation': 'success',
        'proof': 'warning',
        'analysis': 'info',
        'design': 'danger',
        'unknown': 'info'
      }
      return colorMap[type] || 'info'
    }

    const getStatusColor = (status) => {
      const colorMap = {
        'pending': 'info',
        'grading': 'warning',
        'completed': 'success',
        'error': 'danger'
      }
      return colorMap[status] || 'info'
    }

    const getStatusText = (status) => {
      const textMap = {
        'pending': '待评分',
        'grading': '评分中',
        'completed': '已完成',
        'error': '评分失败'
      }
      return textMap[status] || status
    }

    const getScorePercentage = (gradingResult) => {
      if (!gradingResult || gradingResult.max_score === 0) return 0
      return ((gradingResult.score / gradingResult.max_score) * 100).toFixed(1)
    }

    const getQualityColor = (value) => {
      if (value > 0.8) return '#67c23a'
      if (value > 0.6) return '#e6a23c'
      return '#f56c6c'
    }

    const isObjectiveQuestion = (question) => {
      const objectiveTypes = ['choice', 'multiple_choice', 'true_false', 'fill_blank']
      return objectiveTypes.includes(question.question_type)
    }

    const getCriterionName = (criterion) => {
      const nameMap = {
        'keyword_matching': '关键词匹配',
        'structure_quality': '结构质量',
        'content_quality': '内容质量',
        'ai_assessment': 'AI评估'
      }
      return nameMap[criterion] || criterion
    }

    const getIndicatorName = (indicator) => {
      const nameMap = {
        'completeness': '完整性',
        'clarity': '清晰度',
        'accuracy': '准确性'
      }
      return nameMap[indicator] || indicator
    }

    // 监听题目变化，重置状态
    watch(() => props.questions, () => {
      if (props.questions) {
        props.questions.forEach(q => {
          if (!q.status) {
            q.status = 'pending'
            q.progress = 0
          }
        })
      }
    }, { immediate: true, deep: true })

    return {
      // 响应式数据
      grading,
      gradingResult,
      gradingConfig,
      showAdvancedConfig,
      filterType,
      showGradingDetail,
      showScoreAdjustment,
      showReport,
      selectedQuestion,
      adjustingQuestion,
      activeTab,
      gradingQuality,
      gradingReport,
      scoreAdjustment,
      questionTypes,
      
      // 计算属性
      hasQuestions,
      filteredQuestions,
      completedCount,
      gradingCount,
      totalScore,
      totalMaxScore,
      overallPercentage,
      typeDistribution,
      
      // 方法
      startGrading,
      viewGradingDetail,
      adjustScore,
      saveScoreAdjustment,
      retryGrading,
      showGradingReport,
      exportGradingResult,
      handleDetailClose,
      handleReportClose,
      getQuestionTypeName,
      getQuestionTypeColor,
      getStatusColor,
      getStatusText,
      getScorePercentage,
      getQualityColor,
      isObjectiveQuestion,
      getCriterionName,
      getIndicatorName
    }
  }
}
</script>

<style scoped>
.classified-grading {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.toolbar-left h2 {
  margin: 0;
  color: #303133;
}

.toolbar-left .subtitle {
  color: #909399;
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.grading-config {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.advanced-config {
  margin-top: 20px;
}

.questions-grading {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.questions-list {
  max-height: 600px;
  overflow-y: auto;
}

.question-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background: white;
  transition: all 0.3s ease;
}

.question-item.grading {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.question-item.completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

.question-item.error {
  border-color: #f56c6c;
  background: #fef0f0;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.question-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-number {
  font-weight: bold;
  color: #303133;
  font-size: 16px;
}

.question-points {
  color: #f56c6c;
  font-weight: bold;
}

.question-content {
  margin-bottom: 15px;
}

.question-text {
  margin-bottom: 8px;
  line-height: 1.5;
  color: #303133;
}

.student-answer {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.grading-result {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 5px;
}

.score {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.max-score {
  color: #909399;
}

.percentage {
  color: #67c23a;
  font-weight: bold;
}

.feedback {
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
}

.grading-progress {
  margin-bottom: 10px;
}

.question-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.grading-stats {
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.stat-value {
  font-weight: bold;
  color: #303133;
}

.type-distribution {
  margin-bottom: 20px;
}

.type-distribution h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-name {
  width: 60px;
  font-size: 12px;
  color: #303133;
}

.type-count {
  width: 30px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}

.grading-quality h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
}

.quality-indicators {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quality-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quality-label {
  width: 60px;
  font-size: 12px;
  color: #303133;
}

.grading-detail {
  padding: 20px;
}

.basic-info {
  margin-bottom: 20px;
}

.content-section {
  margin-bottom: 20px;
}

.content-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
}

.content-box {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  line-height: 1.6;
  color: #303133;
}

.grading-details {
  padding: 20px 0;
}

.objective-details {
  margin-bottom: 20px;
}

.subjective-details {
  margin-bottom: 20px;
}

.rubric-scores h4,
.quality-indicators h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
}

.rubric-list,
.indicator-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rubric-item,
.indicator-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.criterion-name,
.indicator-name {
  width: 100px;
  font-size: 14px;
  color: #303133;
}

.criterion-score,
.indicator-value {
  width: 60px;
  font-size: 14px;
  color: #409eff;
  text-align: right;
}

.ai-analysis {
  padding: 20px 0;
}

.analysis-section {
  margin-bottom: 20px;
}

.analysis-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 16px;
}

.analysis-content {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  line-height: 1.6;
  color: #303133;
}

.keyword-matches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  margin: 0;
}

.improvement-list {
  margin: 0;
  padding-left: 20px;
}

.improvement-list li {
  margin-bottom: 8px;
  line-height: 1.5;
  color: #303133;
}

.score-adjustment {
  padding: 20px;
}

.current-score {
  font-size: 16px;
  font-weight: bold;
  color: #409eff;
}

.grading-report {
  padding: 20px;
}

.report-summary {
  margin-bottom: 30px;
}

.report-summary h3 {
  margin: 0 0 20px 0;
  color: #303133;
}

.summary-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.summary-label {
  color: #909399;
  font-size: 14px;
}
</style>