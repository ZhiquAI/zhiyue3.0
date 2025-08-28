/**
 * 工具栏组件 - 集成所有设计工具
 */

import React from 'react';
import { Button, Space, Divider, Typography, Tooltip, Switch, InputNumber } from 'antd';
import {
  DragOutlined,
  AimOutlined,
  BarcodeOutlined,
  CheckSquareOutlined,
  EditOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  UndoOutlined,
  RedoOutlined,
  EyeOutlined,
  BorderOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useCanvasActions, useCanvasState, useCanvasGrid } from '../stores/canvasStore';
import { useTemplateActions, useTemplateHistory } from '../stores/templateStore';
import { ToolMode } from '../types/schema';

const { Text } = Typography;

interface ToolbarComponentProps {
  onSave?: () => void;
  onLoad?: (file: File) => void;
  onUploadBackground?: (file: File) => void;
  onExport?: () => void;
}

export const ToolbarComponent: React.FC<ToolbarComponentProps> = ({
  onSave,
  onLoad,
  onUploadBackground,
  onExport
}) => {
  const canvasState = useCanvasState();
  const canvasActions = useCanvasActions();
  const templateActions = useTemplateActions();
  const history = useTemplateHistory();
  const gridState = useCanvasGrid();
  
  // 工具按钮配置
  const tools = [
    {
      key: ToolMode.SELECT,
      icon: <DragOutlined />,
      title: '选择工具 (V)',
      shortcut: 'V'
    },
    {
      key: ToolMode.PAN,
      icon: <DragOutlined rotate={90} />,
      title: '平移工具 (H)',
      shortcut: 'H'
    }
  ];
  
  const drawingTools = [
    {
      key: ToolMode.ANCHOR,
      icon: <AimOutlined />,
      title: '定位点工具 (A)',
      label: '定位点'
    },
    {
      key: ToolMode.BARCODE,
      icon: <BarcodeOutlined />,
      title: '条码区工具 (B)',
      label: '条码区'
    },
    {
      key: ToolMode.OBJECTIVE,
      icon: <CheckSquareOutlined />,
      title: '客观题工具 (O)',
      label: '客观题'
    },
    {
      key: ToolMode.SUBJECTIVE,
      icon: <EditOutlined />,
      title: '主观题工具 (S)',
      label: '主观题'
    }
  ];
  
  const handleToolChange = (tool: ToolMode) => {
    canvasActions.setToolMode(tool);
  };
  
  const handleZoomIn = () => {
    canvasActions.zoomIn();
  };
  
  const handleZoomOut = () => {
    canvasActions.zoomOut();
  };
  
  const handleUndo = () => {
    templateActions.undo();
  };
  
  const handleRedo = () => {
    templateActions.redo();
  };
  
  const handlePreviewToggle = () => {
    canvasActions.togglePreviewMode();
  };
  
  const handleGridToggle = () => {
    canvasActions.toggleGrid();
  };
  
  const handleSnapToggle = () => {
    canvasActions.toggleSnapToGrid();
  };
  
  const handleGridSizeChange = (value: number | null) => {
    if (value && value > 0) {
      canvasActions.setGridSize(value);
    }
  };
  
  return (
    <div style={{ 
      padding: '12px 0', 
      borderBottom: '1px solid #f0f0f0',
      backgroundColor: '#fff' 
    }}>
      <Space wrap size="middle">
        {/* 基础工具 */}
        <Button.Group>
          {tools.map(tool => (
            <Tooltip key={tool.key} title={tool.title}>
              <Button
                type={canvasState.toolMode === tool.key ? 'primary' : 'default'}
                icon={tool.icon}
                onClick={() => handleToolChange(tool.key)}
              />
            </Tooltip>
          ))}
        </Button.Group>
        
        <Divider type="vertical" />
        
        {/* 绘制工具 */}
        <Button.Group>
          {drawingTools.map(tool => (
            <Tooltip key={tool.key} title={tool.title}>
              <Button
                type={canvasState.toolMode === tool.key ? 'primary' : 'default'}
                icon={tool.icon}
                onClick={() => handleToolChange(tool.key)}
              >
                {tool.label}
              </Button>
            </Tooltip>
          ))}
        </Button.Group>
        
        <Divider type="vertical" />
        
        {/* 缩放工具 */}
        <Space>
          <Button.Group>
            <Tooltip title="放大 (+)">
              <Button
                icon={<ZoomInOutlined />}
                onClick={handleZoomIn}
              />
            </Tooltip>
            <Tooltip title="缩小 (-)">
              <Button
                icon={<ZoomOutOutlined />}
                onClick={handleZoomOut}
              />
            </Tooltip>
          </Button.Group>
          
          <Text style={{ minWidth: 60, textAlign: 'center' }}>
            {Math.round(canvasState.scale * 100)}%
          </Text>
        </Space>
        
        <Divider type="vertical" />
        
        {/* 历史操作 */}
        <Button.Group>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button
              icon={<UndoOutlined />}
              disabled={history.currentIndex <= 0}
              onClick={handleUndo}
            />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Shift+Z)">
            <Button
              icon={<RedoOutlined />}
              disabled={history.currentIndex >= history.items.length - 1}
              onClick={handleRedo}
            />
          </Tooltip>
        </Button.Group>
        
        <Divider type="vertical" />
        
        {/* 视图选项 */}
        <Space>
          <Tooltip title="预览模式">
            <Switch
              checkedChildren={<EyeOutlined />}
              unCheckedChildren="编辑"
              checked={canvasState.previewMode}
              onChange={handlePreviewToggle}
            />
          </Tooltip>
          
          <Tooltip title="显示网格">
            <Switch
              checkedChildren={<BorderOutlined />}
              unCheckedChildren="网格"
              checked={gridState.gridVisible}
              onChange={handleGridToggle}
              size="small"
            />
          </Tooltip>
          
          <Tooltip title="网格对齐">
            <Switch
              checkedChildren="吸附"
              unCheckedChildren="自由"
              checked={gridState.snapToGrid}
              onChange={handleSnapToggle}
              size="small"
            />
          </Tooltip>
          
          <Tooltip title="网格大小">
            <InputNumber
              value={gridState.gridSize}
              onChange={handleGridSizeChange}
              min={1}
              max={100}
              size="small"
              style={{ width: 60 }}
              controls={false}
            />
          </Tooltip>
        </Space>
        
        <Divider type="vertical" />
        
        {/* 文件操作 */}
        <Space>
          {onUploadBackground && (
            <Tooltip title="上传背景图">
              <Button
                icon={<UploadOutlined />}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) onUploadBackground(file);
                  };
                  input.click();
                }}
              >
                背景图
              </Button>
            </Tooltip>
          )}
          
          {onLoad && (
            <Tooltip title="加载模板">
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) onLoad(file);
                  };
                  input.click();
                }}
              >
                加载
              </Button>
            </Tooltip>
          )}
          
          {onSave && (
            <Tooltip title="保存模板">
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSave}
              >
                保存
              </Button>
            </Tooltip>
          )}
          
          {onExport && (
            <Tooltip title="导出预览">
              <Button
                icon={<DownloadOutlined />}
                onClick={onExport}
              >
                导出
              </Button>
            </Tooltip>
          )}
        </Space>
      </Space>
      
      {/* 键盘快捷键提示 */}
      {canvasState.toolMode !== ToolMode.SELECT && (
        <div style={{ 
          marginTop: 8, 
          padding: '4px 8px', 
          backgroundColor: '#f0f8ff', 
          borderRadius: 4,
          fontSize: 12,
          color: '#1890ff'
        }}>
          <Space split={<span style={{ color: '#ccc' }}>|</span>}>
            <span>按住 Shift 保持正方形</span>
            <span>按 ESC 取消当前工具</span>
            <span>双击切换到选择工具</span>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ToolbarComponent;