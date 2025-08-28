# 智阅3.0设计系统

## 概述

智阅3.0设计系统是一个统一的、可扩展的设计语言，为智阅阅卷系统提供一致的用户体验。设计系统基于现代化的设计原则，整合了颜色、字体、间距、组件等设计元素，确保产品的一致性和可维护性。

## 核心理念

- **一致性**: 统一的设计语言确保整个应用的视觉和交互一致性
- **可访问性**: 遵循WCAG 2.1 AA标准，确保所有用户都能正常使用
- **可扩展性**: 模块化的设计支持功能扩展和主题定制
- **开发友好**: 提供完整的工具类和组件，提高开发效率

## 目录结构

```
src/design-system/
├── tokens.ts           # 设计令牌 (颜色、字体、间距等)
├── theme.ts            # Ant Design主题配置
├── utils.ts            # 工具函数和样式组合
├── components.ts       # 组件样式预设
├── index.ts            # 主入口文件
└── README.md           # 使用文档
```

## 快速开始

### 1. 导入设计系统

```tsx
import { cn, variants, layout, designTokens } from '@/design-system';
```

### 2. 使用设计令牌

```tsx
// 使用颜色
<div style={{ backgroundColor: designTokens.colors.primary[500] }}>
  主色背景
</div>

// 使用CSS变量 (推荐)
<div className="bg-primary-500 text-white">
  主色背景
</div>
```

### 3. 使用工具类

```tsx
// 按钮样式
<button className={cn(buttonStyles.base, buttonStyles.variants.primary, buttonStyles.sizes.md)}>
  按钮
</button>

// 布局工具
<div className={layout.flex.between()}>
  <span>左侧</span>
  <span>右侧</span>
</div>
```

## 设计令牌

### 颜色系统

设计系统提供了完整的颜色体系：

- **主色调 (Primary)**: `primary-{50-900}` - 智慧蓝色系
- **成功色 (Success)**: `success-{50-900}` - 绿色系  
- **警告色 (Warning)**: `warning-{50-900}` - 琥珀黄色系
- **错误色 (Error)**: `error-{50-900}` - 红色系
- **信息色 (Info)**: `education-{50-900}` - 教育蓝色系
- **中性色 (Neutral)**: `neutral-{0,50-900}` - 灰色系

```tsx
// 使用示例
<div className="bg-primary-500 text-white">主色背景</div>
<div className="text-success-600">成功文本</div>
<div className="border-error-300">错误边框</div>
```

### 字体系统

- **无衬线字体**: Inter, 微软雅黑等
- **等宽字体**: Fira Code, JetBrains Mono等
- **字体大小**: `text-{xs,sm,base,lg,xl,2xl,3xl,4xl,5xl,6xl}`

```tsx
<h1 className="text-3xl font-bold">标题</h1>
<p className="text-base font-normal">正文</p>
<code className="font-mono text-sm">代码</code>
```

### 间距系统

基于4px网格的间距系统：

```tsx
<div className="p-4 m-8">内边距16px，外边距32px</div>
<div className="space-y-6">子元素垂直间距24px</div>
```

### 圆角系统

```tsx
<div className="rounded-md">中等圆角</div>
<div className="rounded-xl">大圆角</div>
<div className="rounded-full">完全圆角</div>
```

### 阴影系统

```tsx
<div className="shadow-soft">柔和阴影</div>
<div className="shadow-medium">中等阴影</div>
<div className="shadow-strong">强阴影</div>
```

## 组件样式

### 按钮组件

```tsx
import { buttonStyles, cn } from '@/design-system';

// 基础用法
<button className={cn(
  buttonStyles.base,
  buttonStyles.variants.primary,
  buttonStyles.sizes.md
)}>
  按钮
</button>

// 可用变体
variants: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
sizes: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
```

### 卡片组件

```tsx
import { cardStyles, cn } from '@/design-system';

<div className={cn(
  cardStyles.base,
  cardStyles.variants.elevated,
  cardStyles.sizes.md
)}>
  卡片内容
</div>

// 可用变体
variants: 'default' | 'elevated' | 'flat' | 'outline' | 'interactive'
sizes: 'sm' | 'md' | 'lg' | 'xl'
```

### 输入框组件

```tsx
import { inputStyles, cn } from '@/design-system';

<input className={cn(
  inputStyles.base,
  inputStyles.variants.default,
  inputStyles.sizes.md
)} />

// 可用变体
variants: 'default' | 'error' | 'success'
sizes: 'sm' | 'md' | 'lg'
```

## 工具函数

### 类名组合 (cn)

```tsx
import { cn } from '@/design-system';

// 合并类名，自动处理冲突
const className = cn(
  'bg-white p-4',
  'hover:bg-gray-50',
  isActive && 'bg-blue-50',
  customClassName
);
```

### 响应式工具

```tsx
import { responsive } from '@/design-system';

// 响应式类名
const classes = responsive.classes('text-sm', {
  sm: 'text-base',
  lg: 'text-lg'
});

// 响应式间距
const spacing = responsive.spacing({
  base: 4,
  sm: 6,
  lg: 8
});
```

### 状态样式

```tsx
import { states } from '@/design-system';

// 交互状态
const interactive = states.interactive(
  'bg-white',           // 基础样式
  'bg-gray-50',         // hover
  'bg-gray-100',        // active
  'ring-2 ring-blue-500' // focus
);
```

### 布局工具

```tsx
import { layout } from '@/design-system';

// Flex布局
<div className={layout.flex.between()}>左右布局</div>
<div className={layout.flex.center()}>居中布局</div>

// Grid布局
<div className={layout.grid.responsive(1, 2, 4)}>响应式网格</div>

// 容器
<div className={layout.container.default()}>默认容器</div>
```

