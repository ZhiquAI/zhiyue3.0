# 答题卡模板设计器 - 重构版

## 概述

基于重构方案实现的新一代答题卡模板设计器，采用模块化架构设计，具备高性能、可扩展、易维护的特点。

## 架构特点

### 🏗️ 模块化架构
- **Provider 层**: 画布交互逻辑抽象
- **Store 层**: 状态管理和数据持久化
- **Component 层**: 原子化组件设计
- **Utils 层**: 通用工具函数

### 📊 状态管理
- 使用 **Zustand + Immer** 实现高性能状态管理
- 支持撤销/重做功能（Time-travel）
- 集中的模板数据和画布状态管理

### 🎨 Canvas 系统
- 统一的坐标系和变换管理
- 高性能的事件处理和交互
- 支持缩放、平移、网格对齐等功能

### 📋 Schema 标准化
- JSON Schema v1.0 规范
- 强类型定义，支持 TypeScript
- 版本兼容性和迁移机制

## 功能特性

### 🖱️ 交互工具
- **选择工具**: 区域选择、多选、批量操作
- **绘制工具**: 定位点、条码区、客观题、主观题
- **视图工具**: 缩放、平移、网格显示
- **编辑工具**: 撤销、重做、复制、删除

### 🎯 区域类型
1. **定位点** (Anchor)
   - 支持圆形、方形、十字形状
   - 可配置精度等级
   
2. **条码区** (Barcode)
   - 支持 Code128、QR码、DataMatrix
   - 可设置方向和编码方式

3. **客观题** (Objective)
   - 灵活的题目布局配置
   - 多种气泡样式选择
   - 支持分值设置

4. **主观题** (Subjective)
   - 可配置答题线条
   - 支持边距和行距设置
   - 多种题型分类

### 💾 文件操作
- JSON 格式模板保存/加载
- 背景图片上传和管理
- 模板验证和错误提示
- 导出功能（开发中）

## 使用方法

### 基本用法

```tsx
import { AnswerSheetDesignerRefactored } from '@/components/AnswerSheetDesigner';

function App() {
  const handleTemplateChange = (template) => {
    console.log('模板已更新:', template);
  };

  const handleRegionSelect = (regionIds) => {
    console.log('选中区域:', regionIds);
  };

  return (
    <AnswerSheetDesignerRefactored
      onTemplateChange={handleTemplateChange}
      onRegionSelect={handleRegionSelect}
    />
  );
}
```

### 高级用法

```tsx
import { 
  AnswerSheetDesignerRefactored,
  useTemplateStore,
  useCanvasStore,
  createRegion,
  RegionType
} from '@/components/AnswerSheetDesigner';

function AdvancedApp() {
  // 使用状态管理 hooks
  const template = useTemplate();
  const templateActions = useTemplateActions();
  const canvasState = useCanvasState();

  // 编程式创建区域
  const createObjectiveRegion = () => {
    const region = createRegion(
      RegionType.OBJECTIVE,
      100, 100, 200, 150,
      '客观题区域1'
    );
    templateActions.addRegion(region);
  };

  return (
    <div>
      <button onClick={createObjectiveRegion}>
        添加客观题区域
      </button>
      <AnswerSheetDesignerRefactored />
    </div>
  );
}
```

## API 文档

### 主要 Props

```tsx
interface AnswerSheetDesignerRefactoredProps {
  initialTemplate?: TemplateData;          // 初始模板数据
  onTemplateChange?: (template: TemplateData) => void;  // 模板变化回调
  onRegionSelect?: (regionIds: string[]) => void;      // 区域选择回调
  width?: number;                          // 容器宽度
  height?: number;                         // 容器高度
}
```

### 状态管理 Hooks

```tsx
// 模板数据管理
const template = useTemplate();
const templateActions = useTemplateActions();
const history = useTemplateHistory();

// 画布状态管理
const canvasState = useCanvasState();
const canvasActions = useCanvasActions();
const selectedIds = useCanvasSelection();
```

### 工具函数

