<template>
  <div class="question-segmentation">
    <!-- 头部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2>智能切题</h2>
        <span class="subtitle">自动识别和分割试卷题目</span>
      </div>
      <div class="toolbar-right">
        <el-button 
          type="primary" 
          :loading="processing" 
          @click="startSegmentation"
          :disabled="!hasOcrResult"
        >
          <i class="el-icon-magic-stick"></i>
          开始切题
        </el-button>
        <el-button 
          v-if="segmentationResult"
          type="success" 
          @click="exportResult"
        >
          <i class="el-icon-download"></i>
          导出结果
        </el-button>
      </div>
    </div>

    <!-- OCR结果预览 -->
    <div v-if="ocrResult" class="ocr-preview">
      <div class="section-header">
        <h3>OCR识别结果</h3>
        <el-tag :type="ocrResult.confidence > 0.8 ? 'success' : 'warning'">
          置信度: {{ (ocrResult.confidence * 100).toFixed(1) }}%
        </el-tag>
      </div>
      <div class="ocr-content">
        <div class="text-content">
          <pre>{{ ocrResult.text }}</pre>
        </div>
        <div v-if="ocrResult.image" class="image-preview">
          <img :src="ocrResult.image" alt="原始图片" />
        </div>
      </div>
    </div>

    <!-- 切题进度 -->
    <div v-if="processing" class="progress-section">
      <div class="progress-header">
        <h3>切题进度</h3>
        <el-progress 
          :percentage="progressPercentage" 
          :status="progressStatus"
          :stroke-width="8"
        ></el-progress>
      </div>
      <div class="progress-steps">
        <el-steps :active="currentStep" finish-status="success">
          <el-step title="文本分析" description="分析OCR结果"></el-step>
          <el-step title="边界识别" description="识别题目边界"></el-step>
          <el-step title="题目分割" description="分割独立题目"></el-step>
          <el-step title="类型分类" description="识别题目类型"></el-step>
          <el-step title="答案提取" description="提取学生答案"></el-step>
        </el-steps>
      </div>
    </div>

    <!-- 切题结果 -->
    <div v-if="segmentationResult" class="segmentation-result">
      <div class="result-header">
        <h3>切题结果</h3>
        <div class="result-stats">
          <el-statistic title="识别题目" :value="segmentationResult.total_questions" suffix="道"></el-statistic>
          <el-statistic title="平均置信度" :value="averageConfidence" suffix="%" :precision="1"></el-statistic>
          <el-statistic title="质量等级" :value="qualityLevel"></el-statistic>
        </div>
      </div>

      <!-- 题目列表 -->
      <div class="questions-list">
        <div 
          v-for="(question, index) in segmentationResult.questions" 
          :key="index"
          class="question-item"
          :class="{ 'selected': selectedQuestionIndex === index }"
          @click="selectQuestion(index)"
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
            <div class="question-confidence">
              <el-progress 
                :percentage="question.confidence * 100" 
                :stroke-width="4"
                :show-text="false"
                :color="getConfidenceColor(question.confidence)"
              ></el-progress>
              <span class="confidence-text">{{ (question.confidence * 100).toFixed(1) }}%</span>
            </div>
          </div>
          
          <div class="question-content">
            <div class="question-text">
              <strong>题目:</strong> {{ question.question_text }}
            </div>
            <div v-if="question.student_answer" class="student-answer">
              <strong>学生答案:</strong> {{ question.student_answer }}
            </div>
          </div>
          
          <div class="question-region">
            <span class="region-info">
              区域: ({{ question.region.x }}, {{ question.region.y }}) 
              {{ question.region.width }}×{{ question.region.height }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 题目详情面板 -->
    <el-drawer
      v-model="showQuestionDetail"
      title="题目详情"
      :size="'50%'"
      direction="rtl"
    >
      <div v-if="selectedQuestion" class="question-detail">
        <div class="detail-section">
          <h4>基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="题目编号">{{ selectedQuestion.question_number }}</el-descriptions-item>
            <el-descriptions-item label="题目类型">
              <el-tag :type="getQuestionTypeColor(selectedQuestion.question_type)">
                {{ getQuestionTypeName(selectedQuestion.question_type) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="分值">{{ selectedQuestion.points }}分</el-descriptions-item>
            <el-descriptions-item label="置信度">{{ (selectedQuestion.confidence * 100).toFixed(1) }}%</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h4>题目内容</h4>
          <div class="content-box">
            {{ selectedQuestion.question_text }}
          </div>
        </div>

        <div v-if="selectedQuestion.student_answer" class="detail-section">
          <h4>学生答案</h4>
          <div class="content-box">
            {{ selectedQuestion.student_answer }}
          </div>
        </div>

        <div class="detail-section">
          <h4>区域信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="X坐标">{{ selectedQuestion.region.x }}px</el-descriptions-item>
            <el-descriptions-item label="Y坐标">{{ selectedQuestion.region.y }}px</el-descriptions-item>
            <el-descriptions-item label="宽度">{{ selectedQuestion.region.width }}px</el-descriptions-item>
            <el-descriptions-item label="高度">{{ selectedQuestion.region.height }}px</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-actions">
          <el-button type="primary" @click="editQuestion">编辑题目</el-button>
          <el-button type="warning" @click="reclassifyQuestion">重新分类</el-button>
          <el-button type="danger" @click="deleteQuestion">删除题目</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 编辑题目对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑题目"
      width="60%"
      :before-close="handleEditClose"
    >
      <div v-if="editingQuestion" class="edit-form">
        <el-form :model="editingQuestion" label-width="100px">
          <el-form-item label="题目编号">
            <el-input v-model="editingQuestion.question_number"></el-input>
          </el-form-item>
          <el-form-item label="题目类型">
            <el-select v-model="editingQuestion.question_type" placeholder="选择题目类型">
              <el-option 
                v-for="type in questionTypes" 
                :key="type.value" 
                :label="type.label" 
                :value="type.value"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="分值">
            <el-input-number v-model="editingQuestion.points" :min="0" :step="0.5"></el-input-number>
          </el-form-item>
          <el-form-item label="题目内容">
            <el-input 
              v-model="editingQuestion.question_text" 
              type="textarea" 
              :rows="4"
              placeholder="请输入题目内容"
            ></el-input>
          </el-form-item>
          <el-form-item label="学生答案">
            <el-input 
              v-model="editingQuestion.student_answer" 
              type="textarea" 
              :rows="3"
              placeholder="请输入学生答案"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="saveQuestion">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 质量验证结果 -->
    <div v-if="validationResult" class="validation-result">
      <div class="validation-header">
        <h3>质量验证</h3>
        <el-tag :type="getQualityColor(validationResult.quality_level)" size="large">
          {{ getQualityText(validationResult.quality_level) }}
        </el-tag>
      </div>
      
      <div class="validation-content">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card>
              <div class="stat-item">
                <div class="stat-value">{{ validationResult.total_questions }}</div>
                <div class="stat-label">总题目数</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card>
              <div class="stat-item">
                <div class="stat-value">{{ validationResult.valid_questions }}</div>
                <div class="stat-label">有效题目</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card>
              <div class="stat-item">
                <div class="stat-value">{{ (validationResult.average_confidence * 100).toFixed(1) }}%</div>
                <div class="stat-label">平均置信度</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <div v-if="validationResult.issues.length > 0" class="validation-issues">
          <h4>发现的问题</h4>
          <el-alert
            v-for="(issue, index) in validationResult.issues"
            :key="index"
            :title="issue"
            type="warning"
            :closable="false"
            class="issue-item"
          ></el-alert>
        </div>

        <div class="type-distribution">
          <h4>题型分布</h4>
          <div class="distribution-chart">
            <div 
              v-for="(count, type) in validationResult.type_distribution" 
              :key="type"
              class="distribution-item"
            >
              <span class="type-name">{{ getQuestionTypeName(type) }}</span>
              <el-progress 
                :percentage="(count / validationResult.total_questions) * 100"
                :stroke-width="20"
                :show-text="false"
              ></el-progress>
              <span class="type-count">{{ count }}道</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { questionSegmentationApi } from '@/api/questionSegmentation'

export default {
  name: 'QuestionSegmentation',
  props: {
    ocrResult: {
      type: Object,
      default: null
    }
  },
  emits: ['segmentation-complete'],
  setup(props, { emit }) {
    // 响应式数据
    const processing = ref(false)
    const currentStep = ref(0)
    const progressPercentage = ref(0)
    const progressStatus = ref('')
    const segmentationResult = ref(null)
    const validationResult = ref(null)
    const selectedQuestionIndex = ref(-1)
    const showQuestionDetail = ref(false)
    const showEditDialog = ref(false)
    const editingQuestion = ref(null)

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
    const hasOcrResult = computed(() => {
      return props.ocrResult && props.ocrResult.text
    })

    const averageConfidence = computed(() => {
      if (!segmentationResult.value || !segmentationResult.value.questions) {
        return 0
      }
      const total = segmentationResult.value.questions.reduce((sum, q) => sum + q.confidence, 0)
      return (total / segmentationResult.value.questions.length) * 100
    })

    const qualityLevel = computed(() => {
      if (!validationResult.value) return '未知'
      return getQualityText(validationResult.value.quality_level)
    })

    const selectedQuestion = computed(() => {
      if (selectedQuestionIndex.value >= 0 && segmentationResult.value) {
        return segmentationResult.value.questions[selectedQuestionIndex.value]
      }
      return null
    })

    // 方法
    const startSegmentation = async () => {
      if (!props.ocrResult) {
        ElMessage.error('请先进行OCR识别')
        return
      }

      processing.value = true
      currentStep.value = 0
      progressPercentage.value = 0
      progressStatus.value = 'active'

      try {
        // 模拟切题进度
        const steps = [
          { step: 0, percentage: 20, message: '正在分析OCR结果...' },
          { step: 1, percentage: 40, message: '正在识别题目边界...' },
          { step: 2, percentage: 60, message: '正在分割题目...' },
          { step: 3, percentage: 80, message: '正在分类题目类型...' },
          { step: 4, percentage: 100, message: '正在提取学生答案...' }
        ]

        for (const stepInfo of steps) {
          currentStep.value = stepInfo.step
          progressPercentage.value = stepInfo.percentage
          ElMessage.info(stepInfo.message)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // 调用API进行切题
        const response = await questionSegmentationApi.segmentQuestions(props.ocrResult)
        segmentationResult.value = response.data

        // 验证切题质量
        const validationResponse = await questionSegmentationApi.validateSegmentation(response.data)
        validationResult.value = validationResponse.data

        progressStatus.value = 'success'
        ElMessage.success('切题完成！')
        
        // 通知父组件
        emit('segmentation-complete', segmentationResult.value)

      } catch (error) {
        console.error('切题失败:', error)
        progressStatus.value = 'exception'
        ElMessage.error('切题失败: ' + (error.message || '未知错误'))
      } finally {
        processing.value = false
      }
    }

    const selectQuestion = (index) => {
      selectedQuestionIndex.value = index
      showQuestionDetail.value = true
    }

    const editQuestion = () => {
      if (selectedQuestion.value) {
        editingQuestion.value = { ...selectedQuestion.value }
        showEditDialog.value = true
      }
    }

    const saveQuestion = () => {
      if (editingQuestion.value && selectedQuestionIndex.value >= 0) {
        // 更新题目信息
        segmentationResult.value.questions[selectedQuestionIndex.value] = { ...editingQuestion.value }
        showEditDialog.value = false
        ElMessage.success('题目已更新')
      }
    }

    const handleEditClose = () => {
      showEditDialog.value = false
      editingQuestion.value = null
    }

    const reclassifyQuestion = async () => {
      if (!selectedQuestion.value) return

      try {
        const response = await questionSegmentationApi.reclassifyQuestion({
          question_text: selectedQuestion.value.question_text,
          question_number: selectedQuestion.value.question_number
        })

        // 更新题目类型
        segmentationResult.value.questions[selectedQuestionIndex.value].question_type = response.data.question_type
        ElMessage.success('重新分类完成')
      } catch (error) {
        ElMessage.error('重新分类失败: ' + error.message)
      }
    }

    const deleteQuestion = () => {
      ElMessageBox.confirm('确定要删除这道题目吗？', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        segmentationResult.value.questions.splice(selectedQuestionIndex.value, 1)
        segmentationResult.value.total_questions -= 1
        showQuestionDetail.value = false
        selectedQuestionIndex.value = -1
        ElMessage.success('题目已删除')
      })
    }

    const exportResult = () => {
      if (!segmentationResult.value) return

      const dataStr = JSON.stringify(segmentationResult.value, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `切题结果_${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      
      ElMessage.success('结果已导出')
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

    const getConfidenceColor = (confidence) => {
      if (confidence > 0.8) return '#67c23a'
      if (confidence > 0.6) return '#e6a23c'
      return '#f56c6c'
    }

    const getQualityColor = (level) => {
      const colorMap = {
        'excellent': 'success',
        'good': 'primary',
        'fair': 'warning',
        'poor': 'danger'
      }
      return colorMap[level] || 'info'
    }

    const getQualityText = (level) => {
      const textMap = {
        'excellent': '优秀',
        'good': '良好',
        'fair': '一般',
        'poor': '较差'
      }
      return textMap[level] || '未知'
    }

    return {
      // 响应式数据
      processing,
      currentStep,
      progressPercentage,
      progressStatus,
      segmentationResult,
      validationResult,
      selectedQuestionIndex,
      showQuestionDetail,
      showEditDialog,
      editingQuestion,
      questionTypes,
      
      // 计算属性
      hasOcrResult,
      averageConfidence,
      qualityLevel,
      selectedQuestion,
      
      // 方法
      startSegmentation,
      selectQuestion,
      editQuestion,
      saveQuestion,
      handleEditClose,
      reclassifyQuestion,
      deleteQuestion,
      exportResult,
      getQuestionTypeName,
      getQuestionTypeColor,
      getConfidenceColor,
      getQualityColor,
      getQualityText
    }
  }
}
</script>

<style scoped>
.question-segmentation {
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

.ocr-preview {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0;
  color: #303133;
}

.ocr-content {
  display: flex;
  gap: 20px;
}

.text-content {
  flex: 1;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.text-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.image-preview {
  width: 300px;
  flex-shrink: 0;
}

.image-preview img {
  width: 100%;
  height: auto;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.progress-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.progress-header {
  margin-bottom: 20px;
}

.progress-header h3 {
  margin: 0 0 15px 0;
  color: #303133;
}

.progress-steps {
  margin-top: 20px;
}

.segmentation-result {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.result-header h3 {
  margin: 0;
  color: #303133;
}

.result-stats {
  display: flex;
  gap: 30px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.question-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
}

.question-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.question-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
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

.question-confidence {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 150px;
}

.confidence-text {
  font-size: 12px;
  color: #909399;
  min-width: 40px;
}

.question-content {
  margin-bottom: 10px;
}

.question-text, .student-answer {
  margin-bottom: 8px;
  line-height: 1.5;
}

.question-text strong, .student-answer strong {
  color: #303133;
}

.question-region {
  font-size: 12px;
  color: #909399;
}

.question-detail {
  padding: 20px;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
}

.content-box {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  line-height: 1.6;
}

.detail-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.edit-form {
  padding: 0 20px;
}

.validation-result {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.validation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.validation-header h3 {
  margin: 0;
  color: #303133;
}

.validation-content {
  margin-top: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.validation-issues {
  margin: 20px 0;
}

.validation-issues h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.issue-item {
  margin-bottom: 10px;
}

.type-distribution {
  margin-top: 20px;
}

.type-distribution h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.type-name {
  width: 80px;
  font-size: 14px;
  color: #303133;
}

.type-count {
  width: 50px;
  font-size: 14px;
  color: #909399;
  text-align: right;
}
</style>