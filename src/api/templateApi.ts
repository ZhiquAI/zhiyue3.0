/**
 * 答题卡模板管理API服务
 */

import { apiClient } from '../services/httpClient';
import type { BaseApiResponse } from '../types/api';

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

interface ApiResponse<T = unknown> extends BaseApiResponse<T> {
  timestamp?: string;
}



/**
 * 模板管理API服务类
 */
export class TemplateApiService {
  /**
   * 创建模板
   */
  static async createTemplate(templateData: CreateTemplateRequest): Promise<ApiResponse<Template>> {
    const response = await apiClient.post<ApiResponse<Template>>('/api/templates', templateData);
    return response.data;
  }

  /**
   * 获取模板列表
   */
  static async getTemplates(params?: TemplateListParams): Promise<ApiResponse<Template[]>> {
    const response = await apiClient.get<ApiResponse<Template[]>>('/api/templates', { params });
    return response.data;
  }

  /**
   * 获取单个模板详情
   */
  static async getTemplate(templateId: number): Promise<ApiResponse<Template>> {
    const response = await apiClient.get<ApiResponse<Template>>(`/api/templates/${templateId}`);
    return response.data;
  }

  /**
   * 更新模板
   */
  static async updateTemplate(templateId: number, templateData: UpdateTemplateRequest): Promise<ApiResponse<Template>> {
    const response = await apiClient.put<ApiResponse<Template>>(`/api/templates/${templateId}`, templateData);
    return response.data;
  }

  /**
   * 删除模板
   */
  static async deleteTemplate(templateId: number): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/api/templates/${templateId}`);
    return response.data;
  }

  /**
   * 预览模板
   */
  static async previewTemplate(templateId: number): Promise<ApiResponse<unknown>> {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/templates/${templateId}/preview`);
    return response.data;
  }

  /**
   * 复制模板
   */
  static async duplicateTemplate(templateId: number, newName: string): Promise<ApiResponse<Template>> {
    const formData = new FormData();
    formData.append('new_name', newName);
    
    const response = await apiClient.upload<ApiResponse<Template>>(`/api/templates/${templateId}/duplicate`, formData);
    return response.data;
  }

  /**
   * 上传背景图片
   */
  static async uploadBackgroundImage(file: File): Promise<ApiResponse<BackgroundUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.upload<ApiResponse<BackgroundUploadResponse>>('/api/templates/upload-background', formData);
    return response.data;
  }

  /**
   * 获取背景图片URL
   */
  static getBackgroundImageUrl(filename: string): string {
    return `/api/templates/background/${filename}`;
  }
}

export default TemplateApiService;