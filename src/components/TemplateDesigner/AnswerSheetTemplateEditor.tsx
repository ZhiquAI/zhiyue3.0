import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Form,
  Space,
  Row,
  Col,
  Modal,
  message,
  Tooltip,
  InputNumber,
  Select,
  Tag,
  Typography,
  Upload,
  Divider,
  List,
  Popconfirm
} from 'antd';
import type { UploadProps } from 'antd';
import {
  FormOutlined,
  DeleteOutlined,
  SaveOutlined,
  ScanOutlined,
  QrcodeOutlined,
  CheckSquareOutlined,
  EditOutlined,
  UploadOutlined,
  AimOutlined
} from '@ant-design/icons';
import { TemplateApiService, type Template as ApiTemplate, type TemplateData as ApiTemplateData, type TemplateRegion as ApiTemplateRegion } from '../../api/templateApi';
import { message as messageUtils } from '../../utils/message';
import { useAppContext } from '../../contexts/AppContext';

const { TextArea } = Input;
const { Title, Text } = Typography;

// 类型定义
interface TemplateRegion {
  id: string;
  type: 'timing' | 'barcode' | 'omr' | 'subjective';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  properties: {
    questionId?: string;
    fullMarks?: string;
    choiceCount?: number;
    [key: string]: any;
  };
}

interface TemplateConfig {
  id?: string;
  name: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
  examType?: string;
  backgroundImage?: string;
  regions: TemplateRegion[];
}

interface AnswerSheetTemplateEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: TemplateConfig) => void;
  initialTemplate?: TemplateConfig;
  mode?: 'create' | 'edit';
}

