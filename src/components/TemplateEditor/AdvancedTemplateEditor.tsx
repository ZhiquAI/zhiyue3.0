import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Tabs,
  Form,
  Input,
  Select,
  Row,
  Col,
  Space,
  Typography,
  Divider,
  Alert,
  InputNumber,
  Radio,
  Checkbox,
  message,
  Modal,
  Tooltip,
  Tag,
  Upload,
  Progress,
  Slider,
  Switch
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  PrinterOutlined,
  DownloadOutlined,
  SettingOutlined,
  BorderOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DragOutlined,
  EditOutlined,
  CloudUploadOutlined,
  FileImageOutlined,
  LayoutOutlined
} from '@ant-design/icons';
import { Stage, Layer, Rect, Text, Line, Circle, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import EightKThreeColumnTemplate from '../AnswerSheetTemplates/EightKThreeColumnTemplate';

const { Title, Text: AntText } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

// 预定义纸张尺寸
const PAPER_SIZES = {
  A4: { width: 210, height: 297, name: 'A4 (210×297mm)' },
  A3: { width: 297, height: 420, name: 'A3 (297×420mm)' },
  '8K': { width: 270, height: 390, name: '8K (270×390mm)' },
  '16K': { width: 195, height: 270, name: '16K (195×270mm)' },
  Letter: { width: 216, height: 279, name: 'Letter (216×279mm)' }
};

// 模板类型
const TEMPLATE_TYPES = {
  'single-column': { name: '单栏布局', description: '适合主观题较多的考试' },
  'two-column': { name: '双栏布局', description: '平衡选择题和主观题' },
  'three-column': { name: '三栏布局', description: '适合选择题为主的考试' },
  'mixed-layout': { name: '混合布局', description: '自定义复杂布局' },
  'standard-exam': { name: '标准考试', description: '通用标准化考试模板' }
};

// 区域类型
const REGION_TYPES = {
  'student_info': { name: '学生信息', color: '#f5222d', icon: '👤' },
  'barcode': { name: '条形码', color: '#fa8c16', icon: '📊' },
  'qr_code': { name: '二维码', color: '#722ed1', icon: '⚡' },
  'choice_questions': { name: '选择题', color: '#1890ff', icon: '🔘' },
  'subjective_questions': { name: '主观题', color: '#52c41a', icon: '✍️' },
  'essay': { name: '作文题', color: '#13c2c2', icon: '📝' },
  'header': { name: '页眉', color: '#eb2f96', icon: '📋' },
  'footer': { name: '页脚', color: '#666666', icon: '📄' },
  'instructions': { name: '答题说明', color: '#faad14', icon: '💡' }
};

interface Region {
  id: string;
  type: keyof typeof REGION_TYPES;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  properties: Record<string, any>;
  locked?: boolean;
}

interface TemplateConfig {
  id?: string;
  name: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  examType?: string;
  paperSize: keyof typeof PAPER_SIZES;
  templateType: keyof typeof TEMPLATE_TYPES;
  orientation: 'portrait' | 'landscape';
  dpi: number;
  margins: { top: number; right: number; bottom: number; left: number };
  regions: Region[];
  settings: {
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  };
}

interface AdvancedTemplateEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: TemplateConfig) => void;
  initialTemplate?: TemplateConfig;
  mode?: 'create' | 'edit';
}

