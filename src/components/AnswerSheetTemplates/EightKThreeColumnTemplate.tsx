import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
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
  Modal
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  PrinterOutlined,
  DownloadOutlined,
  SettingOutlined,
  BorderOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Stage, Layer, Rect, Text, Line, Circle, Group } from 'react-konva';
import Konva from 'konva';

const { Title, Text: AntText } = Typography;
const { TextArea } = Input;

// 8K纸张尺寸 (mm)
const PAPER_8K = {
  width: 270,  // 8K纸宽度
  height: 390, // 8K纸高度
  dpi: 300
};

// 像素转换比例 (适合显示)
const MM_TO_PX = 2.2;
const CANVAS_WIDTH = PAPER_8K.width * MM_TO_PX;
const CANVAS_HEIGHT = PAPER_8K.height * MM_TO_PX;

// 三栏布局配置
const COLUMN_CONFIG = {
  count: 3,
  margin: 15, // 页边距
  gutter: 10, // 栏间距
  width: (PAPER_8K.width - 2 * 15 - 2 * 10) / 3 // 每栏宽度
};

interface TemplateConfig {
  name: string;
  subject: string;
  examType: string;
  gradeLevel: string;
  totalQuestions: number;
  questionsPerColumn: number;
  choiceOptions: number;
  includeStudentInfo: boolean;
  includeBarcode: boolean;
  includeInstructions: boolean;
  headerText: string;
  footerText: string;
}

interface EightKThreeColumnTemplateProps {
  onSave?: (template: any) => void;
  onPreview?: (template: any) => void;
  initialConfig?: Partial<TemplateConfig>;
}