```tsx
import {
  createRegion,
  getRegionColor,
  snapToGrid,
  downloadFile,
  validateTemplate
} from '@/components/AnswerSheetDesigner';
```

## 模板数据结构

### TemplateData Schema v1.0

```json
{
  "id": "template_123",
  "name": "期末考试答题卡",
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "canvas": {
    "width": 794,
    "height": 1123,
    "dpi": 96,
    "unit": "px"
  },
  "regions": [
    {
      "id": "region_123",
      "type": "objective",
      "x": 100,
      "y": 200,
      "width": 400,
      "height": 300,
      "name": "客观题1-20",
      "properties": {
        "startQuestionNumber": 1,
        "questionCount": 20,
        "optionsPerQuestion": 4,
        "questionsPerRow": 4
      }
    }
  ]
}
```

## 性能优化

### 渲染优化
- 使用 `React.memo` 优化组件重渲染
- 节流的鼠标事件处理（60fps）
- Konva Layer 虚拟化渲染

### 状态优化
- Zustand 的选择器模式避免无效更新
- Immer 实现不可变状态更新
- 历史记录的智能压缩

### 交互优化
- 防抖的用户输入处理
- 异步的文件操作
- Web Worker 支持（规划中）

## 开发指南

### 目录结构

```
src/components/AnswerSheetDesigner/
├── index.ts                    # 入口文件
├── AnswerSheetDesignerRefactored.tsx  # 主组件
├── providers/
│   └── CanvasProvider.tsx      # 画布交互提供者
├── stores/
│   ├── templateStore.ts        # 模板状态管理
│   └── canvasStore.ts          # 画布状态管理
├── components/
│   ├── RegionRenderer.tsx      # 区域渲染器
│   ├── ToolbarComponent.tsx    # 工具栏组件
│   └── PropertiesPanel.tsx     # 属性面板
├── types/
│   └── schema.ts               # 类型定义和Schema
├── utils/
│   └── helpers.ts              # 工具函数
└── README.md                   # 本文档
```

### 添加新的区域类型

1. 在 `types/schema.ts` 中定义新的区域类型：

```tsx
export interface CustomRegion extends BaseRegion {
  type: RegionType.CUSTOM;
  properties: {
    customProperty: string;
    // 其他属性...
  };
}
```

2. 在 `RegionRenderer.tsx` 中添加渲染逻辑
3. 在 `PropertiesPanel.tsx` 中添加属性编辑器
4. 更新工具栏和相关工具函数

### 扩展功能

设计器支持插件化扩展，预留了以下扩展点：
- 自定义工具
- 自定义区域类型
- 自定义导出格式
- AI 辅助功能集成

## 测试

### 访问测试页面
开发环境下访问: `http://localhost:5174/designer-refactored`

### 功能测试清单
- [ ] 基本绘制功能
- [ ] 区域选择和编辑
- [ ] 撤销/重做功能
- [ ] 模板保存/加载
- [ ] 背景图片上传
- [ ] 属性面板操作
- [ ] 工具栏交互
- [ ] 响应式布局

## 版本历史

### v1.0.0 (当前版本)
- ✅ 完整的模块化重构
- ✅ Zustand + Immer 状态管理
- ✅ Canvas Provider 交互系统
- ✅ JSON Schema v1.0 标准化
- ✅ 原子化组件设计
- ✅ TypeScript 完整支持

### 规划功能
- 🔄 AI 标注辅助
- 🔄 实时协作功能
- 🔄 多格式导出
- 🔄 国际化支持
- 🔄 完整的测试覆盖

## 技术栈

- **React 18** + TypeScript
- **Zustand** + Immer (状态管理)
- **React-Konva** (Canvas 渲染)
- **Ant Design** (UI 组件)
- **Vite** (构建工具)

## 贡献指南

1. 遵循现有的代码风格和架构模式
2. 为新功能添加相应的 TypeScript 类型定义
3. 确保组件的可测试性和可复用性
4. 更新相关文档和示例代码

## 许可证

MIT License