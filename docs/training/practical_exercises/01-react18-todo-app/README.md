# React 18 + TypeScript Todo应用实战练习

## 项目概述

这是智阅3.0团队重构技术培训的第一个实战练习，旨在帮助开发者掌握React 18新特性、TypeScript类型系统以及现代前端工程化配置。

## 学习目标

- 🎯 掌握React 18的Concurrent Features
- 🎯 理解TypeScript接口定义与泛型应用  
- 🎯 学习自定义Hook封装技巧
- 🎯 掌握Context API状态管理
- 🎯 应用useTransition性能优化
- 🎯 配置现代前端开发环境

## 技术栈

- **前端框架**: React 18.2+
- **开发语言**: TypeScript 5.0+
- **构建工具**: Vite 4.0+
- **UI组件库**: Ant Design 5.0+
- **状态管理**: React Context + useReducer
- **数据持久化**: localStorage
- **样式方案**: CSS Modules + Tailwind CSS
- **开发工具**: ESLint + Prettier + Husky

## 功能需求

### 核心功能

#### 1. 任务管理(CRUD)
- ✅ 添加新任务
- ✅ 编辑任务标题
- ✅ 删除任务
- ✅ 标记任务完成/未完成

#### 2. 任务分类与筛选
- ✅ 设置任务优先级(高/中/低)
- ✅ 添加任务标签
- ✅ 按状态筛选(全部/进行中/已完成)
- ✅ 按优先级筛选
- ✅ 按标签筛选

#### 3. 增强功能
- ✅ 任务搜索功能
- ✅ 批量操作(全选/批量删除)
- ✅ 任务统计信息
- ✅ 数据导出功能
- ✅ 撤销操作功能

#### 4. 用户体验
- ✅ 响应式设计
- ✅ 暗色模式切换
- ✅ 键盘快捷键支持
- ✅ 拖拽排序
- ✅ 动画效果

## 项目结构

```
01-react18-todo-app/
├── public/
│   ├── vite.svg
│   └── index.html
├── src/
│   ├── components/           # 组件目录
│   │   ├── common/          # 通用组件
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Loading.tsx
│   │   ├── todo/            # Todo相关组件
│   │   │   ├── TodoList.tsx
│   │   │   ├── TodoItem.tsx
│   │   │   ├── TodoForm.tsx
│   │   │   ├── TodoFilter.tsx
│   │   │   └── TodoStats.tsx
│   │   └── layout/          # 布局组件
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── hooks/               # 自定义Hook
│   │   ├── useTodos.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useTheme.ts
│   │   └── useKeyboard.ts
│   ├── contexts/            # Context状态管理
│   │   ├── TodoContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── AppContext.tsx
│   ├── types/               # TypeScript类型定义
│   │   ├── todo.ts
│   │   ├── theme.ts
│   │   └── common.ts
│   ├── utils/               # 工具函数
│   │   ├── storage.ts
│   │   ├── date.ts
│   │   ├── export.ts
│   │   └── constants.ts
│   ├── styles/              # 样式文件
│   │   ├── globals.css
│   │   ├── components.css
│   │   └── animations.css
│   ├── App.tsx              # 根组件
│   ├── main.tsx            # 入口文件
│   └── vite-env.d.ts       # Vite类型声明
├── tests/                   # 测试文件
│   ├── components/
│   ├── hooks/
│   └── utils/
├── .eslintrc.js            # ESLint配置
├── .prettierrc             # Prettier配置
├── tailwind.config.js      # Tailwind配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite配置
└── package.json            # 项目依赖
```

## 实现步骤

### 第一阶段：项目搭建 (30分钟)

#### 1. 初始化项目
```bash
# 使用Vite创建React + TypeScript项目
npm create vite@latest todo-app -- --template react-ts
cd todo-app
npm install
```

