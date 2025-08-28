import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Modal,
  Tabs,
  List,
  Typography,
  Divider,
  Alert,
  Slider,
  Upload,
  message,
  notification,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  EditOutlined,
  SettingOutlined,
  BorderOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  BgColorsOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 模板元素类型
type ElementType =
  | "text"
  | "choice"
  | "fill_blank"
  | "essay"
  | "barcode"
  | "qr_code"
  | "image"
  | "line"
  | "rectangle";

// 模板元素
interface TemplateElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: {
    text?: string;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    textAlign?: "left" | "center" | "right";
    color?: string;
    backgroundColor?: string;
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: "solid" | "dashed" | "dotted";
    options?: string[];
    maxLength?: number;
    required?: boolean;
    placeholder?: string;
    validation?: string;
  };
  locked?: boolean;
  visible?: boolean;
}

// 答题卡模板
interface AnswerSheetTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  dpi: number;
  backgroundColor: string;
  elements: TemplateElement[];
  metadata: {
    subject: string;
    grade: string;
    examType: string;
    totalScore: number;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
    version: string;
  };
  settings: {
    gridSize: number;
    snapToGrid: boolean;
    showGrid: boolean;
    showRuler: boolean;
    zoom: number;
  };
}

const TemplateDesigner: React.FC = () => {
  const [template, setTemplate] = useState<AnswerSheetTemplate>({
    id: "template_1",
    name: "新建模板",
    description: "",
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
    dpi: 300,
    backgroundColor: "#ffffff",
    elements: [],
    metadata: {
      subject: "",
      grade: "",
      examType: "",
      totalScore: 100,
      duration: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: "1.0",
    },
    settings: {
      gridSize: 5,
      snapToGrid: true,
      showGrid: true,
      showRuler: true,
      zoom: 1.0,
    },
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("design");
  const [templateListModalVisible, setTemplateListModalVisible] =
    useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [history, setHistory] = useState<AnswerSheetTemplate[]>([template]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [propertiesForm] = Form.useForm();

  // 元素类型配置
  const elementTypes = [
    {
      type: "text",
      label: "文本",
      icon: <FontSizeOutlined />,
      color: "#1890ff",
    },
    {
      type: "choice",
      label: "选择题",
      icon: <BorderOutlined />,
      color: "#52c41a",
    },
    {
      type: "fill_blank",
      label: "填空题",
      icon: <EditOutlined />,
      color: "#fa8c16",
    },
    {
      type: "essay",
      label: "问答题",
      icon: <AlignLeftOutlined />,
      color: "#722ed1",
    },
    {
      type: "barcode",
      label: "条形码",
      icon: <BgColorsOutlined />,
      color: "#13c2c2",
    },
    {
      type: "qr_code",
      label: "二维码",
      icon: <BorderOutlined />,
      color: "#eb2f96",
    },
    { type: "image", label: "图片", icon: <PlusOutlined />, color: "#f5222d" },
    { type: "line", label: "线条", icon: <BorderOutlined />, color: "#faad14" },
    {
      type: "rectangle",
      label: "矩形",
      icon: <BorderOutlined />,
      color: "#a0d911",
    },
  ];

  // 添加元素到历史记录
  const addToHistory = useCallback(
    (newTemplate: AnswerSheetTemplate) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        ...newTemplate,
        metadata: { ...newTemplate.metadata, updatedAt: new Date() },
      });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTemplate(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTemplate(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // 添加元素
  const addElement = useCallback(
    (type: ElementType) => {
      const newElement: TemplateElement = {
        id: `element_${Date.now()}`,
        type,
        x: 50,
        y: 50,
        width: type === "text" ? 100 : type === "line" ? 200 : 150,
        height:
          type === "text"
            ? 30
            : type === "line"
            ? 2
            : type === "essay"
            ? 100
            : 40,
        properties: {
          text:
            type === "text" ? "文本内容" : type === "choice" ? "A B C D" : "",
          fontSize: 12,
          fontWeight: "normal",
          textAlign: "left",
          color: "#000000",
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: "#d9d9d9",
          borderStyle: "solid",
          required: false,
        },
        locked: false,
        visible: true,
      };

      const newTemplate = {
        ...template,
        elements: [...template.elements, newElement],
      };

      setTemplate(newTemplate);
      addToHistory(newTemplate);
      setSelectedElement(newElement.id);
    },
    [template, addToHistory]
  );

  // 删除元素
  const deleteElement = useCallback(
    (elementId: string) => {
      const newTemplate = {
        ...template,
        elements: template.elements.filter((el) => el.id !== elementId),
      };

      setTemplate(newTemplate);
      addToHistory(newTemplate);
      setSelectedElement(null);
    },
    [template, addToHistory]
  );

  // 复制元素
  const duplicateElement = useCallback(
    (elementId: string) => {
      const element = template.elements.find((el) => el.id === elementId);
      if (element) {
        const newElement = {
          ...element,
          id: `element_${Date.now()}`,
          x: element.x + 20,
          y: element.y + 20,
        };

        const newTemplate = {
          ...template,
          elements: [...template.elements, newElement],
        };

        setTemplate(newTemplate);
        addToHistory(newTemplate);
        setSelectedElement(newElement.id);
      }
    },
    [template, addToHistory]
  );

  // 更新元素属性
  const updateElement = useCallback(
    (elementId: string, updates: Partial<TemplateElement>) => {
      const newTemplate = {
        ...template,
        elements: template.elements.map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        ),
      };

      setTemplate(newTemplate);
      addToHistory(newTemplate);
    },
    [template, addToHistory]
  );

  // 保存模板
  const saveTemplate = useCallback(async () => {
    try {
      // 模拟保存到服务器
      await new Promise((resolve) => setTimeout(resolve, 1000));

      notification.success({
        message: "保存成功",
        description: "模板已成功保存到服务器",
      });
    } catch {
      notification.error({
        message: "保存失败",
        description: "保存模板时发生错误，请重试",
      });
    }
  }, []);

  // 导出模板
  const exportTemplate = useCallback(() => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.name}.json`;
    link.click();
    URL.revokeObjectURL(url);

    message.success("模板已导出");
  }, [template]);

  // 导入模板
  const importTemplate = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTemplate = JSON.parse(e.target?.result as string);
          setTemplate(importedTemplate);
          addToHistory(importedTemplate);
          message.success("模板导入成功");
        } catch {
          message.error("模板文件格式错误");
        }
      };
      reader.readAsText(file);
      return false; // 阻止默认上传行为
    },
    [addToHistory]
  );

  // 缩放控制
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(template.settings.zoom * 1.2, 3.0);
    setTemplate((prev) => ({
      ...prev,
      settings: { ...prev.settings, zoom: newZoom },
    }));
  }, [template.settings.zoom]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(template.settings.zoom / 1.2, 0.2);
    setTemplate((prev) => ({
      ...prev,
      settings: { ...prev.settings, zoom: newZoom },
    }));
  }, [template.settings.zoom]);

  // 渲染元素
  const renderElement = useCallback(
    (element: TemplateElement) => {
      const isSelected = selectedElement === element.id;
      const scale = template.settings.zoom;

      const style: React.CSSProperties = {
        position: "absolute",
        left: element.x * scale,
        top: element.y * scale,
        width: element.width * scale,
        height: element.height * scale,
        border: isSelected
          ? "2px solid #1890ff"
          : `${element.properties.borderWidth}px ${element.properties.borderStyle} ${element.properties.borderColor}`,
        backgroundColor: element.properties.backgroundColor,
        color: element.properties.color,
        fontSize: (element.properties.fontSize || 12) * scale,
        fontWeight: element.properties.fontWeight,
        textAlign: element.properties.textAlign,
        display: "flex",
        alignItems: "center",
        justifyContent:
          element.properties.textAlign === "center"
            ? "center"
            : element.properties.textAlign === "right"
            ? "flex-end"
            : "flex-start",
        padding: "4px",
        cursor: "pointer",
        userSelect: "none",
        boxSizing: "border-box",
      };

      const content = () => {
        switch (element.type) {
          case "text":
            return element.properties.text || "文本";
          case "choice":
            return element.properties.options?.join(" ") || "A B C D";
          case "fill_blank":
            return "___________";
          case "essay":
            return "问答题区域";
          case "barcode":
            return "||||| ||||| |||||";
          case "qr_code":
            return "■□■□■\n□■□■□\n■□■□■";
          case "image":
            return "图片区域";
          case "line":
            return "";
          case "rectangle":
            return "";
          default:
            return element.properties.text || "";
        }
      };

      return (
        <div
          key={element.id}
          style={style}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedElement(element.id);
          }}
          onDoubleClick={() => {
            propertiesForm.setFieldsValue(element.properties);
          }}
        >
          {content()}
          {isSelected && (
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                display: "flex",
                gap: "4px",
              }}
            >
              <Button
                size="small"
                type="primary"
                icon={<CopyOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateElement(element.id);
                }}
              />
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteElement(element.id);
                }}
              />
            </div>
          )}
        </div>
      );
    },
    [
      selectedElement,
      template.settings.zoom,
      duplicateElement,
      deleteElement,
      propertiesForm,
    ]
  );

  // 初始化属性表单
  useEffect(() => {
    if (selectedElement) {
      const element = template.elements.find((el) => el.id === selectedElement);
      if (element) {
        propertiesForm.setFieldsValue(element.properties);
      }
    }
  }, [selectedElement, template.elements, propertiesForm]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 工具栏 */}
      <Card size="small" style={{ borderRadius: 0 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<SaveOutlined />}
                type="primary"
                onClick={saveTemplate}
              >
                保存
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportTemplate}>
                导出
              </Button>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={importTemplate}
              >
                <Button icon={<UploadOutlined />}>导入</Button>
              </Upload>
              <Divider type="vertical" />
              <Button
                icon={<UndoOutlined />}
                disabled={historyIndex <= 0}
                onClick={undo}
              >
                撤销
              </Button>
              <Button
                icon={<RedoOutlined />}
                disabled={historyIndex >= history.length - 1}
                onClick={redo}
              >
                重做
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setPreviewModalVisible(true)}
              >
                预览
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setTemplateListModalVisible(true)}
              >
                模板库
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <div style={{ flex: 1, display: "flex" }}>
        {/* 左侧工具面板 */}
        <Card
          size="small"
          style={{
            width: "280px",
            borderRadius: 0,
            borderRight: "1px solid #f0f0f0",
          }}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
            <TabPane tab="元素" key="elements">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {elementTypes.map(({ type, label, icon, color }) => (
                  <Button
                    key={type}
                    icon={icon}
                    onClick={() => addElement(type as ElementType)}
                    style={{
                      height: "60px",
                      display: "flex",
                      flexDirection: "column",
                      borderColor: color,
                      color: color,
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </TabPane>

            <TabPane tab="属性" key="properties">
              {selectedElement ? (
                <Form
                  form={propertiesForm}
                  layout="vertical"
                  size="small"
                  onValuesChange={(_, values) => {
                    updateElement(selectedElement, { properties: values });
                  }}
                >
                  <Form.Item label="文本" name="text">
                    <TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="字体大小" name="fontSize">
                    <InputNumber min={8} max={72} />
                  </Form.Item>
                  <Form.Item label="字体粗细" name="fontWeight">
                    <Select>
                      <Option value="normal">正常</Option>
                      <Option value="bold">粗体</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="对齐方式" name="textAlign">
                    <Select>
                      <Option value="left">左对齐</Option>
                      <Option value="center">居中</Option>
                      <Option value="right">右对齐</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="文字颜色" name="color">
                    <Input type="color" />
                  </Form.Item>
                  <Form.Item label="背景颜色" name="backgroundColor">
                    <Input type="color" />
                  </Form.Item>
                  <Form.Item label="边框宽度" name="borderWidth">
                    <InputNumber min={0} max={10} />
                  </Form.Item>
                  <Form.Item label="边框颜色" name="borderColor">
                    <Input type="color" />
                  </Form.Item>
                  <Form.Item
                    label="必填"
                    name="required"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Form>
              ) : (
                <Alert message="请选择一个元素来编辑属性" type="info" />
              )}
            </TabPane>

            <TabPane tab="设置" key="settings">
              <Form layout="vertical" size="small">
                <Form.Item label="网格大小">
                  <Slider
                    min={1}
                    max={20}
                    value={template.settings.gridSize}
                    onChange={(value) => {
                      setTemplate((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, gridSize: value },
                      }));
                    }}
                  />
                </Form.Item>
                <Form.Item label="吸附网格">
                  <Switch
                    checked={template.settings.snapToGrid}
                    onChange={(checked) => {
                      setTemplate((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, snapToGrid: checked },
                      }));
                    }}
                  />
                </Form.Item>
                <Form.Item label="显示网格">
                  <Switch
                    checked={template.settings.showGrid}
                    onChange={(checked) => {
                      setTemplate((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, showGrid: checked },
                      }));
                    }}
                  />
                </Form.Item>
                <Form.Item label="显示标尺">
                  <Switch
                    checked={template.settings.showRuler}
                    onChange={(checked) => {
                      setTemplate((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, showRuler: checked },
                      }));
                    }}
                  />
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
        </Card>

        {/* 中间设计区域 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* 缩放控制 */}
          <div
            style={{
              padding: "8px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Button size="small" icon={<ZoomOutOutlined />} onClick={zoomOut} />
            <Text style={{ minWidth: "60px", textAlign: "center" }}>
              {Math.round(template.settings.zoom * 100)}%
            </Text>
            <Button size="small" icon={<ZoomInOutlined />} onClick={zoomIn} />
            <Button
              size="small"
              icon={<FullscreenOutlined />}
              onClick={() =>
                setTemplate((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, zoom: 1.0 },
                }))
              }
            />
          </div>

          {/* 画布区域 */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: "#f5f5f5",
              position: "relative",
              padding: "20px",
            }}
            onClick={() => setSelectedElement(null)}
          >
            <div
              ref={canvasRef}
              style={{
                width: template.width * template.settings.zoom,
                height: template.height * template.settings.zoom,
                backgroundColor: template.backgroundColor,
                position: "relative",
                margin: "0 auto",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                backgroundImage: template.settings.showGrid
                  ? `linear-gradient(to right, #e0e0e0 1px, transparent 1px),
                     linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)`
                  : "none",
                backgroundSize: template.settings.showGrid
                  ? `${template.settings.gridSize * template.settings.zoom}px ${
                      template.settings.gridSize * template.settings.zoom
                    }px`
                  : "auto",
              }}
            >
              {template.elements.map(renderElement)}
            </div>
          </div>
        </div>

        {/* 右侧图层面板 */}
        <Card
          size="small"
          style={{
            width: "250px",
            borderRadius: 0,
            borderLeft: "1px solid #f0f0f0",
          }}
        >
          <Title level={5}>图层</Title>
          <List
            size="small"
            dataSource={template.elements}
            renderItem={(element) => (
              <List.Item
                style={{
                  backgroundColor:
                    selectedElement === element.id ? "#e6f7ff" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedElement(element.id)}
                actions={[
                  <Button
                    key="visible"
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    style={{ opacity: element.visible ? 1 : 0.5 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateElement(element.id, { visible: !element.visible });
                    }}
                  />,
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElement(element.id);
                    }}
                  />,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    elementTypes.find((t) => t.type === element.type)?.icon
                  }
                  title={
                    elementTypes.find((t) => t.type === element.type)?.label
                  }
                  description={element.properties.text || element.id}
                />
              </List.Item>
            )}
          />
        </Card>
      </div>

      {/* 预览模态框 */}
      <Modal
        title="模板预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={null}
      >
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div
            style={{
              width: template.width * 0.8,
              height: template.height * 0.8,
              backgroundColor: template.backgroundColor,
              position: "relative",
              margin: "0 auto",
              border: "1px solid #d9d9d9",
            }}
          >
            {template.elements.map((element) => (
              <div
                key={element.id}
                style={{
                  position: "absolute",
                  left: element.x * 0.8,
                  top: element.y * 0.8,
                  width: element.width * 0.8,
                  height: element.height * 0.8,
                  border: `${element.properties.borderWidth}px ${element.properties.borderStyle} ${element.properties.borderColor}`,
                  backgroundColor: element.properties.backgroundColor,
                  color: element.properties.color,
                  fontSize: (element.properties.fontSize || 12) * 0.8,
                  fontWeight: element.properties.fontWeight,
                  textAlign: element.properties.textAlign,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    element.properties.textAlign === "center"
                      ? "center"
                      : element.properties.textAlign === "right"
                      ? "flex-end"
                      : "flex-start",
                  padding: "2px",
                }}
              >
                {element.properties.text ||
                  elementTypes.find((t) => t.type === element.type)?.label}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 模板库模态框 */}
      <Modal
        title="模板库"
        open={templateListModalVisible}
        onCancel={() => setTemplateListModalVisible(false)}
        width={1000}
        footer={null}
      >
        <Row gutter={16}>
          {/* 这里可以显示预设模板列表 */}
          <Col span={8}>
            <Card
              hoverable
              cover={
                <div
                  style={{
                    height: 200,
                    backgroundColor: "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  A4标准模板
                </div>
              }
              actions={[
                <Button key="use" type="primary">
                  使用模板
                </Button>,
              ]}
            >
              <Card.Meta title="A4标准答题卡" description="适用于标准化考试" />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              cover={
                <div
                  style={{
                    height: 200,
                    backgroundColor: "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  选择题模板
                </div>
              }
              actions={[
                <Button key="use" type="primary">
                  使用模板
                </Button>,
              ]}
            >
              <Card.Meta title="选择题专用" description="适用于选择题考试" />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              cover={
                <div
                  style={{
                    height: 200,
                    backgroundColor: "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  综合模板
                </div>
              }
              actions={[
                <Button key="use" type="primary">
                  使用模板
                </Button>,
              ]}
            >
              <Card.Meta title="综合题型" description="包含多种题型" />
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default TemplateDesigner;
