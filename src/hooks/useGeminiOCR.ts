// Gemini OCR Hook - 专门处理OCR识别功能
import { useState, useCallback } from 'react';
import { message } from 'antd';
import { geminiOCRApi } from '../services/geminiApi';
import { useAsyncOperation } from './useAsyncOperation';

export interface OCRResult {
  student_info?: {
    student_id: string;
    name: string;
    class: string;
  };
  objective_answers?: Record<string, string>;
  subjective_answers?: Record<string, string>;
  quality_assessment?: {
    clarity_score: number;
    issues: string[];
    confidence: number;
  };
  paper_info?: {
    subject: string;
    exam_name: string;
    total_score: number;
    duration: string;
  };
  questions?: Array<{
    number: string;
    type: string;
    content: string;
    points: number;
    knowledge_points: string[];
    difficulty: string;
  }>;
}

export const useGeminiOCR = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const { state: ocrState, execute: executeOCR } = useAsyncOperation<OCRResult>();
  const { state: batchState, execute: executeBatch } = useAsyncOperation();

  // 检查Gemini OCR服务健康状态
  const checkHealth = useCallback(async () => {
    try {
      const { checkGeminiHealth } = await import('../services/geminiApi');
      const healthy = await checkGeminiHealth();
      setIsHealthy(healthy);
      
      if (!healthy) {
        message.warning('Gemini OCR服务暂时不可用');
      }
      
      return healthy;
    } catch (error) {
      setIsHealthy(false);
      message.error('Gemini OCR服务连接失败');
      return false;
    }
  }, []);

  // 识别答题卡
  const recognizeAnswerSheet = useCallback(async (file: File) => {
    try {
      const result = await executeOCR(() => 
        geminiOCRApi.recognizeAnswerSheet(file)
      );
      
      message.success('答题卡识别完成');
      return result;
    } catch (error) {
      message.error('答题卡识别失败，请检查图片质量');
      throw error;
    }
  }, [executeOCR]);

  // 识别试卷文档
  const recognizePaperDocument = useCallback(async (file: File) => {
    try {
      const result = await executeOCR(() => 
        geminiOCRApi.recognizePaperDocument(file)
      );
      
      message.success('试卷识别完成');
      return result;
    } catch (error) {
      message.error('试卷识别失败，请检查图片质量');
      throw error;
    }
  }, [executeOCR]);

  // 批量识别
  const batchRecognize = useCallback(async (
    files: File[], 
    type: 'answer_sheet' | 'paper'
  ) => {
    try {
      message.loading('批量识别进行中...', 0);
      
      const results = await executeBatch(() => 
        geminiOCRApi.batchRecognize(files, type)
      );
      
      message.destroy();
      
      const successCount = results.filter((r: any) => r.status === 'success').length;
      const failCount = results.filter((r: any) => r.status === 'error').length;
      
      if (failCount === 0) {
        message.success(`批量识别完成，共处理${successCount}个文件`);
      } else {
        message.warning(`批量识别完成，成功${successCount}个，失败${failCount}个`);
      }
      
      return results;
    } catch (error) {
      message.destroy();
      message.error('批量识别失败');
      throw error;
    }
  }, [executeBatch]);

  // 预处理图片（客户端压缩和优化）
  const preprocessImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 计算压缩后的尺寸
        const maxSize = 2048;
        let { width, height } = img;
        
        if (Math.max(width, height) > maxSize) {
          const ratio = maxSize / Math.max(width, height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制并压缩图片
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('图片压缩失败'));
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // 验证文件格式
  const validateFile = useCallback((file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      message.error('只支持 JPG、PNG、PDF 格式的文件');
      return false;
    }
    
    if (file.size > maxSize) {
      message.error('文件大小不能超过 10MB');
      return false;
    }
    
    return true;
  }, []);

  // 获取识别质量评估
  const getQualityAssessment = useCallback((result: OCRResult) => {
    const quality = result.quality_assessment;
    if (!quality) return null;
    
    const { clarity_score, confidence, issues } = quality;
    
    let level = 'good';
    let color = 'green';
    let suggestions: string[] = [];
    
    if (clarity_score < 6 || confidence < 0.7) {
      level = 'poor';
      color = 'red';
      suggestions.push('建议重新拍摄，确保图片清晰');
    } else if (clarity_score < 8 || confidence < 0.85) {
      level = 'fair';
      color = 'orange';
      suggestions.push('图片质量一般，建议检查识别结果');
    }
    
    if (issues && issues.length > 0) {
      suggestions.push(...issues.map(issue => `发现问题: ${issue}`));
    }
    
    return {
      level,
      color,
      score: clarity_score,
      confidence,
      issues: issues || [],
      suggestions
    };
  }, []);

  return {
    // 状态
    isHealthy,
    ocrState,
    batchState,
    
    // 方法
    checkHealth,
    recognizeAnswerSheet,
    recognizePaperDocument,
    batchRecognize,
    preprocessImage,
    validateFile,
    getQualityAssessment,
    
    // 便捷状态检查
    isOCRLoading: ocrState.loading,
    isBatchLoading: batchState.loading,
  };
};

export default useGeminiOCR;