### 动画工具

```tsx
import { animations } from '@/design-system';

// 预定义动画
<div className={animations.fadeIn()}>淡入动画</div>
<div className={animations.slideIn('up')}>滑入动画</div>

// 过渡效果
<div className={animations.transition(['all'], 'normal', 'easeOut')}>
  平滑过渡
</div>
```

## 主题配置

### Ant Design集成

设计系统提供了完整的Ant Design主题配置：

```tsx
import { ConfigProvider } from 'antd';
import { antdTheme } from '@/design-system';

<ConfigProvider theme={antdTheme}>
  <App />
</ConfigProvider>
```

### 暗色主题

```tsx
import { darkTheme } from '@/design-system';

// 在需要暗色主题的地方使用
<ConfigProvider theme={darkTheme}>
  <DarkModeComponent />
</ConfigProvider>
```

### CSS变量

设计系统导出CSS变量供直接使用：

```css
.custom-component {
  background-color: var(--color-primary-500);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-md);
  box-shadow: var(--box-shadow-soft);
}
```

## 最佳实践

### 1. 优先使用设计令牌

```tsx
// ✅ 推荐
<div className="bg-primary-500 text-white">

// ❌ 不推荐
<div style={{ backgroundColor: '#3b82f6', color: 'white' }}>
```

### 2. 使用语义化的组件变体

```tsx
// ✅ 推荐
<button className={cn(buttonStyles.base, buttonStyles.variants.primary)}>

// ❌ 不推荐
<button className="bg-blue-500 text-white px-4 py-2 rounded">
```

### 3. 保持一致的间距

```tsx
// ✅ 推荐 - 使用设计系统间距
<div className="space-y-6">
  <div className="p-4">内容1</div>
  <div className="p-4">内容2</div>
</div>

// ❌ 不推荐 - 随意间距
<div>
  <div style={{ padding: '15px', marginBottom: '23px' }}>内容1</div>
  <div style={{ padding: '18px' }}>内容2</div>
</div>
```

### 4. 响应式设计

```tsx
// ✅ 推荐 - 使用响应式工具
<div className={layout.container.default()}>
  <div className={layout.grid.responsive(1, 2, 4)}>
    {items.map(item => (
      <div key={item.id} className="responsive-card">
        {item.content}
      </div>
    ))}
  </div>
</div>
```

### 5. 无障碍性考虑

```tsx
// ✅ 推荐 - 包含无障碍属性
<button 
  className={cn(buttonStyles.base, buttonStyles.variants.primary)}
  aria-label="保存文档"
  disabled={isLoading}
>
  {isLoading ? '保存中...' : '保存'}
</button>
```

## 定制化

### 扩展颜色

```typescript
// 在tokens.ts中添加自定义颜色
export const colors = {
  // 现有颜色...
  brand: {
    50: '#f0f9ff',
    500: '#0ea5e9',
    900: '#0c4a6e'
  }
};
```

### 添加组件变体

```typescript
// 在components.ts中添加新变体
export const buttonStyles = {
  variants: {
    // 现有变体...
    gradient: cn(
      'bg-gradient-to-r from-blue-500 to-purple-600',
      'text-white hover:from-blue-600 hover:to-purple-700'
    )
  }
};
```

### 自定义工具类

```typescript
// 在utils.ts中添加新工具
export const customUtils = {
  glassmorphism: () => cn(
    'bg-white bg-opacity-10 backdrop-blur-lg',
    'border border-white border-opacity-20'
  )
};
```

## 迁移指南

从旧样式系统迁移到新设计系统：

### 1. 替换颜色类名

```tsx
// 旧的
<div className="bg-blue-500"> 

// 新的  
<div className="bg-primary-500">
```

### 2. 使用组件样式预设

```tsx
// 旧的
<button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">

// 新的
<button className={cn(buttonStyles.base, buttonStyles.variants.primary, buttonStyles.sizes.md)}>
```

### 3. 统一间距系统

```tsx
// 旧的
<div className="p-5 m-3">

// 新的
<div className="p-6 m-4">  // 使用4px倍数
```

## 常见问题

### Q: 如何自定义Ant Design组件样式？

A: 使用CSS变量和主题配置：

```tsx
// 方法1: 主题配置
<ConfigProvider theme={{
  ...antdTheme,
  components: {
    Button: {
      colorPrimary: designTokens.colors.primary[600]
    }
  }
}}>

// 方法2: CSS变量
.ant-btn-primary {
  background-color: var(--color-primary-600);
}
```

### Q: 如何处理组件样式优先级？

A: 使用`cn`函数正确合并类名：

```tsx
// cn函数会自动处理Tailwind类名冲突
const className = cn(
  'bg-white',        // 基础样式
  'hover:bg-gray-50', // 状态样式  
  isActive && 'bg-blue-50', // 条件样式
  customClass        // 自定义样式 (优先级最高)
);
```

### Q: 如何确保暗色模式兼容？

A: 使用语义化的颜色令牌：

```tsx
// ✅ 推荐 - 自动适配暗色模式
<div className="bg-neutral-0 text-neutral-900">

// ❌ 避免 - 硬编码颜色
<div className="bg-white text-black">
```

## 贡献指南

1. 遵循现有的设计原则和命名规范
2. 所有新增组件必须包含无障碍属性
3. 提供完整的类型定义和文档
4. 确保与现有系统的兼容性
5. 添加相应的测试用例

## 版本历史

- **v1.0.0** - 初始版本，包含基础设计令牌和组件样式
- 后续版本将根据项目需求持续迭代更新

---

更多详细信息和示例，请查看项目中的 `DesignSystemShowcase` 组件。