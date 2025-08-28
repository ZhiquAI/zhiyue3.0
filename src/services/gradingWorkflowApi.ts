/**
 * 阅卷工作流程API客户端
 * 提供工作流程管理和优化的接口
 */

import apiClient from './api';

// 类型定义
export interface WorkflowConfig {
  [key: string]: string | number | boolean;
}

export interface WorkflowInitRequest {
  exam_id: string;
  config?: WorkflowConfig;
}

export interface AssignmentRequest {
  exam_id: string;
  strategy?: 'random' | 'balanced' | 'expertise' | 'workload';
}

export interface WorkflowStatisticsData {
  [key: string]: string | number | boolean;
}

export interface WorkflowStatus {
  workflow_id: string;
  exam_id: string;
  stage: string;
  statistics: WorkflowStatisticsData;
  updated_at: string;
}

export interface PaperAssignment {
  grader_id: string;
  paper_ids: string[];
  assigned_at: string;
}

export interface AssignmentResult {
  total_assigned: number;
  assignments: PaperAssignment[];
  strategy_used: string;
}

export interface GraderWorkload {
  grader_id: string;
  assigned_count: number;
  completed_count: number;
  pending_count: number;
  completion_rate: number;
  avg_grading_time_minutes: number;
}

export interface GraderProgressItem {
  grader_id: string;
  grader_name: string;
  assigned_count: number;
  completed_count: number;
  completion_rate: number;
}

export interface GradingProgress {
  exam_id: string;
  total_sheets: number;
  graded_sheets: number;
  completion_rate: number;
  grader_progress: GraderProgressItem[];
  estimated_completion?: string;
}

export interface WorkflowOverview {
  total_graders: number;
  total_assigned: number;
  total_completed: number;
  overall_completion_rate: number;
  average_grader_completion_rate: number;
}

export interface WorkflowStatistics {
  exam_id: string;
  overview: WorkflowOverview;
  progress: GradingProgress;
  grader_workloads: GraderWorkload[];
}

/**
 * 阅卷工作流程API服务
 */
export class GradingWorkflowApi {
  private static readonly BASE_URL = '/api/grading-workflow';

  /**
   * 初始化工作流程
   */
  static async initializeWorkflow(request: WorkflowInitRequest): Promise<{
    success: boolean;
    message: string;
    data: { workflow_id: string };
  }> {
    const response = await apiClient.post(
      `${this.BASE_URL}/initialize`,
      request
    );
    return response.data;
  }

  /**
   * 获取工作流程状态
   */
  static async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const response = await apiClient.get(
      `${this.BASE_URL}/status/${workflowId}`
    );
    return response.data;
  }

  /**
   * 智能分配试卷
   */
  static async assignPapers(request: AssignmentRequest): Promise<AssignmentResult> {
    const response = await apiClient.post(
      `${this.BASE_URL}/assign`,
      request
    );
    return response.data;
  }

  /**
   * 获取阅卷员工作负载
   */
  static async getGraderWorkload(graderId: string): Promise<GraderWorkload> {
    const response = await apiClient.get(
      `${this.BASE_URL}/workload/${graderId}`
    );
    return response.data;
  }

  /**
   * 优化分配平衡性
   */
  static async optimizeAssignmentBalance(examId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      rebalanced: boolean;
      changes_made: number;
      balance_score: number;
    };
  }> {
    const response = await apiClient.post(
      `${this.BASE_URL}/optimize/${examId}`
    );
    return response.data;
  }

  /**
   * 跟踪阅卷进度
   */
  static async trackGradingProgress(examId: string): Promise<GradingProgress> {
    const response = await apiClient.get(
      `${this.BASE_URL}/progress/${examId}`
    );
    return response.data;
  }

  /**
   * 获取工作流程统计信息
   */
  static async getWorkflowStatistics(examId: string): Promise<WorkflowStatistics> {
    const response = await apiClient.get(
      `${this.BASE_URL}/statistics/${examId}`
    );
    return response.data;
  }
}

export default GradingWorkflowApi;