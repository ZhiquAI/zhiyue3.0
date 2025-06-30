// Gemini AI Hook - 在智阅AI中使用Gemini功能
import { useState, useCallback } from 'react';
import { message } from 'antd';
import { geminiGradingApi, checkGeminiHealth } from '../services/geminiApi';
import { useAsyncOperation } from './useAsyncOperation';

export interface GradingResult {
  dimensions: Array<{
    name: string;
    score: number;
    maxScore: number;
    reason: string;
  }>;
  totalScore: number;
  feedback: string;
}

export interface AnalysisResult {
  overallAnalysis: string;
  strengthAreas: string[];
  weaknessAreas: string[];
  teachingSuggestions: string[];
  studentSuggestions: string[];
}

export const useGeminiAI = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const { state: gradingState, execute: executeGrading } = useAsyncOperation<GradingResult>();
  const { state: analysisState, execute: executeAnalysis } = useAsyncOperation<AnalysisResult>();
  const { state: suggestionState, execute: executeSuggestion } = useAsyncOperation();

  // 检查Gemini服务健康状态
  const checkHealth = useCallback(async () => {
    try {
      const healthy = await checkGeminiHealth();
      setIsHealthy(healthy);
      
      if (!healthy) {
        message.warning('AI服务暂时不可用，将使用本地评分算法');
      }
      
      return healthy;
    } catch (error) {
      setIsHealthy(false);
      message.error('AI服务连接失败');
      return false;
    }
  }, []);

  // 智能评分单个主观题
  const gradeQuestion = useCallback(async (params: {
    question: string;
    referenceAnswer: string;
    rubric: any;
    studentAnswer: string;
  }) => {
    try {
      const result = await executeGrading(() => 
        geminiGradingApi.gradeSubjectiveQuestion(params)
      );
      
      message.success('AI评分完成');
      return result;
    } catch (error) {
      message.error('AI评分失败，已切换到传统评分模式');
      throw error;
    }
  }, [executeGrading]);

  // 批量智能评分
  const batchGradeQuestions = useCallback(async (questions: Array<{
    id: string;
    question: string;
    referenceAnswer: string;
    rubric: any;
    studentAnswer: string;
  }>) => {
    try {
      message.loading('AI正在批量评分中...', 0);
      
      const results = await geminiGradingApi.batchGradeQuestions(questions);
      
      message.destroy();
      
      const successCount = results.filter(r => !r.error).length;
      const failCount = results.filter(r => r.error).length;
      
      if (failCount === 0) {
        message.success(`批量评分完成，共处理${successCount}道题目`);
      } else {
        message.warning(`批量评分完成，成功${successCount}道，失败${failCount}道`);
      }
      
      return results;
    } catch (error) {
      message.destroy();
      message.error('批量评分失败');
      throw error;
    }
  }, []);

  // 学情分析
  const analyzeExamResults = useCallback(async (params: {
    examInfo: any;
    scoreData: any;
    abilityData: any;
  }) => {
    try {
      const result = await executeAnalysis(() => 
        geminiGradingApi.analyzeExamResults(params)
      );
      
      message.success('AI学情分析完成');
      return result;
    } catch (error) {
      message.error('AI分析失败，使用默认分析模板');
      throw error;
    }
  }, [executeAnalysis]);

  // 生成个性化建议
  const generateSuggestion = useCallback(async (params: {
    studentInfo: any;
    performance: any;
    abilityAnalysis: any;
  }) => {
    try {
      const result = await executeSuggestion(() => 
        geminiGradingApi.generatePersonalizedSuggestion(params)
      );
      
      message.success('个性化建议生成完成');
      return result;
    } catch (error) {
      message.error('建议生成失败');
      throw error;
    }
  }, [executeSuggestion]);

  // 试卷内容分析
  const analyzePaper = useCallback(async (paperText: string) => {
    try {
      message.loading('AI正在分析试卷内容...', 0);
      
      const result = await geminiGradingApi.analyzePaperContent(paperText);
      
      message.destroy();
      message.success('试卷分析完成');
      
      return result;
    } catch (error) {
      message.destroy();
      message.error('试卷分析失败');
      throw error;
    }
  }, []);

  return {
    // 状态
    isHealthy,
    gradingState,
    analysisState,
    suggestionState,
    
    // 方法
    checkHealth,
    gradeQuestion,
    batchGradeQuestions,
    analyzeExamResults,
    generateSuggestion,
    analyzePaper,
    
    // 便捷状态检查
    isGradingLoading: gradingState.loading,
    isAnalysisLoading: analysisState.loading,
    isSuggestionLoading: suggestionState.loading,
  };
};

export default useGeminiAI;