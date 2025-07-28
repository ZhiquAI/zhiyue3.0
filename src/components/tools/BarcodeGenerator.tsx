import React, { useState } from 'react';
import {
  Modal, Form, Input, Select, Button, Space, Alert, 
  Card, Row, Col, message, Divider, Tag, Image
} from 'antd';
import {
  BarcodeOutlined, DownloadOutlined, CopyOutlined,
  UserOutlined, IdcardOutlined, TeamOutlined
} from '@ant-design/icons';
import { barcodeApi } from '../../services/api';

interface BarcodeGeneratorProps {
  visible: boolean;
  onClose: () => void;
  initialData?: {
    student_id?: string;
    name?: string;
    class_name?: string;
    exam_number?: string;
    paper_type?: string;
  };
}

interface BarcodeFormData {
  student_id: string;
  name?: string;
  class_name?: string;
  exam_number?: string;
  paper_type?: string;
  format_type: string;
  barcode_type: string;
  delimiter?: string;
}

interface BarcodeResult {
  data: string;
  barcode_type: string;
  format_type: string;
  image_base64: string;
  student_info: any;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  visible,
  onClose,
  initialData
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [templates, setTemplates] = useState<any>({});

  // 获取模板列表
  const loadTemplates = async () => {
    try {
      const response = await barcodeApi.getTemplates();
      // 暂时使用默认模板，避免类型错误
      setTemplates({
        standard: {
          name: '标准模板',
          description: 'JSON格式，CODE128',
          format_type: 'json',
          barcode_type: 'CODE128'
        },
        simple: {
          name: '简单模板',
          description: '分隔符格式，CODE128',
          format_type: 'pipe',
          barcode_type: 'CODE128',
          delimiter: '|'
        }
      });
    } catch (error) {
      console.error('Failed to load templates:', error);
      // 设置默认模板
      setTemplates({});
    }
  };

  // 组件挂载时加载模板
  React.useEffect(() => {
    if (visible) {
      loadTemplates();
      // 设置默认值和初始数据
      const defaultValues = {
        format_type: 'json',
        barcode_type: 'CODE128',
        delimiter: '|',
        ...initialData
      };
      form.setFieldsValue(defaultValues);
    }
  }, [visible, form, initialData]);

  // 生成条形码
  const handleGenerate = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const response = await barcodeApi.generateBarcode(values);
      
