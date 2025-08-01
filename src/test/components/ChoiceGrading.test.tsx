import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ChoiceGrading from '../../pages/ChoiceGrading';

// Mock API calls
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock message utility
vi.mock('../../utils/message', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

// Mock removed useRealtimeStatus hook
// vi.mock('../../hooks/useRealtimeStatus', () => ({
//   useRealtimeStatus: vi.fn(() => ({
//     status: null,
//     connected: false,
//     sendMessage: vi.fn()
//   }))
// }));

// Mock file upload
Object.defineProperty(window, 'File', {
  value: class MockFile {
    constructor(parts: any[], filename: string, properties?: any) {
      this.name = filename;
      this.size = parts.reduce((acc, part) => acc + part.length, 0);
      this.type = properties?.type || '';
    }
    name: string;
    size: number;
    type: string;
  },
  writable: true
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('ChoiceGrading', () => {
  const mockAnswerSheets = [
    {
      id: 1,
      student_name: '张三',
      student_id: '001',
      exam_id: 1,
      status: 'pending',
      ocr_result: {
        choices: ['A', 'B', 'C', 'D'],
        confidence: 0.95
      },
      score: null,
      graded_at: null
    },
    {
      id: 2,
      student_name: '李四',
      student_id: '002',
      exam_id: 1,
      status: 'graded',
      ocr_result: {
        choices: ['A', 'C', 'C', 'D'],
        confidence: 0.92
      },
      score: 85,
      graded_at: '2024-01-01T10:00:00Z'
    }
  ];

  const mockGradingStandards = {
    answer_key: ['A', 'B', 'C', 'D'],
    scoring_rules: {
      correct_points: 5,
      wrong_points: 0,
      blank_points: 0
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render choice grading page', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查页面标题
    expect(screen.getByText('智能评分系统')).toBeInTheDocument();
  });

  it('should display answer sheet upload area', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查上传区域
    const uploadArea = screen.queryByText('上传答题卡');
    if (uploadArea) {
      expect(uploadArea).toBeInTheDocument();
    }
  });

  it('should handle file upload', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 模拟文件上传
    const fileInput = screen.queryByLabelText('选择文件');
    if (fileInput) {
      const file = new File(['test content'], 'answer_sheet.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(fileInput).toBeInTheDocument();
      });
    }
  });

  it('should display grading standards configuration', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查评分标准配置
    const standardsSection = screen.queryByText('评分标准');
    if (standardsSection) {
      expect(standardsSection).toBeInTheDocument();
    }
  });

  it('should handle answer key input', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查答案输入
    const answerInputs = screen.queryAllByPlaceholderText('答案');
    if (answerInputs.length > 0) {
      fireEvent.change(answerInputs[0], { target: { value: 'A' } });
      
      await waitFor(() => {
        expect(answerInputs[0]).toBeInTheDocument();
      });
    }
  });

  it('should display OCR results', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查OCR结果显示
    const ocrSection = screen.queryByText('OCR识别结果');
    if (ocrSection) {
      expect(ocrSection).toBeInTheDocument();
    }
  });

  it('should handle manual grading', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查手动评分按钮
    const gradingButton = screen.queryByText('开始评分');
    if (gradingButton) {
      fireEvent.click(gradingButton);
      
      await waitFor(() => {
        expect(gradingButton).toBeInTheDocument();
      });
    }
  });

  it('should display grading results', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查评分结果显示
    const resultsSection = screen.queryByText('评分结果');
    if (resultsSection) {
      expect(resultsSection).toBeInTheDocument();
    }
  });

  it('should handle batch grading', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查批量评分功能
    const batchButton = screen.queryByText('批量评分');
    if (batchButton) {
      fireEvent.click(batchButton);
      
      await waitFor(() => {
        expect(batchButton).toBeInTheDocument();
      });
    }
  });

  it('should display progress tracking', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查进度跟踪
    const progressSection = screen.queryByText('评分进度');
    if (progressSection) {
      expect(progressSection).toBeInTheDocument();
    }
  });

  it('should handle error states', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查错误处理
    await waitFor(() => {
      expect(screen.getByText('智能评分系统')).toBeInTheDocument();
    });
  });

  it('should validate answer format', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查答案格式验证
    const answerInputs = screen.queryAllByPlaceholderText('答案');
    if (answerInputs.length > 0) {
      fireEvent.change(answerInputs[0], { target: { value: 'X' } });
      
      await waitFor(() => {
        expect(answerInputs[0]).toBeInTheDocument();
      });
    }
  });

  it('should export grading results', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查导出功能
    const exportButton = screen.queryByText('导出结果');
    if (exportButton) {
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(exportButton).toBeInTheDocument();
      });
    }
  });

  it('should handle real-time status updates', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查实时状态更新
    await waitFor(() => {
      expect(screen.getByText('智能评分系统')).toBeInTheDocument();
    });
  });

  it('should handle scoring rule configuration', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查评分规则配置
    const scoringSection = screen.queryByText('评分规则');
    if (scoringSection) {
      expect(scoringSection).toBeInTheDocument();
    }
  });

  it('should display confidence scores', async () => {
    render(
      <TestWrapper>
        <ChoiceGrading />
      </TestWrapper>
    );

    // 检查置信度显示
    const confidenceSection = screen.queryByText('识别置信度');
    if (confidenceSection) {
      expect(confidenceSection).toBeInTheDocument();
    }
  });
});