const AnswerSheetTemplateEditor: React.FC<AnswerSheetTemplateEditorProps> = ({
  visible,
  onClose,
  onSave,
  initialTemplate,
  mode = 'create'
}) => {
  if (!visible) return null;
  const [form] = Form.useForm();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { setHeaderVisible } = useAppContext(); // 添加useAppContext
  
  // 状态管理
  const [regions, setRegions] = useState<TemplateRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawingRegion, setCurrentDrawingRegion] = useState<HTMLDivElement | null>(null);
  const [regionCounter, setRegionCounter] = useState(0);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // 控制菜单栏显示/隐藏
  useEffect(() => {
    if (visible) {
      setHeaderVisible(false); // 模态框打开时隐藏菜单栏
    } else {
      setHeaderVisible(true); // 模态框关闭时显示菜单栏
    }
    
    // 组件卸载时确保恢复菜单栏
    return () => {
      setHeaderVisible(true);
    };
  }, [visible, setHeaderVisible]);
  
  // 工具配置
  const toolConfig = {
    timing: { name: '定位点', color: 'border-red-500', bgColor: 'bg-red-500', icon: <ScanOutlined /> },
    barcode: { name: '条码区', color: 'border-purple-500', bgColor: 'bg-purple-500', icon: <QrcodeOutlined /> },
    omr: { name: '客观题', color: 'border-blue-500', bgColor: 'bg-blue-500', icon: <CheckSquareOutlined /> },
    subjective: { name: '主观题', color: 'border-green-500', bgColor: 'bg-green-500', icon: <EditOutlined /> }
  };
  
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
        setRegions(initialTemplate.regions || []);
        setBackgroundImage(initialTemplate.backgroundImage || '');
      } else {
        form.resetFields();
        setRegions([]);
        setBackgroundImage('');
      }
      setSelectedRegionId(null);
      setCurrentTool(null);
      setRegionCounter(0);
    }
  }, [visible, initialTemplate, form]);
  
  // 处理关闭
  const handleClose = () => {
    setHeaderVisible(true); // 确保关闭时恢复菜单栏
    onClose();
  };

  // 工具选择
  const handleToolSelect = (tool: string) => {
    setCurrentTool(currentTool === tool ? null : tool);
    setSelectedRegionId(null);
  };
  
  // 生成唯一ID
  const generateRegionId = () => {
    const newCounter = regionCounter + 1;
    setRegionCounter(newCounter);
    return `region-${newCounter}`;
  };
  
  // 画布鼠标事件
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTool || !canvasRef.current) {
      return;
    }
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    
    const regionId = generateRegionId();
    const regionElement = document.createElement('div');
    regionElement.id = regionId;
    regionElement.className = `absolute border-2 ${toolConfig[currentTool as keyof typeof toolConfig].color} opacity-70 transition-all duration-100 cursor-pointer`;
    regionElement.style.left = `${x}px`;
    regionElement.style.top = `${y}px`;
    regionElement.style.width = '0px';
    regionElement.style.height = '0px';
    regionElement.style.boxSizing = 'border-box';
    
    // 添加标签
    const label = document.createElement('div');
    label.className = `absolute -top-6 -left-0.5 ${toolConfig[currentTool as keyof typeof toolConfig].bgColor} text-white px-2 py-0.5 text-xs font-medium rounded-t`;
    label.textContent = toolConfig[currentTool as keyof typeof toolConfig].name;
    regionElement.appendChild(label);
    
    canvasRef.current.appendChild(regionElement);
    setCurrentDrawingRegion(regionElement);
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentDrawingRegion || !startPos || !canvasRef.current) {
      return;
    }
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const newX = Math.min(currentX, startPos.x);
    const newY = Math.min(currentY, startPos.y);
    
    currentDrawingRegion.style.left = `${newX}px`;
    currentDrawingRegion.style.top = `${newY}px`;
    currentDrawingRegion.style.width = `${width}px`;
    currentDrawingRegion.style.height = `${height}px`;
  };
  
  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentDrawingRegion || !currentTool) {
      return;
    }
    
    setIsDrawing(false);
    
    const newRegion: TemplateRegion = {
      id: currentDrawingRegion.id,
      type: currentTool as TemplateRegion['type'],
      x: parseInt(currentDrawingRegion.style.left),
      y: parseInt(currentDrawingRegion.style.top),
      width: parseInt(currentDrawingRegion.style.width),
      height: parseInt(currentDrawingRegion.style.height),
      label: toolConfig[currentTool as keyof typeof toolConfig].name,
      properties: { questionId: '', fullMarks: '' }
    };
    
    // 添加点击事件
    currentDrawingRegion.addEventListener('click', (e) => {
      e.stopPropagation();
      selectRegion(newRegion.id);
    });
    
    setRegions(prev => [...prev, newRegion]);
    selectRegion(newRegion.id);
    setCurrentDrawingRegion(null);
    setStartPos(null);
  };
  
  // 选择区域
  const selectRegion = (regionId: string) => {
    setSelectedRegionId(regionId);
    
    // 更新视觉选择状态
    if (canvasRef.current) {
      const allRegions = canvasRef.current.querySelectorAll('.absolute.border-2');
      allRegions.forEach(r => {
        r.classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50', 'z-10');
        r.classList.add('opacity-70');
      });
      
      const selectedElement = document.getElementById(regionId);
      if (selectedElement) {
        selectedElement.classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50', 'z-10');
        selectedElement.classList.remove('opacity-70');
        selectedElement.classList.add('opacity-100');
      }
    }
  };
  
  // 删除选中区域
  const deleteSelectedRegion = () => {
    if (!selectedRegionId) return;
    
    // 从DOM中移除
    const element = document.getElementById(selectedRegionId);
    if (element) {
      element.remove();
    }
    
    // 从状态中移除
    setRegions(prev => prev.filter(r => r.id !== selectedRegionId));
    setSelectedRegionId(null);
  };
  
  // 更新区域属性
  const updateRegionProperty = (property: string, value: any) => {
    if (!selectedRegionId) return;
    
    setRegions(prev => prev.map(region => {
      if (region.id === selectedRegionId) {
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
  };
  
  // 背景图片上传
  const uploadProps: UploadProps = {
    name: 'file',
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: async (file) => {
      setUploading(true);
      try {
        // 上传到服务器
        const uploadResult = await TemplateApiService.uploadBackgroundImage(file);
        const imageUrl = TemplateApiService.getBackgroundImageUrl(uploadResult.filename);
        setBackgroundImage(imageUrl);
        message.success('背景图片上传成功');
      } catch (error) {
        console.error('上传失败:', error);
        message.error('背景图片上传失败');
      } finally {
        setUploading(false);
      }
      return false;
    }
  };
  
  // 保存模板
  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      
      if (regions.length === 0) {
        message.warning('请至少添加一个区域');
        return;
      }
      
      const apiTemplateData: ApiTemplateData = {
         regions: regions.map(region => ({
           id: region.id,
           type: region.type === 'timing' ? 'positioning' : 
                 region.type === 'omr' ? 'objective' : region.type as ApiTemplateRegion['type'],
           x: region.x,
           y: region.y,
           width: region.width,
           height: region.height,
           properties: {
             questionNumber: region.properties.questionId,
             maxScore: region.properties.fullMarks ? Number(region.properties.fullMarks) : undefined,
             optionCount: region.properties.choiceCount
           }
         })),
         pageConfig: {
           width: 210,
           height: 297,
           dpi: 300
         },
         backgroundImage: backgroundImage || undefined
       };
       
       const requestData = {
         name: values.name,
         description: values.description || '',
         subject: values.subject || '',
         grade_level: values.gradeLevel || '',
         exam_type: values.examType || '',
         template_data: apiTemplateData,
         page_width: 210,
         page_height: 297,
         dpi: 300
       };
       
       let savedTemplate: ApiTemplate;
        if (mode === 'edit' && initialTemplate?.id) {
          const templateId = typeof initialTemplate.id === 'string' ? parseInt(initialTemplate.id) : initialTemplate.id;
          savedTemplate = await TemplateApiService.updateTemplate(templateId, requestData);
         message.success('模板更新成功');
       } else {
         savedTemplate = await TemplateApiService.createTemplate(requestData);
         message.success('模板创建成功');
       }
      
      const templateConfig: TemplateConfig = {
         id: savedTemplate.id?.toString() || '',
         name: savedTemplate.name,
         description: savedTemplate.description || '',
         subject: savedTemplate.subject || '',
         gradeLevel: savedTemplate.grade_level || '',
         examType: savedTemplate.exam_type || '',
         backgroundImage: savedTemplate.template_data?.backgroundImage || '',
         regions: savedTemplate.template_data?.regions?.map(region => ({
           id: region.id,
           type: region.type === 'positioning' ? 'timing' :
                 region.type === 'objective' ? 'omr' : region.type as TemplateRegion['type'],
           x: region.x,
           y: region.y,
           width: region.width,
           height: region.height,
           label: `${region.type}_${region.id}`,
           properties: {
             questionId: region.properties.questionNumber || '',
             fullMarks: region.properties.maxScore?.toString() || '',
             choiceCount: region.properties.optionCount || 4
           }
         })) || []
       };
      
      onSave(templateConfig);
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('保存模板失败，请重试');
    } finally {
      setSaving(false);
    }
  };
  
  // 获取选中区域
  const selectedRegion = regions.find(r => r.id === selectedRegionId);
  
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl h-[calc(100vh-2rem)] flex flex-col z-10 overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
          <div className="flex items-center">
            <FormOutlined className="mr-2" />
            <span className="text-lg font-semibold">
              {mode === 'create' ? '答题卡模板设计器' : '编辑答题卡模板'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="text" icon={<DeleteOutlined />} onClick={handleClose} />
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 左侧工具栏 */}
        <div className="w-64 bg-gray-50 p-4 space-y-4 border-r overflow-y-auto max-h-full">
          <div>
            <Title level={5}>基本信息</Title>
            <Form form={form} layout="vertical" size="small">
              <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                <Input placeholder="请输入模板名称" />
              </Form.Item>
              <Form.Item name="description" label="模板描述">
                <TextArea rows={2} placeholder="请输入模板描述" />
              </Form.Item>
              <Form.Item name="subject" label="科目">
                <Select placeholder="选择科目">
                  <Select.Option value="语文">语文</Select.Option>
                  <Select.Option value="数学">数学</Select.Option>
                  <Select.Option value="英语">英语</Select.Option>
                  <Select.Option value="物理">物理</Select.Option>
                  <Select.Option value="化学">化学</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="gradeLevel" label="年级">
                <Select placeholder="选择年级">
                  <Select.Option value="初一">初一</Select.Option>
                  <Select.Option value="初二">初二</Select.Option>
                  <Select.Option value="初三">初三</Select.Option>
                  <Select.Option value="高一">高一</Select.Option>
                  <Select.Option value="高二">高二</Select.Option>
                  <Select.Option value="高三">高三</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="examType" label="考试类型">
                <Select placeholder="选择考试类型">
                  <Select.Option value="期中考试">期中考试</Select.Option>
                  <Select.Option value="期末考试">期末考试</Select.Option>
                  <Select.Option value="月考">月考</Select.Option>
                  <Select.Option value="模拟考试">模拟考试</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </div>
          
          <Divider />
          
          <div>
            <Title level={5}>背景图片</Title>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading} block>
                {uploading ? '上传中...' : '上传答题卡底图'}
              </Button>
            </Upload>
            {backgroundImage && (
              <div className="mt-2">
                <Text type="success">✓ 已上传背景图片</Text>
              </div>
            )}
          </div>
          
          <Divider />
          
          <div>
            <Title level={5}>工具箱</Title>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(toolConfig).map(([key, config]) => (
                <Button
                  key={key}
                  type={currentTool === key ? 'primary' : 'default'}
                  className="h-16 flex flex-col items-center justify-center"
                  onClick={() => handleToolSelect(key)}
                >
                  <div className="text-lg mb-1">{config.icon}</div>
                  <div className="text-xs">{config.name}</div>
                </Button>
              ))}
            </div>
          </div>
          
          <Divider />
          
          <div>
            <Title level={5}>图层列表</Title>
            <div className="max-h-48 overflow-y-auto">
              {regions.length === 0 ? (
                <Text type="secondary" className="text-center block py-4">
                  尚未创建任何区域
                </Text>
              ) : (
                <List
                  size="small"
                  dataSource={regions}
                  renderItem={(region) => {
                    const config = toolConfig[region.type];
                    const displayName = region.type === 'subjective' && region.properties.questionId
                      ? `${config.name} (${region.properties.questionId})`
                      : config.name;
                    
                    return (
                      <List.Item
                        className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                          selectedRegionId === region.id ? 'bg-blue-100' : ''
                        }`}
                        onClick={() => selectRegion(region.id)}
                      >
                        <div className="flex items-center w-full">
                          <div className={`w-3 h-3 rounded-sm ${config.bgColor} mr-2`}></div>
                          <Text className="flex-1 text-sm">{displayName}</Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* 中间画布区域 */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-100 overflow-auto min-w-0 min-h-0">
          <div
            ref={canvasRef}
            className="relative bg-white shadow-lg cursor-crosshair overflow-hidden"
            style={{
              width: '800px',
              height: '1120px',
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1120' viewBox='0 0 800 1120'%3E%3Crect width='800' height='1120' fill='%23ffffff'/%3E%3Ctext x='400' y='560' text-anchor='middle' alignment-baseline='middle' font-size='24' fill='%23cccccc'%3E在此上传答题卡底图%3C/text%3E%3C/svg%3E")`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          >
            {/* 绘制的区域将通过DOM操作添加到这里 */}
          </div>
        </div>
        {/* 右侧属性面板 */}
        <div className="w-80 bg-gray-50 p-4 border-l overflow-y-auto max-h-full">
          <Title level={5}>属性配置</Title>
          {selectedRegion ? (
            <div className="space-y-4">
              <div>
                <Text strong>区域类型</Text>
                <div className="mt-1">
                  <Tag color={toolConfig[selectedRegion.type].color.replace('border-', '')}>
                    {toolConfig[selectedRegion.type].name}
                  </Tag>
                </div>
              </div>
              
              {selectedRegion.type === 'subjective' && (
                <>
                  <div>
                    <Text strong>题目编号</Text>
                    <Input
                      className="mt-1"
                      value={selectedRegion.properties.questionId}
                      onChange={(e) => updateRegionProperty('questionId', e.target.value)}
                      placeholder="请输入题目编号"
                    />
                  </div>
                  <div>
                    <Text strong>满分值</Text>
                    <InputNumber
                      className="mt-1 w-full"
                      value={selectedRegion.properties.fullMarks}
                      onChange={(value) => updateRegionProperty('fullMarks', value)}
                      placeholder="请输入满分值"
                    />
                  </div>
                </>
              )}
              
              {selectedRegion.type === 'omr' && (
                <div>
                  <Text strong>选项数量</Text>
                  <InputNumber
                    className="mt-1 w-full"
                    value={selectedRegion.properties.choiceCount || 4}
                    onChange={(value) => updateRegionProperty('choiceCount', value)}
                    min={2}
                    max={8}
                  />
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Popconfirm
                  title="确定要删除此区域吗？"
                  onConfirm={deleteSelectedRegion}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />} block>
                    删除此区域
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-10">
              <AimOutlined className="text-4xl mb-2" />
              <div>请先选择一个区域</div>
            </div>
          )}
        </div>
        </div>
        
        {/* 底部操作栏 */}
        <div className="flex items-center justify-end p-4 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
          <Space>
            <Button onClick={handleClose}>
              取消
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              {saving ? '保存中...' : '保存模板'}
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default AnswerSheetTemplateEditor;