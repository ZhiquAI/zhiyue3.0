import axios from 'axios';

// 创建API客户端实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== 类型定义 ====================

export interface Student {
  uuid: string;
  student_id: string;
  student_name: string;
  class_name: string;
  grade?: string;
  school?: string;
  gender?: 'male' | 'female' | 'other';
  contact_phone?: string;
  parent_phone?: string;
  address?: string;
  barcode_data?: string;
  exam_number?: string;
  seat_number?: string;
  exam_hall?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCreate {
  student_id: string;
  student_name: string;
  class_name: string;
  grade?: string;
  school?: string;
  gender?: 'male' | 'female' | 'other';
  contact_phone?: string;
  parent_phone?: string;
  address?: string;
}

export interface StudentUpdate {
  student_name?: string;
  class_name?: string;
  grade?: string;
  school?: string;
  gender?: 'male' | 'female' | 'other';
  contact_phone?: string;
  parent_phone?: string;
  address?: string;
}

export interface BatchImportResult {
  total: number;
  success_count: number;
  failed_count: number;
  success_records: Student[];
  failed_records: Array<{
    row: number;
    data: Record<string, any>;
    error: string;
  }>;
  duplicate_records: Array<{
    row: number;
    student_id: string;
    existing_student: Student;
  }>;
}

export interface StudentStatistics {
  total_students: number;
  class_distribution: Record<string, number>;
  gender_distribution: Record<string, number>;
  hall_distribution: Record<string, number>;
}

export interface ExamHall {
  id: string;
  name: string;
  capacity: number;
  assigned_count: number;
}

export interface ArrangementConfig {
  halls: { name: string; capacity: number }[];
  allocation_type: 'by_class' | 'random';
  seating_type: 'sequential' | 'snake';
}

export interface ArrangementResult {
  success: boolean;
  message: string;
  arranged_count: number;
  halls_used: number;
}

interface StandardResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: string;
}

// ==================== 学生管理 API ====================

export const studentApi = {
  // 创建学生
  createStudent: async (examId: string, studentData: StudentCreate): Promise<StandardResponse<Student>> => {
    const response = await apiClient.post(`/api/students/${examId}`, studentData);
    return response.data;
  },

  // 获取学生列表
  getStudents: async (
    examId: string,
    params?: {
      class_name?: string;
      search?: string;
      skip?: number;
      limit?: number;
    }
  ): Promise<StandardResponse<Student[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.class_name) queryParams.append('class_name', params.class_name);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    
    const response = await apiClient.get(`/api/students/${examId}?${queryParams.toString()}`);
    return response.data;
  },

  // 获取单个学生
  getStudent: async (examId: string, studentUuid: string): Promise<StandardResponse<Student>> => {
    const response = await apiClient.get(`/api/students/${examId}/${studentUuid}`);
    return response.data;
  },

  // 更新学生信息
  updateStudent: async (
    examId: string,
    studentUuid: string,
    studentData: StudentUpdate
  ): Promise<StandardResponse<Student>> => {
    const response = await apiClient.put(`/api/students/${examId}/${studentUuid}`, studentData);
    return response.data;
  },

  // 删除学生
  deleteStudent: async (examId: string, studentUuid: string): Promise<StandardResponse> => {
    const response = await apiClient.delete(`/api/students/${examId}/${studentUuid}`);
    return response.data;
  },

  // 批量导入学生
  batchImportStudents: async (examId: string, file: File): Promise<StandardResponse<BatchImportResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/api/students/${examId}/batch-import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 导出学生信息
  exportStudents: async (examId: string, format: 'excel' | 'csv' = 'excel'): Promise<Blob> => {
    const response = await apiClient.get(`/api/students/${examId}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // 获取学生条形码
  getStudentBarcode: async (
    examId: string,
    studentUuid: string,
    format: 'json' | 'delimited' | 'fixed_length' = 'json'
  ): Promise<StandardResponse<{ barcode_data: string; format: string }>> => {
    const response = await apiClient.get(`/api/students/${examId}/${studentUuid}/barcode?format=${format}`);
    return response.data;
  },

  // 通过条形码匹配学生
  matchStudentByBarcode: async (
    examId: string,
    barcodeData: string
  ): Promise<StandardResponse<Student>> => {
    const response = await apiClient.post(`/api/students/${examId}/match-barcode`, {
      barcode_data: barcodeData,
    });
    return response.data;
  },

  // 获取学生统计信息
  getStudentStatistics: async (examId: string): Promise<StandardResponse<StudentStatistics>> => {
    const response = await apiClient.get(`/api/students/${examId}/statistics`);
    return response.data;
  },

  // 生成准考证号和座位号
  generateExamNumbers: async (examId: string): Promise<StandardResponse> => {
    const response = await apiClient.post(`/api/students/${examId}/generate-exam-numbers`);
    return response.data;
  },

  // 获取考场列表
  getExamHalls: async (examId: string): Promise<StandardResponse<ExamHall[]>> => {
    const response = await apiClient.get(`/api/exams/${examId}/halls`);
    return response.data;
  },

  // 自动编排考场
  arrangeExamHalls: async (examId: string, config: ArrangementConfig): Promise<StandardResponse<ArrangementResult>> => {
    const response = await apiClient.post(`/api/exams/${examId}/arrange`, config);
    return response.data;
  },

  // 健康检查
  healthCheck: async (): Promise<StandardResponse> => {
    const response = await apiClient.get('/api/students/health');
    return response.data;
  },
};

// ==================== 文件上传相关 API ====================

export const fileUploadApi = {
  // 上传答题卡（带学生信息匹配）
  uploadAnswerSheets: async (
    examId: string,
    files: FileList
  ): Promise<StandardResponse<{
    success: Array<{
      filename: string;
      file_id: string;
      student_info?: {
        student_id: string;
        student_name: string;
        class_name: string;
        barcode_data: string;
      };
    }>;
    failed: Array<{
      filename: string;
      error: string;
    }>;
    total: number;
    success_count: number;
    failed_count: number;
    student_matches: Array<any>;
    unmatched_files: Array<any>;
  }>> => {
    const formData = new FormData();
    formData.append('exam_id', examId);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    const response = await apiClient.post('/api/files/upload/answer-sheets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default studentApi;