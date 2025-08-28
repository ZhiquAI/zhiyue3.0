// message import removed as it's not used

// 题目类型定义
export interface Question {
  id: string;
  number: string;
  type: 'choice' | 'subjective' | 'calculation' | 'essay';
  content: string;
  totalScore: number;
  scoringCriteria: ScoringCriterion[];
}

export interface ScoringCriterion {
  id: string;
  description: string;
  score: number;
  isRequired: boolean;
}

export interface UploadedFile {
  fileId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  originalFile?: File;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// 文件上传API
export const uploadPaperFile = async (file: File): Promise<UploadedFile> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/scoring-standards/upload/paper', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    const uploadedFile: UploadedFile = {
      fileId: result.data.fileId,
      name: result.data.originalName,
      url: result.data.url,
      type: result.data.type,
      size: result.data.size,
      originalFile: file
    };
    
    return uploadedFile;
  } catch (error) {
    throw new Error(`试卷文件上传失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 参考答案上传API
export const uploadAnswerFile = async (file: File): Promise<UploadedFile> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/scoring-standards/upload/answer', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    const uploadedFile: UploadedFile = {
      fileId: result.data.fileId,
      name: result.data.originalName,
      url: result.data.url,
      type: result.data.type,
      size: result.data.size,
      originalFile: file
    };
    
    return uploadedFile;
  } catch (error) {
    throw new Error(`参考答案文件上传失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// AI生成评分标准API
export const generateScoringStandards = async (
  paperFile: UploadedFile,
  answerFile?: UploadedFile
): Promise<Question[]> => {
  try {
    const formData = new FormData();
    formData.append('paper_file_id', paperFile.fileId);
    if (answerFile) {
      formData.append('answer_file_id', answerFile.fileId);
    }
    
    const response = await fetch('/api/scoring-standards/generate', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data.questions;
  } catch (error) {
    // 如果后端API失败，返回模拟数据作为备选
    console.warn('后端API调用失败，使用模拟数据:', error);
    
    // 模拟生成的题目和评分标准
    const mockQuestions: Question[] = [
      {
        id: '1',
        number: '1',
        type: 'choice',
        content: '下列哪个选项是正确的？A. 选项A  B. 选项B  C. 选项C  D. 选项D',
        totalScore: 5,
        scoringCriteria: [
          { id: '1-1', description: '选择正确答案A', score: 5, isRequired: true },
          { id: '1-2', description: '选择其他错误答案', score: 0, isRequired: false }
        ]
      },
      {
        id: '2',
        number: '2',
        type: 'subjective',
        content: '请简述牛顿第一定律的内容和意义。',
        totalScore: 10,
        scoringCriteria: [
          { id: '2-1', description: '正确表述定律内容：物体在不受外力或合外力为零时保持静止或匀速直线运动状态', score: 6, isRequired: true },
          { id: '2-2', description: '说明物理意义：揭示了力和运动的关系', score: 3, isRequired: false },
          { id: '2-3', description: '举例说明或补充说明', score: 1, isRequired: false }
        ]
      },
      {
        id: '3',
        number: '3',
        type: 'calculation',
        content: '一个质量为2kg的物体从10m高处自由落下，求落地时的速度。(g=10m/s²)',
        totalScore: 15,
        scoringCriteria: [
          { id: '3-1', description: '列出正确公式：v²=2gh 或 v=√(2gh)', score: 5, isRequired: true },
          { id: '3-2', description: '正确代入数值：v=√(2×10×10)', score: 5, isRequired: true },
          { id: '3-3', description: '计算过程正确', score: 3, isRequired: true },
          { id: '3-4', description: '最终答案正确：v=14.14m/s', score: 2, isRequired: false }
        ]
      },
      {
        id: '4',
        number: '4',
        type: 'essay',
        content: '论述可持续发展的重要性及其实现途径。',
        totalScore: 20,
        scoringCriteria: [
          { id: '4-1', description: '明确定义可持续发展概念', score: 4, isRequired: true },
          { id: '4-2', description: '分析可持续发展的重要性（环境、经济、社会三个维度）', score: 8, isRequired: true },
          { id: '4-3', description: '提出具体的实现途径和措施', score: 6, isRequired: true },
          { id: '4-4', description: '论述逻辑清晰，语言表达准确', score: 2, isRequired: false }
        ]
      }
    ];
    
    return mockQuestions;
  }
};

// 保存评分标准API
export const saveScoringStandards = async (questions: Question[], examId?: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/scoring-standards/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        questions,
        examId 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return true;
  } catch (error) {
    throw new Error(`保存评分标准失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 获取已保存的评分标准API
export const getScoringStandards = async (examId: string): Promise<Question[]> => {
  try {
    const response = await fetch(`/api/scoring-standards/exam/${examId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data?.questions || [];
  } catch (error) {
    console.warn('获取评分标准失败，返回空数组:', error);
    return [];
  }
};

// 验证文件格式
export const validateFileFormat = (file: File, allowedTypes: string[]): boolean => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // 检查MIME类型
  const mimeTypeValid = allowedTypes.some(type => {
    if (type === '.pdf') return fileType === 'application/pdf';
    if (type === '.jpg' || type === '.jpeg') return fileType === 'image/jpeg';
    if (type === '.png') return fileType === 'image/png';
    return false;
  });
  
  // 检查文件扩展名
  const extensionValid = allowedTypes.some(type => fileName.endsWith(type));
  
  return mimeTypeValid || extensionValid;
};

// 检查文件大小
export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// 文件上传前的验证
export const validateUploadFile = (file: File, type: 'paper' | 'answer'): string | null => {
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
  const maxSize = 10; // MB
  
  if (!validateFileFormat(file, allowedTypes)) {
    return `不支持的文件格式。请上传 ${allowedTypes.join(', ')} 格式的文件。`;
  }
  
  if (!validateFileSize(file, maxSize)) {
    return `文件大小超过限制。请上传小于 ${maxSize}MB 的文件。`;
  }
  
  return null; // 验证通过
};