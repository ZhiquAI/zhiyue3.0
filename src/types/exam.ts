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
  questionType?: 'choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'analysis' | 'short_answer';
  points: number;
  area: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  answer: string;
  options?: string[]; // 选择题选项
  questionText?: string; // 题目文本
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

export interface ObjectiveResult {
  score: number;
  isCorrect: boolean;
  studentAnswer: string;
  correctAnswer: string;
}

export interface MarkingData {
  studentId: string;
  studentName: string;
  objectiveScore: number;
  objectiveResults?: Record<string, ObjectiveResult>;
  subjectiveScores: Record<string, {
    totalScore: number;
    dimensionScores: Array<{
      id: string;
      score: number;
      reason: string;
    }>;
  }>;
}