      if (response.data.status === 'success') {
        setResult(response.data);
        message.success('条形码生成成功');
      } else {
        message.error('条形码生成失败');
      }
    } catch (error: any) {
      console.error('Barcode generation failed:', error);
      message.error(error.response?.data?.detail || '条形码生成失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制条形码数据
  const handleCopyData = () => {
    if (result?.data) {
      navigator.clipboard.writeText(result.data);
      message.success('条形码数据已复制到剪贴板');
    }
  };

  // 下载条形码图片
  const handleDownload = () => {
    if (result?.image_base64) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${result.image_base64}`;
      link.download = `barcode_${result.student_info.student_id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('条形码图片已下载');
    }
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setResult(null);
    form.setFieldsValue({
      format_type: 'json',
      barcode_type: 'CODE128',
      delimiter: '|'
    });
  };

  // 应用模板
  const handleApplyTemplate = (templateKey: string) => {
    const template = templates[templateKey];
    if (template) {
      form.setFieldsValue({
        format_type: template.format_type,
        barcode_type: template.barcode_type,
        delimiter: template.delimiter || '|'
      });
      message.success(`已应用模板: ${template.name}`);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <BarcodeOutlined className="text-blue-600" />
          <span>条形码生成器</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <div className="flex justify-between">
          <Button onClick={handleReset}>重置</Button>
          <Space>
            <Button onClick={onClose}>关闭</Button>
            <Button 
              type="primary" 
              onClick={handleGenerate}
              loading={loading}
              icon={<BarcodeOutlined />}
            >
              生成条形码
            </Button>
          </Space>
        </div>
      }
    >
      <Row gutter={[24, 24]}>
        {/* 左侧：配置表单 */}
        <Col xs={24} lg={12}>
          <div className="space-y-4">
            {/* 模板选择 */}
            <Card title="快速模板" size="small">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(templates).map(([key, template]: [string, any]) => (
                  <Button
                    key={key}
                    size="small"
                    onClick={() => handleApplyTemplate(key)}
                    className="text-left h-auto p-2"
                  >
                    <div>
                      <div className="font-medium text-xs">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </Card>

            {/* 学生信息 */}
            <Card title="学生信息" size="small">
              <Form
                form={form}
                layout="vertical"
                size="small"
              >
                <Row gutter={[16, 0]}>
                  <Col span={12}>
                    <Form.Item
                      label="学号/考号"
                      name="student_id"
                      rules={[{ required: true, message: '请输入学号' }]}
                    >
                      <Input 
                        prefix={<IdcardOutlined />} 
                        placeholder="请输入学号"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="姓名"
                      name="name"
                    >
                      <Input 
                        prefix={<UserOutlined />} 
                        placeholder="请输入姓名"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={[16, 0]}>
                  <Col span={12}>
                    <Form.Item
                      label="班级"
                      name="class_name"
                    >
                      <Input 
                        prefix={<TeamOutlined />} 
                        placeholder="请输入班级"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="准考证号"
                      name="exam_number"
                    >
                      <Input 
                        prefix={<IdcardOutlined />} 
                        placeholder="请输入准考证号"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item
                  label="试卷类型"
                  name="paper_type"
                >
                  <Select placeholder="请选择试卷类型">
                    <Select.Option value="A">A卷</Select.Option>
                    <Select.Option value="B">B卷</Select.Option>
                    <Select.Option value="C">C卷</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Card>

            {/* 条形码配置 */}
            <Card title="条形码配置" size="small">
              <Form.Item
                label="数据格式"
                name="format_type"
                rules={[{ required: true, message: '请选择数据格式' }]}
              >
                <Select>
                  <Select.Option value="json">JSON格式</Select.Option>
                  <Select.Option value="delimited">分隔符格式</Select.Option>
                  <Select.Option value="fixed_length">固定长度格式</Select.Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                label="条形码类型"
                name="barcode_type"
                rules={[{ required: true, message: '请选择条形码类型' }]}
              >
                <Select>
                  <Select.Option value="CODE128">CODE128</Select.Option>
                  <Select.Option value="CODE39">CODE39</Select.Option>
                  <Select.Option value="QR_CODE">二维码</Select.Option>
                  <Select.Option value="EAN13">EAN13</Select.Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.format_type !== currentValues.format_type
                }
              >
                {({ getFieldValue }) => {
                  const formatType = getFieldValue('format_type');
                  return formatType === 'delimited' ? (
                    <Form.Item
                      label="分隔符"
                      name="delimiter"
                      rules={[{ required: true, message: '请输入分隔符' }]}
                    >
                      <Input placeholder="例如: | 或 ," />
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>
            </Card>
          </div>
        </Col>

        {/* 右侧：生成结果 */}
        <Col xs={24} lg={12}>
          {result ? (
            <div className="space-y-4">
              {/* 条形码图片 */}
              <Card 
                title={
                  <div className="flex items-center justify-between">
                    <span>生成结果</span>
                    <Space>
                      <Button 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={handleCopyData}
                      >
                        复制数据
                      </Button>
                      <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                      >
                        下载图片
                      </Button>
                    </Space>
                  </div>
                }
                size="small"
              >
                <div className="text-center">
                  <Image
                    src={`data:image/png;base64,${result.image_base64}`}
                    alt="生成的条形码"
                    style={{ maxWidth: '100%', maxHeight: '200px' }}
                    preview={false}
                  />
                </div>
                
                <Divider style={{ margin: '16px 0' }} />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">条形码类型：</span>
                    <Tag color="blue">{result.barcode_type}</Tag>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">数据格式：</span>
                    <Tag color="green">{result.format_type}</Tag>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">编码数据：</div>
                    <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                      {result.data}
                    </div>
                  </div>
                </div>
              </Card>

              {/* 使用说明 */}
              <Alert
                message="使用说明"
                description={
                  <div className="text-sm space-y-1">
                    <div>• 将生成的条形码图片打印并粘贴到答题卡上</div>
                    <div>• 确保条形码清晰可读，避免折叠或污损</div>
                    <div>• 建议在答题卡的固定位置放置条形码</div>
                    <div>• 扫描答题卡时系统会自动识别条形码信息</div>
                  </div>
                }
                type="info"
                showIcon
              />
            </div>
          ) : (
            <Card title="预览区域" size="small">
              <div className="text-center text-gray-500 py-8">
                <BarcodeOutlined className="text-4xl mb-4" />
                <div>请填写学生信息并点击生成条形码</div>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </Modal>
  );
};

export default BarcodeGenerator;