const AdvancedTemplateEditor: React.FC<AdvancedTemplateEditorProps> = ({
  visible,
  onClose,
  onSave,
  initialTemplate,
  mode = 'create'
}) => {
  const [form] = Form.useForm();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  
  // 状态管理
  const [activeTab, setActiveTab] = useState('basic');
  const [config, setConfig] = useState<TemplateConfig>({
    name: '新建答题卡模板',
    description: '',
    subject: '数学',
    gradeLevel: '高中',
    examType: '期末考试',
    paperSize: 'A4',
    templateType: 'single-column',
    orientation: 'portrait',
    dpi: 300,
    margins: { top: 20, right: 15, bottom: 20, left: 15 },
    regions: [],
    settings: {
      showGrid: true,
      snapToGrid: true,
      gridSize: 10,
      backgroundColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 1
    }
  });
  
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<Region[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [previewMode, setPreviewMode] = useState(false);
  const [showEightKTemplate, setShowEightKTemplate] = useState(false);
  
  // 计算画布尺寸
  const mmToPx = 2.5;
  const paperConfig = PAPER_SIZES[config.paperSize];
  const canvasWidth = (config.orientation === 'portrait' ? paperConfig.width : paperConfig.height) * mmToPx;
  const canvasHeight = (config.orientation === 'portrait' ? paperConfig.height : paperConfig.width) * mmToPx;
  
  // 初始化
  useEffect(() => {
    if (visible) {
      if (initialTemplate) {
        setConfig(initialTemplate);
        form.setFieldsValue(initialTemplate);
        addToHistory(initialTemplate.regions);
      } else {
        const defaultConfig: TemplateConfig = {
          name: '新建答题卡模板',
          description: '',
          subject: '数学',
          gradeLevel: '高中',
          examType: '期末考试',
          paperSize: 'A4',
          templateType: 'single-column',
          orientation: 'portrait',
          dpi: 300,
          margins: { top: 20, right: 15, bottom: 20, left: 15 },
          regions: [],
          settings: {
            showGrid: true,
            snapToGrid: true,
            gridSize: 10,
            backgroundColor: '#ffffff',
            borderColor: '#000000',
            borderWidth: 1
          }
        };
        setConfig(defaultConfig);
        form.setFieldsValue(defaultConfig);
        setHistory([]);
        setHistoryIndex(-1);
      }
      setSelectedRegionId(null);
      setCurrentTool('select');
      setScale(1);
      setStagePos({ x: 0, y: 0 });
    }
  }, [visible, initialTemplate, form]);
  
  // 历史记录管理
  const addToHistory = (newRegions: Region[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newRegions]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const newRegions = [...history[historyIndex - 1]];
      setConfig(prev => ({ ...prev, regions: newRegions }));
      setSelectedRegionId(null);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const newRegions = [...history[historyIndex + 1]];
      setConfig(prev => ({ ...prev, regions: newRegions }));
      setSelectedRegionId(null);
    }
  };
  
  // 生成唯一ID
  const generateId = () => `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 创建新区域
  const createRegion = (type: keyof typeof REGION_TYPES) => {
    const newRegion: Region = {
      id: generateId(),
      type,
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      label: REGION_TYPES[type].name,
      properties: getDefaultProperties(type)
    };
    
    const newRegions = [...config.regions, newRegion];
    setConfig(prev => ({ ...prev, regions: newRegions }));
    addToHistory(newRegions);
    setSelectedRegionId(newRegion.id);
    setCurrentTool('select');
  };
  
  // 获取默认属性
  const getDefaultProperties = (type: keyof typeof REGION_TYPES) => {
    switch (type) {
      case 'choice_questions':
        return {
          questionStart: 1,
          questionEnd: 20,
          choiceCount: 4,
          columns: 1,
          fontSize: 10
        };
      case 'subjective_questions':
        return {
          questionStart: 1,
          questionEnd: 5,
          linesPerQuestion: 8,
          fontSize: 10
        };
      case 'student_info':
        return {
          fields: ['姓名', '学号', '班级', '考号'],
          fontSize: 12
        };
      case 'essay':
        return {
          lines: 20,
          fontSize: 10,
          title: '作文题'
        };
      default:
        return {
          fontSize: 10,
          textAlign: 'left'
        };
    }
  };
  
  // 更新区域
  const updateRegion = (regionId: string, updates: Partial<Region>) => {
    const newRegions = config.regions.map(r => 
      r.id === regionId ? { ...r, ...updates } : r
    );
    setConfig(prev => ({ ...prev, regions: newRegions }));
    addToHistory(newRegions);
  };
  
  // 删除区域
  const deleteRegion = (regionId: string) => {
    const newRegions = config.regions.filter(r => r.id !== regionId);
    setConfig(prev => ({ ...prev, regions: newRegions }));
    addToHistory(newRegions);
    setSelectedRegionId(null);
  };
  
  // 复制区域
  const duplicateRegion = (regionId: string) => {
    const region = config.regions.find(r => r.id === regionId);
    if (region) {
      const newRegion: Region = {
        ...region,
        id: generateId(),
        x: region.x + 20,
        y: region.y + 20,
        label: `${region.label} (副本)`
      };
      
      const newRegions = [...config.regions, newRegion];
      setConfig(prev => ({ ...prev, regions: newRegions }));
      addToHistory(newRegions);
      setSelectedRegionId(newRegion.id);
    }
  };
  
  // 鼠标事件处理
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (currentTool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedRegionId(null);
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
  };
  
  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
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
        const regionType = currentTool as keyof typeof REGION_TYPES;
        const newRegion: Region = {
          id: generateId(),
          type: regionType,
          x: Math.min(pos.x, drawStart.x),
          y: Math.min(pos.y, drawStart.y),
          width,
          height,
          label: REGION_TYPES[regionType].name,
          properties: getDefaultProperties(regionType)
        };
        
        const newRegions = [...config.regions, newRegion];
        setConfig(prev => ({ ...prev, regions: newRegions }));
        addToHistory(newRegions);
        setSelectedRegionId(newRegion.id);
      }
    }
    
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentTool('select');
  };
  
  // 选择区域
  const handleRegionClick = (regionId: string) => {
    setSelectedRegionId(regionId);
  };
  
  // 更新Transformer
  useEffect(() => {
    if (selectedRegionId && transformerRef.current && layerRef.current) {
      const selectedNode = layerRef.current.findOne(`#${selectedRegionId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedRegionId]);
  
  // 处理区域变换
  const handleTransformEnd = (regionId: string) => {
    const node = layerRef.current?.findOne(`#${regionId}`);
    if (node) {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      node.scaleX(1);
      node.scaleY(1);
      
      updateRegion(regionId, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY)
      });
    }
  };
  
  // 渲染网格
  const renderGrid = () => {
    if (!config.settings.showGrid) return null;
    
    const lines = [];
    const gridSize = config.settings.gridSize * mmToPx;
    
    // 垂直线
    for (let i = 0; i <= canvasWidth; i += gridSize) {
      lines.push(
        <Line
          key={`v${i}`}
          points={[i, 0, i, canvasHeight]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    
    // 水平线
    for (let i = 0; i <= canvasHeight; i += gridSize) {
      lines.push(
        <Line
          key={`h${i}`}
          points={[0, i, canvasWidth, i]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    
    return lines;
  };
  
  // 渲染区域
  const renderRegions = () => {
    return config.regions.map((region) => {
      const regionType = REGION_TYPES[region.type];
      
      return (
        <Group key={region.id}>
          <Rect
            id={region.id}
            x={region.x}
            y={region.y}
            width={region.width}
            height={region.height}
            fill={regionType.color + '20'}
            stroke={regionType.color}
            strokeWidth={selectedRegionId === region.id ? 3 : 1}
            draggable={!previewMode && !region.locked}
            onClick={() => handleRegionClick(region.id)}
            onTransformEnd={() => handleTransformEnd(region.id)}
            onDragEnd={() => handleTransformEnd(region.id)}
          />
          <Text
            x={region.x + 5}
            y={region.y + 5}
            text={`${regionType.icon} ${region.label}`}
            fontSize={10}
            fill={regionType.color}
            fontStyle="bold"
            listening={false}
          />
          {region.locked && (
            <Text
              x={region.x + region.width - 15}
              y={region.y + 5}
              text="🔒"
              fontSize={10}
              listening={false}
            />
          )}
        </Group>
      );
    });
  };
  
  // 保存模板
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (config.regions.length === 0) {
        message.warning('请至少添加一个区域');
        return;
      }
      
      const templateData: TemplateConfig = {
        ...config,
        ...values
      };
      
      onSave(templateData);
      message.success('模板保存成功');
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('保存模板失败');
    }
  };
  
  // 应用预设模板
  const applyPresetTemplate = (templateType: keyof typeof TEMPLATE_TYPES) => {
    let presetRegions: Region[] = [];
    
    switch (templateType) {
      case 'three-column':
        // 三栏布局预设
        const columnWidth = (canvasWidth - 60) / 3;
        for (let i = 0; i < 3; i++) {
          presetRegions.push({
            id: generateId(),
            type: 'choice_questions',
            x: 20 + i * (columnWidth + 10),
            y: 100,
            width: columnWidth,
            height: canvasHeight - 200,
            label: `第${i + 1}栏选择题`,
            properties: {
              questionStart: i * 20 + 1,
              questionEnd: (i + 1) * 20,
              choiceCount: 4,
              columns: 1,
              fontSize: 10
            }
          });
        }
        break;
        
      case 'standard-exam':
        // 标准考试模板
        presetRegions = [
          {
            id: generateId(),
            type: 'student_info',
            x: 20,
            y: 60,
            width: canvasWidth - 40,
            height: 50,
            label: '学生信息区域',
            properties: {
              fields: ['姓名', '学号', '班级', '考号'],
              fontSize: 12
            }
          },
          {
            id: generateId(),
            type: 'choice_questions',
            x: 20,
            y: 130,
            width: canvasWidth / 2 - 30,
            height: 300,
            label: '选择题区域',
            properties: {
              questionStart: 1,
              questionEnd: 30,
              choiceCount: 4,
              columns: 2,
              fontSize: 10
            }
          },
          {
            id: generateId(),
            type: 'subjective_questions',
            x: canvasWidth / 2 + 10,
            y: 130,
            width: canvasWidth / 2 - 30,
            height: 300,
            label: '主观题区域',
            properties: {
              questionStart: 31,
              questionEnd: 35,
              linesPerQuestion: 8,
              fontSize: 10
            }
          }
        ];
        break;
    }
    
    setConfig(prev => ({ ...prev, regions: presetRegions, templateType }));
    addToHistory(presetRegions);
    message.success(`已应用${TEMPLATE_TYPES[templateType].name}模板`);
  };
  
  // 导出为图片
  const handleExportImage = () => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2
      });
      
      const link = document.createElement('a');
      link.download = `${config.name}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('模板图片导出成功');
    }
  };
  
  return (
    <Modal
      title={`${mode === 'create' ? '创建' : '编辑'}答题卡模板 - 高级编辑器`}
      open={visible}
      onCancel={onClose}
      width={1600}
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="8k-template" type="dashed" onClick={() => setShowEightKTemplate(true)}>
          8K三栏模板
        </Button>,
        <Button key="preview" icon={<EyeOutlined />} onClick={() => setPreviewMode(!previewMode)}>
          {previewMode ? '编辑模式' : '预览模式'}
        </Button>,
        <Button key="export" icon={<DownloadOutlined />} onClick={handleExportImage}>
          导出图片
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存模板
        </Button>
      ]}
    >
      <Row gutter={16}>
        {/* 左侧工具栏 */}
        <Col span={6}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
            <TabPane tab="基本信息" key="basic">
              <Card size="small" style={{ marginBottom: 16 }}>
                <Form
                  form={form}
                  layout="vertical"
                  size="small"
                  onValuesChange={(_, allValues) => {
                    setConfig(prev => ({ ...prev, ...allValues }));
                  }}
                >
                  <Form.Item
                    name="name"
                    label="模板名称"
                    rules={[{ required: true, message: '请输入模板名称' }]}
                  >
                    <Input placeholder="请输入模板名称" />
                  </Form.Item>
                  
                  <Form.Item name="description" label="模板描述">
                    <TextArea rows={2} placeholder="请输入模板描述" />
                  </Form.Item>
                  
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item name="subject" label="科目">
                        <Select>
                          <Select.Option value="语文">语文</Select.Option>
                          <Select.Option value="数学">数学</Select.Option>
                          <Select.Option value="英语">英语</Select.Option>
                          <Select.Option value="物理">物理</Select.Option>
                          <Select.Option value="化学">化学</Select.Option>
                          <Select.Option value="生物">生物</Select.Option>
                          <Select.Option value="历史">历史</Select.Option>
                          <Select.Option value="地理">地理</Select.Option>
                          <Select.Option value="政治">政治</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="gradeLevel" label="年级">
                        <Select>
                          <Select.Option value="小学">小学</Select.Option>
                          <Select.Option value="初中">初中</Select.Option>
                          <Select.Option value="高中">高中</Select.Option>
                          <Select.Option value="大学">大学</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item name="examType" label="考试类型">
                    <Select>
                      <Select.Option value="期中考试">期中考试</Select.Option>
                      <Select.Option value="期末考试">期末考试</Select.Option>
                      <Select.Option value="月考">月考</Select.Option>
                      <Select.Option value="模拟考试">模拟考试</Select.Option>
                      <Select.Option value="单元测试">单元测试</Select.Option>
                    </Select>
                  </Form.Item>
                </Form>
              </Card>
              
              {/* 页面设置 */}
              <Card title="页面设置" size="small">
                <Row gutter={8}>
                  <Col span={12}>
                    <div style={{ marginBottom: 8, fontSize: '12px' }}>纸张尺寸</div>
                    <Select
                      value={config.paperSize}
                      onChange={(value) => setConfig(prev => ({ ...prev, paperSize: value }))}
                      style={{ width: '100%' }}
                      size="small"
                    >
                      {Object.entries(PAPER_SIZES).map(([key, size]) => (
                        <Select.Option key={key} value={key}>
                          {size.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8, fontSize: '12px' }}>方向</div>
                    <Radio.Group
                      value={config.orientation}
                      onChange={(e) => setConfig(prev => ({ ...prev, orientation: e.target.value }))}
                      size="small"
                    >
                      <Radio.Button value="portrait">竖向</Radio.Button>
                      <Radio.Button value="landscape">横向</Radio.Button>
                    </Radio.Group>
                  </Col>
                </Row>
                
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8, fontSize: '12px' }}>分辨率 (DPI)</div>
                  <InputNumber
                    value={config.dpi}
                    onChange={(value) => setConfig(prev => ({ ...prev, dpi: value || 300 }))}
                    min={150}
                    max={600}
                    style={{ width: '100%' }}
                    size="small"
                  />
                </div>
              </Card>
            </TabPane>
            
            <TabPane tab="绘制工具" key="tools">
              {!previewMode && (
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      type={currentTool === 'select' ? 'primary' : 'default'}
                      icon={<DragOutlined />}
                      onClick={() => setCurrentTool('select')}
                      block
                      size="small"
                    >
                      选择工具
                    </Button>
                    
                    <Divider style={{ margin: '8px 0' }}>区域类型</Divider>
                    
                    {Object.entries(REGION_TYPES).map(([key, type]) => (
                      <Button
                        key={key}
                        type={currentTool === key ? 'primary' : 'default'}
                        onClick={() => setCurrentTool(key)}
                        block
                        size="small"
                        style={{ textAlign: 'left' }}
                      >
                        {type.icon} {type.name}
                      </Button>
                    ))}
                  </Space>
                </Card>
              )}
              
              {/* 预设模板 */}
              <Card title="预设模板" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {Object.entries(TEMPLATE_TYPES).map(([key, type]) => (
                    <Tooltip key={key} title={type.description}>
                      <Button
                        onClick={() => applyPresetTemplate(key as keyof typeof TEMPLATE_TYPES)}
                        block
                        size="small"
                      >
                        {type.name}
                      </Button>
                    </Tooltip>
                  ))}
                </Space>
              </Card>
            </TabPane>
            
            <TabPane tab="设置" key="settings">
              <Card title="显示设置" size="small" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <Checkbox
                    checked={config.settings.showGrid}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      settings: { ...prev.settings, showGrid: e.target.checked }
                    }))}
                  >
                    显示网格
                  </Checkbox>
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <Checkbox
                    checked={config.settings.snapToGrid}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      settings: { ...prev.settings, snapToGrid: e.target.checked }
                    }))}
                  >
                    对齐网格
                  </Checkbox>
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <div style={{ marginBottom: 4, fontSize: '12px' }}>网格大小 (mm)</div>
                  <Slider
                    value={config.settings.gridSize}
                    onChange={(value) => setConfig(prev => ({
                      ...prev,
                      settings: { ...prev.settings, gridSize: value }
                    }))}
                    min={5}
                    max={20}
                    step={1}
                  />
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <div style={{ marginBottom: 4, fontSize: '12px' }}>缩放比例</div>
                  <Row gutter={8}>
                    <Col span={8}>
                      <Button
                        icon={<ZoomOutOutlined />}
                        onClick={() => setScale(Math.max(0.1, scale - 0.1))}
                        size="small"
                      />
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', lineHeight: '24px', fontSize: '12px' }}>
                        {Math.round(scale * 100)}%
                      </div>
                    </Col>
                    <Col span={8}>
                      <Button
                        icon={<ZoomInOutlined />}
                        onClick={() => setScale(Math.min(3, scale + 0.1))}
                        size="small"
                      />
                    </Col>
                  </Row>
                </div>
              </Card>
              
              {/* 操作按钮 */}
              <Card title="操作" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Tooltip title="撤销">
                        <Button
                          icon={<UndoOutlined />}
                          onClick={undo}
                          disabled={historyIndex <= 0}
                          block
                          size="small"
                        >
                          撤销
                        </Button>
                      </Tooltip>
                    </Col>
                    <Col span={12}>
                      <Tooltip title="重做">
                        <Button
                          icon={<RedoOutlined />}
                          onClick={redo}
                          disabled={historyIndex >= history.length - 1}
                          block
                          size="small"
                        >
                          重做
                        </Button>
                      </Tooltip>
                    </Col>
                  </Row>
                  
                  {selectedRegionId && (
                    <Row gutter={8}>
                      <Col span={12}>
                        <Button
                          icon={<CopyOutlined />}
                          onClick={() => duplicateRegion(selectedRegionId)}
                          block
                          size="small"
                        >
                          复制
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          icon={<DeleteOutlined />}
                          onClick={() => deleteRegion(selectedRegionId)}
                          danger
                          block
                          size="small"
                        >
                          删除
                        </Button>
                      </Col>
                    </Row>
                  )}
                </Space>
              </Card>
            </TabPane>
          </Tabs>
        </Col>
        
        {/* 中间画布区域 */}
        <Col span={12}>
          <Card 
            title="模板设计" 
            size="small" 
            style={{ height: '75vh', overflow: 'hidden' }}
            extra={
              <Space>
                <AntText type="secondary">
                  {PAPER_SIZES[config.paperSize].name}
                </AntText>
                <Tag color={config.orientation === 'portrait' ? 'blue' : 'green'}>
                  {config.orientation === 'portrait' ? '竖向' : '横向'}
                </Tag>
              </Space>
            }
          >
            <div style={{ 
              width: '100%', 
              height: '100%', 
              overflow: 'auto',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: '#fafafa',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '20px'
            }}>
              <div style={{
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '4px'
              }}>
                <Stage
                  ref={stageRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  scaleX={scale}
                  scaleY={scale}
                  x={stagePos.x}
                  y={stagePos.y}
                  onMouseDown={handleMouseDown}
                  onMouseup={handleMouseUp}
                  style={{ 
                    backgroundColor: config.settings.backgroundColor,
                    cursor: currentTool === 'select' ? 'default' : 'crosshair'
                  }}
                >
                  <Layer ref={layerRef}>
                    {/* 页面边框 */}
                    <Rect
                      x={0}
                      y={0}
                      width={canvasWidth}
                      height={canvasHeight}
                      stroke={config.settings.borderColor}
                      strokeWidth={config.settings.borderWidth}
                      fill={config.settings.backgroundColor}
                    />
                    
                    {/* 网格 */}
                    {renderGrid()}
                    
                    {/* 渲染所有区域 */}
                    {renderRegions()}
                    
                    {/* Transformer */}
                    {!previewMode && <Transformer ref={transformerRef} />}
                  </Layer>
                </Stage>
              </div>
            </div>
          </Card>
        </Col>
        
        {/* 右侧属性面板 */}
        <Col span={6}>
          <Card title="区域列表" size="small" style={{ marginBottom: 16 }}>
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              {config.regions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                  暂无区域
                </div>
              ) : (
                config.regions.map((region) => {
                  const regionType = REGION_TYPES[region.type];
                  return (
                    <div
                      key={region.id}
                      style={{
                        padding: '8px',
                        marginBottom: '4px',
                        border: selectedRegionId === region.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: selectedRegionId === region.id ? '#f0f8ff' : 'white'
                      }}
                      onClick={() => setSelectedRegionId(region.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Tag color={regionType.color}>
                            {regionType.icon} {region.label}
                          </Tag>
                          {region.locked && <Tag color="red">🔒</Tag>}
                        </div>
                        {!previewMode && (
                          <Space size="small">
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateRegion(region.id);
                              }}
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              danger
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRegion(region.id);
                              }}
                            />
                          </Space>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        位置: ({Math.round(region.x)}, {Math.round(region.y)})
                        <br />
                        尺寸: {Math.round(region.width)} × {Math.round(region.height)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          
          {/* 选中区域属性 */}
          {selectedRegionId && !previewMode && (
            <Card title="区域属性" size="small">
              {(() => {
                const selectedRegion = config.regions.find(r => r.id === selectedRegionId);
                if (!selectedRegion) return null;
                
                return (
                  <div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>区域标签</label>
                      <Input
                        size="small"
                        value={selectedRegion.label}
                        onChange={(e) => updateRegion(selectedRegionId, { label: e.target.value })}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 12 }}>
                      <Checkbox
                        checked={selectedRegion.locked}
                        onChange={(e) => updateRegion(selectedRegionId, { locked: e.target.checked })}
                      >
                        锁定区域
                      </Checkbox>
                    </div>
                    
                    {/* 根据区域类型显示不同的属性 */}
                    {selectedRegion.type === 'choice_questions' && (
                      <>
                        <Row gutter={8}>
                          <Col span={12}>
                            <div style={{ marginBottom: 8, fontSize: '12px', fontWeight: 'bold' }}>起始题号</div>
                            <InputNumber
                              size="small"
                              value={selectedRegion.properties?.questionStart}
                              onChange={(value) => updateRegion(selectedRegionId, {
                                properties: { ...selectedRegion.properties, questionStart: value || 1 }
                              })}
                              min={1}
                              style={{ width: '100%' }}
                            />
                          </Col>
                          <Col span={12}>
                            <div style={{ marginBottom: 8, fontSize: '12px', fontWeight: 'bold' }}>结束题号</div>
                            <InputNumber
                              size="small"
                              value={selectedRegion.properties?.questionEnd}
                              onChange={(value) => updateRegion(selectedRegionId, {
                                properties: { ...selectedRegion.properties, questionEnd: value || 20 }
                              })}
                              min={1}
                              style={{ width: '100%' }}
                            />
                          </Col>
                        </Row>
                        
                        <div style={{ marginTop: 12, marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>选项数量</label>
                          <Select
                            size="small"
                            value={selectedRegion.properties?.choiceCount}
                            onChange={(value) => updateRegion(selectedRegionId, {
                              properties: { ...selectedRegion.properties, choiceCount: value }
                            })}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value={4}>4选项 (A-D)</Select.Option>
                            <Select.Option value={5}>5选项 (A-E)</Select.Option>
                            <Select.Option value={6}>6选项 (A-F)</Select.Option>
                          </Select>
                        </div>
                      </>
                    )}
                    
                    {selectedRegion.type === 'student_info' && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>信息字段</label>
                        <Select
                          mode="tags"
                          size="small"
                          value={selectedRegion.properties?.fields}
                          onChange={(value) => updateRegion(selectedRegionId, {
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
                    )}
                    
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>字体大小</label>
                      <InputNumber
                        size="small"
                        value={selectedRegion.properties?.fontSize}
                        onChange={(value) => updateRegion(selectedRegionId, {
                          properties: { ...selectedRegion.properties, fontSize: value || 10 }
                        })}
                        min={6}
                        max={24}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                );
              })()}
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
                <p>4. 使用预设模板快速创建标准布局</p>
                <p>5. 支持8K纸张三栏等分布局</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Col>
      </Row>
      
      {/* 8K三栏模板模态框 */}
      <Modal
        title="8K三栏答题卡模板"
        open={showEightKTemplate}
        onCancel={() => setShowEightKTemplate(false)}
        width={1400}
        footer={null}
      >
        <EightKThreeColumnTemplate
          onSave={(template) => {
            onSave(template);
            setShowEightKTemplate(false);
            message.success('8K三栏模板保存成功');
          }}
          onPreview={(template) => {
            console.log('预览8K模板:', template);
          }}
        />
      </Modal>
    </Modal>
  );
};

export default AdvancedTemplateEditor;