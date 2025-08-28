/**
 * Canvas Provider - 统一画布交互逻辑
 * 提供坐标系、事件处理、工具交互等功能
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore, useCanvasActions } from '../stores/canvasStore';
import { useTemplate, useTemplateActions } from '../stores/templateStore';
import { ToolMode, RegionType } from '../types/schema';
import { createRegion, snapToGrid, throttle } from '../utils/helpers';

interface CanvasProviderProps {
  width: number;
  height: number;
  children: React.ReactNode;
  onRegionCreate?: (region: any) => void;
  onRegionSelect?: (regionIds: string[]) => void;
  onRegionUpdate?: (regionId: string, updates: any) => void;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({
  width,
  height,
  children,
  onRegionCreate,
  onRegionSelect,
  onRegionUpdate
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  
  // 状态和动作
  const canvasState = useCanvasStore();
  const canvasActions = useCanvasActions();
  const template = useTemplate();
  const templateActions = useTemplateActions();
  
  // 节流的鼠标移动处理
  const throttledMouseMove = useCallback(
    throttle((e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;
      
      canvasActions.setMousePosition(pointerPosition);
    }, 16), // 约60fps
    [canvasActions]
  );
  
  // 画布鼠标按下事件
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    const worldPos = canvasActions.screenToWorld(pointerPosition);
    
    // 如果是选择工具
    if (canvasState.toolMode === ToolMode.SELECT) {
      const clickedOnEmpty = e.target === stage;
      
      if (clickedOnEmpty) {
        // 开始选择框
        if (!e.evt.ctrlKey && !e.evt.metaKey) {
          canvasActions.clearSelection();
        }
        canvasActions.startSelectionBox(worldPos);
      }
      return;
    }
    
    // 如果是平移工具，交给 Konva 处理
    if (canvasState.toolMode === ToolMode.PAN) {
      return;
    }
    
    // 如果是绘制工具
    if ([ToolMode.ANCHOR, ToolMode.BARCODE, ToolMode.OBJECTIVE, ToolMode.SUBJECTIVE].includes(canvasState.toolMode)) {
      // 开始绘制
      canvasActions.setDrawing(true, worldPos);
    }
  }, [canvasState.toolMode, canvasActions]);
  
  // 画布鼠标移动事件
  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    throttledMouseMove(e);
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    const worldPos = canvasActions.screenToWorld(pointerPosition);
    
    // 更新选择框
    if (canvasState.selectionBox) {
      canvasActions.updateSelectionBox(worldPos);
    }
    
    // 实时显示绘制区域（可选）
    // 这里可以添加实时预览逻辑
  }, [throttledMouseMove, canvasActions, canvasState.selectionBox]);
  
  // 画布鼠标抬起事件
  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    const worldPos = canvasActions.screenToWorld(pointerPosition);
    
    // 结束选择框
    if (canvasState.selectionBox) {
      // 计算选择框覆盖的区域
      const box = canvasState.selectionBox;
      const minX = Math.min(box.startX, box.endX);
      const maxX = Math.max(box.startX, box.endX);
      const minY = Math.min(box.startY, box.endY);
      const maxY = Math.max(box.startY, box.endY);
      
      const selectedIds = template.regions
        .filter(region => {
          return (
            region.x < maxX &&
            region.x + region.width > minX &&
            region.y < maxY &&
            region.y + region.height > minY
          );
        })
        .map(region => region.id);
      
      canvasActions.setSelectedRegions(selectedIds);
      canvasActions.endSelectionBox();
      
      if (onRegionSelect) {
        onRegionSelect(selectedIds);
      }
      return;
    }
    
    // 处理绘制工具
    if (canvasState.isDrawing && canvasState.drawingStart) {
      const startPos = canvasState.drawingStart;
      const endPos = worldPos;
      
      const width = Math.abs(endPos.x - startPos.x);
      const height = Math.abs(endPos.y - startPos.y);
      
      // 最小尺寸检查
      if (width > 10 && height > 10) {
        const x = Math.min(startPos.x, endPos.x);
        const y = Math.min(startPos.y, endPos.y);
        
        // 网格对齐
        const finalX = snapToGrid(x, canvasState.gridSize, canvasState.snapToGrid);
        const finalY = snapToGrid(y, canvasState.gridSize, canvasState.snapToGrid);
        const finalWidth = snapToGrid(width, canvasState.gridSize, canvasState.snapToGrid);
        const finalHeight = snapToGrid(height, canvasState.gridSize, canvasState.snapToGrid);
        
        // 创建区域
        const regionType = toolModeToRegionType(canvasState.toolMode);
        if (regionType) {
          const newRegion = createRegion(regionType, finalX, finalY, finalWidth, finalHeight);
          templateActions.addRegion(newRegion);
          canvasActions.setSelectedRegions([newRegion.id]);
          
          if (onRegionCreate) {
            onRegionCreate(newRegion);
          }
        }
      }
      
      canvasActions.setDrawing(false);
      canvasActions.setToolMode(ToolMode.SELECT);
    }
  }, [
    canvasState.selectionBox,
    canvasState.isDrawing,
    canvasState.drawingStart,
    canvasState.toolMode,
    canvasState.gridSize,
    canvasState.snapToGrid,
    canvasActions,
    template.regions,
    templateActions,
    onRegionCreate,
    onRegionSelect
  ]);
  
  // 画布拖拽事件
  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target;
    canvasActions.setPosition({
      x: stage.x(),
      y: stage.y()
    });
  }, [canvasActions]);
  
  // 滚轮缩放
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const oldScale = canvasState.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const mousePointTo = {
      x: (pointer.x - canvasState.position.x) / oldScale,
      y: (pointer.y - canvasState.position.y) / oldScale
    };
    
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    canvasActions.setScale(newScale);
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    };
    
    canvasActions.setPosition(newPos);
  }, [canvasState.scale, canvasState.position, canvasActions]);
  
  // 键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 删除选中的区域
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (canvasState.selectedRegionIds.length > 0) {
        templateActions.deleteRegions(canvasState.selectedRegionIds);
        canvasActions.clearSelection();
        e.preventDefault();
      }
    }
    
    // 复制
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      // 实现复制逻辑
      e.preventDefault();
    }
    
    // 粘贴
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      // 实现粘贴逻辑
      e.preventDefault();
    }
    
    // 全选
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      canvasActions.selectAll();
      e.preventDefault();
    }
    
    // 撤销/重做
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      if (e.shiftKey) {
        templateActions.redo();
      } else {
        templateActions.undo();
      }
      e.preventDefault();
    }
    
    // ESC 清除选择/取消工具
    if (e.key === 'Escape') {
      canvasActions.clearSelection();
      canvasActions.setToolMode(ToolMode.SELECT);
      e.preventDefault();
    }
  }, [canvasState.selectedRegionIds, canvasActions, templateActions]);
  
  // 更新视口尺寸
  useEffect(() => {
    canvasActions.updateViewport(width, height);
  }, [width, height, canvasActions]);
  
  // 绑定键盘事件
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={canvasState.scale}
      scaleY={canvasState.scale}
      x={canvasState.position.x}
      y={canvasState.position.y}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onWheel={handleWheel}
      draggable={canvasState.toolMode === ToolMode.PAN}
      onDragEnd={handleStageDragEnd}
      style={{
        cursor: getCursorForTool(canvasState.toolMode)
      }}
    >
      <Layer>
        {children}
      </Layer>
    </Stage>
  );
};

// 工具模式转区域类型
function toolModeToRegionType(toolMode: ToolMode): RegionType | null {
  switch (toolMode) {
    case ToolMode.ANCHOR:
      return RegionType.ANCHOR;
    case ToolMode.BARCODE:
      return RegionType.BARCODE;
    case ToolMode.OBJECTIVE:
      return RegionType.OBJECTIVE;
    case ToolMode.SUBJECTIVE:
      return RegionType.SUBJECTIVE;
    default:
      return null;
  }
}

// 获取工具对应的鼠标样式
function getCursorForTool(toolMode: ToolMode): string {
  switch (toolMode) {
    case ToolMode.SELECT:
      return 'default';
    case ToolMode.PAN:
      return 'grab';
    case ToolMode.ANCHOR:
    case ToolMode.BARCODE:
    case ToolMode.OBJECTIVE:
    case ToolMode.SUBJECTIVE:
      return 'crosshair';
    default:
      return 'default';
  }
}

export default CanvasProvider;