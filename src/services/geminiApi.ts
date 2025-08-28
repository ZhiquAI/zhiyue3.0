// Gemini AI API服务 - 更新为支持OCR功能
import axios, { AxiosInstance } from 'axios';

// Gemini API配置
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-pro';
const GEMINI_BASE_URL = import.meta.env.VITE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const MAX_TOKENS = parseInt(import.meta.env.VITE_GEMINI_MAX_TOKENS) || 8192;
const TEMPERATURE = parseFloat(import.meta.env.VITE_GEMINI_TEMPERATURE) || 0.3;
const TOP_P = parseFloat(import.meta.env.VITE_GEMINI_TOP_P) || 0.8;
const TOP_K = parseInt(import.meta.env.VITE_GEMINI_TOP_K) || 40;

// 检查API密钥
if (!GEMINI_API_KEY) {
  console.warn('Gemini API key not found. AI features will be disabled.');
}

// Gemini API请求接口
interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text?: string;
      inline_data?: {
        mime_type: string;
        data: string;
      };
    }>;
  }>;
  generationConfig: {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
  };
  safetySettings: Array<{
    category: string;
    threshold: string;
  }>;
}

// Gemini API响应接口
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// 安全设置 - 适合教育场景
const SAFETY_SETTINGS = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_HIGH_ONLY'
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
  }
];

// 基础API调用函数
// 创建专门的 Gemini API 客户端
const createGeminiClient = (): AxiosInstance => {
  const geminiClient = axios.create({
    baseURL: GEMINI_BASE_URL,
    timeout: 60000, // Gemini API 可能需要更长时间
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 添加请求拦截器来处理 API key
  geminiClient.interceptors.request.use((config) => {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }
    config.params = { ...config.params, key: GEMINI_API_KEY };
    return config;
  });

  return geminiClient;
};

const geminiClient = createGeminiClient();

const callGeminiAPI = async (prompt: string, imageData?: string): Promise<string> => {
  const parts: Array<{
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;
    };
  }> = [{ text: prompt }];
  
  // 如果有图像数据，添加到请求中
  if (imageData) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: imageData
      }
    });
  }

  const requestBody: GeminiRequest = {
    contents: [{ parts }],
    generationConfig: {
      temperature: imageData ? 0.1 : TEMPERATURE, // OCR任务使用更低温度
      topK: TOP_K,
      topP: TOP_P,
      maxOutputTokens: MAX_TOKENS
    },
    safetySettings: SAFETY_SETTINGS
  };

  try {
    console.log('🔍 Gemini API调用信息:', {
      model: GEMINI_MODEL,
      hasApiKey: !!GEMINI_API_KEY,
      apiKeyLength: GEMINI_API_KEY?.length
    });

    const response = await geminiClient.post<GeminiResponse>(
      `/models/${GEMINI_MODEL}:generateContent`,
      requestBody
    );

    console.log('📡 API响应状态: 200 OK');

    const data = response.data;
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Response blocked by safety filters');
    }

    return candidate.content.parts[0].text;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
};

