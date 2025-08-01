import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../../utils/performance';
import { renderHook, act } from '@testing-library/react';

describe('Performance Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useDebounce', () => {
    it('should debounce function calls', () => {
      const mockFn = vi.fn();
      const { result } = renderHook(() => useDebounce(mockFn, 500));
      const debouncedFn = result.current;

      // 快速连续调用
      debouncedFn('test1');
      debouncedFn('test2');
      debouncedFn('test3');

      // 函数还未被调用
      expect(mockFn).not.toHaveBeenCalled();

      // 等待防抖延迟
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 只调用最后一次
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test3');
    });

    it('should reset timer on new calls', () => {
      const mockFn = vi.fn();
      const { result } = renderHook(() => useDebounce(mockFn, 500));
      const debouncedFn = result.current;

      debouncedFn('test1');
      
      // 等待一半时间
      act(() => {
        vi.advanceTimersByTime(250);
      });
      
      // 再次调用，重置计时器
      debouncedFn('test2');
      
      // 再等待一半时间（总共750ms，但计时器被重置）
      act(() => {
        vi.advanceTimersByTime(250);
      });
      
      // 函数还未被调用
      expect(mockFn).not.toHaveBeenCalled();
      
      // 等待剩余时间
      act(() => {
        vi.advanceTimersByTime(250);
      });
      
      // 现在函数被调用
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test2');
    });

    it('should handle multiple parameters', () => {
      const mockFn = vi.fn();
      const { result } = renderHook(() => useDebounce(mockFn, 300));
      const debouncedFn = result.current;

      debouncedFn('param1', 'param2', 123);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockFn).toHaveBeenCalledWith('param1', 'param2', 123);
    });

    it('should work with different delay values', () => {
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn();
      
      const { result: result1 } = renderHook(() => useDebounce(mockFn1, 100));
      const { result: result2 } = renderHook(() => useDebounce(mockFn2, 500));
      
      const debouncedFn1 = result1.current;
      const debouncedFn2 = result2.current;

      debouncedFn1('fast');
      debouncedFn2('slow');

      // 等待100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockFn1).toHaveBeenCalledWith('fast');
      expect(mockFn2).not.toHaveBeenCalled();

      // 再等待400ms
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(mockFn2).toHaveBeenCalledWith('slow');
    });

    it('should handle zero delay', () => {
      const mockFn = vi.fn();
      const { result } = renderHook(() => useDebounce(mockFn, 0));
      const debouncedFn = result.current;

      debouncedFn('immediate');

      // 即使延迟为0，也需要等待下一个事件循环
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(mockFn).toHaveBeenCalledWith('immediate');
    });

    it('should cleanup timer on unmount', () => {
      const mockFn = vi.fn();
      const { result, unmount } = renderHook(() => useDebounce(mockFn, 500));

      const debouncedFn = result.current;
      debouncedFn('test');

      // 卸载组件
      unmount();

      // 等待延迟时间
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 由于添加了useEffect清理函数，定时器应该被清理
      // 函数不应该被调用
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should handle function reference changes', () => {
      let mockFn1 = vi.fn();
      let mockFn2 = vi.fn();
      
      const { result, rerender } = renderHook(
        ({ fn, delay }) => useDebounce(fn, delay),
        { initialProps: { fn: mockFn1, delay: 300 } }
      );

      const debouncedFn = result.current;
      debouncedFn('test1');

      // 更改函数引用
      rerender({ fn: mockFn2, delay: 300 });
      
      // 获取新的防抖函数并调用
      const newDebouncedFn = result.current;
      newDebouncedFn('test2');
      
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // 由于函数引用变化，新函数应该被调用
      expect(mockFn1).not.toHaveBeenCalled();
      expect(mockFn2).toHaveBeenCalledWith('test2');
    });

    it('should handle delay changes', () => {
      const mockFn = vi.fn();
      
      const { result, rerender } = renderHook(
        ({ fn, delay }) => useDebounce(fn, delay),
        { initialProps: { fn: mockFn, delay: 300 } }
      );

      let debouncedFn = result.current;
      debouncedFn('test1');

      // 等待一半时间
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // 更改延迟时间
      rerender({ fn: mockFn, delay: 500 });
      debouncedFn = result.current;
      
      // 再次调用
      debouncedFn('test2');
      
      // 等待原来的剩余时间
      act(() => {
        vi.advanceTimersByTime(150);
      });
      
      // 函数还未被调用
      expect(mockFn).not.toHaveBeenCalled();
      
      // 等待新的延迟时间
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockFn).toHaveBeenCalledWith('test2');
    });

    it('should preserve this context', () => {
      const obj = {
        value: 'test',
        method: vi.fn(function(this: any) {
          expect(this.value).toBe('test');
          return this.value;
        })
      };

      const { result } = renderHook(() => useDebounce(obj.method.bind(obj), 300));
      const debouncedMethod = result.current;
      debouncedMethod();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(obj.method).toHaveBeenCalled();
    });
  });
});