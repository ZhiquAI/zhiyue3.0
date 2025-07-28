import { App } from 'antd';

// 全局message实例，需要在App组件上下文中初始化
let globalMessage: any = null;

// 初始化全局message实例
export const initMessage = (messageInstance: any) => {
  globalMessage = messageInstance;
};

// 获取message实例的hook
export const useMessage = () => {
  const { message } = App.useApp();
  return message;
};

// 兼容的全局message API
export const message = {
  success: (content: string, duration?: number) => {
    if (globalMessage) {
      globalMessage.success(content, duration);
    } else {
      console.warn('Message instance not initialized. Please call initMessage first.');
    }
  },
  error: (content: string, duration?: number) => {
    if (globalMessage) {
      globalMessage.error(content, duration);
    } else {
      console.warn('Message instance not initialized. Please call initMessage first.');
    }
  },
  info: (content: string, duration?: number) => {
    if (globalMessage) {
      globalMessage.info(content, duration);
    } else {
      console.warn('Message instance not initialized. Please call initMessage first.');
    }
  },
  warning: (content: string, duration?: number) => {
    if (globalMessage) {
      globalMessage.warning(content, duration);
    } else {
      console.warn('Message instance not initialized. Please call initMessage first.');
    }
  },
  loading: (content: string, duration?: number) => {
    if (globalMessage) {
      return globalMessage.loading(content, duration);
    } else {
      console.warn('Message instance not initialized. Please call initMessage first.');
      return null;
    }
  },
  destroy: () => {
    if (globalMessage) {
      globalMessage.destroy();
    }
  }
};

export default message;