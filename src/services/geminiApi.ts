// Gemini AI API服务 - 专为智阅AI历史阅卷优化
import { message } from 'antd';

// Gemini API配置
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro';
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
      text: string;
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
const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const requestBody: GeminiRequest = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: TEMPERATURE,
      topK: TOP_K,
      topP: TOP_P,
      maxOutputTokens: MAX_TOKENS
    },
    safetySettings: SAFETY_SETTINGS
  };

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
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

// 历史学科专用提示词模板
const HISTORY_PROMPTS = {
  // 主观题评分提示词
  SUBJECTIVE_GRADING: `
你是一位专业的初中历史教师，正在使用智阅AI系统进行阅卷。请根据以下信息对学生答案进行评分：

题目：{question}
参考答案：{referenceAnswer}
评分标准：{rubric}
学生答案：{studentAnswer}

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
`,

  // 学情分析提示词
  LEARNING_ANALYSIS: `
你是一位资深的历史教育专家，请基于以下考试数据进行学情分析：

考试信息：{examInfo}
成绩数据：{scoreData}
能力维度数据：{abilityData}

请从以下角度进行分析：
1. 整体成绩分布特点
2. 各能力维度的强弱分析
3. 学习问题诊断
4. 教学改进建议

请以JSON格式返回分析结果：
{
  "overallAnalysis": "整体分析",
  "strengthAreas": ["优势领域"],
  "weaknessAreas": ["薄弱领域"],
  "teachingSuggestions": ["教学建议"],
  "studentSuggestions": ["学习建议"]
}
`,

  // 个性化学习建议
  PERSONALIZED_SUGGESTION: `
你是一位经验丰富的历史教师，请为学生提供个性化的学习建议：

学生信息：{studentInfo}
成绩表现：{performance}
能力分析：{abilityAnalysis}

请提供：
1. 学习优势分析
2. 薄弱环节诊断
3. 具体改进建议
4. 学习方法指导

请以JSON格式返回：
{
  "strengths": ["优势分析"],
  "weaknesses": ["薄弱环节"],
  "suggestions": ["改进建议"],
  "methods": ["学习方法"]
}
`
};

// 智能阅卷API
export const geminiGradingApi = {
  // 主观题智能评分
  gradeSubjectiveQuestion: async (params: {
    question: string;
    referenceAnswer: string;
    rubric: any;
    studentAnswer: string;
  }) => {
    try {
      const prompt = HISTORY_PROMPTS.SUBJECTIVE_GRADING
        .replace('{question}', params.question)
        .replace('{referenceAnswer}', params.referenceAnswer)
        .replace('{rubric}', JSON.stringify(params.rubric))
        .replace('{studentAnswer}', params.studentAnswer);

      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Subjective grading failed:', error);
      throw new Error('智能评分失败，请重试');
    }
  },

  // 批量评分
  batchGradeQuestions: async (questions: Array<{
    id: string;
    question: string;
    referenceAnswer: string;
    rubric: any;
    studentAnswer: string;
  }>) => {
    const results = [];
    
    for (const q of questions) {
      try {
        const result = await geminiGradingApi.gradeSubjectiveQuestion(q);
        results.push({ id: q.id, result });
        
        // 添加延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Grading failed for question ${q.id}:`, error);
        results.push({ id: q.id, error: error.message });
      }
    }
    
    return results;
  },

  // 学情分析
  analyzeExamResults: async (params: {
    examInfo: any;
    scoreData: any;
    abilityData: any;
  }) => {
    try {
      const prompt = HISTORY_PROMPTS.LEARNING_ANALYSIS
        .replace('{examInfo}', JSON.stringify(params.examInfo))
        .replace('{scoreData}', JSON.stringify(params.scoreData))
        .replace('{abilityData}', JSON.stringify(params.abilityData));

      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Learning analysis failed:', error);
      throw new Error('学情分析失败，请重试');
    }
  },

  // 个性化建议生成
  generatePersonalizedSuggestion: async (params: {
    studentInfo: any;
    performance: any;
    abilityAnalysis: any;
  }) => {
    try {
      const prompt = HISTORY_PROMPTS.PERSONALIZED_SUGGESTION
        .replace('{studentInfo}', JSON.stringify(params.studentInfo))
        .replace('{performance}', JSON.stringify(params.performance))
        .replace('{abilityAnalysis}', JSON.stringify(params.abilityAnalysis));

      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Personalized suggestion failed:', error);
      throw new Error('个性化建议生成失败，请重试');
    }
  },

  // 试卷内容分析
  analyzePaperContent: async (paperText: string) => {
    try {
      const prompt = `
请分析以下历史试卷内容，识别题目类型、知识点和难度等级：

试卷内容：${paperText}

请以JSON格式返回分析结果：
{
  "questions": [
    {
      "number": "题号",
      "type": "题目类型",
      "content": "题目内容",
      "knowledgePoints": ["知识点"],
      "difficulty": "难度等级",
      "points": "分值"
    }
  ],
  "overview": {
    "totalQuestions": "总题数",
    "questionTypes": ["题型分布"],
    "knowledgeAreas": ["知识领域"],
    "difficultyDistribution": "难度分布"
  }
}`;

      const response = await callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Paper analysis failed:', error);
      throw new Error('试卷分析失败，请重试');
    }
  }
};

// 健康检查
export const checkGeminiHealth = async (): Promise<boolean> => {
  try {
    await callGeminiAPI('Hello, this is a health check.');
    return true;
  } catch (error) {
    console.error('Gemini health check failed:', error);
    return false;
  }
};

// 获取API使用统计
export const getGeminiUsageStats = () => {
  // 这里可以实现使用统计逻辑
  return {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };
};

export default geminiGradingApi;