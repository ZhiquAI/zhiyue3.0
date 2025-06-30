export type ExamStatus = '待配置' | '待阅卷' | '阅卷中' | '已完成';

export interface Exam {
  id: string;
  name: string;
  subject: string;
  grade: string;
  status: ExamStatus;
  createdAt: string;
  tasks: {
    total: number;
    completed: number;
    hasError: boolean;
    errorCount?: number;
  };
  avgScore: number | null;
}

export interface Question {
  id: string;
  title: string;
  type: string;
  points: number;
  area: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  answer: string;
}

export interface RubricDimension {
  id: string;
  name: string;
  points: number;
  guide: string;
  keywords?: string[];
}

export interface Rubric {
  dimensions: RubricDimension[];
}

export interface MarkingData {
  studentId: string;
  studentName: string;
  objectiveScore: number;
  subjectiveScores: Record<string, {
    totalScore: number;
    dimensionScores: Array<{
      id: string;
      score: number;
      reason: string;
    }>;
  }>;
}