#### 2. 安装依赖
```bash
# UI组件库
npm install antd

# 工具库
npm install clsx classnames lodash
npm install -D @types/lodash

# 开发工具
npm install -D eslint prettier husky lint-staged
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D tailwindcss postcss autoprefixer

# 测试工具
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

#### 3. 配置开发环境
创建并配置以下文件：
- `.eslintrc.js` - ESLint代码检查
- `.prettierrc` - 代码格式化
- `tailwind.config.js` - Tailwind CSS
- `tsconfig.json` - TypeScript配置
- `vite.config.ts` - Vite构建配置

### 第二阶段：类型定义 (20分钟)

#### 创建核心类型定义
```typescript
// src/types/todo.ts
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface TodoFilter {
  status: 'all' | 'active' | 'completed';
  priority?: Priority;
  tags: string[];
  search: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
  byPriority: Record<Priority, number>;
}
```

### 第三阶段：状态管理 (40分钟)

#### 1. 创建TodoContext
```typescript
// src/contexts/TodoContext.tsx
interface TodoContextType {
  todos: Todo[];
  filter: TodoFilter;
  stats: TodoStats;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  setFilter: (filter: Partial<TodoFilter>) => void;
  clearCompleted: () => void;
  exportTodos: () => void;
}
```

#### 2. 实现useReducer状态逻辑
```typescript
// 使用useReducer管理复杂状态
const todoReducer = (state: TodoState, action: TodoAction): TodoState => {
  switch (action.type) {
    case 'ADD_TODO':
      // 添加任务逻辑
    case 'UPDATE_TODO':
      // 更新任务逻辑
    case 'DELETE_TODO':
      // 删除任务逻辑
    // ...其他action处理
    default:
      return state;
  }
};
```

### 第四阶段：自定义Hook (30分钟)

#### 1. useTodos Hook
```typescript
// src/hooks/useTodos.ts
export const useTodos = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within TodoProvider');
  }
  return context;
};
```

#### 2. useLocalStorage Hook
```typescript
// src/hooks/useLocalStorage.ts
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
};
```

### 第五阶段：组件开发 (60分钟)

#### 1. TodoForm组件 (新增/编辑)
```typescript
// src/components/todo/TodoForm.tsx
interface TodoFormProps {
  onSubmit: (todo: Partial<Todo>) => void;
  initialValues?: Partial<Todo>;
  isEdit?: boolean;
}

export const TodoForm: React.FC<TodoFormProps> = ({ 
  onSubmit, 
  initialValues, 
  isEdit = false 
}) => {
  // 表单逻辑实现
  // 使用useTransition优化用户体验
  const [isPending, startTransition] = useTransition();
  
  const handleSubmit = useCallback((values: Todo) => {
    startTransition(() => {
      onSubmit(values);
    });
  }, [onSubmit]);

  return (
    <Form onFinish={handleSubmit}>
      {/* 表单字段 */}
    </Form>
  );
};
```

#### 2. TodoList组件 (列表展示)
```typescript
// src/components/todo/TodoList.tsx
export const TodoList: React.FC = () => {
  const { todos, filter } = useTodos();
  
  // 使用useMemo优化筛选性能
  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      // 筛选逻辑
    });
  }, [todos, filter]);

  return (
    <List
      dataSource={filteredTodos}
      renderItem={(todo) => (
        <TodoItem key={todo.id} todo={todo} />
      )}
    />
  );
};
```

#### 3. TodoItem组件 (单个任务)
```typescript
// src/components/todo/TodoItem.tsx
interface TodoItemProps {
  todo: Todo;
}

export const TodoItem: React.FC<TodoItemProps> = ({ todo }) => {
  const { updateTodo, deleteTodo } = useTodos();
  
  // 使用useCallback优化渲染性能
  const handleToggle = useCallback(() => {
    updateTodo(todo.id, { completed: !todo.completed });
  }, [todo.id, todo.completed, updateTodo]);

  return (
    <List.Item
      actions={[
        <Button onClick={handleToggle}>
          {todo.completed ? '取消完成' : '标记完成'}
        </Button>
      ]}
    >
      {/* 任务内容 */}
    </List.Item>
  );
};
```

### 第六阶段：性能优化 (30分钟)

#### 1. 使用React.memo优化渲染
```typescript
export const TodoItem = React.memo<TodoItemProps>(({ todo }) => {
  // 组件实现
});
```

#### 2. 使用useTransition优化用户体验
```typescript
const [isPending, startTransition] = useTransition();

const handleAddTodo = (todo: Todo) => {
  startTransition(() => {
    addTodo(todo);
  });
};
```

#### 3. 使用useDeferredValue优化搜索
```typescript
const [searchQuery, setSearchQuery] = useState('');
const deferredSearchQuery = useDeferredValue(searchQuery);
```

### 第七阶段：测试编写 (40分钟)

#### 1. 组件测试
```typescript
// tests/components/TodoItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoItem } from '../src/components/todo/TodoItem';