const EightKThreeColumnTemplate: React.FC<EightKThreeColumnTemplateProps> = ({
  onSave,
  onPreview,
  initialConfig
}) => {
  const [form] = Form.useForm();
  const stageRef = useRef<Konva.Stage>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [config, setConfig] = useState<TemplateConfig>({
    name: '8K三栏答题卡模板',
    subject: '数学',
    examType: '期末考试',
    gradeLevel: '高中',
    totalQuestions: 60,
    questionsPerColumn: 20,
    choiceOptions: 4,
    includeStudentInfo: true,
    includeBarcode: true,
    includeInstructions: true,
    headerText: '2024年度期末考试',
    footerText: '请在规定时间内完成答题',
    ...initialConfig
  });

  // 更新配置
  const updateConfig = (updates: Partial<TemplateConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // 渲染学生信息区域
  const renderStudentInfoArea = () => {
    if (!config.includeStudentInfo) return null;

    const startY = 80;
    const height = 60;
    const fieldWidth = 80;
    const fieldHeight = 20;
    const spacing = 10;

    return (
      <Group>
        {/* 学生信息区域背景 */}
        <Rect
          x={COLUMN_CONFIG.margin}
          y={startY}
          width={CANVAS_WIDTH - 2 * COLUMN_CONFIG.margin}
          height={height}
          stroke="#000"
          strokeWidth={1}
          fill="#f8f9fa"
        />
        
        {/* 学生信息标题 */}
        <Text
          x={COLUMN_CONFIG.margin + 10}
          y={startY + 8}
          text="学生信息 Student Information"
          fontSize={12}
          fontStyle="bold"
          fill="#000"
        />
        
        {/* 姓名字段 */}
        <Text
          x={COLUMN_CONFIG.margin + 20}
          y={startY + 25}
          text="姓名 Name:"
          fontSize={10}
          fill="#000"
        />
        <Rect
          x={COLUMN_CONFIG.margin + 70}
          y={startY + 22}
          width={fieldWidth}
          height={fieldHeight}
          stroke="#000"
          strokeWidth={1}
          fill="white"
        />
        
        {/* 学号字段 */}
        <Text
          x={COLUMN_CONFIG.margin + 170}
          y={startY + 25}
          text="学号 Student ID:"
          fontSize={10}
          fill="#000"
        />
        <Rect
          x={COLUMN_CONFIG.margin + 250}
          y={startY + 22}
          width={fieldWidth}
          height={fieldHeight}
          stroke="#000"
          strokeWidth={1}
          fill="white"
        />
        
        {/* 班级字段 */}
        <Text
          x={COLUMN_CONFIG.margin + 350}
          y={startY + 25}
          text="班级 Class:"
          fontSize={10}
          fill="#000"
        />
        <Rect
          x={COLUMN_CONFIG.margin + 400}
          y={startY + 22}
          width={fieldWidth}
          height={fieldHeight}
          stroke="#000"
          strokeWidth={1}
          fill="white"
        />
        
        {/* 考号字段 */}
        <Text
          x={COLUMN_CONFIG.margin + 500}
          y={startY + 25}
          text="考号 Exam No:"
          fontSize={10}
          fill="#000"
        />
        <Rect
          x={COLUMN_CONFIG.margin + 570}
          y={startY + 22}
          width={fieldWidth}
          height={fieldHeight}
          stroke="#000"
          strokeWidth={1}
          fill="white"
        />
      </Group>
    );
  };

  // 渲染条形码区域
  const renderBarcodeArea = () => {
    if (!config.includeBarcode) return null;

    const x = CANVAS_WIDTH - COLUMN_CONFIG.margin - 100;
    const y = 20;
    const width = 80;
    const height = 40;

    return (
      <Group>
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke="#000"
          strokeWidth={1}
          fill="white"
        />
        <Text
          x={x + 5}
          y={y + 5}
          text="条形码区域"
          fontSize={8}
          fill="#666"
        />
        {/* 模拟条形码线条 */}
        {Array.from({ length: 20 }, (_, i) => (
          <Line
            key={i}
            points={[x + 5 + i * 3, y + 15, x + 5 + i * 3, y + 35]}
            stroke="#000"
            strokeWidth={i % 3 === 0 ? 2 : 1}
          />
        ))}
      </Group>
    );
  };

  // 渲染选择题选项
  const renderChoiceOptions = (questionX: number, questionY: number, questionNum: number) => {
    const optionSize = 8;
    const optionSpacing = 15;
    const options = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, config.choiceOptions);
    
    return options.map((option, index) => (
      <Group key={`q${questionNum}-${option}`}>
        <Circle
          x={questionX + 25 + index * optionSpacing}
          y={questionY + 6}
          radius={optionSize / 2}
          stroke="#000"
          strokeWidth={1}
          fill="white"
        />
        <Text
          x={questionX + 25 + index * optionSpacing - 3}
          y={questionY + 2}
          text={option}
          fontSize={6}
          fill="#000"
        />
      </Group>
    ));
  };

  // 渲染三栏选择题区域
  const renderThreeColumnQuestions = () => {
    const startY = config.includeStudentInfo ? 160 : 100;
    const questionHeight = 16;
    const questionSpacing = 2;
    const totalHeight = CANVAS_HEIGHT - startY - 100;
    const questionsPerColumn = Math.floor(totalHeight / (questionHeight + questionSpacing));
    
    const columns = [];
    
    for (let col = 0; col < COLUMN_CONFIG.count; col++) {
      const columnX = COLUMN_CONFIG.margin + col * (COLUMN_CONFIG.width + COLUMN_CONFIG.gutter);
      const columnQuestions = [];
      
      // 栏标题
      columnQuestions.push(
        <Group key={`column-${col}-header`}>
          <Rect
            x={columnX}
            y={startY - 25}
            width={COLUMN_CONFIG.width}
            height={20}
            stroke="#000"
            strokeWidth={1}
            fill="#e6f7ff"
          />
          <Text
            x={columnX + COLUMN_CONFIG.width / 2 - 20}
            y={startY - 18}
            text={`第${col + 1}栏 Column ${col + 1}`}
            fontSize={10}
            fontStyle="bold"
            fill="#000"
          />
        </Group>
      );
      
      // 栏边框
      columnQuestions.push(
        <Rect
          key={`column-${col}-border`}
          x={columnX}
          y={startY}
          width={COLUMN_CONFIG.width}
          height={totalHeight - 50}
          stroke="#000"
          strokeWidth={1}
          fill="white"
        />
      );
      
      // 题目
      for (let q = 0; q < questionsPerColumn && (col * questionsPerColumn + q) < config.totalQuestions; q++) {
        const questionNum = col * questionsPerColumn + q + 1;
        const questionY = startY + 10 + q * (questionHeight + questionSpacing);
        
        columnQuestions.push(
          <Group key={`question-${questionNum}`}>
            {/* 题号 */}
            <Text
              x={columnX + 5}
              y={questionY + 2}
              text={questionNum.toString().padStart(2, '0')}
              fontSize={8}
              fill="#000"
            />
            
            {/* 选项 */}
            {renderChoiceOptions(columnX, questionY, questionNum)}
            
            {/* 分隔线 */}
            {q < questionsPerColumn - 1 && (
              <Line
                points={[
                  columnX + 2, 
                  questionY + questionHeight - 2,
                  columnX + COLUMN_CONFIG.width - 2, 
                  questionY + questionHeight - 2
                ]}
                stroke="#ddd"
                strokeWidth={0.5}
                dash={[2, 2]}
              />
            )}
          </Group>
        );
      }
      
      columns.push(...columnQuestions);
    }
    
    return columns;
  };

  // 渲染页眉
  const renderHeader = () => {
    return (
      <Group>
        <Text
          x={CANVAS_WIDTH / 2 - 100}
          y={20}
          text={config.headerText}
          fontSize={16}
          fontStyle="bold"
          fill="#000"
        />
        <Text
          x={CANVAS_WIDTH / 2 - 50}
          y={40}
          text={`${config.subject} - ${config.examType}`}
          fontSize={12}
          fill="#000"
        />
        <Text
          x={CANVAS_WIDTH / 2 - 30}
          y={55}
          text={`年级: ${config.gradeLevel}`}
          fontSize={10}
          fill="#666"
        />
      </Group>
    );
  };

  // 渲染页脚
  const renderFooter = () => {
    const footerY = CANVAS_HEIGHT - 40;
    
    return (
      <Group>
        <Line
          points={[COLUMN_CONFIG.margin, footerY, CANVAS_WIDTH - COLUMN_CONFIG.margin, footerY]}
          stroke="#000"
          strokeWidth={1}
        />
        <Text
          x={CANVAS_WIDTH / 2 - 80}
          y={footerY + 10}
          text={config.footerText}
          fontSize={10}
          fill="#666"
        />
        <Text
          x={CANVAS_WIDTH - COLUMN_CONFIG.margin - 100}
          y={footerY + 10}
          text={`总题数: ${config.totalQuestions}`}
          fontSize={8}
          fill="#666"
        />
      </Group>
    );
  };

  // 渲染答题说明
  const renderInstructions = () => {
    if (!config.includeInstructions) return null;
    
    const instructionY = CANVAS_HEIGHT - 80;
    
    return (
      <Group>
        <Rect
          x={COLUMN_CONFIG.margin}
          y={instructionY}
          width={CANVAS_WIDTH - 2 * COLUMN_CONFIG.margin}
          height={35}
          stroke="#000"
          strokeWidth={1}
          fill="#fffbe6"
        />
        <Text
          x={COLUMN_CONFIG.margin + 10}
          y={instructionY + 5}
          text="答题说明 Instructions:"
          fontSize={10}
          fontStyle="bold"
          fill="#000"
        />
        <Text
          x={COLUMN_CONFIG.margin + 10}
          y={instructionY + 18}
          text="1. 请用2B铅笔填涂选择题答案，填涂要规范、清晰  2. 保持答题卡清洁，不要折叠  3. 仔细核对题号和选项"
          fontSize={8}
          fill="#333"
        />
      </Group>
    );
  };

  // 保存模板
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const templateData = {
        ...config,
        ...values,
        paperSize: '8K',
        layout: 'three-column',
        pageWidth: PAPER_8K.width,
        pageHeight: PAPER_8K.height,
        dpi: PAPER_8K.dpi,
        columnConfig: COLUMN_CONFIG,
        regions: generateRegions()
      };
      
      onSave?.(templateData);
      message.success('8K三栏答题卡模板保存成功');
    } catch (error) {
      message.error('保存失败，请检查表单信息');
    }
  };

  // 生成区域配置
  const generateRegions = () => {
    const regions = [];
    
    // 学生信息区域
    if (config.includeStudentInfo) {
      regions.push({
        id: 'student_info',
        type: 'student_info',
        x: COLUMN_CONFIG.margin,
        y: 80,
        width: CANVAS_WIDTH - 2 * COLUMN_CONFIG.margin,
        height: 60,
        label: '学生信息区域',
        properties: {
          fields: ['姓名', '学号', '班级', '考号']
        }
      });
    }
    
    // 条形码区域
    if (config.includeBarcode) {
      regions.push({
        id: 'barcode',
        type: 'barcode',
        x: CANVAS_WIDTH - COLUMN_CONFIG.margin - 100,
        y: 20,
        width: 80,
        height: 40,
        label: '条形码区域'
      });
    }
    
    // 三栏选择题区域
    for (let col = 0; col < COLUMN_CONFIG.count; col++) {
      const columnX = COLUMN_CONFIG.margin + col * (COLUMN_CONFIG.width + COLUMN_CONFIG.gutter);
      regions.push({
        id: `column_${col + 1}`,
        type: 'question',
        subType: 'choice',
        x: columnX,
        y: config.includeStudentInfo ? 160 : 100,
        width: COLUMN_CONFIG.width,
        height: CANVAS_HEIGHT - (config.includeStudentInfo ? 160 : 100) - 100,
        label: `第${col + 1}栏选择题`,
        properties: {
          questionStart: col * Math.ceil(config.totalQuestions / 3) + 1,
          questionEnd: Math.min((col + 1) * Math.ceil(config.totalQuestions / 3), config.totalQuestions),
          choiceCount: config.choiceOptions
        }
      });
    }
    
    return regions;
  };

  // 预览模板
  const handlePreview = () => {
    setPreviewMode(true);
    onPreview?.({
      ...config,
      paperSize: '8K',
      layout: 'three-column',
      regions: generateRegions()
    });
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
    <div style={{ padding: '24px' }}>
      <Row gutter={24}>
        {/* 左侧配置面板 */}
        <Col span={8}>
          <Card title="8K三栏答题卡配置" size="small">
            <Form
              form={form}
              layout="vertical"
              initialValues={config}
              onValuesChange={(_, allValues) => updateConfig(allValues)}
            >
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="请输入模板名称" />
              </Form.Item>
              
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="subject" label="科目">
                    <Select>
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
                  <Form.Item name="gradeLevel" label="年级">
                    <Select>
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
                </Select>
              </Form.Item>
              
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="totalQuestions" label="总题数">
                    <InputNumber
                      min={1}
                      max={150}
                      style={{ width: '100%' }}
                      onChange={(value) => updateConfig({ totalQuestions: value || 60 })}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="choiceOptions" label="选项数">
                    <Select onChange={(value) => updateConfig({ choiceOptions: value })}>
                      <Select.Option value={4}>4选项 (A-D)</Select.Option>
                      <Select.Option value={5}>5选项 (A-E)</Select.Option>
                      <Select.Option value={6}>6选项 (A-F)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="headerText" label="页眉文字">
                <Input placeholder="考试标题" />
              </Form.Item>
              
              <Form.Item name="footerText" label="页脚文字">
                <Input placeholder="答题说明或注意事项" />
              </Form.Item>
              
              <Form.Item label="包含区域">
                <Checkbox
                  checked={config.includeStudentInfo}
                  onChange={(e) => updateConfig({ includeStudentInfo: e.target.checked })}
                >
                  学生信息区域
                </Checkbox>
                <br />
                <Checkbox
                  checked={config.includeBarcode}
                  onChange={(e) => updateConfig({ includeBarcode: e.target.checked })}
                >
                  条形码区域
                </Checkbox>
                <br />
                <Checkbox
                  checked={config.includeInstructions}
                  onChange={(e) => updateConfig({ includeInstructions: e.target.checked })}
                >
                  答题说明
                </Checkbox>
              </Form.Item>
            </Form>
            
            <Divider />
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                block
              >
                保存模板
              </Button>
              
              <Button
                icon={<EyeOutlined />}
                onClick={handlePreview}
                block
              >
                预览模板
              </Button>
              
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportImage}
                block
              >
                导出图片
              </Button>
            </Space>
          </Card>
          
          {/* 规格说明 */}
          <Card title="8K纸张规格" size="small" style={{ marginTop: 16 }}>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <p><strong>纸张尺寸:</strong> 270mm × 390mm</p>
              <p><strong>布局方式:</strong> 三栏等分布局</p>
              <p><strong>每栏宽度:</strong> {COLUMN_CONFIG.width}mm</p>
              <p><strong>栏间距:</strong> {COLUMN_CONFIG.gutter}mm</p>
              <p><strong>页边距:</strong> {COLUMN_CONFIG.margin}mm</p>
              <p><strong>分辨率:</strong> {PAPER_8K.dpi} DPI</p>
              <p><strong>适用场景:</strong> 大型考试、标准化测试</p>
            </div>
          </Card>
        </Col>
        
        {/* 右侧预览区域 */}
        <Col span={16}>
          <Card 
            title="模板预览" 
            size="small"
            extra={
              <Space>
                <AntText type="secondary">8K (270×390mm)</AntText>
                <Button
                  size="small"
                  icon={<BorderOutlined />}
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? '编辑' : '预览'}
                </Button>
              </Space>
            }
          >
            <div style={{ 
              width: '100%', 
              height: '80vh', 
              overflow: 'auto',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: '#f5f5f5',
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
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  scale={{ x: 0.8, y: 0.8 }}
                >
                  <Layer>
                    {/* 页面背景 */}
                    <Rect
                      x={0}
                      y={0}
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      fill="white"
                      stroke="#ddd"
                      strokeWidth={1}
                    />
                    
                    {/* 渲染各个区域 */}
                    {renderHeader()}
                    {renderStudentInfoArea()}
                    {renderBarcodeArea()}
                    {renderThreeColumnQuestions()}
                    {renderInstructions()}
                    {renderFooter()}
                  </Layer>
                </Stage>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* 预览模态框 */}
      <Modal
        title="8K三栏答题卡预览"
        open={previewMode}
        onCancel={() => setPreviewMode(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setPreviewMode(false)}>
            关闭
          </Button>,
          <Button key="print" icon={<PrinterOutlined />}>
            打印预览
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleExportImage}>
            下载图片
          </Button>
        ]}
      >
        <div style={{ textAlign: 'center' }}>
          <Stage
            width={CANVAS_WIDTH * 0.6}
            height={CANVAS_HEIGHT * 0.6}
            scale={{ x: 0.6, y: 0.6 }}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="white"
                stroke="#ddd"
                strokeWidth={1}
              />
              {renderHeader()}
              {renderStudentInfoArea()}
              {renderBarcodeArea()}
              {renderThreeColumnQuestions()}
              {renderInstructions()}
              {renderFooter()}
            </Layer>
          </Stage>
        </div>
      </Modal>
    </div>
  );
};

export default EightKThreeColumnTemplate;