/**
 * 画布状态管理
 * 管理画布的交互状态、视图状态和工具状态
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CanvasState, ToolMode } from '../types/schema';

interface CanvasStoreState extends CanvasState {
  // 视图状态
  viewport: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  
  // 交互状态
  mousePosition: { x: number; y: number };
  worldMousePosition: { x: number; y: number };
  
  // 网格和辅助线
  gridVisible: boolean;
  snapToGrid: boolean;
  gridSize: number;
  guidesVisible: boolean;
  guides: Array<{ type: 'horizontal' | 'vertical'; position: number; id: string }>;
  
  // 选择框
  selectionBox?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
  
  // Actions
  actions: {
    // 工具操作
    setToolMode: (mode: ToolMode) => void;
    togglePreviewMode: () => void;
    
    // 视图操作
    setScale: (scale: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    zoomToFit: () => void;
    zoomToSelection: () => void;
    resetView: () => void;
    
    // 位置操作
    setPosition: (position: { x: number; y: number }) => void;
    panBy: (deltaX: number, deltaY: number) => void;
    centerView: () => void;
    
    // 选择操作
    setSelectedRegions: (ids: string[]) => void;
    addToSelection: (id: string) => void;
    removeFromSelection: (id: string) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    selectAll: () => void;
    
    // 鼠标和交互
    setMousePosition: (position: { x: number; y: number }) => void;
    updateWorldMousePosition: () => void;
    setDragging: (isDragging: boolean) => void;
    setDrawing: (isDrawing: boolean, start?: { x: number; y: number }) => void;
    
    // 选择框
    startSelectionBox: (position: { x: number; y: number }) => void;
    updateSelectionBox: (position: { x: number; y: number }) => void;
    endSelectionBox: () => void;
    
    // 网格和辅助线
    toggleGrid: () => void;
    setGridSize: (size: number) => void;
    toggleSnapToGrid: () => void;
    toggleGuides: () => void;
    addGuide: (type: 'horizontal' | 'vertical', position: number) => void;
    removeGuide: (id: string) => void;
    clearGuides: () => void;
    
    // 视口
    updateViewport: (width: number, height: number) => void;
    
    // 坐标转换
    screenToWorld: (screenPos: { x: number; y: number }) => { x: number; y: number };
    worldToScreen: (worldPos: { x: number; y: number }) => { x: number; y: number };
  };
}

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_FACTOR = 1.2;

export const useCanvasStore = create<CanvasStoreState>()(
  immer((set, get) => ({
    // 初始画布状态
    scale: DEFAULT_SCALE,
    position: { x: 0, y: 0 },
    selectedRegionIds: [],
    isDragging: false,
    isDrawing: false,
    drawingStart: undefined,
    toolMode: ToolMode.SELECT,
    previewMode: false,
    
    // 视口状态
    viewport: {
      width: 800,
      height: 600,
      centerX: 400,
      centerY: 300
    },
    
    // 鼠标状态
    mousePosition: { x: 0, y: 0 },
    worldMousePosition: { x: 0, y: 0 },
    
    // 网格和辅助线
    gridVisible: true,
    snapToGrid: true,
    gridSize: 10,
    guidesVisible: true,
    guides: [],
    
    actions: {
      // 设置工具模式
      setToolMode: (mode: ToolMode) => {
        set((state) => {
          state.toolMode = mode;
          // 切换工具时清除选择和绘制状态
          if (mode !== ToolMode.SELECT) {
            state.selectedRegionIds = [];
          }
          state.isDrawing = false;
          state.drawingStart = undefined;
        });
      },
      
      // 切换预览模式
      togglePreviewMode: () => {
        set((state) => {
          state.previewMode = !state.previewMode;
          if (state.previewMode) {
            // 进入预览模式时清除选择
            state.selectedRegionIds = [];
            state.toolMode = ToolMode.SELECT;
          }
        });
      },
      
      // 设置缩放
      setScale: (scale: number) => {
        set((state) => {
          state.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
        });
      },
      
      // 放大
      zoomIn: () => {
        const state = get();
        state.actions.setScale(state.scale * ZOOM_FACTOR);
      },
      
      // 缩小
      zoomOut: () => {
        const state = get();
        state.actions.setScale(state.scale / ZOOM_FACTOR);
      },
      
      // 缩放到适合
      zoomToFit: () => {
        set((state) => {
          // 这里需要模板数据来计算适合的缩放比例
          // 暂时设置为默认值
          state.scale = 1;
          state.position = { x: 0, y: 0 };
        });
      },
      
      // 缩放到选择
      zoomToSelection: () => {
        const state = get();
        if (state.selectedRegionIds.length === 0) return;
        
        // 这里需要从模板存储获取选中区域的边界
        // 然后计算合适的缩放和位置
        // 暂时保持现状
      },
      
      // 重置视图
      resetView: () => {
        set((state) => {
          state.scale = DEFAULT_SCALE;
          state.position = { x: 0, y: 0 };
        });
      },
      
      // 设置位置
      setPosition: (position: { x: number; y: number }) => {
        set((state) => {
          state.position = { ...position };
        });
      },
      
      // 平移
      panBy: (deltaX: number, deltaY: number) => {
        set((state) => {
          state.position.x += deltaX;
          state.position.y += deltaY;
        });
      },
      
      // 居中视图
      centerView: () => {
        set((state) => {
          state.position = {
            x: state.viewport.centerX,
            y: state.viewport.centerY
          };
        });
      },
      
      // 设置选中区域
      setSelectedRegions: (ids: string[]) => {
        set((state) => {
          state.selectedRegionIds = [...ids];
        });
      },
      
      // 添加到选择
      addToSelection: (id: string) => {
        set((state) => {
          if (!state.selectedRegionIds.includes(id)) {
            state.selectedRegionIds.push(id);
          }
        });
      },
      
      // 从选择中移除
      removeFromSelection: (id: string) => {
        set((state) => {
          state.selectedRegionIds = state.selectedRegionIds.filter(regionId => regionId !== id);
        });
      },
      
      // 切换选择
      toggleSelection: (id: string) => {
        const state = get();
        if (state.selectedRegionIds.includes(id)) {
          state.actions.removeFromSelection(id);
        } else {
          state.actions.addToSelection(id);
        }
      },
      
      // 清除选择
      clearSelection: () => {
        set((state) => {
          state.selectedRegionIds = [];
        });
      },
      
      // 选择全部
      selectAll: () => {
        // 这里需要从模板存储获取所有区域ID
        // 暂时保持空实现
        set((state) => {
          // state.selectedRegionIds = allRegionIds;
        });
      },
      
      // 设置鼠标位置
      setMousePosition: (position: { x: number; y: number }) => {
        set((state) => {
          state.mousePosition = { ...position };
        });
        // 自动更新世界坐标
        get().actions.updateWorldMousePosition();
      },
      
      // 更新世界鼠标位置
      updateWorldMousePosition: () => {
        const state = get();
        const worldPos = state.actions.screenToWorld(state.mousePosition);
        set((draft) => {
          draft.worldMousePosition = worldPos;
        });
      },
      
      // 设置拖拽状态
      setDragging: (isDragging: boolean) => {
        set((state) => {
          state.isDragging = isDragging;
        });
      },
      
      // 设置绘制状态
      setDrawing: (isDrawing: boolean, start?: { x: number; y: number }) => {
        set((state) => {
          state.isDrawing = isDrawing;
          state.drawingStart = start;
        });
      },
      
      // 开始选择框
      startSelectionBox: (position: { x: number; y: number }) => {
        set((state) => {
          const worldPos = state.actions.screenToWorld(position);
          state.selectionBox = {
            startX: worldPos.x,
            startY: worldPos.y,
            endX: worldPos.x,
            endY: worldPos.y
          };
        });
      },
      
      // 更新选择框
      updateSelectionBox: (position: { x: number; y: number }) => {
        set((state) => {
          if (state.selectionBox) {
            const worldPos = state.actions.screenToWorld(position);
            state.selectionBox.endX = worldPos.x;
            state.selectionBox.endY = worldPos.y;
          }
        });
      },
      
      // 结束选择框
      endSelectionBox: () => {
        const state = get();
        if (state.selectionBox) {
          // 这里应该根据选择框选择区域
          // 需要与模板存储协调
        }
        set((draft) => {
          draft.selectionBox = undefined;
        });
      },
      
      // 切换网格
      toggleGrid: () => {
        set((state) => {
          state.gridVisible = !state.gridVisible;
        });
      },
      
      // 设置网格大小
      setGridSize: (size: number) => {
        set((state) => {
          state.gridSize = Math.max(1, size);
        });
      },
      
      // 切换网格吸附
      toggleSnapToGrid: () => {
        set((state) => {
          state.snapToGrid = !state.snapToGrid;
        });
      },
      
      // 切换辅助线
      toggleGuides: () => {
        set((state) => {
          state.guidesVisible = !state.guidesVisible;
        });
      },
      
      // 添加辅助线
      addGuide: (type: 'horizontal' | 'vertical', position: number) => {
        set((state) => {
          const id = `guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          state.guides.push({ type, position, id });
        });
      },
      
      // 移除辅助线
      removeGuide: (id: string) => {
        set((state) => {
          state.guides = state.guides.filter(guide => guide.id !== id);
        });
      },
      
      // 清除所有辅助线
      clearGuides: () => {
        set((state) => {
          state.guides = [];
        });
      },
      
      // 更新视口
      updateViewport: (width: number, height: number) => {
        set((state) => {
          state.viewport.width = width;
          state.viewport.height = height;
          state.viewport.centerX = width / 2;
          state.viewport.centerY = height / 2;
        });
      },
      
      // 屏幕坐标转世界坐标
      screenToWorld: (screenPos: { x: number; y: number }): { x: number; y: number } => {
        const state = get();
        return {
          x: (screenPos.x - state.position.x) / state.scale,
          y: (screenPos.y - state.position.y) / state.scale
        };
      },
      
      // 世界坐标转屏幕坐标
      worldToScreen: (worldPos: { x: number; y: number }): { x: number; y: number } => {
        const state = get();
        return {
          x: worldPos.x * state.scale + state.position.x,
          y: worldPos.y * state.scale + state.position.y
        };
      }
    }
  }))
);

// 选择器
export const useCanvasState = () => useCanvasStore(state => ({
  scale: state.scale,
  position: state.position,
  selectedRegionIds: state.selectedRegionIds,
  isDragging: state.isDragging,
  isDrawing: state.isDrawing,
  drawingStart: state.drawingStart,
  toolMode: state.toolMode,
  previewMode: state.previewMode
}));

export const useCanvasActions = () => useCanvasStore(state => state.actions);
export const useCanvasSelection = () => useCanvasStore(state => state.selectedRegionIds);
export const useCanvasToolMode = () => useCanvasStore(state => state.toolMode);
export const useCanvasScale = () => useCanvasStore(state => state.scale);
export const useCanvasGrid = () => useCanvasStore(state => ({
  gridVisible: state.gridVisible,
  gridSize: state.gridSize,
  snapToGrid: state.snapToGrid
}));