describe('TodoItem', () => {
  it('should toggle todo completion when clicked', () => {
    // 测试实现
  });
  
  it('should delete todo when delete button clicked', () => {
    // 测试实现  
  });
});
```

#### 2. Hook测试
```typescript
// tests/hooks/useTodos.test.ts
import { renderHook, act } from '@testing-library/react';
import { useTodos } from '../src/hooks/useTodos';

describe('useTodos', () => {
  it('should add todo correctly', () => {
    // Hook测试实现
  });
});
```

## React 18新特性应用

### 1. Concurrent Features
- ✅ 使用`useTransition`优化状态更新
- ✅ 使用`useDeferredValue`优化搜索体验
- ✅ 启用`Concurrent Mode`提升用户体验

### 2. Automatic Batching
- ✅ 利用自动批处理减少渲染次数
- ✅ 在异步操作中也能自动批处理

### 3. Suspense增强
- ✅ 使用`Suspense`包装异步组件
- ✅ 实现渐进式加载体验

### 4. Strict Mode
- ✅ 启用严格模式检测潜在问题
- ✅ 双重渲染检测副作用

## TypeScript高级特性应用

### 1. 接口与类型定义
```typescript
// 使用泛型约束
interface Repository<T extends { id: string }> {
  findById(id: string): T | undefined;
  save(entity: T): void;
  delete(id: string): void;
}

// 使用条件类型
type ApiResponse<T> = T extends string 
  ? { message: T } 
  : { data: T };
```

### 2. 高级类型工具
```typescript
// 使用Pick和Omit
type CreateTodoDto = Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>;
type TodoSummary = Pick<Todo, 'id' | 'title' | 'completed'>;

// 使用Record和keyof
type TodoActions = Record<keyof Todo, (value: any) => void>;
```

## 性能优化技巧

### 1. 渲染优化
- ✅ 使用`React.memo`防止不必要的渲染
- ✅ 使用`useMemo`缓存计算结果
- ✅ 使用`useCallback`稳定函数引用

### 2. 状态优化
- ✅ 合理拆分state，避免过度渲染
- ✅ 使用`useReducer`管理复杂状态
- ✅ 使用Context时注意value的稳定性

### 3. 包优化
- ✅ 使用动态导入进行代码分割
- ✅ 配置Tree Shaking移除无用代码
- ✅ 使用Bundle Analyzer分析包大小

## 提交要求

### 代码质量
- ✅ 通过ESLint检查(0 error, 0 warning)
- ✅ 通过TypeScript类型检查
- ✅ 代码格式符合Prettier规范
- ✅ 测试覆盖率 >= 80%

### Git提交
- ✅ 使用约定式提交格式
- ✅ 每个功能一个commit
- ✅ 提交信息清晰明确
- ✅ 不提交build文件和node_modules

### 文档要求
- ✅ README.md完整清晰
- ✅ 代码注释充分
- ✅ 组件Props有TypeScript类型
- ✅ 复杂逻辑有注释说明

## 评分标准

| 评分项 | 权重 | A级(90-100) | B级(80-89) | C级(70-79) |
|--------|------|-------------|-----------|-----------|
| 功能实现 | 40% | 所有功能完整实现 | 核心功能完整 | 基础功能实现 |
| 技术应用 | 30% | 深度应用新特性 | 正确使用技术栈 | 基本技术要求 |
| 代码质量 | 20% | 优秀的架构设计 | 良好的代码规范 | 基本代码规范 |
| 性能优化 | 10% | 全面的性能优化 | 关键点优化 | 基本优化措施 |

## 常见问题

### Q: useTransition什么时候使用？
A: 当状态更新可能导致界面卡顿时使用，比如大量数据的筛选、搜索等操作。

### Q: 如何避免Context导致的过度渲染？
A: 将Context的value用useMemo包装，确保引用稳定性；或者将Context拆分为多个更细粒度的Context。

### Q: TypeScript泛型如何设计？
A: 遵循单一职责原则，泛型参数命名要有意义，使用约束确保类型安全。

## 学习资源

- [React 18 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Ant Design Components](https://ant.design/components/overview/)
- [Vite Guide](https://vitejs.dev/guide/)

## 技术支持

如果在实现过程中遇到问题，可以通过以下方式获取帮助：

- 📧 发邮件到: tech-training@zhiyue-ai.com
- 💬 技术群: 智阅技术培训群
- 📚 查看参考实现: `/docs/training/solutions/01-react18-todo-app/`

---

**预计完成时间**: 4小时  
**难度级别**: ⭐⭐⭐  
**最后更新**: 2025-08-21