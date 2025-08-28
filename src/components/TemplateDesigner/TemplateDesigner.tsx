import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Layout,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  BorderOutlined,
  CheckSquareOutlined,
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  ExpandOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
  UploadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import Konva from 'konva';
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from 'react-konva';
import useImage from 'use-image';

// 类型定义
interface Region {
  id: string;
  type: 'question' | 'student_info' | 'barcode' | 'timing_point' | 'header' | 'footer';
  subType?: 'choice' | 'subjective' | 'fill_blank' | 'essay';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  properties?: {
    questionNumber?: number;
    maxScore?: number;
    choiceCount?: number;
    layout?: 'horizontal' | 'vertical';
    fields?: string[];
    infoType?: 'name' | 'id' | 'class' | 'exam';
    barcodeType?: 'code128' | 'qrcode' | 'datamatrix';
    text?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    shape?: 'circle' | 'square';
    size?: 'small' | 'medium' | 'large';
  };
}

interface TemplateConfig {
  name: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  examType?: string;
  pageWidth: number;
  pageHeight: number;
  dpi: number;
  regions: Region[];
}

interface TemplateDesignerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: TemplateConfig) => void;
  initialTemplate?: TemplateConfig;
}

const { Sider, Content } = Layout;

// 背景图片组件
const BackgroundImage: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => {
  const [image] = useImage(src);
  return image ? <KonvaImage image={image} width={width} height={height} opacity={0.5} /> : null;
};

