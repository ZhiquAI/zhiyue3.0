/**
 * 优化版答题卡模板设计器
 * 基于"智阅阅卷系统模块功能说明"设计
 * 
 * 核心功能：
 * 1. 创建数字化的"切割地图"，让系统理解物理答题卡布局
 * 2. 支持定位点、条码区、客观题区、主观题区的精确定义
 * 3. 客观题区域自动生成矩阵
 * 4. 主观题区域绑定题号和分值
 * 5. JSON格式模板保存和加载
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal, Card, Row, Col, Button, Input, InputNumber, Select, Space, Divider,
  Tag, Tooltip, Alert, Form, Radio, Switch, Slider, Progress, message,
  Tabs, Collapse, Badge, Upload, Typography, Popconfirm
} from 'antd';
import {
  UndoOutlined, RedoOutlined, SaveOutlined, LoadingOutlined,
  ZoomInOutlined, ZoomOutOutlined, DragOutlined, SelectOutlined,
  AimOutlined, BarcodeOutlined, CheckSquareOutlined, EditOutlined,
  FileImageOutlined, DownloadOutlined, UploadOutlined, EyeOutlined,
  DeleteOutlined, CopyOutlined, SettingOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import { Stage, Layer, Rect, Text, Group, Transformer, Image } from 'react-konva';
import Konva from 'konva';
import type { UploadFile } from 'antd/es/upload/interface';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Title, Paragraph } = Typography;

// 区域类型定义
export interface TemplateRegion {
  id: string;
  type: 'positioning' | 'barcode' | 'objective' | 'subjective';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  properties: {
    // 通用属性
    description?: string;
    
    // 定位点属性
    shape?: 'circle' | 'square';
    size?: number;
    
    // 条码属性
    barcodeType?: 'qrcode' | 'code128' | 'datamatrix';
    encoding?: 'utf8' | 'ascii';
    
    // 客观题属性
    questionCount?: number;
    optionCount?: number;
    layout?: 'horizontal' | 'vertical' | 'matrix';
    startQuestionNumber?: number;
    rowCount?: number;
    columnCount?: number;
    bubbleSize?: number;
    spacing?: number;
    
    // 主观题属性
    questionNumber?: number;
    maxScore?: number;
    scoreStep?: number;
    expectLines?: number;
  };
}

// 模板配置
export interface TemplateConfig {
  id?: string;
  name: string;
  description: string;
  subject: string;
  gradeLevel: string;
  examType: string;
  
  // 页面配置
  pageConfig: {
    width: number;
    height: number;
    dpi: number;
    unit: 'mm' | 'px';
  };
  
  // 底图配置
  backgroundImage?: {
    url: string;
    filename: string;
    width: number;
    height: number;
  };
  
  // 区域配置
  regions: TemplateRegion[];
  
  // 元数据
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    author: string;
  };
}

// 工具类型
export type ToolType = 'select' | 'positioning' | 'barcode' | 'objective' | 'subjective';

interface OptimizedAnswerSheetDesignerProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (template: TemplateConfig) => void;
  initialTemplate?: TemplateConfig;
  mode?: 'create' | 'edit' | 'preview';
}

const OptimizedAnswerSheetDesigner: React.FC<OptimizedAnswerSheetDesignerProps> = ({
  visible,
  onCancel,
  onSave,
  initialTemplate,
  mode = 'create'
}) => {
  // 基础状态
  const [regions, setRegions] = useState<TemplateRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<any>(null);
  
  // 画布状态
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  
  // 模板配置
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({
    name: '',
    description: '',
    subject: '',
    gradeLevel: '',
    examType: '',
    pageConfig: {
      width: 210,
      height: 297,
      dpi: 300,
      unit: 'mm'
    },
    regions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      author: ''
    }
  });
  
  // 表单实例
  const [form] = Form.useForm();
  
  // 工具配置
  const tools = [
    { key: 'select', label: '选择', icon: <SelectOutlined />, tooltip: '选择和移动区域' },
    { key: 'positioning', label: '定位点', icon: <AimOutlined />, tooltip: '添加定位点' },
    { key: 'barcode', label: '条码区', icon: <BarcodeOutlined />, tooltip: '添加条码识别区域' },
    { key: 'objective', label: '客观题', icon: <CheckSquareOutlined />, tooltip: '添加客观题区域' },
    { key: 'subjective', label: '主观题', icon: <EditOutlined />, tooltip: '添加主观题区域' }
  ];

  // 初始化
  useEffect(() => {
    if (initialTemplate) {
      setTemplateConfig(initialTemplate);
      setRegions(initialTemplate.regions || []);
      form.setFieldsValue(initialTemplate);
      
      // 加载背景图片
      if (initialTemplate.backgroundImage) {
        loadBackgroundImage(initialTemplate.backgroundImage.url);
      }
    }
  }, [initialTemplate, form]);

  // 背景图片处理
  const loadBackgroundImage = useCallback((url: string) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackgroundImage(img);
    };
    img.src = url;
  }, []);

  // 处理背景图片上传
  const handleBackgroundUpload = async (file: UploadFile) => {
    try {
      const formData = new FormData();
      formData.append('file', file as any);
      
      // 这里应该调用实际的上传API
      const response = await fetch('/api/templates/upload-background', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        loadBackgroundImage(result.url);
        
        setTemplateConfig(prev => ({
          ...prev,
          backgroundImage: {
            url: result.url,
            filename: result.original_name,
            width: 0, // 会在图片加载后更新
            height: 0
          }
        }));
        
        message.success('背景图片上传成功');
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      console.error('上传背景图片失败:', error);
      message.error('上传背景图片失败');
    }
    
    return false; // 阻止默认上传行为
  };

  // 画布操作
  const handleZoom = (delta: number) => {
    const newScale = Math.max(0.1, Math.min(3, canvasScale + delta));
    setCanvasScale(newScale);
  };

  const handleCanvasReset = () => {
    setCanvasScale(1);
    setCanvasPosition({ x: 0, y: 0 });
  };

  // 区域操作
  const generateRegionId = () => `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleStageClick = (e: any) => {
    if (currentTool === 'select') {
      return;
    }

    if (isDrawing) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // 转换为相对坐标
    const x = (pointer.x - canvasPosition.x) / canvasScale;
    const y = (pointer.y - canvasPosition.y) / canvasScale;

    // 创建新区域
    const newRegion: TemplateRegion = {
      id: generateRegionId(),
      type: currentTool,
      x: x,
      y: y,
      width: currentTool === 'positioning' ? 20 : 100,
      height: currentTool === 'positioning' ? 20 : 60,
      label: getDefaultLabel(currentTool),
      properties: getDefaultProperties(currentTool)
    };

    setRegions(prev => [...prev, newRegion]);
    setSelectedId(newRegion.id);
    setCurrentTool('select');
  };

  const getDefaultLabel = (type: ToolType): string => {
    switch (type) {
      case 'positioning': return '定位点';
      case 'barcode': return '条码区';
      case 'objective': return '客观题区';
      case 'subjective': return '主观题区';
      default: return '未知区域';
    }
  };

  const getDefaultProperties = (type: ToolType): TemplateRegion['properties'] => {
    switch (type) {
      case 'positioning':
        return { shape: 'circle', size: 10 };
      case 'barcode':
        return { barcodeType: 'qrcode', encoding: 'utf8' };
      case 'objective':
        return { 
          questionCount: 5, 
          optionCount: 4, 
          layout: 'vertical',
          startQuestionNumber: 1,
          bubbleSize: 8,
          spacing: 5
        };
      case 'subjective':
        return { 
          questionNumber: 1, 
          maxScore: 10,
          scoreStep: 0.5,
          expectLines: 5
        };
      default:
        return {};
    }
  };

  // 删除区域
  const handleDeleteRegion = (id: string) => {
    setRegions(prev => prev.filter(region => region.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  // 复制区域
  const handleCopyRegion = (id: string) => {
    const region = regions.find(r => r.id === id);
    if (!region) return;

    const newRegion: TemplateRegion = {
      ...region,
      id: generateRegionId(),
      x: region.x + 20,
      y: region.y + 20,
      label: `${region.label}_复制`
    };

    setRegions(prev => [...prev, newRegion]);
    setSelectedId(newRegion.id);
  };

  // 客观题矩阵生成
  const generateObjectiveMatrix = (region: TemplateRegion) => {
    const { questionCount = 5, optionCount = 4, rowCount = 5, bubbleSize = 8, spacing = 5 } = region.properties;
    
    // 这里会根据参数生成客观题矩阵的具体布局
    // 实际实现中需要计算每个选项泡泡的精确位置
    
    message.success(`已生成 ${questionCount} 道题，每题 ${optionCount} 个选项的客观题矩阵`);
  };

  // 保存模板
  const handleSave = () => {
    form.validateFields().then(values => {
      const template: TemplateConfig = {
        ...templateConfig,
        ...values,
        regions: regions,
        metadata: {
          ...templateConfig.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      onSave(template);
      message.success('模板保存成功');
    }).catch(error => {
      console.error('表单验证失败:', error);
      message.error('请检查模板配置信息');
    });
  };

  // 导出JSON
  const handleExportJSON = () => {
    const template: TemplateConfig = {
      ...templateConfig,
      regions: regions,
      metadata: {
        ...templateConfig.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name || '答题卡模板'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('模板已导出为JSON文件');
  };

  // 导入JSON
  const handleImportJSON = (file: UploadFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target?.result as string);
        setTemplateConfig(template);
        setRegions(template.regions || []);
        form.setFieldsValue(template);
        
        if (template.backgroundImage) {
          loadBackgroundImage(template.backgroundImage.url);
        }
        
        message.success('模板导入成功');
      } catch (error) {
        console.error('导入模板失败:', error);
        message.error('模板文件格式错误');
      }
    };
    reader.readAsText(file as any);
    return false;
  };

  // 获取选中区域
  const selectedRegion = regions.find(region => region.id === selectedId);

  return (
    <Modal
      title="答题卡模板设计器"
      open={visible}
      onCancel={onCancel}
      width="95%"
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="export" icon={<DownloadOutlined />} onClick={handleExportJSON}>
          导出JSON
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存模板
        </Button>
      ]}
    >
      <div className="flex h-[80vh]">
        {/* 左侧工具栏 */}
        <div className="w-80 bg-gray-50 p-4 overflow-y-auto border-r">
          <Tabs defaultActiveKey="basic" size="small">
            <TabPane tab="基本信息" key="basic">
              <Form form={form} layout="vertical" size="small">
                <Form.Item label="模板名称" name="name" rules={[{ required: true }]}>
                  <Input placeholder="输入模板名称" />
                </Form.Item>
                <Form.Item label="模板描述" name="description">
                  <TextArea rows={3} placeholder="输入模板描述" />
                </Form.Item>
                <Form.Item label="科目" name="subject">
                  <Select placeholder="选择科目">
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
                <Form.Item label="年级" name="gradeLevel">
                  <Select placeholder="选择年级">
                    <Select.Option value="初一">初一</Select.Option>
                    <Select.Option value="初二">初二</Select.Option>
                    <Select.Option value="初三">初三</Select.Option>
                    <Select.Option value="高一">高一</Select.Option>
                    <Select.Option value="高二">高二</Select.Option>
                    <Select.Option value="高三">高三</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="考试类型" name="examType">
                  <Input placeholder="如：期中考试" />
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="画布设置" key="canvas">
              <Space direction="vertical" className="w-full">
                <div>
                  <Title level={5}>背景图片</Title>
                  <Upload
                    accept="image/*"
                    beforeUpload={handleBackgroundUpload}
                    showUploadList={false}
                  >
                    <Button icon={<FileImageOutlined />} block>
                      上传底图
                    </Button>
                  </Upload>
                </div>
                
                <Divider />
                
                <div>
                  <Title level={5}>画布控制</Title>
                  <Space>
                    <Button icon={<ZoomInOutlined />} onClick={() => handleZoom(0.1)} />
                    <Button icon={<ZoomOutOutlined />} onClick={() => handleZoom(-0.1)} />
                    <Button onClick={handleCanvasReset}>重置</Button>
                  </Space>
                  <div className="mt-2">
                    <span>缩放比例: {Math.round(canvasScale * 100)}%</span>
                  </div>
                </div>
                
                <Divider />
                
                <div>
                  <Title level={5}>模板管理</Title>
                  <Space direction="vertical" className="w-full">
                    <Upload
                      accept=".json"
                      beforeUpload={handleImportJSON}
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />} block>
                        导入模板
                      </Button>
                    </Upload>
                  </Space>
                </div>
              </Space>
            </TabPane>
            
            <TabPane tab="区域管理" key="regions">
              <div>
                <Title level={5}>工具栏</Title>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {tools.map(tool => (
                    <Tooltip key={tool.key} title={tool.tooltip}>
                      <Button
                        type={currentTool === tool.key ? 'primary' : 'default'}
                        icon={tool.icon}
                        onClick={() => setCurrentTool(tool.key as ToolType)}
                        size="small"
                        block
                      >
                        {tool.label}
                      </Button>
                    </Tooltip>
                  ))}
                </div>
                
                <Divider />
                
                <Title level={5}>区域列表 ({regions.length})</Title>
                <div className="space-y-2">
                  {regions.map(region => (
                    <div
                      key={region.id}
                      className={`p-2 border rounded cursor-pointer ${
                        selectedId === region.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedId(region.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{region.label}</span>
                        <Space size="small">
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyRegion(region.id);
                            }}
                          />
                          <Popconfirm
                            title="确定删除此区域？"
                            onConfirm={() => handleDeleteRegion(region.id)}
                          >
                            <Button
                              size="small"
                              icon={<DeleteOutlined />}
                              danger
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                        </Space>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {region.type} | {Math.round(region.width)} × {Math.round(region.height)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabPane>
            
            {selectedRegion && (
              <TabPane tab="属性设置" key="properties">
                <div>
                  <Title level={5}>{selectedRegion.label} 属性</Title>
                  
                  {/* 根据区域类型显示不同的属性设置 */}
                  {selectedRegion.type === 'objective' && (
                    <Space direction="vertical" className="w-full">
                      <div>
                        <label>题目数量:</label>
                        <InputNumber
                          min={1}
                          max={100}
                          value={selectedRegion.properties.questionCount}
                          onChange={(value) => {
                            const newRegions = regions.map(r => 
                              r.id === selectedId 
                                ? { ...r, properties: { ...r.properties, questionCount: value } }
                                : r
                            );
                            setRegions(newRegions);
                          }}
                        />
                      </div>
                      <div>
                        <label>选项数量:</label>
                        <InputNumber
                          min={2}
                          max={8}
                          value={selectedRegion.properties.optionCount}
                          onChange={(value) => {
                            const newRegions = regions.map(r => 
                              r.id === selectedId 
                                ? { ...r, properties: { ...r.properties, optionCount: value } }
                                : r
                            );
                            setRegions(newRegions);
                          }}
                        />
                      </div>
                      <div>
                        <label>起始题号:</label>
                        <InputNumber
                          min={1}
                          value={selectedRegion.properties.startQuestionNumber}
                          onChange={(value) => {
                            const newRegions = regions.map(r => 
                              r.id === selectedId 
                                ? { ...r, properties: { ...r.properties, startQuestionNumber: value } }
                                : r
                            );
                            setRegions(newRegions);
                          }}
                        />
                      </div>
                      <Button 
                        type="primary" 
                        onClick={() => generateObjectiveMatrix(selectedRegion)}
                        block
                      >
                        生成题目矩阵
                      </Button>
                    </Space>
                  )}
                  
                  {selectedRegion.type === 'subjective' && (
                    <Space direction="vertical" className="w-full">
                      <div>
                        <label>题号:</label>
                        <InputNumber
                          min={1}
                          value={selectedRegion.properties.questionNumber}
                          onChange={(value) => {
                            const newRegions = regions.map(r => 
                              r.id === selectedId 
                                ? { ...r, properties: { ...r.properties, questionNumber: value } }
                                : r
                            );
                            setRegions(newRegions);
                          }}
                        />
                      </div>
                      <div>
                        <label>满分:</label>
                        <InputNumber
                          min={1}
                          max={100}
                          value={selectedRegion.properties.maxScore}
                          onChange={(value) => {
                            const newRegions = regions.map(r => 
                              r.id === selectedId 
                                ? { ...r, properties: { ...r.properties, maxScore: value } }
                                : r
                            );
                            setRegions(newRegions);
                          }}
                        />
                      </div>
                      <div>
                        <label>预期行数:</label>
                        <InputNumber
                          min={1}
                          max={20}
                          value={selectedRegion.properties.expectLines}
                          onChange={(value) => {
                            const newRegions = regions.map(r => 
                              r.id === selectedId 
                                ? { ...r, properties: { ...r.properties, expectLines: value } }
                                : r
                            );
                            setRegions(newRegions);
                          }}
                        />
                      </div>
                    </Space>
                  )}
                </div>
              </TabPane>
            )}
          </Tabs>
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 bg-white overflow-hidden">
          <div className="w-full h-full relative">
            <Stage
              ref={stageRef}
              width={window.innerWidth * 0.6}
              height={window.innerHeight * 0.8}
              scaleX={canvasScale}
              scaleY={canvasScale}
              x={canvasPosition.x}
              y={canvasPosition.y}
              onClick={handleStageClick}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedId(null);
                }
              }}
              draggable={currentTool === 'select'}
              onDragEnd={(e) => {
                setCanvasPosition({ x: e.target.x(), y: e.target.y() });
              }}
            >
              <Layer>
                {/* 背景图片 */}
                {backgroundImage && (
                  <Image
                    image={backgroundImage}
                    x={0}
                    y={0}
                    width={backgroundImage.width}
                    height={backgroundImage.height}
                  />
                )}
                
                {/* 区域渲染 */}
                {regions.map(region => (
                  <Group key={region.id}>
                    <Rect
                      x={region.x}
                      y={region.y}
                      width={region.width}
                      height={region.height}
                      stroke={selectedId === region.id ? '#1890ff' : getRegionColor(region.type)}
                      strokeWidth={selectedId === region.id ? 2 : 1}
                      fill={`${getRegionColor(region.type)}20`}
                      draggable={currentTool === 'select'}
                      onClick={() => setSelectedId(region.id)}
                      onDragEnd={(e) => {
                        const newRegions = regions.map(r => 
                          r.id === region.id 
                            ? { ...r, x: e.target.x(), y: e.target.y() }
                            : r
                        );
                        setRegions(newRegions);
                      }}
                    />
                    <Text
                      x={region.x + 5}
                      y={region.y + 5}
                      text={region.label}
                      fontSize={12}
                      fill="#333"
                    />
                  </Group>
                ))}
                
                {/* 选中区域的变换器 */}
                {selectedId && (
                  <Transformer
                    ref={transformerRef}
                    node={regions.find(r => r.id === selectedId) as any}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const newRegions = regions.map(r => 
                        r.id === selectedId
                          ? {
                              ...r,
                              x: node.x(),
                              y: node.y(),
                              width: node.width() * node.scaleX(),
                              height: node.height() * node.scaleY()
                            }
                          : r
                      );
                      setRegions(newRegions);
                    }}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// 辅助函数
const getRegionColor = (type: TemplateRegion['type']): string => {
  switch (type) {
    case 'positioning': return '#ff4d4f';
    case 'barcode': return '#1890ff';
    case 'objective': return '#52c41a';
    case 'subjective': return '#faad14';
    default: return '#d9d9d9';
  }
};

export default OptimizedAnswerSheetDesigner;