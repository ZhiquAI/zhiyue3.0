import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';

describe('useAsyncOperation', () => {
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAsyncOperation());

    expect(result.current.state).toEqual({
      data: null,
      loading: false,
      error: null,
    });
  });

  it('should handle successful operation', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const mockData = { id: 1, name: 'test' };
    const mockOperation = vi.fn().mockResolvedValue(mockData);

    await act(async () => {
      const resultData = await result.current.execute(mockOperation);
      expect(resultData).toEqual(mockData);
    });

    expect(result.current.state).toEqual({
      data: mockData,
      loading: false,
      error: null,
    });
  });

  it('should handle failed operation', async () => {
    const { result } = renderHook(() => useAsyncOperation(null, false));
    const mockError = new Error('Test error');
    const mockOperation = vi.fn().mockRejectedValue(mockError);

    await act(async () => {
      try {
        await result.current.execute(mockOperation);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.state).toEqual({
      data: null,
      loading: false,
      error: mockError,
    });
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useAsyncOperation());

    act(() => {
      result.current.setData({ test: 'data' });
    });

    expect(result.current.state.data).toEqual({ test: 'data' });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      data: null,
      loading: false,
      error: null,
    });
  });
});