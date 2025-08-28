import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Transformer } from 'react-konva';
import {
  Layout,
  Card,
  Button,
  Upload,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Divider,
  Typography,
  Row,
  Col,
  Tabs,
  Modal,
  message,
  Tooltip,
  Switch,
  Badge,
  Tag
} from 'antd';
import {
  UploadOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DragOutlined,
  AimOutlined,
  BarcodeOutlined,
  CheckSquareOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  UndoOutlined,
  RedoOutlined,
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import useImage from 'use-image';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;

// 区域类型定义
interface TemplateRegion {
  id: string;
  type: 'anchor' | 'barcode' | 'objective' | 'subjective';
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  properties: {
    // 定位点属性
    anchorId?: string;
    precision?: 'high' | 'medium' | 'low';
    
    // 条码区属性
    barcodeType?: 'code128' | 'qr' | 'datamatrix';
    
    // 客观题属性
    startQuestionNumber?: number;
    questionCount?: number;
    optionsPerQuestion?: number;
    questionsPerRow?: number;
    layout?: 'horizontal' | 'vertical';
    scorePerQuestion?: number;
    
    // 主观题属性
    questionNumber?: number;
    totalScore?: number;
    questionType?: 'essay' | 'calculation' | 'analysis' | 'design' | 'other';
  };
}

// 模板数据结构
interface TemplateData {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage?: string;
  regions: TemplateRegion[];
  metadata: {
    examName?: string;
    subject?: string;
    totalQuestions?: number;
    totalScore?: number;
  };
}

// 工具模式
type ToolMode = 'select' | 'anchor' | 'barcode' | 'objective' | 'subjective' | 'pan' | 'zoom';

const AnswerSheetTemplateDesigner: React.FC = () => {
  // 状态管理
  const [templateData, setTemplateData] = useState<TemplateData>({
    id: '',
    name: '新建模板',
    description: '',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvasWidth: 800,
    canvasHeight: 1200,
    regions: [],
    metadata: {}
  });
  
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>('');
  const [backgroundImage] = useImage(backgroundImageUrl);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [scale, setScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState({ x: 0, y: 0 });
  const [previewMode, setPreviewMode] = useState(false);
  
  // 引用
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 历史记录管理
  const [history, setHistory] = useState<TemplateData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // 添加到历史记录
  const addToHistory = useCallback((data: TemplateData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...data, updatedAt: new Date().toISOString() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  // 撤销操作
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTemplateData(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);
  
  // 重做操作
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTemplateData(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);
  
  // 上传背景图片
  const handleBackgroundUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setBackgroundImageUrl(imageUrl);
      
      // 创建临时图片元素获取尺寸
      const img = new Image();
      img.onload = () => {
        setTemplateData(prev => ({
          ...prev,
          canvasWidth: img.width,
          canvasHeight: img.height,
          backgroundImage: imageUrl
        }));
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
    return false; // 阻止默认上传行为
  }, []);
  
  // 生成唯一ID
  const generateId = () => `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 创建新区域
  const createRegion = useCallback((type: TemplateRegion['type'], x: number, y: number, width: number, height: number) => {
    const newRegion: TemplateRegion = {
      id: generateId(),
      type,
      x,
      y,
      width,
      height,
      name: `${getRegionTypeName(type)}_${templateData.regions.filter(r => r.type === type).length + 1}`,
      properties: getDefaultProperties(type)
    };
    
    const newTemplateData = {
      ...templateData,
      regions: [...templateData.regions, newRegion]
    };
    
    setTemplateData(newTemplateData);
    addToHistory(newTemplateData);
    setSelectedRegionId(newRegion.id);
    setToolMode('select');
  }, [templateData, addToHistory]);
  
  // 获取区域类型名称
  const getRegionTypeName = (type: TemplateRegion['type']) => {
    const names = {
      anchor: '定位点',
      barcode: '条码区',
      objective: '客观题',
      subjective: '主观题'
    };
    return names[type];
  };
  
  // 获取默认属性
  const getDefaultProperties = (type: TemplateRegion['type']) => {
    switch (type) {
      case 'anchor':
        return { anchorId: 'A1', precision: 'high' as const };
      case 'barcode':
        return { barcodeType: 'code128' as const };
      case 'objective':
        return {
          startQuestionNumber: 1,
          questionCount: 10,
          optionsPerQuestion: 4,
          questionsPerRow: 5,
          layout: 'horizontal' as const,
          scorePerQuestion: 2
        };
      case 'subjective':
        return {
          questionNumber: 1,
          totalScore: 10,
          questionType: 'essay' as const
        };
      default:
        return {};
    }
  };
  
  // 画布鼠标事件处理
  const handleStageMouseDown = useCallback((e: any) => {
    if (toolMode === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedRegionId('');
      }
      return;
    }
    
    if (toolMode === 'pan') {
      return;
    }
    
    if (['anchor', 'barcode', 'objective', 'subjective'].includes(toolMode)) {
      const pos = e.target.getStage().getPointerPosition();
      const adjustedPos = {
        x: (pos.x - stagePosition.x) / scale,
        y: (pos.y - stagePosition.y) / scale
      };
      
      setIsDrawing(true);
      setDrawingStart(adjustedPos);
    }
  }, [toolMode, scale, stagePosition]);
  
  const handleStageMouseMove = useCallback((e: any) => {
    if (!isDrawing) return;
    
    // 实时显示绘制区域的逻辑可以在这里实现
  }, [isDrawing]);
  
  const handleStageMouseUp = useCallback((e: any) => {
    if (!isDrawing) return;
    
    const pos = e.target.getStage().getPointerPosition();
    const adjustedPos = {
      x: (pos.x - stagePosition.x) / scale,
      y: (pos.y - stagePosition.y) / scale
    };
    
    const width = Math.abs(adjustedPos.x - drawingStart.x);
    const height = Math.abs(adjustedPos.y - drawingStart.y);
    
    if (width > 10 && height > 10) { // 最小尺寸限制
      const x = Math.min(drawingStart.x, adjustedPos.x);
      const y = Math.min(drawingStart.y, adjustedPos.y);
      
      createRegion(toolMode as TemplateRegion['type'], x, y, width, height);
    }
    
    setIsDrawing(false);
  }, [isDrawing, drawingStart, scale, stagePosition, toolMode, createRegion]);
  
  // 区域选择处理
  const handleRegionClick = useCallback((regionId: string) => {
    setSelectedRegionId(regionId);
    setToolMode('select');
  }, []);
  
  // 更新区域属性
  const updateRegionProperties = useCallback((regionId: string, properties: Partial<TemplateRegion['properties']>) => {
    const newTemplateData = {
      ...templateData,
      regions: templateData.regions.map(region =>
        region.id === regionId
          ? { ...region, properties: { ...region.properties, ...properties } }
          : region
      )
    };
    
    setTemplateData(newTemplateData);
    addToHistory(newTemplateData);
  }, [templateData, addToHistory]);
  
  // 删除区域
  const deleteRegion = useCallback((regionId: string) => {
    const newTemplateData = {
      ...templateData,
      regions: templateData.regions.filter(region => region.id !== regionId)
    };
    
    setTemplateData(newTemplateData);
    addToHistory(newTemplateData);
    setSelectedRegionId('');
  }, [templateData, addToHistory]);
  
  // 保存模板
  const saveTemplate = useCallback(() => {
    const templateJson = JSON.stringify(templateData, null, 2);
    const blob = new Blob([templateJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateData.name || '答题卡模板'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    message.success('模板保存成功');
  }, [templateData]);
  
  // 加载模板
  const loadTemplate = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const templateData = JSON.parse(e.target?.result as string);
        setTemplateData(templateData);
        if (templateData.backgroundImage) {
          setBackgroundImageUrl(templateData.backgroundImage);
        }
        addToHistory(templateData);
        message.success('模板加载成功');
      } catch (error) {
        message.error('模板文件格式错误');
      }
    };
    reader.readAsText(file);
    return false;
  }, [addToHistory]);
  
  // 获取选中的区域
  const selectedRegion = templateData.regions.find(region => region.id === selectedRegionId);
  
  // 渲染区域
  const renderRegion = (region: TemplateRegion) => {
    const isSelected = region.id === selectedRegionId;
    const colors = {
      anchor: '#ff4d4f',
      barcode: '#1890ff',
      objective: '#52c41a',
      subjective: '#faad14'
    };
    
    return (
      <React.Fragment key={region.id}>
        <Rect
          x={region.x}
          y={region.y}
          width={region.width}
          height={region.height}
          stroke={colors[region.type]}
          strokeWidth={isSelected ? 3 : 2}
          fill={`${colors[region.type]}20`}
          dash={region.type === 'anchor' ? [5, 5] : undefined}
          onClick={() => handleRegionClick(region.id)}
          onTap={() => handleRegionClick(region.id)}
        />
        <Text
          x={region.x + 5}
          y={region.y + 5}
          text={region.name}
          fontSize={12}
          fill={colors[region.type]}
          fontStyle="bold"
        />
      </React.Fragment>
    );
  };
  
  // 工具栏
  const renderToolbar = () => (
    <Space wrap style={{ marginBottom: 16 }}>
      <Button.Group>
        <Tooltip title="选择工具">
          <Button
            type={toolMode === 'select' ? 'primary' : 'default'}
            icon={<DragOutlined />}
            onClick={() => setToolMode('select')}
          />
        </Tooltip>
        <Tooltip title="平移画布">
          <Button
            type={toolMode === 'pan' ? 'primary' : 'default'}
            icon={<DragOutlined />}
            onClick={() => setToolMode('pan')}
          />
        </Tooltip>
      </Button.Group>
      
      <Divider type="vertical" />
      
      <Button.Group>
        <Tooltip title="添加定位点">
          <Button
            type={toolMode === 'anchor' ? 'primary' : 'default'}
            icon={<AimOutlined />}
            onClick={() => setToolMode('anchor')}
          >
            定位点
          </Button>
        </Tooltip>
        <Tooltip title="添加条码区">
          <Button
            type={toolMode === 'barcode' ? 'primary' : 'default'}
            icon={<BarcodeOutlined />}
            onClick={() => setToolMode('barcode')}
          >
            条码区
          </Button>
        </Tooltip>
        <Tooltip title="添加客观题">
          <Button
            type={toolMode === 'objective' ? 'primary' : 'default'}
            icon={<CheckSquareOutlined />}
            onClick={() => setToolMode('objective')}
          >
            客观题
          </Button>
        </Tooltip>
        <Tooltip title="添加主观题">
          <Button
            type={toolMode === 'subjective' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => setToolMode('subjective')}
          >
            主观题
          </Button>
        </Tooltip>
      </Button.Group>
      
      <Divider type="vertical" />
      
      <Button.Group>
        <Tooltip title="放大">
          <Button
            icon={<ZoomInOutlined />}
            onClick={() => setScale(prev => Math.min(prev * 1.2, 3))}
          />
        </Tooltip>
        <Tooltip title="缩小">
          <Button
            icon={<ZoomOutOutlined />}
            onClick={() => setScale(prev => Math.max(prev / 1.2, 0.1))}
          />
        </Tooltip>
        <Text style={{ margin: '0 8px' }}>{Math.round(scale * 100)}%</Text>
      </Button.Group>
      
      <Divider type="vertical" />
      
      <Button.Group>
        <Tooltip title="撤销">
          <Button
            icon={<UndoOutlined />}
            disabled={historyIndex <= 0}
            onClick={undo}
          />
        </Tooltip>
        <Tooltip title="重做">
          <Button
            icon={<RedoOutlined />}
            disabled={historyIndex >= history.length - 1}
            onClick={redo}
          />
        </Tooltip>
      </Button.Group>
      
      <Divider type="vertical" />
      
      <Switch
        checkedChildren="预览"
        unCheckedChildren="编辑"
        checked={previewMode}
        onChange={setPreviewMode}
      />
    </Space>
  );
  
  // 属性面板
  const renderPropertiesPanel = () => {
    if (!selectedRegion) {
      return (
        <Card title="属性设置" size="small">
          <Text type="secondary">请选择一个区域来编辑其属性</Text>
        </Card>
      );
    }
    
    return (
      <Card title={`${getRegionTypeName(selectedRegion.type)}属性`} size="small">
        <Form layout="vertical" size="small">
          <Form.Item label="区域名称">
            <Input
              value={selectedRegion.name}
              onChange={(e) => {
                const newTemplateData = {
                  ...templateData,
                  regions: templateData.regions.map(region =>
                    region.id === selectedRegion.id
                      ? { ...region, name: e.target.value }
                      : region
                  )
                };
                setTemplateData(newTemplateData);
              }}
            />
          </Form.Item>
          
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item label="X坐标">
                <InputNumber
                  value={Math.round(selectedRegion.x)}
                  onChange={(value) => {
                    const newTemplateData = {
                      ...templateData,
                      regions: templateData.regions.map(region =>
                        region.id === selectedRegion.id
                          ? { ...region, x: value || 0 }
                          : region
                      )
                    };
                    setTemplateData(newTemplateData);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Y坐标">
                <InputNumber
                  value={Math.round(selectedRegion.y)}
                  onChange={(value) => {
                    const newTemplateData = {
                      ...templateData,
                      regions: templateData.regions.map(region =>
                        region.id === selectedRegion.id
                          ? { ...region, y: value || 0 }
                          : region
                      )
                    };
                    setTemplateData(newTemplateData);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item label="宽度">
                <InputNumber
                  value={Math.round(selectedRegion.width)}
                  onChange={(value) => {
                    const newTemplateData = {
                      ...templateData,
                      regions: templateData.regions.map(region =>
                        region.id === selectedRegion.id
                          ? { ...region, width: value || 1 }
                          : region
                      )
                    };
                    setTemplateData(newTemplateData);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="高度">
                <InputNumber
                  value={Math.round(selectedRegion.height)}
                  onChange={(value) => {
                    const newTemplateData = {
                      ...templateData,
                      regions: templateData.regions.map(region =>
                        region.id === selectedRegion.id
                          ? { ...region, height: value || 1 }
                          : region
                      )
                    };
                    setTemplateData(newTemplateData);
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          {/* 根据区域类型显示特定属性 */}
          {selectedRegion.type === 'anchor' && (
            <>
              <Form.Item label="定位点标识">
                <Input
                  value={selectedRegion.properties.anchorId}
                  onChange={(e) => updateRegionProperties(selectedRegion.id, { anchorId: e.target.value })}
                  placeholder="如：A1, B2"
                />
              </Form.Item>
              <Form.Item label="定位精度">
                <Select
                  value={selectedRegion.properties.precision}
                  onChange={(value) => updateRegionProperties(selectedRegion.id, { precision: value })}
                >
                  <Option value="high">高精度</Option>
                  <Option value="medium">中等精度</Option>
                  <Option value="low">低精度</Option>
                </Select>
              </Form.Item>
            </>
          )}
          
          {selectedRegion.type === 'barcode' && (
            <Form.Item label="条码类型">
              <Select
                value={selectedRegion.properties.barcodeType}
                onChange={(value) => updateRegionProperties(selectedRegion.id, { barcodeType: value })}
              >
                <Option value="code128">Code128</Option>
                <Option value="qr">二维码</Option>
                <Option value="datamatrix">DataMatrix</Option>
              </Select>
            </Form.Item>
          )}
          
          {selectedRegion.type === 'objective' && (
            <>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item label="起始题号">
                    <InputNumber
                      value={selectedRegion.properties.startQuestionNumber}
                      onChange={(value) => updateRegionProperties(selectedRegion.id, { startQuestionNumber: value })}
                      min={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="题目数量">
                    <InputNumber
                      value={selectedRegion.properties.questionCount}
                      onChange={(value) => updateRegionProperties(selectedRegion.id, { questionCount: value })}
                      min={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item label="选项数">
                    <InputNumber
                      value={selectedRegion.properties.optionsPerQuestion}
                      onChange={(value) => updateRegionProperties(selectedRegion.id, { optionsPerQuestion: value })}
                      min={2}
                      max={8}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="每行题数">
                    <InputNumber
                      value={selectedRegion.properties.questionsPerRow}
                      onChange={(value) => updateRegionProperties(selectedRegion.id, { questionsPerRow: value })}
                      min={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item label="每题分值">
                <InputNumber
                  value={selectedRegion.properties.scorePerQuestion}
                  onChange={(value) => updateRegionProperties(selectedRegion.id, { scorePerQuestion: value })}
                  min={0.5}
                  step={0.5}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Form.Item label="布局方式">
                <Select
                  value={selectedRegion.properties.layout}
                  onChange={(value) => updateRegionProperties(selectedRegion.id, { layout: value })}
                >
                  <Option value="horizontal">水平排列</Option>
                  <Option value="vertical">垂直排列</Option>
                </Select>
              </Form.Item>
            </>
          )}
          
          {selectedRegion.type === 'subjective' && (
            <>
              <Form.Item label="题号">
                <InputNumber
                  value={selectedRegion.properties.questionNumber}
                  onChange={(value) => updateRegionProperties(selectedRegion.id, { questionNumber: value })}
                  min={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Form.Item label="总分值">
                <InputNumber
                  value={selectedRegion.properties.totalScore}
                  onChange={(value) => updateRegionProperties(selectedRegion.id, { totalScore: value })}
                  min={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Form.Item label="题目类型">
                <Select
                  value={selectedRegion.properties.questionType}
                  onChange={(value) => updateRegionProperties(selectedRegion.id, { questionType: value })}
                >
                  <Option value="essay">论述题</Option>
                  <Option value="calculation">计算题</Option>
                  <Option value="analysis">分析题</Option>
                  <Option value="design">设计题</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </>
          )}
          
          <Divider />
          
          <Space>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteRegion(selectedRegion.id)}
              size="small"
            >
              删除区域
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                const newRegion = {
                  ...selectedRegion,
                  id: generateId(),
                  name: `${selectedRegion.name}_副本`,
                  x: selectedRegion.x + 20,
                  y: selectedRegion.y + 20
                };
                const newTemplateData = {
                  ...templateData,
                  regions: [...templateData.regions, newRegion]
                };
                setTemplateData(newTemplateData);
                addToHistory(newTemplateData);
              }}
              size="small"
            >
              复制
            </Button>
          </Space>
        </Form>
      </Card>
    );
  };
  
  // 区域列表
  const renderRegionList = () => (
    <Card title="区域列表" size="small" style={{ marginTop: 16 }}>
      {templateData.regions.length === 0 ? (
        <Text type="secondary">暂无区域，请在画布上绘制区域</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {templateData.regions.map(region => (
            <div
              key={region.id}
              style={{
                padding: 8,
                border: `1px solid ${region.id === selectedRegionId ? '#1890ff' : '#d9d9d9'}`,
                borderRadius: 4,
                cursor: 'pointer',
                backgroundColor: region.id === selectedRegionId ? '#f0f8ff' : 'transparent'
              }}
              onClick={() => setSelectedRegionId(region.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Badge
                    color={{
                      anchor: '#ff4d4f',
                      barcode: '#1890ff',
                      objective: '#52c41a',
                      subjective: '#faad14'
                    }[region.type]}
                    text={region.name}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    {getRegionTypeName(region.type)} | 
                    {Math.round(region.x)},{Math.round(region.y)} | 
                    {Math.round(region.width)}×{Math.round(region.height)}
                  </div>
                </div>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRegion(region.id);
                  }}
                />
              </div>
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
  
  return (
    <Layout style={{ height: '100vh' }}>
      {/* 顶部工具栏 */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>答题卡模板设计器</Title>
          </Col>
          <Col>
            <Space>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleBackgroundUpload}
              >
                <Button icon={<UploadOutlined />}>上传背景图</Button>
              </Upload>
              
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={loadTemplate}
              >
                <Button icon={<FolderOpenOutlined />}>加载模板</Button>
              </Upload>
              
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveTemplate}
              >
                保存模板
              </Button>
              
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  // 导出预览图的逻辑
                  message.info('导出功能开发中...');
                }}
              >
                导出预览
              </Button>
            </Space>
          </Col>
        </Row>
        
        {renderToolbar()}
      </div>
      
      <Layout>
        {/* 左侧属性面板 */}
        <Sider width={320} style={{ backgroundColor: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
            <Tabs defaultActiveKey="properties" size="small">
              <TabPane tab="属性" key="properties">
                {renderPropertiesPanel()}
                {renderRegionList()}
              </TabPane>
              
              <TabPane tab="模板信息" key="template">
                <Card title="模板信息" size="small">
                  <Form layout="vertical" size="small">
                    <Form.Item label="模板名称">
                      <Input
                        value={templateData.name}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </Form.Item>
                    
                    <Form.Item label="描述">
                      <Input.TextArea
                        value={templateData.description}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </Form.Item>
                    
                    <Form.Item label="版本">
                      <Input
                        value={templateData.version}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, version: e.target.value }))}
                      />
                    </Form.Item>
                    
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item label="画布宽度">
                          <InputNumber
                            value={templateData.canvasWidth}
                            onChange={(value) => setTemplateData(prev => ({ ...prev, canvasWidth: value || 800 }))}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="画布高度">
                          <InputNumber
                            value={templateData.canvasHeight}
                            onChange={(value) => setTemplateData(prev => ({ ...prev, canvasHeight: value || 1200 }))}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
                
                <Card title="统计信息" size="small" style={{ marginTop: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>总区域数：{templateData.regions.length}</div>
                    <div>定位点：{templateData.regions.filter(r => r.type === 'anchor').length}</div>
                    <div>条码区：{templateData.regions.filter(r => r.type === 'barcode').length}</div>
                    <div>客观题：{templateData.regions.filter(r => r.type === 'objective').length}</div>
                    <div>主观题：{templateData.regions.filter(r => r.type === 'subjective').length}</div>
                  </Space>
                </Card>
              </TabPane>
            </Tabs>
          </div>
        </Sider>
        
        {/* 主画布区域 */}
        <Content style={{ backgroundColor: '#f5f5f5', position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: toolMode === 'pan' ? 'grab' : toolMode !== 'select' ? 'crosshair' : 'default'
            }}
          >
            <Stage
              ref={stageRef}
              width={window.innerWidth - 320}
              height={window.innerHeight - 120}
              scaleX={scale}
              scaleY={scale}
              x={stagePosition.x}
              y={stagePosition.y}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              draggable={toolMode === 'pan'}
              onDragEnd={(e) => {
                setStagePosition({
                  x: e.target.x(),
                  y: e.target.y()
                });
              }}
            >
              <Layer>
                {/* 背景图片 */}
                {backgroundImage && (
                  <KonvaImage
                    image={backgroundImage}
                    width={templateData.canvasWidth}
                    height={templateData.canvasHeight}
                    opacity={previewMode ? 1 : 0.7}
                  />
                )}
                
                {/* 画布边框 */}
                <Rect
                  x={0}
                  y={0}
                  width={templateData.canvasWidth}
                  height={templateData.canvasHeight}
                  stroke="#ccc"
                  strokeWidth={1}
                  fill="transparent"
                />
                
                {/* 渲染所有区域 */}
                {!previewMode && templateData.regions.map(renderRegion)}
              </Layer>
            </Stage>
          </div>
          
          {/* 状态栏 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 32,
              backgroundColor: '#fff',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 16,
              fontSize: 12,
              color: '#666'
            }}
          >
            <Space split={<Divider type="vertical" />}>
              <span>画布: {templateData.canvasWidth} × {templateData.canvasHeight}</span>
              <span>缩放: {Math.round(scale * 100)}%</span>
              <span>区域: {templateData.regions.length}</span>
              <span>工具: {{
                select: '选择',
                pan: '平移',
                anchor: '定位点',
                barcode: '条码区',
                objective: '客观题',
                subjective: '主观题'
              }[toolMode]}</span>
              {selectedRegion && <span>选中: {selectedRegion.name}</span>}
            </Space>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AnswerSheetTemplateDesigner;