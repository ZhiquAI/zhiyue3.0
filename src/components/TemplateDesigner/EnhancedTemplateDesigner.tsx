/**
 * 增强版答题卡模板设计器
 * 
 * 核心作用：
 * 1. 数字蓝图制定者 - 创建精确的坐标定义和区域划分
 * 2. 物理与数字世界的桥梁 - 将纸质答题卡转换为系统可理解的结构化数据
 * 3. 质量保障的源头 - 内嵌OMR设计规范，确保识别准确性
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal, Card, Row, Col, Button, Input, InputNumber, Select, Space, Divider,
  Tag, Tooltip, Alert, Form, Radio, Switch, Slider, Progress, message,
  Tabs, Collapse, Badge, Popover, Typography
} from 'antd';
import {
  UndoOutlined, RedoOutlined, CopyOutlined, DeleteOutlined,
  ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, SaveOutlined,
  EyeOutlined, SettingOutlined, CheckCircleOutlined, WarningOutlined,
  InfoCircleOutlined, BulbOutlined, BorderOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { Stage, Layer, Rect, Text, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import { QualityAnalyzer, analyzeTemplateQuality, getQualityGrade } from '../../utils/qualityAnalyzer';
import { DesignAssistant, createDesignAssistant } from '../../utils/designAssistant';
import { getOMRStandards } from '../../config/omrStandards';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Title, Paragraph } = Typography;

// 增强的区域类型定义
export interface EnhancedRegion {
  id: string;
  type: 'positioning' | 'barcode' | 'student_info' | 'question' | 'header' | 'footer';
  subType?: 'choice' | 'fill_blank' | 'essay' | 'calculation' | 'qrcode' | 'code128';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  properties: {
    // 通用属性
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
    
    // 题目属性
    questionNumber?: number;
    maxScore?: number;
    choiceCount?: number;
    layout?: 'horizontal' | 'vertical';
    
    // 学生信息属性
    fields?: string[];
    infoType?: 'name' | 'id' | 'class' | 'exam';
    
    // 条码属性
    barcodeType?: 'qrcode' | 'code128' | 'datamatrix';
    
    // 定位点属性
    shape?: 'circle' | 'square';
    size?: 'small' | 'medium' | 'large';
    
    // 页眉页脚属性
    text?: string;
    
    // OMR规范属性
    omrCompliant?: boolean;
    recognitionAccuracy?: number;
    qualityScore?: number;
  };
  // 质量评估
  qualityMetrics?: {
    positionAccuracy: number;
    sizeCompliance: number;
    omrStandard: number;
    overallScore: number;
  };
}

// 模板配置接口
export interface EnhancedTemplateConfig {
  name: string;
  description: string;
  subject: string;
  gradeLevel: string;
  examType: string;
  pageConfig: {
    width: number;
    height: number;
    dpi: number;
    orientation: 'portrait' | 'landscape';
  };
  omrStandards: {
    minBubbleSize: number;
    maxBubbleSize: number;
    bubbleSpacing: number;
    lineThickness: number;
    marginRequirements: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  qualityThresholds: {
    minAccuracy: number;
    minCompliance: number;
    warningThreshold: number;
  };
}

// 工具类型
export type ToolType = 'select' | 'positioning' | 'barcode' | 'student_info' | 
               'question_choice' | 'question_fill_blank' | 'question_essay' | 
               'question_calculation' | 'header' | 'footer';

interface EnhancedTemplateDesignerProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (template: any) => void;
  initialTemplate?: any;
  mode?: 'create' | 'edit' | 'preview';
}

const EnhancedTemplateDesigner: React.FC<EnhancedTemplateDesignerProps> = ({
  visible,
  onCancel,
  onSave,
  initialTemplate,
  mode = 'create'
}) => {
  // 基础状态
  const [regions, setRegions] = useState<EnhancedRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [previewMode, setPreviewMode] = useState(mode === 'preview');
  
  // 模板配置
  const [templateConfig, setTemplateConfig] = useState<EnhancedTemplateConfig>({
    name: '',
    description: '',
    subject: '',
    gradeLevel: '',
    examType: '',
    pageConfig: {
      width: 210,
      height: 297,
      dpi: 300,
      orientation: 'portrait'
    },
    omrStandards: {
      minBubbleSize: 8,
      maxBubbleSize: 12,
      bubbleSpacing: 15,
      lineThickness: 1,
      marginRequirements: {
        top: 20,
        bottom: 20,
        left: 15,
        right: 15
      }
    },
    qualityThresholds: {
      minAccuracy: 95,
      minCompliance: 90,
      warningThreshold: 85
    }
  });
  
  // 画布状态
  const [scale, setScale] = useState(0.8);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  
  // 历史记录
  const [history, setHistory] = useState<EnhancedRegion[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // 质量评估
  const [qualityAnalysis, setQualityAnalysis] = useState({
    overallScore: 0,
    issues: [] as string[],
    suggestions: [] as string[],
    categoryScores: {
      position: 0,
      size: 0,
      spacing: 0,
      omr: 0,
      print: 0
    },
    compliance: {
      omrStandard: false,
      printReady: false,
      scanOptimized: false
    }
  });
  
  // 设计助手
  const [designAssistant] = useState(() => createDesignAssistant(templateConfig.examType));
  const [designSuggestions, setDesignSuggestions] = useState<any[]>([]);
  const [autoLayoutEnabled, setAutoLayoutEnabled] = useState(false);
  
  // 绘制状态
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  // Refs
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  
  // 计算画布尺寸
  const canvasWidth = (templateConfig.pageConfig.width * templateConfig.pageConfig.dpi) / 25.4;
  const canvasHeight = (templateConfig.pageConfig.height * templateConfig.pageConfig.dpi) / 25.4;
  
  // 生成唯一ID
  const generateId = () => `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 获取区域颜色
  const getRegionColor = (type: string, subType?: string) => {
    const colorMap = {
      positioning: '#ff4d4f',
      barcode: '#1890ff',
      student_info: '#52c41a',
      question: '#722ed1',
      header: '#fa8c16',
      footer: '#13c2c2'
    };
    return colorMap[type as keyof typeof colorMap] || '#666666';
  };
  
  // 获取区域标签
  const getRegionLabel = (type: string, subType?: string, questionNumber?: number): string => {
    if (type === 'positioning') return '定位点';
    if (type === 'barcode') return subType === 'qrcode' ? '二维码' : '条形码';
    if (type === 'student_info') return '学生信息';
    if (type === 'header') return '页眉';
    if (type === 'footer') return '页脚';
    
    if (type === 'question' && subType) {
      const questionLabels = {
        choice: `选择题${questionNumber ? ` ${questionNumber}` : ''}`,
        fill_blank: `填空题${questionNumber ? ` ${questionNumber}` : ''}`,
        essay: `作文题${questionNumber ? ` ${questionNumber}` : ''}`,
        calculation: `计算题${questionNumber ? ` ${questionNumber}` : ''}`
      };
      return questionLabels[subType as keyof typeof questionLabels] || '题目';
    }
    
    return type;
  };
  
  // OMR规范验证
  const validateOMRCompliance = useCallback((region: EnhancedRegion): number => {
    let score = 100;
    const { omrStandards } = templateConfig;
    
    // 检查尺寸规范
    if (region.type === 'question' && region.subType === 'choice') {
      const bubbleSize = Math.min(region.width, region.height);
      if (bubbleSize < omrStandards.minBubbleSize) score -= 20;
      if (bubbleSize > omrStandards.maxBubbleSize) score -= 15;
    }
    
    // 检查边距要求
    const margins = omrStandards.marginRequirements;
    if (region.x < margins.left) score -= 10;
    if (region.y < margins.top) score -= 10;
    if (region.x + region.width > canvasWidth - margins.right) score -= 10;
    if (region.y + region.height > canvasHeight - margins.bottom) score -= 10;
    
    // 检查与其他区域的间距
    regions.forEach(otherRegion => {
      if (otherRegion.id !== region.id) {
        const distance = Math.sqrt(
          Math.pow(region.x - otherRegion.x, 2) + 
          Math.pow(region.y - otherRegion.y, 2)
        );
        if (distance < omrStandards.bubbleSpacing) score -= 5;
      }
    });
    
    return Math.max(0, score);
  }, [regions, templateConfig, canvasWidth, canvasHeight]);
  
  // 质量分析
  const performQualityAnalysis = useCallback(() => {
    // 使用新的质量分析工具
    const analysis = analyzeTemplateQuality(regions, templateConfig);
    
    setQualityAnalysis({
      overallScore: analysis.overall.score,
      issues: analysis.issues.map((issue: any) => issue.description),
      suggestions: analysis.suggestions.map((suggestion: any) => suggestion.description),
      categoryScores: {
        position: analysis.categories.position.score,
        size: analysis.categories.size.score,
        spacing: analysis.categories.spacing.score,
        omr: analysis.categories.omr.score,
        print: analysis.categories.print.score
      },
      compliance: analysis.compliance
    });
    
    // 生成设计建议
    const suggestions = designAssistant.generateSuggestions(regions);
    setDesignSuggestions(suggestions);
  }, [regions, templateConfig, designAssistant]);
  
  // 创建区域
  const createRegion = (type: ToolType, x: number, y: number, width: number, height: number) => {
    const questionNumber = regions.filter(r => r.type === 'question').length + 1;
    
    const newRegion: EnhancedRegion = {
      id: generateId(),
      type: type.startsWith('question_') ? 'question' : type as any,
      subType: type.startsWith('question_') ? type.replace('question_', '') as any : undefined,
      x,
      y,
      width,
      height,
      label: getRegionLabel(
        type.startsWith('question_') ? 'question' : type,
        type.startsWith('question_') ? type.replace('question_', '') : undefined,
        type.startsWith('question_') ? questionNumber : undefined
      ),
      properties: {
        fontSize: 12,
        textAlign: 'left',
        questionNumber: type.startsWith('question_') ? questionNumber : undefined,
        maxScore: type.startsWith('question_') ? 10 : undefined,
        choiceCount: type === 'question_choice' ? 4 : undefined,
        layout: 'horizontal',
        omrCompliant: true,
        recognitionAccuracy: 95
      }
    };
    
    // 计算质量指标
    const compliance = validateOMRCompliance(newRegion);
    newRegion.qualityMetrics = {
      positionAccuracy: 95,
      sizeCompliance: compliance,
      omrStandard: compliance,
      overallScore: compliance
    };
    
    return newRegion;
  };
  
  // 鼠标事件处理
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (previewMode || currentTool === 'select') return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    setIsDrawing(true);
    setStartPos({ x: pos.x / scale, y: pos.y / scale });
  };
  
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || previewMode || currentTool === 'select') return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    const currentPos = { x: pos.x / scale, y: pos.y / scale };
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    
    // 实时预览绘制区域
    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'crosshair';
    }
  };
  
  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || previewMode || currentTool === 'select') return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    const endPos = { x: pos.x / scale, y: pos.y / scale };
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    
    // 最小尺寸检查
    if (width < 10 || height < 10) {
      setIsDrawing(false);
      return;
    }
    
    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    
    const newRegion = createRegion(currentTool, x, y, width, height);
    const newRegions = [...regions, newRegion];
    
    setRegions(newRegions);
    addToHistory(newRegions);
    setSelectedId(newRegion.id);
    setIsDrawing(false);
    setCurrentTool('select');
    
    message.success(`已创建 ${newRegion.label}`);
  };
  
  // 历史记录管理
  const addToHistory = (newRegions: EnhancedRegion[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newRegions]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setRegions([...history[historyIndex - 1]]);
      setSelectedId(null);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setRegions([...history[historyIndex + 1]]);
      setSelectedId(null);
    }
  };
  
  // 区域操作
  const updateRegion = (id: string, updates: Partial<EnhancedRegion>) => {
    const newRegions = regions.map(region => {
      if (region.id === id) {
        const updatedRegion = { ...region, ...updates };
        // 重新计算质量指标
        const compliance = validateOMRCompliance(updatedRegion);
        updatedRegion.qualityMetrics = {
          positionAccuracy: 95,
          sizeCompliance: compliance,
          omrStandard: compliance,
          overallScore: compliance
        };
        return updatedRegion;
      }
      return region;
    });
    
    setRegions(newRegions);
    addToHistory(newRegions);
  };
  
  const deleteRegion = (id: string) => {
    const newRegions = regions.filter(region => region.id !== id);
    setRegions(newRegions);
    addToHistory(newRegions);
    setSelectedId(null);
    message.success('区域已删除');
  };
  
  const duplicateRegion = (id: string) => {
    const region = regions.find(r => r.id === id);
    if (!region) return;
    
    const newRegion = {
      ...region,
      id: generateId(),
      x: region.x + 20,
      y: region.y + 20,
      label: `${region.label} 副本`
    };
    
    const newRegions = [...regions, newRegion];
    setRegions(newRegions);
    addToHistory(newRegions);
    setSelectedId(newRegion.id);
    message.success('区域已复制');
  };
  
  // 缩放控制
  const handleZoom = (zoomIn: boolean) => {
    const newScale = zoomIn ? scale * 1.2 : scale / 1.2;
    setScale(Math.max(0.1, Math.min(3, newScale)));
  };
  
  const handleFitCanvas = () => {
    setScale(0.8);
    setStagePos({ x: 0, y: 0 });
  };
  
  // 保存模板
  const handleSave = () => {
    if (!templateConfig.name.trim()) {
      message.error('请输入模板名称');
      return;
    }
    
    if (regions.length === 0) {
      message.error('请至少添加一个区域');
      return;
    }
    
    // 验证必要区域
    const hasPositioning = regions.some(r => r.type === 'positioning');
    const hasBarcode = regions.some(r => r.type === 'barcode');
    
    if (!hasPositioning) {
      message.warning('建议添加定位点以提高识别精度');
    }
    
    if (!hasBarcode) {
      message.warning('建议添加条码区域以便学生信息识别');
    }
    
    const templateData = {
      ...templateConfig,
      regions,
      qualityAnalysis,
      createdAt: new Date().toISOString(),
      version: '2.0'
    };
    
    onSave(templateData);
    message.success('模板保存成功');
  };
  
  // 效果钩子
  useEffect(() => {
    if (initialTemplate) {
      setTemplateConfig(initialTemplate.config || templateConfig);
      setRegions(initialTemplate.regions || []);
      setBackgroundImage(initialTemplate.backgroundImage);
    }
  }, [initialTemplate]);
  
  useEffect(() => {
    performQualityAnalysis();
  }, [regions, performQualityAnalysis]);
  
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current?.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId]);
  
  const selectedRegion = regions.find(r => r.id === selectedId);
  
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            {mode === 'create' ? '创建' : mode === 'edit' ? '编辑' : '预览'}答题卡模板
          </span>
          <Space>
            <Badge 
              count={qualityAnalysis.issues.length} 
              status={qualityAnalysis.overallScore >= 90 ? 'success' : 'warning'}
            >
              <Button 
                size="small" 
                icon={<CheckCircleOutlined />}
                type={qualityAnalysis.overallScore >= 90 ? 'primary' : 'default'}
              >
                质量: {Math.round(qualityAnalysis.overallScore)}%
              </Button>
            </Badge>
            <Switch
              checked={previewMode}
              onChange={setPreviewMode}
              checkedChildren="预览"
              unCheckedChildren="编辑"
            />
          </Space>
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      width="95vw"
      style={{ top: 20 }}
      bodyStyle={{ height: '85vh', padding: 0 }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tooltip title="OMR规范指导">
              <Button icon={<BulbOutlined />} type="link">
                设计指南
              </Button>
            </Tooltip>
            <Tooltip title="质量检测报告">
              <Popover
                title="模板质量分析"
                content={
                  <div style={{ width: 300 }}>
                    <Progress 
                      percent={Math.round(qualityAnalysis.overallScore)} 
                      status={qualityAnalysis.overallScore >= 90 ? 'success' : 'exception'}
                    />
                    {qualityAnalysis.issues.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Title level={5}>问题:</Title>
                        {qualityAnalysis.issues.map((issue, index) => (
                          <div key={index} style={{ color: '#ff4d4f', fontSize: '12px' }}>
                            • {issue}
                          </div>
                        ))}
                      </div>
                    )}
                    {qualityAnalysis.suggestions.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Title level={5}>建议:</Title>
                        {qualityAnalysis.suggestions.map((suggestion, index) => (
                          <div key={index} style={{ color: '#1890ff', fontSize: '12px' }}>
                            • {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                }
                trigger="click"
              >
                <Button icon={<InfoCircleOutlined />} type="link">
                  质量报告
                </Button>
              </Popover>
            </Tooltip>
          </Space>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            {!previewMode && (
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
                disabled={regions.length === 0}
              >
                保存模板
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <div style={{ height: '100%', display: 'flex' }}>
        {/* 左侧工具栏 */}
        <div style={{ width: 280, borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          <Tabs defaultActiveKey="design" size="small">
            <TabPane tab="设计" key="design">
              <div style={{ padding: 16 }}>
                {/* 模板信息 */}
                <Card title="模板信息" size="small" style={{ marginBottom: 16 }}>
                  <Form layout="vertical" size="small">
                    <Form.Item label="模板名称">
                      <Input
                        value={templateConfig.name}
                        onChange={(e) => setTemplateConfig({
                          ...templateConfig,
                          name: e.target.value
                        })}
                        placeholder="请输入模板名称"
                      />
                    </Form.Item>
                    <Form.Item label="描述">
                      <TextArea
                        value={templateConfig.description}
                        onChange={(e) => setTemplateConfig({
                          ...templateConfig,
                          description: e.target.value
                        })}
                        placeholder="请输入模板描述"
                        rows={2}
                      />
                    </Form.Item>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item label="科目">
                          <Select
                            value={templateConfig.subject}
                            onChange={(value) => setTemplateConfig({
                              ...templateConfig,
                              subject: value
                            })}
                            placeholder="选择科目"
                          >
                            <Select.Option value="语文">语文</Select.Option>
                            <Select.Option value="数学">数学</Select.Option>
                            <Select.Option value="英语">英语</Select.Option>
                            <Select.Option value="物理">物理</Select.Option>
                            <Select.Option value="化学">化学</Select.Option>
                            <Select.Option value="生物">生物</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="年级">
                          <Select
                            value={templateConfig.gradeLevel}
                            onChange={(value) => setTemplateConfig({
                              ...templateConfig,
                              gradeLevel: value
                            })}
                            placeholder="选择年级"
                          >
                            <Select.Option value="小学">小学</Select.Option>
                            <Select.Option value="初中">初中</Select.Option>
                            <Select.Option value="高中">高中</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
                
                {/* 页面设置 */}
                <Card title="页面设置" size="small" style={{ marginBottom: 16 }}>
                  <Form layout="vertical" size="small">
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item label="宽度(mm)">
                          <InputNumber
                            value={templateConfig.pageConfig.width}
                            onChange={(value) => setTemplateConfig({
                              ...templateConfig,
                              pageConfig: {
                                ...templateConfig.pageConfig,
                                width: value || 210
                              }
                            })}
                            min={100}
                            max={500}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="高度(mm)">
                          <InputNumber
                            value={templateConfig.pageConfig.height}
                            onChange={(value) => setTemplateConfig({
                              ...templateConfig,
                              pageConfig: {
                                ...templateConfig.pageConfig,
                                height: value || 297
                              }
                            })}
                            min={100}
                            max={500}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="分辨率(DPI)">
                      <Slider
                        value={templateConfig.pageConfig.dpi}
                        onChange={(value) => setTemplateConfig({
                          ...templateConfig,
                          pageConfig: {
                            ...templateConfig.pageConfig,
                            dpi: value
                          }
                        })}
                        min={150}
                        max={600}
                        step={50}
                        marks={{
                          150: '150',
                          300: '300',
                          600: '600'
                        }}
                      />
                    </Form.Item>
                  </Form>
                </Card>
                
                {/* 绘制工具 */}
                {!previewMode && (
                  <Card title="绘制工具" size="small" style={{ marginBottom: 16 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button
                        type={currentTool === 'select' ? 'primary' : 'default'}
                        onClick={() => setCurrentTool('select')}
                        block
                        icon={<SettingOutlined />}
                      >
                        选择工具
                      </Button>
                      
                      <Divider style={{ margin: '8px 0' }}>识别区域</Divider>
                      
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Button
                            type={currentTool === 'positioning' ? 'primary' : 'default'}
                            onClick={() => setCurrentTool('positioning')}
                            block
                            size="small"
                            style={{ height: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                          >
                            <div>🎯</div>
                            <div style={{ fontSize: '10px' }}>定位点</div>
                          </Button>
                        </Col>
                        <Col span={12}>
                          <Button
                            type={currentTool === 'barcode' ? 'primary' : 'default'}
                            onClick={() => setCurrentTool('barcode')}
                            block
                            size="small"
                            style={{ height: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                          >
                            <div>📊</div>
                            <div style={{ fontSize: '10px' }}>条码区</div>
                          </Button>
                        </Col>
                        <Col span={12}>
                          <Button
                            type={currentTool === 'student_info' ? 'primary' : 'default'}
                            onClick={() => setCurrentTool('student_info')}
                            block
                            size="small"
                            style={{ height: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                          >
                            <div>👤</div>
                            <div style={{ fontSize: '10px' }}>学生信息</div>
                          </Button>
                        </Col>
                      </Row>
                      
                      <Divider style={{ margin: '8px 0' }}>题目区域</Divider>
                      
                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Button
                            type={currentTool === 'question_choice' ? 'primary' : 'default'}
                            onClick={() => setCurrentTool('question_choice')}
                            block
                            size="small"
                            style={{ height: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                          >
                            <div>⭕</div>
                            <div style={{ fontSize: '10px' }}>选择题</div>
                          </Button>
                        </Col>
                        <Col span={12}>
                          <Button
                            type={currentTool === 'question_fill_blank' ? 'primary' : 'default'}
                            onClick={() => setCurrentTool('question_fill_blank')}
                            block
                            size="small"
                            style={{ height: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                          >
                            <div>📄</div>
                            <div style={{ fontSize: '10px' }}>填空题</div>
                          </Button>
                        </Col>
                        <Col span={12}>
                          <Button
                            type={currentTool === 'question_essay' ? 'primary' : 'default'}
                            onClick={() => setCurrentTool('question_essay')}
                            block
                            size="small"
                            style={{ height: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                          >
                            <div>📖</div>
                            <div style={{ fontSize: '10px' }}>作文题</div>
                          </Button>
                        </Col>
                        <Col span={12}>
                          <Button
                            type={currentTool === 'question_calculation' ? 'primary' : 'default'}
                            onClick={() => setCurrentTool('question_calculation')}
                            block
                            size="small"
                            style={{ height: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                          >
                            <div>🔢</div>
                            <div style={{ fontSize: '10px' }}>计算题</div>
                          </Button>
                        </Col>
                      </Row>
                    </Space>
                  </Card>
                )}
                
                {/* 操作按钮 */}
                {!previewMode && (
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
                      
                      {selectedId && (
                        <Row gutter={8}>
                          <Col span={12}>
                            <Button
                              icon={<CopyOutlined />}
                              onClick={() => duplicateRegion(selectedId)}
                              block
                              size="small"
                            >
                              复制
                            </Button>
                          </Col>
                          <Col span={12}>
                            <Button
                              icon={<DeleteOutlined />}
                              onClick={() => deleteRegion(selectedId)}
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
                )}
              </div>
            </TabPane>
            
            <TabPane tab="OMR规范" key="omr">
              <div style={{ padding: 16 }}>
                <Card title="OMR设计规范" size="small">
                  <Form layout="vertical" size="small">
                    <Form.Item label="最小气泡尺寸(mm)">
                      <InputNumber
                        value={templateConfig.omrStandards.minBubbleSize}
                        onChange={(value) => setTemplateConfig({
                          ...templateConfig,
                          omrStandards: {
                            ...templateConfig.omrStandards,
                            minBubbleSize: value || 8
                          }
                        })}
                        min={6}
                        max={15}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    
                    <Form.Item label="最大气泡尺寸(mm)">
                      <InputNumber
                        value={templateConfig.omrStandards.maxBubbleSize}
                        onChange={(value) => setTemplateConfig({
                          ...templateConfig,
                          omrStandards: {
                            ...templateConfig.omrStandards,
                            maxBubbleSize: value || 12
                          }
                        })}
                        min={10}
                        max={20}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    
                    <Form.Item label="气泡间距(mm)">
                      <InputNumber
                        value={templateConfig.omrStandards.bubbleSpacing}
                        onChange={(value) => setTemplateConfig({
                          ...templateConfig,
                          omrStandards: {
                            ...templateConfig.omrStandards,
                            bubbleSpacing: value || 15
                          }
                        })}
                        min={10}
                        max={30}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    
                    <Divider>页面边距</Divider>
                    
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item label="上边距">
                          <InputNumber
                            value={templateConfig.omrStandards.marginRequirements.top}
                            onChange={(value) => setTemplateConfig({
                              ...templateConfig,
                              omrStandards: {
                                ...templateConfig.omrStandards,
                                marginRequirements: {
                                  ...templateConfig.omrStandards.marginRequirements,
                                  top: value || 20
                                }
                              }
                            })}
                            min={10}
                            max={50}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="下边距">
                          <InputNumber
                            value={templateConfig.omrStandards.marginRequirements.bottom}
                            onChange={(value) => setTemplateConfig({
                              ...templateConfig,
                              omrStandards: {
                                ...templateConfig.omrStandards,
                                marginRequirements: {
                                  ...templateConfig.omrStandards.marginRequirements,
                                  bottom: value || 20
                                }
                              }
                            })}
                            min={10}
                            max={50}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
                
                <Alert
                  message="OMR设计建议"
                  description={
                    <div style={{ fontSize: '12px' }}>
                      <p>• 定位点应放置在四个角落</p>
                      <p>• 选择题气泡应保持一致的大小和间距</p>
                      <p>• 避免在扫描区域使用过深的背景色</p>
                      <p>• 确保足够的页面边距以防止裁切</p>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </div>
            </TabPane>
          </Tabs>
        </div>
        
        {/* 中间画布区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            padding: '8px 16px', 
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Space>
              <Switch
                checked={showGrid}
                onChange={setShowGrid}
                size="small"
              />
              <span style={{ fontSize: '12px' }}>网格</span>
              
              <Switch
                checked={showRuler}
                onChange={setShowRuler}
                size="small"
              />
              <span style={{ fontSize: '12px' }}>标尺</span>
            </Space>
            
            <Space>
              <Tooltip title="缩小">
                <Button size="small" icon={<ZoomOutOutlined />} onClick={() => handleZoom(false)} />
              </Tooltip>
              <span style={{ fontSize: '12px', minWidth: '50px', textAlign: 'center' }}>
                {Math.round(scale * 100)}%
              </span>
              <Tooltip title="放大">
                <Button size="small" icon={<ZoomInOutlined />} onClick={() => handleZoom(true)} />
              </Tooltip>
              <Tooltip title="适应画布">
                <Button size="small" icon={<ExpandOutlined />} onClick={handleFitCanvas} />
              </Tooltip>
            </Space>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            backgroundColor: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <div style={{
              backgroundColor: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <Stage
                ref={stageRef}
                width={canvasWidth * scale}
                height={canvasHeight * scale}
                scaleX={scale}
                scaleY={scale}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ 
                  cursor: currentTool === 'select' ? 'default' : 'crosshair'
                }}
              >
                <Layer ref={layerRef}>
                  {/* 页面背景 */}
                  <Rect
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    fill="white"
                    stroke="#d9d9d9"
                    strokeWidth={1}
                  />
                  
                  {/* 网格 */}
                  {showGrid && (
                    <Group>
                      {Array.from({ length: Math.floor(canvasWidth / 20) }, (_, i) => (
                        <Rect
                          key={`grid-v-${i}`}
                          x={i * 20}
                          y={0}
                          width={1}
                          height={canvasHeight}
                          fill="#f0f0f0"
                        />
                      ))}
                      {Array.from({ length: Math.floor(canvasHeight / 20) }, (_, i) => (
                        <Rect
                          key={`grid-h-${i}`}
                          x={0}
                          y={i * 20}
                          width={canvasWidth}
                          height={1}
                          fill="#f0f0f0"
                        />
                      ))}
                    </Group>
                  )}
                  
                  {/* 渲染所有区域 */}
                  {regions.map((region) => (
                    <Group key={region.id}>
                      <Rect
                        id={region.id}
                        x={region.x}
                        y={region.y}
                        width={region.width}
                        height={region.height}
                        fill={getRegionColor(region.type, region.subType) + '20'}
                        stroke={getRegionColor(region.type, region.subType)}
                        strokeWidth={selectedId === region.id ? 3 : 1}
                        draggable={!previewMode}
                        onClick={() => setSelectedId(region.id)}
                        onDragEnd={(e) => {
                          updateRegion(region.id, {
                            x: e.target.x(),
                            y: e.target.y()
                          });
                        }}
                      />
                      <Text
                        x={region.x + 5}
                        y={region.y + 5}
                        text={region.label}
                        fontSize={12}
                        fill={getRegionColor(region.type, region.subType)}
                        fontStyle="bold"
                        listening={false}
                      />
                      
                      {/* 质量指示器 */}
                      {region.qualityMetrics && (
                        <Rect
                          x={region.x + region.width - 15}
                          y={region.y + 5}
                          width={10}
                          height={10}
                          fill={region.qualityMetrics.overallScore >= 90 ? '#52c41a' : 
                                region.qualityMetrics.overallScore >= 70 ? '#faad14' : '#ff4d4f'}
                          cornerRadius={5}
                          listening={false}
                        />
                      )}
                    </Group>
                  ))}
                  
                  {/* Transformer */}
                  {!previewMode && <Transformer ref={transformerRef} />}
                </Layer>
              </Stage>
            </div>
          </div>
        </div>
        
        {/* 右侧属性面板 */}
        <div style={{ width: 320, borderLeft: '1px solid #f0f0f0', overflow: 'auto' }}>
          <Tabs defaultActiveKey="regions" size="small">
            <TabPane tab="区域列表" key="regions">
              <div style={{ padding: 16 }}>
                <Card title="区域管理" size="small" style={{ marginBottom: 16 }}>
                  <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {regions.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                        暂无区域
                      </div>
                    ) : (
                      regions.map((region) => (
                        <div
                          key={region.id}
                          style={{
                            padding: '8px',
                            marginBottom: '4px',
                            border: selectedId === region.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: selectedId === region.id ? '#f0f8ff' : 'white'
                          }}
                          onClick={() => setSelectedId(region.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Tag color={getRegionColor(region.type, region.subType)}>
                                {region.label}
                              </Tag>
                              {region.qualityMetrics && (
                                <Badge 
                                  count={Math.round(region.qualityMetrics.overallScore)} 
                                  style={{ 
                                    backgroundColor: region.qualityMetrics.overallScore >= 90 ? '#52c41a' : 
                                                   region.qualityMetrics.overallScore >= 70 ? '#faad14' : '#ff4d4f'
                                  }}
                                />
                              )}
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
                      ))
                    )}
                  </div>
                </Card>
                
                {/* 选中区域属性 */}
                {selectedRegion && !previewMode && (
                  <Card title="区域属性" size="small">
                    <Form layout="vertical" size="small">
                      <Form.Item label="区域标签">
                        <Input
                          value={selectedRegion.label}
                          onChange={(e) => updateRegion(selectedId!, { label: e.target.value })}
                        />
                      </Form.Item>
                      
                      {/* 位置和尺寸 */}
                      <Collapse size="small" ghost>
                        <Panel header="位置和尺寸" key="position">
                          <Row gutter={8}>
                            <Col span={12}>
                              <Form.Item label="X坐标">
                                <InputNumber
                                  value={Math.round(selectedRegion.x)}
                                  onChange={(value) => updateRegion(selectedId!, { x: value || 0 })}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="Y坐标">
                                <InputNumber
                                  value={Math.round(selectedRegion.y)}
                                  onChange={(value) => updateRegion(selectedId!, { y: value || 0 })}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="宽度">
                                <InputNumber
                                  value={Math.round(selectedRegion.width)}
                                  onChange={(value) => updateRegion(selectedId!, { width: value || 10 })}
                                  min={10}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="高度">
                                <InputNumber
                                  value={Math.round(selectedRegion.height)}
                                  onChange={(value) => updateRegion(selectedId!, { height: value || 10 })}
                                  min={10}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Panel>
                        
                        {/* 题目属性 */}
                        {selectedRegion.type === 'question' && (
                          <Panel header="题目属性" key="question">
                            <Form.Item label="题目编号">
                              <InputNumber
                                value={selectedRegion.properties?.questionNumber}
                                onChange={(value) => updateRegion(selectedId!, {
                                  properties: { ...selectedRegion.properties, questionNumber: value || 1 }
                                })}
                                min={1}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                            
                            <Form.Item label="满分">
                              <InputNumber
                                value={selectedRegion.properties?.maxScore}
                                onChange={(value) => updateRegion(selectedId!, {
                                  properties: { ...selectedRegion.properties, maxScore: value || 10 }
                                })}
                                min={1}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                            
                            {selectedRegion.subType === 'choice' && (
                              <>
                                <Form.Item label="选项数量">
                                  <InputNumber
                                    value={selectedRegion.properties?.choiceCount}
                                    onChange={(value) => updateRegion(selectedId!, {
                                      properties: { ...selectedRegion.properties, choiceCount: value || 4 }
                                    })}
                                    min={2}
                                    max={8}
                                    style={{ width: '100%' }}
                                  />
                                </Form.Item>
                                
                                <Form.Item label="布局方式">
                                  <Radio.Group
                                    value={selectedRegion.properties?.layout || 'horizontal'}
                                    onChange={(e) => updateRegion(selectedId!, {
                                      properties: { ...selectedRegion.properties, layout: e.target.value }
                                    })}
                                  >
                                    <Radio.Button value="horizontal">水平</Radio.Button>
                                    <Radio.Button value="vertical">垂直</Radio.Button>
                                  </Radio.Group>
                                </Form.Item>
                              </>
                            )}
                          </Panel>
                        )}
                        
                        {/* 质量指标 */}
                        {selectedRegion.qualityMetrics && (
                          <Panel header="质量指标" key="quality">
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px' }}>位置精度</span>
                                <span style={{ fontSize: '12px' }}>{selectedRegion.qualityMetrics.positionAccuracy}%</span>
                              </div>
                              <Progress 
                                percent={selectedRegion.qualityMetrics.positionAccuracy} 
                                size="small" 
                                showInfo={false}
                              />
                            </div>
                            
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px' }}>尺寸规范</span>
                                <span style={{ fontSize: '12px' }}>{selectedRegion.qualityMetrics.sizeCompliance}%</span>
                              </div>
                              <Progress 
                                percent={selectedRegion.qualityMetrics.sizeCompliance} 
                                size="small" 
                                showInfo={false}
                              />
                            </div>
                            
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px' }}>OMR标准</span>
                                <span style={{ fontSize: '12px' }}>{selectedRegion.qualityMetrics.omrStandard}%</span>
                              </div>
                              <Progress 
                                percent={selectedRegion.qualityMetrics.omrStandard} 
                                size="small" 
                                showInfo={false}
                              />
                            </div>
                            
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px' }}>综合评分</span>
                                <span style={{ fontSize: '12px' }}>{selectedRegion.qualityMetrics.overallScore}%</span>
                              </div>
                              <Progress 
                                percent={selectedRegion.qualityMetrics.overallScore} 
                                size="small" 
                                showInfo={false}
                                status={selectedRegion.qualityMetrics.overallScore >= 90 ? 'success' : 
                                       selectedRegion.qualityMetrics.overallScore >= 70 ? 'normal' : 'exception'}
                              />
                            </div>
                          </Panel>
                        )}
                      </Collapse>
                    </Form>
                  </Card>
                )}
              </div>
            </TabPane>
            
            <TabPane tab="使用说明" key="help">
              <div style={{ padding: 16 }}>
                <Card title="操作指南" size="small">
                  <Collapse size="small" ghost>
                    <Panel header="基础操作" key="basic">
                      <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                        <p><strong>绘制区域：</strong></p>
                        <p>1. 选择左侧工具栏中的绘制工具</p>
                        <p>2. 在画布上按住鼠标左键拖拽绘制</p>
                        <p>3. 松开鼠标完成区域创建</p>
                        
                        <p><strong>编辑区域：</strong></p>
                        <p>1. 点击区域选中</p>
                        <p>2. 拖拽移动位置</p>
                        <p>3. 拖拽边角调整大小</p>
                        <p>4. 在右侧属性面板修改详细属性</p>
                      </div>
                    </Panel>
                    
                    <Panel header="OMR规范" key="omr-guide">
                      <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                        <p><strong>定位点要求：</strong></p>
                        <p>• 建议在四个角落各放置一个定位点</p>
                        <p>• 定位点应清晰可见，避免被遮挡</p>
                        
                        <p><strong>选择题规范：</strong></p>
                        <p>• 气泡大小应在8-12mm之间</p>
                        <p>• 气泡间距不少于15mm</p>
                        <p>• 保持一致的排列方式</p>
                        
                        <p><strong>页面要求：</strong></p>
                        <p>• 保持足够的页面边距</p>
                        <p>• 避免使用过深的背景色</p>
                        <p>• 确保打印质量清晰</p>
                      </div>
                    </Panel>
                    
                    <Panel header="质量检测" key="quality">
                      <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                        <p><strong>质量指标说明：</strong></p>
                        <p>• <span style={{ color: '#52c41a' }}>绿色</span>：优秀(90%以上)</p>
                        <p>• <span style={{ color: '#faad14' }}>黄色</span>：良好(70-89%)</p>
                        <p>• <span style={{ color: '#ff4d4f' }}>红色</span>：需要改进(70%以下)</p>
                        
                        <p><strong>常见问题：</strong></p>
                        <p>• 区域过小或过大</p>
                        <p>• 间距不符合规范</p>
                        <p>• 边距不足</p>
                        <p>• 缺少必要的定位点</p>
                      </div>
                    </Panel>
                  </Collapse>
                </Card>
              </div>
            </TabPane>
          </Tabs>
        </div>
      </div>
    </Modal>
  );
};

export default EnhancedTemplateDesigner;