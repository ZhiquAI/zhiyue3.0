/**
 * API服务测试
 * 测试标准化HTTP客户端和各API模块的功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { examApi, markingApi, analysisApi, authApi, barcodeApi, uploadApi } from '../api';
import { StandardHttpClient } from '../standardHttpClient';

// Mock StandardHttpClient
vi.mock('../standardHttpClient', () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(), 
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    paginate: vi.fn(),
    upload: vi.fn(),
    batch: vi.fn(),
    healthCheck: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
    getAxiosInstance: vi.fn(() => ({
      interceptors: {
        response: {
          use: vi.fn()
        }
      }
    }))
  };

  return {
    StandardHttpClient: vi.fn(() => mockClient),
    createServiceClient: vi.fn(() => mockClient),
  };
});

describe('API Services', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = new StandardHttpClient();
    vi.clearAllMocks();
  });

  describe('examApi', () => {
    it('应该正确获取考试列表', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', name: '期中考试' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      };
      
      mockClient.paginate.mockResolvedValue(mockResponse);

      const result = await examApi.getExams({ page: 1, pageSize: 20 });

      expect(mockClient.paginate).toHaveBeenCalledWith('/exams', {
        page: 1,
        pageSize: 20,
        filters: {
          subject: undefined,
          grade: undefined,
          status: undefined,
          search: undefined
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确创建考试', async () => {
      const examData = { name: '新考试', subject: '数学' };
      const mockResponse = {
        success: true,
        data: { id: '1', ...examData }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await examApi.createExam(examData);

      expect(mockClient.post).toHaveBeenCalledWith('/exams', examData);
      expect(result).toEqual(mockResponse);
    });

    it('应该正确获取考试详情', async () => {
      const examId = '123';
      const mockResponse = {
        success: true,
        data: { id: examId, name: '期末考试' }
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await examApi.getExam(examId);

      expect(mockClient.get).toHaveBeenCalledWith('/exams/123');
      expect(result).toEqual(mockResponse);
    });

    it('应该正确删除考试', async () => {
      const examId = '123';
      const mockResponse = { success: true };

      mockClient.delete.mockResolvedValue(mockResponse);

      const result = await examApi.deleteExam(examId);

      expect(mockClient.delete).toHaveBeenCalledWith('/exams/123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('authApi', () => {
    it('应该正确处理登录', async () => {
      const credentials = { username: 'test', password: 'password' };
      const mockResponse = {
        success: true,
        data: { 
          user: { id: '1', username: 'test' },
          token: 'jwt-token'
        }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.login(credentials);

      expect(mockClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(mockClient.setAuthToken).toHaveBeenCalledWith('jwt-token', true);
      expect(result).toEqual(mockResponse);
    });

    it('应该正确处理登出', async () => {
      const mockResponse = { success: true };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.logout();

      expect(mockClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockClient.clearAuthToken).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('应该正确注册用户', async () => {
      const userData = {
        username: 'newuser',
        email: 'test@example.com',
        password: 'password',
        name: '张三'
      };
      const mockResponse = {
        success: true,
        data: { id: '1', username: 'newuser' }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.register(userData);

      expect(mockClient.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markingApi', () => {
    it('应该正确获取阅卷任务', async () => {
      const params = { status: 'pending', examId: '123' };
      const mockResponse = {
        success: true,
        data: [{ id: '1', status: 'pending' }]
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await markingApi.getMarkingTasks(params);

      expect(mockClient.get).toHaveBeenCalledWith('/marking/tasks', {
        status: 'pending',
        examId: '123'
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确获取下一个待阅卷提交', async () => {
      const examId = '123';
      const mockResponse = {
        success: true,
        data: { id: 'sub1', studentName: '学生A' }
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await markingApi.getNextSubmission(examId);

      expect(mockClient.get).toHaveBeenCalledWith('/marking/exams/123/next-submission');
      expect(result).toEqual(mockResponse);
    });

    it('应该正确提交阅卷结果', async () => {
      const submissionId = 'sub123';
      const result = { score: 85, feedback: '不错' };
      const mockResponse = {
        success: true,
        data: { id: submissionId, score: 85 }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const response = await markingApi.submitMarkingResult(submissionId, result);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/marking/submissions/sub123/result', 
        result
      );
      expect(response).toEqual(mockResponse);
    });
  });

  describe('analysisApi', () => {
    it('应该正确获取考试分析', async () => {
      const examId = '123';
      const mockResponse = {
        success: true,
        data: { examId, overview: { participantCount: 50 } }
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await analysisApi.getExamAnalysis(examId);

      expect(mockClient.get).toHaveBeenCalledWith('/analysis/exams/123');
      expect(result).toEqual(mockResponse);
    });

    it('应该正确获取年级分析', async () => {
      const params = { subject: '数学', grade: '高三', timeRange: '2023-2024' };
      const mockResponse = {
        success: true,
        data: { subject: '数学', trends: [] }
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await analysisApi.getGradeAnalysis(params);

      expect(mockClient.get).toHaveBeenCalledWith('/analysis/grade', {
        subject: '数学',
        grade: '高三',
        timeRange: '2023-2024'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('barcodeApi', () => {
    it('应该正确生成条形码', async () => {
      const barcodeData = {
        studentId: 'S001',
        name: '张三',
        className: '高三1班',
        barcodeType: 'code128' as const,
        dataFormat: 'json'
      };
      const mockResponse = {
        success: true,
        data: { barcode: 'generated-barcode-data' }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await barcodeApi.generateBarcode(barcodeData);

      expect(mockClient.post).toHaveBeenCalledWith('/barcode/generate', {
        student_id: 'S001',
        name: '张三',
        class_name: '高三1班',
        exam_number: undefined,
        paper_type: undefined,
        barcode_type: 'code128',
        data_format: 'json'
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确识别条形码', async () => {
      const file = new File([''], 'barcode.jpg');
      const mockResponse = {
        success: true,
        data: { studentId: 'S001', confidence: 0.95 }
      };

      mockClient.upload.mockResolvedValue(mockResponse);

      const result = await barcodeApi.recognizeBarcode(file);

      expect(mockClient.upload).toHaveBeenCalledWith('/barcode/recognize', file);
      expect(result).toEqual(mockResponse);
    });

    it('应该正确进行健康检查', async () => {
      mockClient.healthCheck.mockResolvedValue(true);

      const result = await barcodeApi.healthCheck();

      expect(mockClient.healthCheck).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('uploadApi', () => {
    it('应该正确上传单个文件', async () => {
      const file = new File(['content'], 'test.pdf');
      const type = 'paper' as const;
      const mockResponse = {
        success: true,
        data: { id: 'file1', filename: 'test.pdf' }
      };

      mockClient.upload.mockResolvedValue(mockResponse);

      const result = await uploadApi.uploadFile(file, type);

      expect(mockClient.upload).toHaveBeenCalledWith('/upload', file, {
        onProgress: undefined,
        metadata: { type: 'paper' }
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确批量上传文件', async () => {
      const files = [
        new File(['content1'], 'test1.pdf'),
        new File(['content2'], 'test2.pdf')
      ];
      const type = 'answer';
      const options = { batchSize: 10, stopOnError: true };
      const mockResponse = {
        success: true,
        data: { successful: [], failed: [] }
      };

      mockClient.batch.mockResolvedValue(mockResponse);

      const result = await uploadApi.uploadFiles(files, type, options);

      expect(mockClient.batch).toHaveBeenCalledWith(
        '/upload/batch',
        [
          { file: files[0], type: 'answer' },
          { file: files[1], type: 'answer' }
        ],
        options
      );
      expect(result).toEqual(mockResponse);
    });
  });
});