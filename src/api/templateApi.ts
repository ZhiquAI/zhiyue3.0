/**
 * 答题卡模板管理API服务
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/api/templates';

// 模板数据接口
export interface TemplateData {
  regions: TemplateRegion[];
  pageConfig: {
    width: number;
    height: number;
    dpi: number;
  };
  backgroundImage?: string;
}

export interface TemplateRegion {
  id: string;
  type: 'positioning' | 'barcode' | 'objective' | 'subjective';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: {
    questionNumber?: string;
    maxScore?: number;
    optionCount?: number;
    [key: string]: any;
  };
}

export interface Template {
  id?: number;
  name: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  exam_type?: string;
  template_data: TemplateData;
  page_width: number;
  page_height: number;
  dpi: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  usage_count?: number;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  exam_type?: string;
  template_data: TemplateData;
  page_width: number;
  page_height: number;
  dpi: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  exam_type?: string;
  template_data?: TemplateData;
  page_width?: number;
  page_height?: number;
  dpi?: number;
  is_active?: boolean;
}

export interface TemplateListParams {
  subject?: string;
  grade_level?: string;
  exam_type?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface BackgroundUploadResponse {
  filename: string;
  original_name: string;
  url: string;
  size: number;
  content_type: string;
}

// 获取认证头
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// 获取文件上传认证头
const getFileUploadHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`
  };
};

/**
 * 模板管理API服务类
 */
export class TemplateApiService {
  /**
   * 创建模板
   */
  static async createTemplate(templateData: CreateTemplateRequest): Promise<Template> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/`,
        templateData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('创建模板失败:', error);
      throw new Error(error.response?.data?.detail || '创建模板失败');
    }
  }

  /**
   * 获取模板列表
   */
  static async getTemplates(params?: TemplateListParams): Promise<Template[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/`,
        {
          headers: getAuthHeaders(),
          params
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('获取模板列表失败:', error);
      throw new Error(error.response?.data?.detail || '获取模板列表失败');
    }
  }

  /**
   * 获取单个模板详情
   */
  static async getTemplate(templateId: number): Promise<Template> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/${templateId}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('获取模板详情失败:', error);
      throw new Error(error.response?.data?.detail || '获取模板详情失败');
    }
  }

  /**
   * 更新模板
   */
  static async updateTemplate(templateId: number, templateData: UpdateTemplateRequest): Promise<Template> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/${templateId}`,
        templateData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('更新模板失败:', error);
      throw new Error(error.response?.data?.detail || '更新模板失败');
    }
  }

  /**
   * 删除模板
   */
  static async deleteTemplate(templateId: number): Promise<{ message: string }> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/${templateId}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('删除模板失败:', error);
      throw new Error(error.response?.data?.detail || '删除模板失败');
    }
  }

  /**
   * 预览模板
   */
  static async previewTemplate(templateId: number): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/${templateId}/preview`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('预览模板失败:', error);
      throw new Error(error.response?.data?.detail || '预览模板失败');
    }
  }

  /**
   * 复制模板
   */
  static async duplicateTemplate(templateId: number, newName: string): Promise<Template> {
    try {
      const formData = new FormData();
      formData.append('new_name', newName);
      
      const response = await axios.post(
        `${API_BASE_URL}/${templateId}/duplicate`,
        formData,
        { headers: getFileUploadHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('复制模板失败:', error);
      throw new Error(error.response?.data?.detail || '复制模板失败');
    }
  }

  /**
   * 上传背景图片
   */
  static async uploadBackgroundImage(file: File): Promise<BackgroundUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${API_BASE_URL}/upload-background`,
        formData,
        { headers: getFileUploadHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error('上传背景图片失败:', error);
      throw new Error(error.response?.data?.detail || '上传背景图片失败');
    }
  }

  /**
   * 获取背景图片URL
   */
  static getBackgroundImageUrl(filename: string): string {
    return `${API_BASE_URL}/background/${filename}`;
  }
}

export default TemplateApiService;