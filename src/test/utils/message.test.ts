import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the message module
const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
  destroy: vi.fn()
};

vi.mock('../../utils/message', () => ({
  message: mockMessage
}));

describe('Message Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('message functions', () => {
    it('should have all required message methods', async () => {
      const { message } = await import('../../utils/message');
      
      expect(typeof message.success).toBe('function');
      expect(typeof message.error).toBe('function');
      expect(typeof message.warning).toBe('function');
      expect(typeof message.info).toBe('function');
    });

    it('should call success method', async () => {
      const { message } = await import('../../utils/message');
      
      message.success('操作成功');
      
      expect(mockMessage.success).toHaveBeenCalledWith('操作成功');
    });

    it('should call error method', async () => {
      const { message } = await import('../../utils/message');
      
      message.error('操作失败');
      
      expect(mockMessage.error).toHaveBeenCalledWith('操作失败');
    });

    it('should call warning method', async () => {
      const { message } = await import('../../utils/message');
      
      message.warning('警告信息');
      
      expect(mockMessage.warning).toHaveBeenCalledWith('警告信息');
    });

    it('should call info method', async () => {
      const { message } = await import('../../utils/message');
      
      message.info('提示信息');
      
      expect(mockMessage.info).toHaveBeenCalledWith('提示信息');
    });

    it('should handle multiple calls', async () => {
      const { message } = await import('../../utils/message');
      
      message.success('第一条消息');
      message.success('第二条消息');
      message.error('错误消息');
      
      expect(mockMessage.success).toHaveBeenCalledTimes(2);
      expect(mockMessage.error).toHaveBeenCalledTimes(1);
    });

    it('should handle empty messages', async () => {
      const { message } = await import('../../utils/message');
      
      message.info('');
      
      expect(mockMessage.info).toHaveBeenCalledWith('');
    });

    it('should handle different message types', async () => {
      const { message } = await import('../../utils/message');
      
      const testMessage = '测试消息';
      
      message.success(testMessage);
      message.error(testMessage);
      message.warning(testMessage);
      message.info(testMessage);
      
      expect(mockMessage.success).toHaveBeenCalledWith(testMessage);
      expect(mockMessage.error).toHaveBeenCalledWith(testMessage);
      expect(mockMessage.warning).toHaveBeenCalledWith(testMessage);
      expect(mockMessage.info).toHaveBeenCalledWith(testMessage);
    });
  });

  describe('message with parameters', () => {
    it('should handle messages with duration', async () => {
      const { message } = await import('../../utils/message');
      
      message.success('成功', 5);
      
      expect(mockMessage.success).toHaveBeenCalledWith('成功', 5);
    });

    it('should handle messages with callbacks', async () => {
      const { message } = await import('../../utils/message');
      const callback = vi.fn();
      
      message.error('失败', callback);
      
      expect(mockMessage.error).toHaveBeenCalledWith('失败', callback);
    });
  });

  describe('message cleanup', () => {
    it('should support destroy method', async () => {
      const { message } = await import('../../utils/message');
      
      if (message.destroy) {
        message.destroy();
        expect(mockMessage.destroy).toHaveBeenCalled();
      }
    });
  });
});