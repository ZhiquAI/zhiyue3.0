// 输入验证工具 - 防止XSS和数据验证
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// XSS防护
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// 检查危险脚本
export const containsScript = (input: string): boolean => {
  const scriptPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
  ];
  
  return scriptPatterns.some(pattern => pattern.test(input));
};

// 考试名称验证
export const validateExamName = (name: string): void => {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('考试名称不能为空', 'name');
  }
  
  if (name.length > 100) {
    throw new ValidationError('考试名称不能超过100个字符', 'name');
  }
  
  if (containsScript(name)) {
    throw new ValidationError('考试名称包含非法字符', 'name');
  }
};

// 文件验证
export const validateFile = (file: File, options: {
  maxSize?: number; // bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): void => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options;
  
  // 检查文件大小
  if (file.size > maxSize) {
    throw new ValidationError(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`, 'file');
  }
  
  // 检查文件类型
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new ValidationError(`不支持的文件类型: ${file.type}`, 'file');
  }
  
  // 检查文件扩展名
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new ValidationError(`不支持的文件扩展名: ${extension}`, 'file');
    }
  }
};

// 分数验证
export const validateScore = (score: number, maxScore: number): void => {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new ValidationError('分数必须是有效数字', 'score');
  }
  
  if (score < 0) {
    throw new ValidationError('分数不能为负数', 'score');
  }
  
  if (score > maxScore) {
    throw new ValidationError(`分数不能超过满分 ${maxScore}`, 'score');
  }
};

// 邮箱验证
export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim().length === 0) {
    throw new ValidationError('邮箱地址不能为空', 'email');
  }
  
  if (!emailRegex.test(email)) {
    throw new ValidationError('邮箱地址格式不正确', 'email');
  }
  
  if (containsScript(email)) {
    throw new ValidationError('邮箱地址包含非法字符', 'email');
  }
};

// 密码验证
export const validatePassword = (password: string): void => {
  if (!password || password.length === 0) {
    throw new ValidationError('密码不能为空', 'password');
  }
  
  if (password.length < 8) {
    throw new ValidationError('密码长度不能少于8位', 'password');
  }
  
  if (password.length > 128) {
    throw new ValidationError('密码长度不能超过128位', 'password');
  }
  
  // 检查密码强度
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strengthCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (strengthCount < 3) {
    throw new ValidationError('密码必须包含大写字母、小写字母、数字和特殊字符中的至少3种', 'password');
  }
};

// 通用表单验证
export const validateForm = (data: Record<string, any>, rules: Record<string, (value: any) => void>): void => {
  const errors: Record<string, string> = {};
  
  Object.entries(rules).forEach(([field, validator]) => {
    try {
      validator(data[field]);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors[field] = error.message;
      }
    }
  });
  
  if (Object.keys(errors).length > 0) {
    const error = new ValidationError('表单验证失败');
    (error as any).errors = errors;
    throw error;
  }
};