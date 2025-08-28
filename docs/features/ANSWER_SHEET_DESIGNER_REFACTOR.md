# 答题卡设计器重构方案

> 目标：在保证现有业务可用的前提下，将设计器拆分为可维护、可扩展、高性能的模块；同时完善测试与 CI/CD 流程，支撑后续 AI 识别与协同功能。以下方案分阶段推进，每阶段都可独立交付并回滚。

---

## 1. 现状梳理（T+0 ~ T+1 周）

1. **代码扫描**：使用 ESLint、TS-Check、DepCheck 生成依赖/循环引用报告；对渲染层（Konva/Fabric）与业务层耦合度做可视化分析（Madge）。
2. **性能基线**：使用 Chrome DevTools + Lighthouse 记录首次渲染、热点拖拽、批量生成等关键指标。
3. **痛点归纳**：
   - 组件与画布逻辑混杂，缺乏统一状态管理。
   - 模板 JSON 规范未固化，导致导出/导入冗余字段。
   - 渲染循环无节流，批量操作掉帧严重。
   - 测试缺失：仅少量单测，几乎无端到端 (E2E)。

> **交付**：现状评估报告 + 问题清单（优先级、影响面）。

---

## 2. 架构重构（T+2 ~ T+4 周）

| 模块 | 重构要点 | 选型 & 技术细节 |
| ---- | -------- | --------------- |
| 画布层 | 抽象 `CanvasProvider`，统一坐标系、缩放、吸附；引入虚拟化（Konva Layer diff） | `react-konva`, `zustand`, `throttle-debounce` |
| 组件层 | 以 **原子组件** 思想拆分；每个组件独立 props/Schema；支持插槽 | `TypeBox` Schema、动态渲染工厂 |
| 状态层 | 采用 `Zustand` + `immer`，集中处理撤销重做、批量更新 | Time-travel middleware |
| 模板层 | 制定 **JSON Schema v1**（题型、布局、打印标尺）；输出版本号 | `@sinclair/typebox`, `ajv` 校验 |
| 渲染导出 | 独立 `exportService`，SVG➡️PDF 双通道；Worker 线程异步导出 | `svg2pdf.js`, `pdf-lib`, Web Worker |
| 插件化 | 预留插件注册 API（如 AI 标定、协同光标） | 事件总线 & 依赖注入容器 |

> **交付**：重构后核心包 `@zhiyue/answer-sheet-designer` + Storybook DEMO。

---

## 3. 质量保障（并行）

1. **测试矩阵**
   - 单元：Vitest 覆盖组件 & 状态逻辑 ≥ 80%。
   - 端到端：Playwright 模拟拖拽、缩放、批量导出。
2. **CI/CD**
   - GitHub Actions：lint → test → build → Chromatic 视觉回归。
   - 发布 npm 内部包，Tag + Release Notes 自动生成。
3. **性能回归**：每次合并自动跑 Lighthouse CI，对关键指标设阈值报警。

---

## 4. 增量功能（T+5 ~ T+6 周）

| Feature | 描述 | 依赖 | 备注 |
| ------- | ---- | ---- | ---- |
| AI 标注辅助 | 解析题干自动生成组件草稿 | Gemini OCR | 需后端接口 |
| 模板协作 | 基于 Yjs 实时协同 | WebSocket | 与权限模块联动 |
| 国际化 | i18n-json 驱动 | react-i18next | 多语言出口 |

---

## 5. 里程碑 & 时间线

1. **M1（第 1 周）**：现状报告 & Schema 草稿。
2. **M2（第 3 周）**：核心画布 + 组件库 MVP，可导出 SVG。
3. **M3（第 5 周）**：PDF 高精度导出 + Undo/Redo + 单元测试覆盖。
4. **M4（第 6 周）**：E2E 全通过，发布 v1.0 内测。

---

## 6. 风险与缓解

- **渲染性能不达标**：早期接入 Profiling，并在批量操作中使用 `requestIdleCallback`／Worker。  
- **版本兼容**：Schema 加版本号，提供迁移脚本。  
- **依赖膨胀**：持续监控 bundle size，采用动态 import。

---

## 7. 下一步

1. 确认方案优先级与人力排期，输出详细任务拆分（Story/Issue）。
2. 创建 `@zhiyue/answer-sheet-schema` 与 `@zhiyue/answer-sheet-designer` 两个包的目录骨架。

如有补充需求或对时间线有调整，欢迎讨论。

---

## 8. 功能映射与 UI 优化补充

### 功能模块映射
- **定位功能**  
  - 条形码区域识别 → 数据解析与识别 / 条形码检测子模块  
  - 客观题答题区域划分 → 模板定义与编辑 / 组件层  
  - 主观题作答区域标注 → 模板定义与编辑 / 组件层  

- **切分功能**  
  - 材料题智能分割 → 数据解析与识别 / 文本结构化子模块  

- **识别功能**  
  - 高精度 OCR 手写答案识别 → 数据解析与识别 / OCR 引擎整合（Gemini OCR）

### 前端 UI 优化
1. 直观可视化布局：所见即所得画布，实时展示分区。  
2. 拖拽式模板编辑：支持吸附/对齐线并可配合快捷键。  
3. 实时预览与识别模拟：抽象 `PreviewPanel`，展示导出效果及 OCR 命中率提示。  
4. 多级操作指引：增加 Onboarding 流程与文档直达链接。  
5. 性能与流畅度：引入虚拟化渲染、Batch 更新与 GPU 加速。