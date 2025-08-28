/**
 * 标准化HTTP客户端测试
 * 测试HTTP客户端的各项功能包括请求、响应、错误处理等
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { StandardHttpClient } from '../standardHttpClient';
import { ApiErrorCode } from '../../types/standardApi';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('StandardHttpClient', () => {
  let client: StandardHttpClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // 创建mock axios实例
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // 清除localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    client = new StandardHttpClient({
      baseURL: 'http://test-api.com',
      timeout: 5000
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该正确创建axios实例', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test-api.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    });

    it('应该设置请求和响应拦截器', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('HTTP方法', () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 1, name: 'test' },
        message: '成功',
        code: 'SUCCESS',
        timestamp: new Date().toISOString()
      }
    };

    it('应该正确发送GET请求', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.get('/test', { param1: 'value1' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        params: { param1: 'value1' }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该正确发送POST请求', async () => {
      const postData = { name: 'test', value: 123 };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.post('/test', postData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('应该正确发送PUT请求', async () => {
      const putData = { id: 1, name: 'updated' };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const result = await client.put('/test/1', putData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test/1', putData, undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('应该正确发送PATCH请求', async () => {
      const patchData = { name: 'patched' };
      mockAxiosInstance.patch.mockResolvedValue(mockResponse);

      const result = await client.patch('/test/1', patchData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test/1', patchData, undefined);
      expect(result).toEqual(mockResponse.data);
    });

    it('应该正确发送DELETE请求', async () => {
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await client.delete('/test/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('分页查询', () => {
    it('应该正确处理分页请求', async () => {
      const mockPaginatedResponse = {
        data: {
          success: true,
          data: [{ id: 1 }, { id: 2 }],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 100,
            totalPages: 5,
            hasNext: true,
            hasPrev: false
          }
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockPaginatedResponse);

      const result = await client.paginate('/test', {
        page: 1,
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'asc',
        filters: { status: 'active' }
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', {
        params: {
          page: 1,
          pageSize: 20,
          sortBy: 'name',
          sortOrder: 'asc',
          status: 'active'
        }
      });
      expect(result).toEqual(mockPaginatedResponse.data);
    });
  });

  describe('文件上传', () => {
    it('应该正确上传文件', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const mockUploadResponse = {
        data: {
          success: true,
          data: { id: 'file1', filename: 'test.txt' }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockUploadResponse);

      const onProgress = vi.fn();
      const result = await client.upload('/upload', file, {
        onProgress,
        metadata: { type: 'document' }
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: onProgress,
        }
      );
      expect(result).toEqual(mockUploadResponse.data);
    });
  });

  describe('批量操作', () => {
    it('应该正确处理批量请求', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const mockBatchResponse = {
        data: {
          success: true,
          data: { processed: 2, errors: 0 }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockBatchResponse);

      const result = await client.batch('/batch', items, {
        batchSize: 10,
        stopOnError: true
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/batch', {
        items,
        options: {
          stopOnError: true,
          batchSize: 10
        }
      });
      expect(result).toEqual(mockBatchResponse.data);
    });
  });

  describe('认证管理', () => {
    it('应该正确设置认证令牌', () => {
      const token = 'test-token';
      
      client.setAuthToken(token, true);

      expect(localStorage.setItem).toHaveBeenCalledWith('authToken', token);
    });

    it('应该正确设置会话令牌', () => {
      const token = 'session-token';
      
      client.setAuthToken(token, false);

      expect(sessionStorage.setItem).toHaveBeenCalledWith('authToken', token);
    });

    it('应该正确清除认证令牌', () => {
      client.clearAuthToken();

      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('健康检查', () => {
    it('应该在健康检查成功时返回true', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { success: true }
      });

      const result = await client.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toBe(true);
    });

    it('应该在健康检查失败时返回false', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该正确获取axios实例', () => {
      const instance = client.getAxiosInstance();
      expect(instance).toBe(mockAxiosInstance);
    });
  });
});

describe('createServiceClient', () => {
  it('应该创建带有指定baseURL的客户端', () => {
    const { createServiceClient } = require('../standardHttpClient');
    
    const serviceClient = createServiceClient('http://service-api.com', {
      timeout: 10000
    });

    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://service-api.com',
        timeout: 10000
      })
    );
  });
});