const TemplateDesigner: React.FC<TemplateDesignerProps> = ({ visible, onClose, onSave, initialTemplate }) => {
  const [form] = Form.useForm();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  
  // 状态管理
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<Region[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  // 页面配置
  const [pageConfig, setPageConfig] = useState({
    width: 210, // A4纸宽度(mm)
    height: 297, // A4纸高度(mm)
    dpi: 300
  });
  
  // 像素转换比例 (1mm = 3.78px at 96dpi, 调整为适合显示的比例)
  const mmToPx = 2.5;
  const canvasWidth = pageConfig.width * mmToPx;
  const canvasHeight = pageConfig.height * mmToPx;
  
  // 初始化
  useEffect(() => {
    if (visible) {
      if (initialTemplate) {
        form.setFieldsValue({
          name: initialTemplate.name,
          description: initialTemplate.description,
          subject: initialTemplate.subject,
          gradeLevel: initialTemplate.gradeLevel,
          examType: initialTemplate.examType
        });
        setPageConfig({
          width: initialTemplate.pageWidth,
          height: initialTemplate.pageHeight,
          dpi: initialTemplate.dpi
        });
        setRegions(initialTemplate.regions || []);
        addToHistory(initialTemplate.regions || []);
      } else {
        form.resetFields();
        setRegions([]);
        setHistory([]);
        setHistoryIndex(-1);
      }
      setSelectedId(null);
      setCurrentTool('select');
      setScale(1);
      setStagePos({ x: 0, y: 0 });
    }
  }, [visible, initialTemplate, form]);
  
  // 历史记录管理
  const addToHistory = useCallback((newRegions: Region[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newRegions]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setRegions([...history[historyIndex - 1]]);
      setSelectedId(null);
    }
  }, [history, historyIndex]);
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setRegions([...history[historyIndex + 1]]);
      setSelectedId(null);
    }
  }, [history, historyIndex]);
  
  // 生成唯一ID
  const generateId = () => `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 创建新区域
  const createRegion = useCallback((type: Region['type'], subType?: Region['subType']) => {
    const newRegion: Region = {
      id: generateId(),
      type,
      subType,
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      label: getRegionLabel(type, subType),
      properties: getDefaultProperties(type, subType)
    };
    
    const newRegions = [...regions, newRegion];
    setRegions(newRegions);
    addToHistory(newRegions);
    setSelectedId(newRegion.id);
    setCurrentTool('select');
  }, [regions, addToHistory]);
  
  // 获取区域标签
  const getRegionLabel = (type: Region['type'], subType?: Region['subType']) => {
    switch (type) {
      case 'question':
        switch (subType) {
          case 'choice': return '选择题区域';
          case 'subjective': return '主观题区域';
          case 'fill_blank': return '填空题区域';
          case 'essay': return '作文题区域';
          default: return '题目区域';
        }
      case 'student_info': return '学生信息区域';
      case 'barcode': return '条形码区域';
      case 'timing_point': return '定位点区域';
      case 'header': return '页眉区域';
      case 'footer': return '页脚区域';
      default: return '未知区域';
    }
  };
  
  // 获取默认属性
  const getDefaultProperties = (type: Region['type'], subType?: Region['subType']) => {
    switch (type) {
      case 'question':
        return {
          questionNumber: 1,
          maxScore: 10,
          choiceCount: subType === 'choice' ? 4 : undefined,
          fontSize: 12,
          textAlign: 'left' as const
        };
      case 'student_info':
        return {
          fields: ['姓名', '学号', '班级'],
          fontSize: 12,
          textAlign: 'left' as const
        };
      case 'timing_point':
        return {
          shape: 'circle' as const,
          size: 'medium' as const,
          fontSize: 12,
          textAlign: 'center' as const
        };
      default:
        return {
          fontSize: 12,
          textAlign: 'left' as const
        };
    }
  };
  
  // 删除区域
  const deleteRegion = useCallback((regionId: string) => {
    const newRegions = regions.filter(r => r.id !== regionId);
    setRegions(newRegions);
    addToHistory(newRegions);
    setSelectedId(null);
  }, [regions, addToHistory]);
  
  // 复制区域
  const duplicateRegion = useCallback((regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (region) {
      const newRegion: Region = {
        ...region,
        id: generateId(),
        x: region.x + 20,
        y: region.y + 20,
        label: `${region.label} (副本)`
      };
      
      const newRegions = [...regions, newRegion];
      setRegions(newRegions);
      addToHistory(newRegions);
      setSelectedId(newRegion.id);
    }
  }, [regions, addToHistory]);
  
  // 更新区域属性
  const updateRegion = useCallback((regionId: string, updates: Partial<Region>) => {
    const newRegions = regions.map(r => 
      r.id === regionId ? { ...r, ...updates } : r
    );
    setRegions(newRegions);
    addToHistory(newRegions);
  }, [regions, addToHistory]);
  
  // 鼠标事件处理
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (currentTool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }
    
    if (currentTool !== 'select') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setIsDrawing(true);
        setDrawStart(pos);
      }
    }
  }, [currentTool]);
  
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart || currentTool === 'select') return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      // 实时显示绘制框（这里可以添加临时绘制逻辑）
    }
  }, [isDrawing, drawStart, currentTool]);
  
  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawStart || currentTool === 'select') {
      setIsDrawing(false);
      setDrawStart(null);
      return;
    }
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      const width = Math.abs(pos.x - drawStart.x);
      const height = Math.abs(pos.y - drawStart.y);
      
      if (width > 10 && height > 10) {
        const [type, subType] = currentTool.split('_') as [Region['type'], Region['subType']];
        const newRegion: Region = {
          id: generateId(),
          type,
          subType,
          x: Math.min(pos.x, drawStart.x),
          y: Math.min(pos.y, drawStart.y),
          width,
          height,
          label: getRegionLabel(type, subType),
          properties: getDefaultProperties(type, subType)
        };
        
        const newRegions = [...regions, newRegion];
        setRegions(newRegions);
        addToHistory(newRegions);
        setSelectedId(newRegion.id);
      }
    }
    
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentTool('select');
  }, [isDrawing, drawStart, currentTool, regions, addToHistory, getRegionLabel, getDefaultProperties]);
  
  // 选择区域
  const handleRegionClick = useCallback((regionId: string) => {
    setSelectedId(regionId);
  }, []);
  
  // 更新Transformer
  useEffect(() => {
    if (selectedId && transformerRef.current && layerRef.current) {
      const selectedNode = layerRef.current.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId]);
  
  // 处理区域变换
  const handleTransformEnd = useCallback((regionId: string) => {
    const node = layerRef.current?.findOne(`#${regionId}`);
    if (node) {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      // 重置缩放并应用到宽高
      node.scaleX(1);
      node.scaleY(1);
      
      const newRegions = regions.map(r => 
        r.id === regionId ? {
          ...r,
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY)
        } : r
      );
      
      setRegions(newRegions);
      addToHistory(newRegions);
    }
  }, [regions, addToHistory]);
  
  // 背景图片上传
  const handleBackgroundUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    return false; // 阻止自动上传
  };

  // 画布缩放
  const handleZoom = (zoomIn: boolean) => {
    const newScale = zoomIn ? scale * 1.2 : scale / 1.2;
    setScale(Math.max(0.1, Math.min(3, newScale)));
  };

  // 适应画布
  const handleFitCanvas = () => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  // 画布拖拽
  const handleStageDragStart = () => {
    setIsPanning(true);
  };

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsPanning(false);
    setStagePos({
      x: e.target.x(),
      y: e.target.y()
    });
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        deleteRegion(selectedId);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
        if (e.key === 'd' && selectedId) {
          e.preventDefault();
          duplicateRegion(selectedId);
        }
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, selectedId, undo, redo, deleteRegion, duplicateRegion]);

  // 保存模板
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (regions.length === 0) {
        message.warning('请至少添加一个区域');
        return;
      }
      
      const templateConfig: TemplateConfig = {
        name: values.name,
        description: values.description,
        subject: values.subject,
        gradeLevel: values.gradeLevel,
        examType: values.examType,
        pageWidth: pageConfig.width,
        pageHeight: pageConfig.height,
        dpi: pageConfig.dpi,
        regions: regions
      };
      
      onSave(templateConfig);
      message.success('模板保存成功');
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('保存模板失败');
    }
  };
  

  
  return (
    <Modal
      title="答题卡模板设计器"
      open={visible}
      onCancel={onClose}
      width="95vw"
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存模板</Button>,
      ]}
      destroyOnClose
    >
      <Layout style={{ height: 'calc(100vh - 150px)', background: '#fff' }}>
        <Sider width={280} style={{ background: '#fff', padding: 16, borderRight: '1px solid #f0f0f0', overflowY: 'auto', height: '100%' }}>
          <Typography.Title level={5}>基本信息</Typography.Title>
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
              <Input placeholder="请输入模板名称" />
            </Form.Item>
            <Form.Item name="description" label="模板描述">
              <Input.TextArea rows={2} placeholder="请输入模板描述" />
            </Form.Item>
            <Form.Item name="subject" label="科目">
              <Select placeholder="选择科目">
                <Select.Option value="chinese">语文</Select.Option>
                <Select.Option value="math">数学</Select.Option>
                <Select.Option value="english">英语</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="gradeLevel" label="年级">
              <Select placeholder="选择年级">
                <Select.Option value="g1">一年级</Select.Option>
                <Select.Option value="g7">七年级</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="examType" label="考试类型">
              <Select placeholder="选择考试类型">
                <Select.Option value="midterm">期中</Select.Option>
                <Select.Option value="final">期末</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="背景图片">
              <Upload beforeUpload={handleBackgroundUpload} showUploadList={false}>
                <Button icon={<UploadOutlined />} style={{ width: '100%' }}>上传答题卡底图</Button>
              </Upload>
            </Form.Item>
          </Form>
          <Divider />
          <Typography.Title level={5}>工具箱</Typography.Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Button block icon={<DragOutlined />} onClick={() => createRegion('timing_point')}>定位点</Button>
            </Col>
            <Col span={12}>
              <Button block icon={<BorderOutlined />} onClick={() => createRegion('barcode')}>条码区</Button>
            </Col>
            <Col span={12}>
              <Button block icon={<CheckSquareOutlined />} onClick={() => createRegion('question', 'choice')}>客观题</Button>
            </Col>
            <Col span={12}>
              <Button block icon={<EditOutlined />} onClick={() => createRegion('question', 'subjective')}>主观题</Button>
            </Col>
          </Row>
        </Sider>
        <Content style={{ background: '#f0f2f5', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Tooltip title="撤销 (Cmd+Z)">
                <Button icon={<UndoOutlined />} onClick={undo} disabled={historyIndex <= 0} />
              </Tooltip>
              <Tooltip title="重做 (Cmd+Y)">
                <Button icon={<RedoOutlined />} onClick={redo} disabled={historyIndex >= history.length - 1} />
              </Tooltip>
              <Tooltip title="复制 (Cmd+D)">
                <Button icon={<CopyOutlined />} onClick={() => selectedId && duplicateRegion(selectedId)} disabled={!selectedId} />
              </Tooltip>
              <Tooltip title="删除 (Delete)">
                <Button icon={<DeleteOutlined />} onClick={() => selectedId && deleteRegion(selectedId)} disabled={!selectedId} />
              </Tooltip>
              <Divider type="vertical" />
              <Tooltip title="放大">
                <Button icon={<ZoomInOutlined />} onClick={() => handleZoom(true)} />
              </Tooltip>
              <Tooltip title="缩小">
                <Button icon={<ZoomOutOutlined />} onClick={() => handleZoom(false)} />
              </Tooltip>
              <Tooltip title="适应画布">
                <Button icon={<ExpandOutlined />} onClick={handleFitCanvas} />
              </Tooltip>
            </Space>
          </div>
          <div style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Stage
              ref={stageRef}
              width={canvasWidth}
              height={canvasHeight}
              scaleX={scale}
              scaleY={scale}
              x={stagePos.x}
              y={stagePos.y}
              draggable={currentTool === 'select' && !selectedId}
              onDragStart={handleStageDragStart}
              onDragEnd={handleStageDragEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ 
                backgroundColor: 'white', 
                cursor: isPanning ? 'grabbing' : (currentTool === 'select' ? 'grab' : 'crosshair')
              }}
            >
              <Layer ref={layerRef}>
                {backgroundImage && <BackgroundImage src={backgroundImage} width={canvasWidth} height={canvasHeight} />}
                {regions.map(region => (
                  <Group
                    key={region.id}
                    id={region.id}
                    x={region.x}
                    y={region.y}
                    width={region.width}
                    height={region.height}
                    draggable
                    onClick={() => handleRegionClick(region.id)}
                    onTap={() => handleRegionClick(region.id)}
                    onTransformEnd={() => handleTransformEnd(region.id)}
                  >
                    <Rect
                      width={region.width}
                      height={region.height}
                      fill="rgba(0, 128, 255, 0.2)"
                      stroke="rgba(0, 128, 255, 0.8)"
                      strokeWidth={2}
                    />
                    <Text
                      text={region.label}
                      fontSize={12}
                      fill="#333"
                      padding={5}
                      listening={false}
                    />
                  </Group>
                ))}
                <Transformer ref={transformerRef} />
              </Layer>
            </Stage>
          </div>
        </Content>
        <Sider width={280} style={{ background: '#fff', padding: 16, borderLeft: '1px solid #f0f0f0', overflowY: 'auto', height: '100%' }}>
          <Typography.Title level={5}>属性配置</Typography.Title>
          {selectedId ? (
            <div>
              {(() => {
                const selectedRegion = regions.find(r => r.id === selectedId);
                if (!selectedRegion) return null;
                
                return (
                  <div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>区域标签</label>
                      <Input
                        size="small"
                        value={selectedRegion.label}
                        onChange={(e) => updateRegion(selectedId, { label: e.target.value })}
                      />
                    </div>
                    
                    {/* 位置和尺寸 */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>位置和尺寸</label>
                      <Row gutter={8}>
                        <Col span={12}>
                          <div style={{ marginBottom: 4, fontSize: '10px' }}>X坐标</div>
                          <InputNumber
                            size="small"
                            value={Math.round(selectedRegion.x)}
                            onChange={(value) => updateRegion(selectedId, { x: value || 0 })}
                            style={{ width: '100%' }}
                          />
                        </Col>
                        <Col span={12}>
                          <div style={{ marginBottom: 4, fontSize: '10px' }}>Y坐标</div>
                          <InputNumber
                            size="small"
                            value={Math.round(selectedRegion.y)}
                            onChange={(value) => updateRegion(selectedId, { y: value || 0 })}
                            style={{ width: '100%' }}
                          />
                        </Col>
                        <Col span={12}>
                          <div style={{ marginBottom: 4, fontSize: '10px' }}>宽度</div>
                          <InputNumber
                            size="small"
                            value={Math.round(selectedRegion.width)}
                            onChange={(value) => updateRegion(selectedId, { width: value || 10 })}
                            min={10}
                            style={{ width: '100%' }}
                          />
                        </Col>
                        <Col span={12}>
                          <div style={{ marginBottom: 4, fontSize: '10px' }}>高度</div>
                          <InputNumber
                            size="small"
                            value={Math.round(selectedRegion.height)}
                            onChange={(value) => updateRegion(selectedId, { height: value || 10 })}
                            min={10}
                            style={{ width: '100%' }}
                          />
                        </Col>
                      </Row>
                    </div>
                    
                    {/* 题目区域属性 */}
                    {selectedRegion.type === 'question' && (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>题目编号</label>
                          <InputNumber
                            size="small"
                            value={selectedRegion.properties?.questionNumber}
                            onChange={(value) => updateRegion(selectedId, {
                              properties: { ...selectedRegion.properties, questionNumber: value || 1 }
                            })}
                            min={1}
                            style={{ width: '100%' }}
                          />
                        </div>
                        
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>满分</label>
                          <InputNumber
                            size="small"
                            value={selectedRegion.properties?.maxScore}
                            onChange={(value) => updateRegion(selectedId, {
                              properties: { ...selectedRegion.properties, maxScore: value || 10 }
                            })}
                            min={1}
                            style={{ width: '100%' }}
                          />
                        </div>
                        
                        {selectedRegion.subType === 'choice' && (
                          <>
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>选项数量</label>
                              <InputNumber
                                size="small"
                                value={selectedRegion.properties?.choiceCount}
                                onChange={(value) => updateRegion(selectedId, {
                                  properties: { ...selectedRegion.properties, choiceCount: value || 4 }
                                })}
                                min={2}
                                max={8}
                                style={{ width: '100%' }}
                              />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>布局方式</label>
                              <Select
                                size="small"
                                value={selectedRegion.properties?.layout || 'horizontal'}
                                onChange={(value) => updateRegion(selectedId, {
                                  properties: { ...selectedRegion.properties, layout: value }
                                })}
                                style={{ width: '100%' }}
                              >
                                <Select.Option value="horizontal">水平排列</Select.Option>
                                <Select.Option value="vertical">垂直排列</Select.Option>
                              </Select>
                            </div>
                          </>
                        )}
                      </>
                    )}
                    
                    {/* 学生信息区域属性 */}
                    {selectedRegion.type === 'student_info' && (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>信息字段</label>
                          <Select
                            mode="tags"
                            size="small"
                            value={selectedRegion.properties?.fields}
                            onChange={(value) => updateRegion(selectedId, {
                              properties: { ...selectedRegion.properties, fields: value }
                            })}
                            style={{ width: '100%' }}
                            placeholder="输入字段名称"
                          >
                            <Select.Option value="姓名">姓名</Select.Option>
                            <Select.Option value="学号">学号</Select.Option>
                            <Select.Option value="班级">班级</Select.Option>
                            <Select.Option value="考号">考号</Select.Option>
                            <Select.Option value="座位号">座位号</Select.Option>
                          </Select>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>信息类型</label>
                          <Select
                            size="small"
                            value={selectedRegion.properties?.infoType || 'name'}
                            onChange={(value) => updateRegion(selectedId, {
                              properties: { ...selectedRegion.properties, infoType: value }
                            })}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="name">姓名</Select.Option>
                            <Select.Option value="id">学号</Select.Option>
                            <Select.Option value="class">班级</Select.Option>
                            <Select.Option value="exam">考试信息</Select.Option>
                          </Select>
                        </div>
                      </>
                    )}
                    
                    {/* 条形码区域属性 */}
                    {selectedRegion.type === 'barcode' && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>条形码类型</label>
                        <Select
                          size="small"
                          value={selectedRegion.properties?.barcodeType || 'code128'}
                          onChange={(value) => updateRegion(selectedId, {
                            properties: { ...selectedRegion.properties, barcodeType: value }
                          })}
                          style={{ width: '100%' }}
                        >
                          <Select.Option value="code128">Code 128</Select.Option>
                          <Select.Option value="qrcode">二维码</Select.Option>
                          <Select.Option value="datamatrix">Data Matrix</Select.Option>
                        </Select>
                      </div>
                    )}
                    
                    {/* 定位点区域属性 */}
                    {selectedRegion.type === 'timing_point' && (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>形状</label>
                          <Select
                            size="small"
                            value={selectedRegion.properties?.shape || 'circle'}
                            onChange={(value) => updateRegion(selectedId, {
                              properties: { ...selectedRegion.properties, shape: value }
                            })}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="circle">圆形</Select.Option>
                            <Select.Option value="square">方形</Select.Option>
                          </Select>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>大小</label>
                          <Select
                            size="small"
                            value={selectedRegion.properties?.size || 'medium'}
                            onChange={(value) => updateRegion(selectedId, {
                              properties: { ...selectedRegion.properties, size: value }
                            })}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value="small">小</Select.Option>
                            <Select.Option value="medium">中</Select.Option>
                            <Select.Option value="large">大</Select.Option>
                          </Select>
                        </div>
                      </>
                    )}
                    
                    {/* 页眉页脚区域属性 */}
                    {(selectedRegion.type === 'header' || selectedRegion.type === 'footer') && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>文本内容</label>
                        <Input
                          size="small"
                          value={selectedRegion.properties?.text || ''}
                          onChange={(e) => updateRegion(selectedId, {
                            properties: { ...selectedRegion.properties, text: e.target.value }
                          })}
                          placeholder="输入文本内容"
                        />
                      </div>
                    )}
                    
                    {/* 通用属性 */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>字体大小</label>
                      <InputNumber
                        size="small"
                        value={selectedRegion.properties?.fontSize}
                        onChange={(value) => updateRegion(selectedId, {
                          properties: { ...selectedRegion.properties, fontSize: value || 12 }
                        })}
                        min={8}
                        max={24}
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>文本对齐</label>
                      <Radio.Group
                        size="small"
                        value={selectedRegion.properties?.textAlign}
                        onChange={(e) => updateRegion(selectedId, {
                          properties: { ...selectedRegion.properties, textAlign: e.target.value }
                        })}
                      >
                        <Radio.Button value="left">左对齐</Radio.Button>
                        <Radio.Button value="center">居中</Radio.Button>
                        <Radio.Button value="right">右对齐</Radio.Button>
                      </Radio.Group>
                    </div>
                  </div>
                );
              })()} 
            </div>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', color: '#999' }}>
                <p>请先选择一个区域</p>
              </div>
            </Card>
          )}
          
          {/* 使用说明 */}
          <Alert
            message="使用说明"
            description={
              <div style={{ fontSize: '12px' }}>
                <p>1. 选择绘制工具后，在画布上拖拽绘制区域</p>
                <p>2. 点击区域可选中并编辑属性</p>
                <p>3. 拖拽区域可调整位置和大小</p>
                <p>4. 使用预览模式查看最终效果</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Sider>
      </Layout>
    </Modal>
  );
};

export default TemplateDesigner;