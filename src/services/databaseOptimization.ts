/**
 * 数据库优化API服务
 * 提供数据库性能监控、优化管理、统计分析等API接口
 */

import { apiClient } from './httpClient';

export interface DatabaseHealthResponse {
  status: 'healthy' | 'warning' | 'error';
  database_type: string;
  connection_test: boolean;
  response_time: number;
  pool_stats: {
    pool_size: number;
    checked_in: number;
    checked_out: number;
    overflow: number;
    total_connections: number;
    peak_connections: number;
    average_checkout_time: number;
    longest_checkout_time: number;
  };
  error?: string;
}

export interface DatabaseMetricsResponse {
  pool_stats: {
    pool_size: number;
    checked_in: number;
    checked_out: number;
    overflow: number;
    invalid: number;
    total_connections: number;
    peak_connections: number;
    connection_requests: number;
    pool_hits: number;
    pool_misses: number;
    average_checkout_time: number;
    longest_checkout_time: number;
  };
  query_stats: {
    total_unique_queries: number;
    total_executions: number;
    total_execution_time: number;
    avg_execution_time: number;
    slow_queries_count: number;
    cache_enabled: boolean;
  };
  cache_stats: {
    size: number;
    max_size: number;
    ttl_seconds: number;
    hit_rate: number;
  };
  recommendations: string[];
}

export interface PerformanceAnalysisResponse {
  slow_queries: Array<{
    query_hash: string;
    sql: string;
    execution_count: number;
    total_time: number;
    avg_time: number;
    min_time: number;
    max_time: number;
    last_executed: string;
    cache_hits: number;
    cache_misses: number;
    cache_hit_rate: number;
  }>;
  table_analysis: Array<{
    table_name: string;
    estimated_count: number;
    table_size: string;
    index_count: number;
    seq_scan_count: number;
    index_scan_count: number;
    n_tup_ins: number;
    n_tup_upd: number;
    n_tup_del: number;
    last_vacuum: string;
    last_analyze: string;
  }>;
  performance_summary: {
    total_tables: number;
    slow_queries_count: number;
    optimization_opportunities: number;
    overall_score: number;
  };
}

export interface IndexOptimizationResponse {
  recommendations: Array<{
    type: 'CREATE' | 'DROP' | 'MODIFY';
    table: string;
    columns: string[];
    reason: string;
    estimated_improvement: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    sql: string;
    impact_analysis: {
      query_improvement: string;
      storage_impact: string;
      maintenance_cost: string;
    };
  }>;
  total_recommendations: number;
  potential_improvement: string;
  estimated_execution_time: string;
}

export interface QueryOptimizationResponse {
  optimized_queries: Array<{
    original_sql: string;
    optimized_sql: string;
    optimization_type: string;
    estimated_improvement: string;
    performance_impact: string;
  }>;
  slow_queries: Array<{
    query_hash: string;
    sql: string;
    execution_count: number;
    avg_time: number;
    max_time: number;
    last_executed: string;
    optimization_suggestions: string[];
  }>;
  cache_stats: {
    size: number;
    max_size: number;
    hit_rate: number;
    recommendations: string[];
  };
}

export interface ConnectionPoolOptimizationResponse {
  current_stats: {
    pool_size: number;
    checked_in: number;
    checked_out: number;
    overflow: number;
    total_connections: number;
    peak_connections: number;
    average_checkout_time: number;
    longest_checkout_time: number;
  };
  recommendations: string[];
  optimal_pool_size: number;
  optimization_plan: {
    current_utilization: number;
    target_utilization: number;
    performance_impact: string;
  };
}

export interface MonitoringDataResponse {
  timestamp: string;
  metrics: {
    connection_count: number;
    active_queries: number;
    slow_queries: number;
    cache_hit_rate: number;
    avg_response_time: number;
    error_rate: number;
  };
  alerts: Array<{
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    timestamp: string;
    metric: string;
    value: number;
    threshold: number;
  }>;
}

