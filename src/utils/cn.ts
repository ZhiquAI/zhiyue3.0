// 类名合并工具
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并和优化 Tailwind CSS 类名
 * @param inputs - 类名输入
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 响应式类名生成器
 * @param base - 基础类名
 * @param responsive - 响应式类名映射
 * @returns 合并后的响应式类名
 */
export function responsive(base: string, responsive: Record<string, string>) {
  const classes = [base];
  
  Object.entries(responsive).forEach(([breakpoint, className]) => {
    classes.push(`${breakpoint}:${className}`);
  });
  
  return cn(...classes);
}

/**
 * 条件类名生成器
 * @param condition - 条件
 * @param trueClass - 条件为真时的类名
 * @param falseClass - 条件为假时的类名
 * @returns 条件类名
 */
export function conditional(condition: boolean, trueClass: string, falseClass?: string) {
  return condition ? trueClass : (falseClass || '');
}

/**
 * 变体类名生成器
 * @param variant - 变体名称
 * @param variants - 变体映射
 * @param defaultVariant - 默认变体
 * @returns 变体类名
 */
export function variant<T extends string>(
  variant: T,
  variants: Record<T, string>,
  defaultVariant?: T
) {
  return variants[variant] || (defaultVariant ? variants[defaultVariant] : '');
}

/**
 * 尺寸类名生成器
 * @param size - 尺寸
 * @param sizes - 尺寸映射
 * @returns 尺寸类名
 */
export function size<T extends string>(
  size: T,
  sizes: Record<T, string>
) {
  return sizes[size] || '';
}