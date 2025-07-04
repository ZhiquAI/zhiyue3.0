// Gemini API测试工具
import { checkGeminiHealth } from '../services/geminiApi';

export const testGeminiConnection = async () => {
  console.log('🧪 开始测试Gemini API连接...');
  
  // 检查环境变量
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL;
  const baseUrl = import.meta.env.VITE_GEMINI_BASE_URL;
  
  console.log('🔧 环境配置检查:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    apiKeyPrefix: apiKey?.substring(0, 10) + '...',
    model: model,
    baseUrl: baseUrl
  });
  
  if (!apiKey) {
    console.error('❌ API密钥未配置');
    return false;
  }
  
  if (apiKey === 'your_gemini_api_key_here') {
    console.error('❌ API密钥未更新，仍为默认值');
    return false;
  }
  
  try {
    console.log('🌐 测试API连接...');
    const isHealthy = await checkGeminiHealth();
    
    if (isHealthy) {
      console.log('✅ Gemini API连接成功！');
      return true;
    } else {
      console.error('❌ Gemini API连接失败');
      return false;
    }
  } catch (error) {
    console.error('❌ API测试异常:', error);
    return false;
  }
};

// 在浏览器控制台中可以调用的测试函数
(window as any).testGemini = testGeminiConnection;