// 将文件转换为base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/jpeg;base64,前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// OCR识别API
export const geminiOCRApi = {
  // 答题卡识别
  recognizeAnswerSheet: async (file: File) => {
    try {
      const imageData = await fileToBase64(file);
      
      const prompt = `
你是一个专业的答题卡识别专家。请仔细分析这张答题卡图像，提取以下信息：

1. 学生基本信息：
   - 学号/考号
   - 姓名
   - 班级/年级

2. 答题内容：
   - 客观题答案（选择题、填空题）
   - 主观题手写内容（简答题、论述题等）

3. 图像质量评估：
   - 清晰度评分（1-10）
   - 是否有污损、折痕等问题
   - 文字是否清晰可读

请以JSON格式返回结果：
{
  "student_info": {
    "student_id": "学号",
    "name": "姓名", 
    "class": "班级"
  },
  "objective_answers": {
    "1": "A",
    "2": "B"
  },
  "subjective_answers": {
    "13": "主观题答案文本...",
    "14": "主观题答案文本..."
  },
  "quality_assessment": {
    "clarity_score": 8,
    "issues": ["轻微污损"],
    "confidence": 0.95
  }
}

注意：
- 如果某些信息无法识别，请在对应字段标注null
- 对于模糊或不确定的内容，请在confidence字段中反映
- 主观题答案请完整提取，保持原有的换行和格式
`;

      const response = await callGeminiAPI(prompt, imageData);
      return JSON.parse(response);
    } catch {
      throw new Error('答题卡识别失败，请重试');
    }
  },

  // 试卷识别
  recognizePaperDocument: async (file: File) => {
    try {
      const imageData = await fileToBase64(file);
      
      const prompt = `
你是一个专业的试卷分析专家。请仔细分析这张试卷图像，识别题目结构和内容：

1. 试卷基本信息：
   - 科目名称
   - 考试名称
   - 总分
   - 考试时间

2. 题目结构分析：
   - 题目编号和类型（选择题、填空题、简答题、论述题等）
   - 每题分值
   - 题目内容完整文本
   - 题目在图像中的位置坐标

3. 知识点识别：
   - 每道题涉及的历史知识点
   - 难度等级评估

请以JSON格式返回结果：
{
  "paper_info": {
    "subject": "历史",
    "exam_name": "考试名称",
    "total_score": 100,
    "duration": "90分钟"
  },
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "题目完整内容...",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "points": 2,
      "knowledge_points": ["古代政治制度"],
      "difficulty": "medium",
      "region": {
        "x": 10,
        "y": 20,
        "width": 80,
        "height": 15
      }
    }
  ],
  "quality_assessment": {
    "clarity_score": 9,
    "completeness": 1.0,
    "confidence": 0.96
  }
}

注意：
- 准确识别每道题的完整内容，包括题干和选项
- 坐标使用相对百分比表示（0-100）
- 根据题目内容判断知识点和难度
- 保持题目原有格式和编号
`;

      const response = await callGeminiAPI(prompt, imageData);
      return JSON.parse(response);
    } catch {
      throw new Error('试卷识别失败，请重试');
    }
  },

  // 批量识别
  batchRecognize: async (files: File[], type: 'answer_sheet' | 'paper') => {
    const results = [];
    
    for (const file of files) {
      try {
        let result;
        if (type === 'answer_sheet') {
          result = await geminiOCRApi.recognizeAnswerSheet(file);
        } else {
          result = await geminiOCRApi.recognizePaperDocument(file);
        }
        
        results.push({
          filename: file.name,
          status: 'success',
          result
        });
        
        // 添加延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          filename: file.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
};

// 智能阅卷API (保持原有功能)
export const geminiGradingApi = {
  // 主观题智能评分
  gradeSubjectiveQuestion: async (params: {
    question: string;
    referenceAnswer: string;
    rubric: unknown;
    studentAnswer: string;
  }) => {
    try {
      const prompt = `
你是一位专业的初中历史教师，正在使用智阅AI系统进行阅卷。请根据以下信息对学生答案进行评分：

题目：${params.question}
参考答案：${params.referenceAnswer}
评分标准：${JSON.stringify(params.rubric)}
学生答案：${params.studentAnswer}

请按照以下维度进行评分：
1. 历史知识点掌握程度
2. 史料运用能力
3. 逻辑论证能力
4. 语言表达清晰度

对每个维度给出具体分数和评分理由，最后给出总分。
请以JSON格式返回结果：
{
  "dimensions": [
    {
      "name": "维度名称",
      "score": 分数,
      "maxScore": 满分,
      "reason": "评分理由"
    }
  ],
  "totalScore": 总分,
  "feedback": "整体评价和建议"
}
`;

      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch {
      throw new Error('智能评分失败，请重试');
    }
  },

  // 其他原有功能保持不变...
  batchGradeQuestions: async (questions: Array<{
    id: string;
    question: string;
    referenceAnswer: string;
    rubric: unknown;
    studentAnswer: string;
  }>) => {
    // 实现批量评分
    const results = [];
    
    for (const q of questions) {
      try {
        const result = await geminiGradingApi.gradeSubjectiveQuestion(q);
        results.push({ id: q.id, result });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: unknown) {
        results.push({ id: q.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return results;
  },

  analyzeExamResults: async (params: unknown) => {
    // 学情分析功能
    try {
      const prompt = `
基于以下考试数据进行学情分析：
${JSON.stringify(params)}

请从整体成绩分布、能力维度分析、问题诊断、教学建议等角度进行分析。
`;
      
      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch {
      throw new Error('学情分析失败，请重试');
    }
  },

  generatePersonalizedSuggestion: async (params: unknown) => {
    // 个性化建议生成
    try {
      const prompt = `
为学生提供个性化学习建议：
${JSON.stringify(params)}

请提供学习优势分析、薄弱环节诊断、具体改进建议、学习方法指导。
`;
      
      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch {
      throw new Error('个性化建议生成失败，请重试');
    }
  },

  analyzePaperContent: async (paperText: string) => {
    // 试卷内容分析
    try {
      const prompt = `
请分析以下历史试卷内容，识别题目类型、知识点和难度等级：

试卷内容：${paperText}

请以JSON格式返回分析结果。
`;

      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch {
      throw new Error('试卷分析失败，请重试');
    }
  }
};

// 健康检查
export const checkGeminiHealth = async (): Promise<boolean> => {
  try {
    await callGeminiAPI('Hello, this is a health check.');
    return true;
  } catch {
    return false;
  }
};

// 获取API使用统计
export const getGeminiUsageStats = () => {
  return {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    ocrRequests: 0,
    gradingRequests: 0
  };
};

export default { geminiOCRApi, geminiGradingApi, checkGeminiHealth, getGeminiUsageStats };