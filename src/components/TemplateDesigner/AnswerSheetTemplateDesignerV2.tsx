/**
 * 答题卡模板设计器 V2.0
 * 基于HTML原型的React实现版本
 * 
 * 主要功能：
 * 1. 可视化设计界面 - 左侧工具栏、中间画布、右侧属性面板
 * 2. 多种区域类型 - 定位点、条码区、客观题、主观题
 * 3. 交互操作 - 拖拽创建、选择编辑、缩放平移
 * 4. 模板管理 - 加载/保存模板、上传底图
 * 5. 历史记录 - 撤销/重做功能
 * 6. 图层管理 - 区域列表、选择切换
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Button, Input, InputNumber, Select, Space, Card, Divider, Upload, message, Slider } from 'antd';
import './templateDesignerV2.css';
import {
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  PictureOutlined,
  DeleteOutlined,
  DragOutlined,
  BorderOutlined,
  QrcodeOutlined,
  CheckSquareOutlined,
  EditOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

// 区域类型定义
export interface TemplateRegion {
  id: string;
  type: 'timing' | 'barcode' | 'omr' | 'subjective';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: {
    // 客观题属性
    startQ?: number;
    totalQ?: number;
    options?: number;
    perRow?: number;
    points?: number;
    // 主观题属性
    questionId?: string;
    fullMarks?: string;
  };
}

// 工具配置
const toolConfig = {
  timing: { name: '定位点', color: '#ef4444', bgColor: '#fef2f2' },
  barcode: { name: '条码区', color: '#8b5cf6', bgColor: '#f3e8ff' },
  omr: { name: '客观题', color: '#3b82f6', bgColor: '#eff6ff' },
  subjective: { name: '主观题', color: '#10b981', bgColor: '#f0fdf4' }
};

// 动作状态
interface ActionState {
  isDrawing: boolean;
  isMoving: boolean;
  isResizing: boolean;
  isPanning: boolean;
  startX: number;
  startY: number;
  lastPanX: number;
  lastPanY: number;
  resizeHandle: string | null;
}

interface AnswerSheetTemplateDesignerV2Props {
  visible: boolean;
  onCancel: () => void;
  onSave: (template: any) => void;
  initialTemplate?: any;
}

const AnswerSheetTemplateDesignerV2: React.FC<AnswerSheetTemplateDesignerV2Props> = ({
  visible,
  onCancel,
  onSave,
  initialTemplate
}) => {
  // 基础状态
  const [regions, setRegions] = useState<TemplateRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // 历史记录
  const [history, setHistory] = useState<TemplateRegion[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // 动作状态
  const [actionState, setActionState] = useState<ActionState>({
    isDrawing: false,
    isMoving: false,
    isResizing: false,
    isPanning: false,
    startX: 0,
    startY: 0,
    lastPanX: 0,
    lastPanY: 0,
    resizeHandle: null
  });
  
  // 画布引用
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  
  // 区域计数器
  const [regionCounter, setRegionCounter] = useState(0);
  
  // 生成唯一ID
  const generateRegionId = () => {
    const newCounter = Math.max(0, ...regions.map(r => parseInt(r.id.split('-')[1]) || 0)) + 1;
    setRegionCounter(newCounter);
    return `region-${newCounter}`;
  };
  
  // 保存状态到历史记录
  const saveState = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(regions)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [regions, history, historyIndex]);
  
  // 撤销
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRegions(JSON.parse(JSON.stringify(history[newIndex])));
      setSelectedRegionId(null);
    }
  };
  
  // 重做
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRegions(JSON.parse(JSON.stringify(history[newIndex])));
      setSelectedRegionId(null);
    }
  };
  
  // 选择工具
  const selectTool = (tool: string) => {
    setCurrentTool(currentTool === tool ? null : tool);
    setSelectedRegionId(null);
  };
  
  // 选择区域
  const selectRegion = (regionId: string) => {
    setSelectedRegionId(selectedRegionId === regionId ? null : regionId);
    setCurrentTool(null);
  };
  
  // 删除区域
  const deleteRegion = (regionId: string) => {
    setRegions(prev => prev.filter(r => r.id !== regionId));
    setSelectedRegionId(null);
    saveState();
  };
  
  // 更新区域属性
  const updateRegionProperty = (regionId: string, property: string, value: any) => {
    setRegions(prev => prev.map(region => {
      if (region.id === regionId) {
        return {
          ...region,
          properties: {
            ...region.properties,
            [property]: value
          }
        };
      }
      return region;
    }));
    saveState();
  };
  
  // 画布鼠标事件处理
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!currentTool || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setActionState(prev => ({
      ...prev,
      isDrawing: true,
      startX: x,
      startY: y
    }));
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!actionState.isDrawing || !currentTool || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // 这里可以添加实时绘制预览逻辑
  };
  
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (!actionState.isDrawing || !currentTool || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    const width = Math.abs(x - actionState.startX);
    const height = Math.abs(y - actionState.startY);
    
    if (width > 20 && height > 20) {
      const newRegion: TemplateRegion = {
        id: generateRegionId(),
        type: currentTool as any,
        x: Math.min(x, actionState.startX),
        y: Math.min(y, actionState.startY),
        width,
        height,
        properties: currentTool === 'omr' 
          ? { startQ: 1, totalQ: 20, options: 4, perRow: 5, points: 2 }
          : { questionId: '', fullMarks: '' }
      };
      
      setRegions(prev => [...prev, newRegion]);
      setSelectedRegionId(newRegion.id);
      saveState();
    }
    
    setActionState(prev => ({
      ...prev,
      isDrawing: false
    }));
    setCurrentTool(null);
  };
  
  // 缩放控制
  const handleZoom = (delta: number) => {
    setScale(prev => {
      const newScale = delta === 0 ? 1 : prev + delta;
      return Math.max(0.2, Math.min(newScale, 3));
    });
  };
  
  // 上传背景图
  const handleBackgroundUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    return false; // 阻止默认上传行为
  };
  
  // 保存模板
  const handleSave = () => {
    if (regions.length === 0) {
      message.warning('模板为空，无法保存！');
      return;
    }
    
    const templateData = {
      regions,
      backgroundImage,
      scale,
      createdAt: new Date().toISOString()
    };
    
    onSave(templateData);
    message.success('模板保存成功！');
  };
  
  // 加载模板
  const handleLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const templateData = JSON.parse(e.target?.result as string);
        if (Array.isArray(templateData)) {
          // 兼容旧格式
          setRegions(templateData);
        } else {
          setRegions(templateData.regions || []);
          setBackgroundImage(templateData.backgroundImage || null);
          setScale(templateData.scale || 1);
        }
        setSelectedRegionId(null);
        saveState();
        message.success('模板加载成功！');
      } catch (error) {
        message.error('加载模板失败，请确保文件格式正确！');
      }
    };
    reader.readAsText(file);
    return false;
  };
  
  // 渲染客观题内容
  const renderOMRContent = (region: TemplateRegion) => {
    const { startQ = 1, totalQ = 1, options = 4, perRow = 1 } = region.properties;
    if (totalQ <= 0 || perRow <= 0) return null;
    
    const optionChars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const items = [];
    
    for (let i = 0; i < totalQ; i++) {
      const questionNumber = startQ + i;
      const optionElements = [];
      
      for (let j = 0; j < options; j++) {
        optionElements.push(
          <span key={j} className="border border-black rounded-sm px-1 mx-0.5 text-xs">
            [{optionChars[j]}]
          </span>
        );
      }
      
      items.push(
        <div key={i} className="flex items-center text-xs">
          <span className="font-bold mr-1">{questionNumber}.</span>
          {optionElements}
        </div>
      );
    }
    
    return (
      <div 
        className="grid gap-1 p-2 h-full overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${perRow}, 1fr)` }}
      >
        {items}
      </div>
    );
  };
  
  // 获取选中的区域
  const selectedRegion = regions.find(r => r.id === selectedRegionId);
  
  return (
    <Modal
      title="答题卡模板设计器 V2.0"
      open={visible}
      onCancel={onCancel}
      width="95vw"
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          保存模板
        </Button>
      ]}
    >
      <div className="flex h-[80vh]">
        {/* 左侧工具栏 */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          {/* 文件操作 */}
          <Card size="small" title="文件操作" className="mb-4">
            <Space direction="vertical" className="w-full">
              <Upload
                accept=".json"
                beforeUpload={handleLoad}
                showUploadList={false}
              >
                <Button icon={<FolderOpenOutlined />} block>
                  加载模板
                </Button>
              </Upload>
              
              <Upload
                accept="image/*"
                beforeUpload={handleBackgroundUpload}
                showUploadList={false}
              >
                <Button icon={<PictureOutlined />} block>
                  上传底图
                </Button>
              </Upload>
            </Space>
          </Card>
          
          {/* 工具箱 */}
          <Card size="small" title="工具箱" className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(toolConfig).map(([key, config]) => (
                <div
                  key={key}
                  className={`tool-button ${
                    currentTool === key ? 'active' : ''
                  }`}
                  onClick={() => selectTool(key)}
                >
                  {key === 'timing' && <BorderOutlined />}
                  {key === 'barcode' && <QrcodeOutlined />}
                  {key === 'omr' && <CheckSquareOutlined />}
                  {key === 'subjective' && <EditOutlined />}
                  <span>{config.name}</span>
                </div>
              ))}
            </div>
          </Card>
          
          {/* 图层列表 */}
          <Card size="small" title="图层列表" className="mb-4">
            {regions.length === 0 ? (
              <div className="text-center text-gray-400 py-4">
                <p className="text-sm">尚未创建任何区域</p>
              </div>
            ) : (
              <div className="space-y-2">
                {regions.map(region => {
                  const config = toolConfig[region.type];
                  const displayName = region.type === 'subjective' && region.properties.questionId
                    ? `${config.name} (${region.properties.questionId})`
                    : region.type === 'omr'
                    ? `${config.name} (${region.properties.startQ}-${(region.properties.startQ || 1) + (region.properties.totalQ || 1) - 1})`
                    : config.name;
                  
                  return (
                    <div
                      key={region.id}
                      className={`layer-item ${
                        selectedRegionId === region.id ? 'selected' : ''
                      }`}
                      onClick={() => selectRegion(region.id)}
                    >
                      <div
                        className="layer-indicator"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="layer-name">{displayName}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRegion(region.id);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          
          {/* 历史记录 */}
          <Card size="small" title="历史记录">
            <Space>
              <Button
                icon={<UndoOutlined />}
                disabled={historyIndex === 0}
                onClick={undo}
              >
                撤销
              </Button>
              <Button
                icon={<RedoOutlined />}
                disabled={historyIndex === history.length - 1}
                onClick={redo}
              >
                重做
              </Button>
            </Space>
          </Card>
        </div>
        
        {/* 中间画布区域 */}
        <div className="flex-1 flex flex-col">
          {/* 画布工具栏 */}
          <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between">
            <Space>
              <Button
                icon={<ZoomOutOutlined />}
                onClick={() => handleZoom(-0.1)}
              />
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <Button
                icon={<ZoomInOutlined />}
                onClick={() => handleZoom(0.1)}
              />
              <Button
                icon={<ExpandOutlined />}
                onClick={() => handleZoom(0)}
              >
                重置
              </Button>
            </Space>
            
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存模板
            </Button>
          </div>
          
          {/* 画布容器 */}
          <div 
            ref={canvasWrapperRef}
            className="flex-1 overflow-auto bg-gray-100 p-4"
          >
            <div className="flex justify-center">
              <div
                ref={canvasRef}
                className={`template-canvas ${
                  currentTool ? 'drawing' : ''
                } ${actionState.isPanning ? 'panning' : ''}`}
                style={{
                  width: 794,
                  height: 1123,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                {/* 渲染区域 */}
                {regions.map(region => (
                  <div
                    key={region.id}
                    className={`template-region ${
                      selectedRegionId === region.id ? 'selected' : ''
                    }`}
                    style={{
                      left: region.x,
                      top: region.y,
                      width: region.width,
                      height: region.height,
                      borderColor: toolConfig[region.type].color
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectRegion(region.id);
                    }}
                  >
                    {region.type === 'omr' && renderOMRContent(region)}
                    
                    {/* 调整手柄 */}
                    {selectedRegionId === region.id && (
                      <>
                        <div className="resize-handle nw" />
                        <div className="resize-handle ne" />
                        <div className="resize-handle sw" />
                        <div className="resize-handle se" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* 右侧属性面板 */}
        <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
          <Card size="small" title="属性面板">
            {!selectedRegion ? (
              <div className="text-center text-gray-400 py-10">
                <BorderOutlined className="text-4xl mb-2" />
                <p className="text-sm">请先选择一个区域</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    区域类型
                  </label>
                  <p className="text-lg font-semibold" style={{ color: toolConfig[selectedRegion.type].color }}>
                    {toolConfig[selectedRegion.type].name}
                  </p>
                </div>
                
                {selectedRegion.type === 'subjective' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        题目编号
                      </label>
                      <Input
                        value={selectedRegion.properties.questionId || ''}
                        onChange={(e) => updateRegionProperty(selectedRegion.id, 'questionId', e.target.value)}
                        placeholder="请输入题目编号"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        满分值
                      </label>
                      <Input
                        value={selectedRegion.properties.fullMarks || ''}
                        onChange={(e) => updateRegionProperty(selectedRegion.id, 'fullMarks', e.target.value)}
                        placeholder="请输入满分值"
                      />
                    </div>
                  </>
                )}
                
                {selectedRegion.type === 'omr' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          起始题号
                        </label>
                        <InputNumber
                          value={selectedRegion.properties.startQ || 1}
                          onChange={(value) => updateRegionProperty(selectedRegion.id, 'startQ', value)}
                          min={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          题目数量
                        </label>
                        <InputNumber
                          value={selectedRegion.properties.totalQ || 20}
                          onChange={(value) => updateRegionProperty(selectedRegion.id, 'totalQ', value)}
                          min={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          选项数量
                        </label>
                        <InputNumber
                          value={selectedRegion.properties.options || 4}
                          onChange={(value) => updateRegionProperty(selectedRegion.id, 'options', value)}
                          min={2}
                          max={8}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          每行题数
                        </label>
                        <InputNumber
                          value={selectedRegion.properties.perRow || 5}
                          onChange={(value) => updateRegionProperty(selectedRegion.id, 'perRow', value)}
                          min={1}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          每题分数
                        </label>
                        <InputNumber
                          value={selectedRegion.properties.points || 2}
                          onChange={(value) => updateRegionProperty(selectedRegion.id, 'points', value)}
                          min={0.5}
                          step={0.5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <Divider />
                
                <Button
                  type="primary"
                  danger
                  block
                  icon={<DeleteOutlined />}
                  onClick={() => deleteRegion(selectedRegion.id)}
                >
                  删除此区域
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Modal>
  );
};

export default AnswerSheetTemplateDesignerV2;