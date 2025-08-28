import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PerformanceWorkspace from '../../components/workspaces/PerformanceWorkspace';

// Mock the message utility
vi.mock('../../utils/message', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

// Mock the performance components
vi.mock('../../components/performance/FileUploadOptimizer', () => ({
  default: function MockFileUploadOptimizer() {
    return (
      <div data-testid="file-upload-optimizer">
        <h3>文件上传优化器</h3>
        <button data-testid="start-upload">开始上传</button>
        <div data-testid="upload-progress">上传进度: 0%</div>
      </div>
    );
  }
}));

vi.mock('../../components/performance/BatchProcessingMonitor', () => ({
  default: function MockBatchProcessingMonitor() {
    return (
      <div data-testid="batch-processing-monitor">
        <h3>批量处理监控</h3>
        <button data-testid="start-monitoring">开始监控</button>
        <div data-testid="task-count">活跃任务: 0</div>
      </div>
    );
  }
}));

vi.mock('../../components/performance/PerformanceOptimizer', () => ({
  default: function MockPerformanceOptimizer() {
    return (
      <div data-testid="performance-optimizer">
        <h3>性能优化器</h3>
        <button data-testid="auto-optimize">自动优化</button>
        <div data-testid="optimization-status">优化状态: 待优化</div>
      </div>
    );
  }
}));

describe('PerformanceWorkspace', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确渲染性能监控工作区', () => {
    render(<PerformanceWorkspace onBack={mockOnBack} />);
    
    // 检查标题和描述
    expect(screen.getByText('性能监控与优化')).toBeInTheDocument();
    expect(screen.getByText('监控系统性能，优化处理效率')).toBeInTheDocument();
    
    // 检查返回按钮
    expect(screen.getByTestId('back-btn')).toBeInTheDocument();
    
    // 检查帮助按钮
    expect(screen.getByText('帮助')).toBeInTheDocument();
  });

  it('应该显示所有性能优化选项卡', () => {
    render(<PerformanceWorkspace />);
    
    // 检查选项卡标题
    expect(screen.getAllByText('文件上传优化').length).toBeGreaterThan(0);
    expect(screen.getAllByText('批量处理监控').length).toBeGreaterThan(0);
    expect(screen.getAllByText('性能优化器').length).toBeGreaterThan(0);
  });

  it('应该默认显示文件上传优化选项卡', () => {
    render(<PerformanceWorkspace />);
    
    // 默认应该显示文件上传优化器
    expect(screen.getByTestId('file-upload-optimizer')).toBeInTheDocument();
    expect(screen.getByText('文件上传性能优化')).toBeInTheDocument();
  });

  it('应该能够切换到批量处理监控选项卡', async () => {
    render(<PerformanceWorkspace />);
    
    // 使用更精确的选择器点击批量处理监控选项卡
    const batchTab = screen.getByRole('tab', { name: /批量处理监控/ });
    fireEvent.click(batchTab);
    
    // 等待选项卡切换
    await waitFor(() => {
      expect(screen.getByTestId('batch-processing-monitor')).toBeInTheDocument();
      expect(screen.getByText('批量处理性能监控')).toBeInTheDocument();
    });
  });

  it('应该能够切换到性能优化器选项卡', async () => {
    render(<PerformanceWorkspace />);
    
    // 使用更精确的选择器点击性能优化器选项卡
    const perfTab = screen.getByRole('tab', { name: /性能优化器/ });
    fireEvent.click(perfTab);
    
    // 等待选项卡切换
    await waitFor(() => {
      expect(screen.getByTestId('performance-optimizer')).toBeInTheDocument();
      expect(screen.getByText('系统性能优化')).toBeInTheDocument();
    });
  });

  it('应该正确处理返回按钮点击', async () => {
    render(<PerformanceWorkspace onBack={mockOnBack} />);
    
    // 等待返回按钮渲染后点击
    const backButton = await screen.findByTestId('back-btn');
    fireEvent.click(backButton);
    
    // 验证回调函数被调用
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('应该显示性能优化建议', () => {
    render(<PerformanceWorkspace />);
    
    // 检查性能优化建议卡片
    expect(screen.getByText('性能优化建议')).toBeInTheDocument();
    
    // 检查各个优化建议类别（使用更精确的选择器）
    expect(screen.getAllByText('文件上传优化')[1]).toBeInTheDocument();
    expect(screen.getByText('批量处理优化')).toBeInTheDocument();
    expect(screen.getByText('系统资源优化')).toBeInTheDocument();
    
    // 检查具体建议内容
    expect(screen.getByText('• 启用分块上传提高大文件稳定性')).toBeInTheDocument();
    expect(screen.getByText('• 监控任务队列长度避免积压')).toBeInTheDocument();
    expect(screen.getByText('• 监控内存使用防止内存泄漏')).toBeInTheDocument();
  });

  it('应该在没有onBack属性时不显示返回按钮', () => {
    render(<PerformanceWorkspace />);
    
    // 不应该显示返回按钮
    expect(screen.queryByTestId('back-btn')).not.toBeInTheDocument();
    
    // 但应该显示帮助按钮
    expect(screen.getByText('帮助')).toBeInTheDocument();
  });

  it('应该正确处理帮助按钮点击', () => {
    // Mock console.log
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<PerformanceWorkspace />);
    
    // 使用文本内容查找帮助按钮
    const helpButton = screen.getByText('帮助');
    fireEvent.click(helpButton);
    
    // 验证console.log被调用
    expect(consoleSpy).toHaveBeenCalledWith('显示帮助信息');
    
    // 清理mock
    consoleSpy.mockRestore();
  });

  it('应该为每个选项卡显示正确的提示信息', async () => {
    render(<PerformanceWorkspace />);
    
    // 文件上传优化选项卡的提示
    expect(screen.getByText('通过分块上传、并发控制和断点续传等技术提升大文件上传的稳定性和速度。')).toBeInTheDocument();
    
    // 切换到批量处理监控
    const batchTab = screen.getByRole('tab', { name: /批量处理监控/ });
    fireEvent.click(batchTab);
    await waitFor(() => {
      expect(screen.getByText('实时监控OCR识别、质量检查、结构分析等批量处理任务的性能指标和资源使用情况。')).toBeInTheDocument();
    });
    
    // 切换到性能优化器
    const perfTab = screen.getByRole('tab', { name: /性能优化器/ });
    fireEvent.click(perfTab);
    await waitFor(() => {
      expect(screen.getByText('智能分析系统性能瓶颈，提供优化建议和自动调优功能。')).toBeInTheDocument();
    });
  });

  it('应该正确传递属性给子组件', () => {
    render(<PerformanceWorkspace />);
    
    // 验证文件上传优化器的默认属性
    expect(screen.getByTestId('file-upload-optimizer')).toBeInTheDocument();
    
    // 切换到批量处理监控并验证属性
    const batchTab = screen.getByRole('tab', { name: /批量处理监控/ });
    fireEvent.click(batchTab);
    expect(screen.getByTestId('batch-processing-monitor')).toBeInTheDocument();
  });

  it('应该具有正确的CSS类名和样式', () => {
    const { container } = render(<PerformanceWorkspace />);
    
    // 检查主容器的类名
    const workspace = container.querySelector('.performance-workspace');
    expect(workspace).toHaveClass('min-h-screen', 'bg-gray-50');
    
    // 检查头部区域的样式
    const header = container.querySelector('.bg-white.border-b');
    expect(header).toBeInTheDocument();
  });
});