export const databaseOptimizationAPI = {
  // 获取数据库健康状态
  getHealth: async () => 
    await apiClient.get<DatabaseHealthResponse>('/api/database-optimization/health'),

  // 获取数据库指标
  getMetrics: async () => 
    await apiClient.get<DatabaseMetricsResponse>('/api/database-optimization/metrics'),

  // 执行性能分析
  analyzePerformance: async (params?: { 
    table_names?: string[]; 
    analyze_queries?: boolean; 
    analyze_indexes?: boolean 
  }) => 
    await apiClient.post<PerformanceAnalysisResponse>('/api/database-optimization/performance/analyze', params),

  // 获取索引优化建议
  optimizeIndexes: async (params: { 
    dry_run: boolean; 
    table_names?: string[]; 
    strategy?: 'AGGRESSIVE' | 'CONSERVATIVE' | 'BALANCED' 
  }) => 
    await apiClient.post<IndexOptimizationResponse>('/api/database-optimization/indexes/optimize', params),

  // 分析查询性能
  analyzeQueries: async (params?: { 
    threshold?: number; 
    limit?: number; 
    include_cache_stats?: boolean 
  }) => 
    await apiClient.post<QueryOptimizationResponse>('/api/database-optimization/queries/analyze', params),

  // 优化连接池
  optimizeConnectionPool: async () => 
    await apiClient.post<ConnectionPoolOptimizationResponse>('/api/database-optimization/connection-pool/optimize'),

  // 获取监控数据
  getMonitoringData: async (params?: { 
    time_range?: number; 
    metrics?: string[] 
  }) => 
    await apiClient.get<MonitoringDataResponse>('/api/database-optimization/monitoring', { params }),

  // 清除统计数据
  clearStats: async () => 
    await apiClient.post<{ success: boolean; message: string }>('/api/database-optimization/stats/clear'),

  // 清除查询缓存
  clearCache: async () => 
    await apiClient.post<{ success: boolean; message: string }>('/api/database-optimization/cache/clear'),

  // 生成优化报告
  generateOptimizationReport: async () => 
    await apiClient.get<{
      timestamp: string;
      summary: {
        total_unique_queries: number;
        total_executions: number;
        total_execution_time: number;
        avg_execution_time: number;
        slow_queries_count: number;
        cache_enabled: boolean;
      };
      slow_queries: Array<{
        query_hash: string;
        sql: string;
        execution_count: number;
        avg_time: number;
        max_time: number;
        last_executed: string;
        cache_hit_rate: number;
      }>;
      most_frequent_queries: Array<{
        query_hash: string;
        sql: string;
        execution_count: number;
        avg_time: number;
        total_time: number;
      }>;
      cache_stats: {
        size: number;
        max_size: number;
        ttl_seconds: number;
        hit_rate: number;
      };
      recommendations: string[];
    }>('/api/database-optimization/reports/optimization'),

  // 获取实时监控数据
  getRealtimeMonitoring: async () => 
    await apiClient.get<{
      timestamp: string;
      active_connections: number;
      running_queries: number;
      slow_queries_last_minute: number;
      cache_hit_rate_last_minute: number;
      avg_response_time_last_minute: number;
      system_load: {
        cpu_usage: number;
        memory_usage: number;
        disk_usage: number;
      };
    }>('/api/database-optimization/monitoring/realtime'),

  // 设置监控阈值
  setMonitoringThresholds: async (thresholds: {
    slow_query_threshold?: number;
    connection_pool_threshold?: number;
    cache_hit_rate_threshold?: number;
    response_time_threshold?: number;
  }) => 
    await apiClient.post<{ success: boolean; message: string }>('/api/database-optimization/monitoring/thresholds', thresholds),

  // 获取监控阈值
  getMonitoringThresholds: async () => 
    await apiClient.get<{
      slow_query_threshold: number;
      connection_pool_threshold: number;
      cache_hit_rate_threshold: number;
      response_time_threshold: number;
    }>('/api/database-optimization/monitoring/thresholds'),
};

export default databaseOptimizationAPI;