// 集成测试：测试选项卡切换和组件交互
describe('PerformanceWorkspace Integration Tests', () => {
  it('应该能够在不同选项卡之间流畅切换', async () => {
    render(<PerformanceWorkspace />);
    
    // 初始状态：文件上传优化
    expect(screen.getByTestId('file-upload-optimizer')).toBeInTheDocument();
    
    // 切换到批量处理监控
    const batchTab = screen.getByRole('tab', { name: /批量处理监控/ });
    fireEvent.click(batchTab);
    await waitFor(() => {
      expect(screen.getByTestId('batch-processing-monitor')).toBeInTheDocument();
      expect(batchTab).toHaveAttribute('aria-selected', 'true');
    });
    
    // 切换到性能优化器
    const perfTab = screen.getByRole('tab', { name: /性能优化器/ });
    fireEvent.click(perfTab);
    await waitFor(() => {
      expect(screen.getByTestId('performance-optimizer')).toBeInTheDocument();
      expect(perfTab).toHaveAttribute('aria-selected', 'true');
    });
    
    // 切换回文件上传优化
    const uploadTab = screen.getByRole('tab', { name: /文件上传优化/ });
    fireEvent.click(uploadTab);
    await waitFor(() => {
      expect(screen.getByTestId('file-upload-optimizer')).toBeInTheDocument();
      expect(uploadTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('应该保持选项卡状态的一致性', async () => {
    render(<PerformanceWorkspace />);
    
    // 验证初始活跃选项卡
    const uploadTab = screen.getByRole('tab', { name: /文件上传优化/ });
    expect(uploadTab).toHaveAttribute('aria-selected', 'true');
    
    // 切换选项卡
    const batchTab = screen.getByRole('tab', { name: /批量处理监控/ });
    fireEvent.click(batchTab);
    
    await waitFor(() => {
      expect(batchTab).toHaveAttribute('aria-selected', 'true');
      expect(uploadTab).toHaveAttribute('aria-selected', 'false');
    });
  });
});

// 性能测试：确保组件渲染性能
describe('PerformanceWorkspace Performance Tests', () => {
  it('应该快速渲染而不阻塞UI', () => {
    const startTime = performance.now();
    
    render(<PerformanceWorkspace />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // 渲染时间应该少于100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('应该能够处理快速的选项卡切换', async () => {
    render(<PerformanceWorkspace />);
    
    // 快速切换选项卡
    const batchTab = screen.getByRole('tab', { name: /批量处理监控/ });
    const perfTab = screen.getByRole('tab', { name: /性能优化器/ });
    const uploadTab = screen.getByRole('tab', { name: /文件上传优化/ });
    
    // 快速切换，不等待
    fireEvent.click(batchTab);
    fireEvent.click(perfTab);
    fireEvent.click(uploadTab);
    
    // 最终应该显示最后一个选项卡的内容
    await waitFor(() => {
      expect(screen.getByTestId('file-upload-optimizer')).toBeInTheDocument();
    });
  });
});