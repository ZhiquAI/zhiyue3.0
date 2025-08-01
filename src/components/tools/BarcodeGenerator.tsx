import React, { useState } from 'react';
import {
  Modal, Form, Input, Select, Button, Space, Alert, 
  Card, Row, Col, Divider, Tag, Image, Upload, Tabs, Typography
} from 'antd';
import {
  BarcodeOutlined, DownloadOutlined, CopyOutlined,
  UserOutlined, IdcardOutlined, TeamOutlined, UploadOutlined,
  PrinterOutlined, FileTextOutlined
} from '@ant-design/icons';
import { barcodeApi } from '../../services/api';
import { message } from '../../utils/message';

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

interface StudentData {
  studentId: string;
  name: string;
  className: string;
  seatNumber: string;
  examRoom: string;
}

interface BatchBarcodeResult {
  student_id: string;
  name: string;
  class_name: string;
  seat_number: string;
  exam_room: string;
  barcode_data: string;
  barcode_image: string;
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
  const [activeTab, setActiveTab] = useState('single');
  const [csvData, setCsvData] = useState<StudentData[]>([]);
  const [batchResults, setBatchResults] = useState<BatchBarcodeResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

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

  // 解析CSV文件
  const parseCSV = (text: string): StudentData[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('CSV文件至少需要包含表头和一行数据。');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['studentId', 'name', 'className', 'seatNumber', 'examRoom'];
    
    // 检查必需的表头是否存在
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`CSV文件缺少必需的表头: ${required}`);
      }
    }
    
    const data: StudentData[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const values = lines[i].split(',');
      const entry: any = {};
      headers.forEach((header, index) => {
        entry[header] = values[index] ? values[index].trim() : '';
      });
      data.push(entry as StudentData);
    }
    return data;
  };

  // 处理CSV文件上传
  const handleCSVUpload = (file: any) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const studentData = parseCSV(csvText);
        setCsvData(studentData);
        setUploadedFile(file);
        message.success(`成功解析 ${studentData.length} 条学生数据`);
      } catch (error: any) {
        message.error(`处理文件失败: ${error.message}`);
      }
    };
    reader.onerror = () => {
      message.error('读取文件时发生错误');
    };
    reader.readAsText(file, 'UTF-8');
    return false; // 阻止自动上传
  };

  // 批量生成条形码
  const handleBatchGenerate = async () => {
    if (csvData.length === 0) {
      message.error('请先上传CSV文件');
      return;
    }

    try {
      setBatchLoading(true);
      const values = await form.validateFields(['format_type', 'barcode_type', 'delimiter']);
      const results: BatchBarcodeResult[] = [];

      for (const student of csvData) {
        try {
          const response = await barcodeApi.generateBarcode({
              student_id: student.studentId,
              name: student.name,
              class_name: student.className,
              exam_number: student.seatNumber,
              paper_type: 'A', // 默认试卷类型
              data_format: values.format_type,
              barcode_type: values.barcode_type
            });

          if (response.data.status === 'success') {
            results.push({
              student_id: student.studentId,
              name: student.name,
              class_name: student.className,
              seat_number: student.seatNumber,
              exam_room: student.examRoom,
              barcode_data: response.data.data,
              barcode_image: response.data.image_base64
            });
          }
        } catch (error) {
          console.error(`Failed to generate barcode for ${student.studentId}:`, error);
        }
      }

      setBatchResults(results);
      message.success(`成功生成 ${results.length} 个条形码`);
    } catch (error: any) {
      message.error('批量生成失败');
    } finally {
      setBatchLoading(false);
    }
  };

  // 打印批量条形码
  const handleBatchPrint = () => {
    if (batchResults.length === 0) {
      message.error('没有可打印的条形码');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('无法打开打印窗口');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>批量条形码打印</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; }
          .barcode-item {
            display: inline-block;
            vertical-align: top;
            padding: 10px;
            margin: 5px;
            border: 1px solid #eee;
            border-radius: 4px;
            page-break-inside: avoid;
            width: calc(33.333% - 10px);
            box-sizing: border-box;
          }
          .top-text {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .bottom-text {
            text-align: center;
            font-size: 10px;
            font-weight: 600;
            margin-top: 4px;
            word-break: break-all;
          }
          .barcode-image {
            width: 100%;
            max-height: 40px;
          }
          @media print {
            .barcode-item { border: 1px solid #ccc; }
          }
        </style>
      </head>
      <body>
        ${batchResults.map(result => `
          <div class="barcode-item">
            <div class="top-text">
              <span>座号:${result.seat_number}</span>
              <span>考场:${result.exam_room}</span>
            </div>
            <img src="data:image/png;base64,${result.barcode_image}" class="barcode-image" alt="条形码" />
            <div class="bottom-text">
              <span>班级:${result.class_name} ${result.student_id} 姓名:${result.name}</span>
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // 下载CSV模板
  const downloadCSVTemplate = () => {
    const csvContent = 'studentId,name,className,seatNumber,examRoom\n99284196,任一彤,九年07班,4643,18\n99284197,李华,九年08班,4644,18';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'barcode_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('CSV模板已下载');
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
      width={1000}
      footer={
        <div className="flex justify-between">
          <Button onClick={handleReset}>重置</Button>
          <Space>
            <Button onClick={onClose}>关闭</Button>
            {activeTab === 'single' ? (
              <Button 
                type="primary" 
                onClick={handleGenerate}
                loading={loading}
                icon={<BarcodeOutlined />}
              >
                生成条形码
              </Button>
            ) : (
              <Space>
                <Button 
                  type="primary" 
                  onClick={handleBatchGenerate}
                  loading={batchLoading}
                  icon={<BarcodeOutlined />}
                  disabled={csvData.length === 0}
                >
                  批量生成
                </Button>
                <Button 
                  type="default" 
                  onClick={handleBatchPrint}
                  icon={<PrinterOutlined />}
                  disabled={batchResults.length === 0}
                >
                  打印预览
                </Button>
              </Space>
            )}
          </Space>
        </div>
      }
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'single',
            label: (
              <span>
                <UserOutlined />
                单个生成
              </span>
            ),
            children: (
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
                    <div>• 将生成的条形码图片打印并粘贴到标签上</div>
                    <div>• 确保条形码清晰可读，避免折叠或污损</div>
                    <div>• 建议在固定位置放置条形码</div>
                    <div>• 扫描时系统会自动识别条形码信息</div>
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
             )
           },
           {
             key: 'batch',
             label: (
               <span>
                 <TeamOutlined />
                 批量生成
               </span>
             ),
             children: (
               <div className="space-y-6">
                 {/* 使用说明 */}
                 <Alert
                   message="批量生成说明"
                   description={
                     <div className="text-sm space-y-2">
                       <div>1. 准备一个CSV文件，第一行必须是表头，且必须包含以下列：studentId, name, className, seatNumber, examRoom</div>
                       <div>2. 点击"选择文件"按钮，上传您的CSV文件</div>
                       <div>3. 点击"批量生成"按钮，系统会为所有学生生成条形码</div>
                       <div>4. 确认无误后，点击"打印预览"按钮，即可打印全部条形码</div>
                       <div className="mt-2">
                         <Button 
                           type="link" 
                           size="small" 
                           icon={<DownloadOutlined />}
                           onClick={downloadCSVTemplate}
                         >
                           下载CSV模板文件
                         </Button>
                       </div>
                     </div>
                   }
                   type="info"
                   showIcon
                 />

                 <Row gutter={[24, 24]}>
                   {/* 左侧：文件上传和配置 */}
                   <Col xs={24} lg={12}>
                     <div className="space-y-4">
                       {/* 文件上传 */}
                       <Card title="文件上传" size="small">
                         <Upload.Dragger
                           accept=".csv"
                           beforeUpload={handleCSVUpload}
                           showUploadList={false}
                           className="mb-4"
                         >
                           <p className="ant-upload-drag-icon">
                             <UploadOutlined />
                           </p>
                           <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
                           <p className="ant-upload-hint">支持单个CSV文件上传，文件大小不超过10MB</p>
                         </Upload.Dragger>
                         
                         {uploadedFile && (
                           <div className="bg-green-50 p-3 rounded border border-green-200">
                             <div className="flex items-center gap-2 text-green-700">
                               <FileTextOutlined />
                               <span className="font-medium">{uploadedFile.name}</span>
                             </div>
                             <div className="text-sm text-green-600 mt-1">
                               已解析 {csvData.length} 条学生数据
                             </div>
                           </div>
                         )}
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
                       </Card>
                     </div>
                   </Col>

                   {/* 右侧：预览区域 */}
                   <Col xs={24} lg={12}>
                     {batchResults.length > 0 ? (
                       <Card 
                         title={
                           <div className="flex items-center justify-between">
                             <span>批量生成结果 ({batchResults.length}个)</span>
                             <Button 
                               size="small" 
                               icon={<PrinterOutlined />}
                               onClick={handleBatchPrint}
                             >
                               打印预览
                             </Button>
                           </div>
                         }
                         size="small"
                       >
                         <div className="max-h-96 overflow-y-auto">
                           <div className="grid grid-cols-1 gap-2">
                             {batchResults.slice(0, 10).map((result, index) => (
                               <div key={index} className="border rounded p-2 text-xs">
                                 <div className="flex justify-between items-center">
                                   <span className="font-medium">{result.name} ({result.student_id})</span>
                                   <span className="text-gray-500">{result.class_name}</span>
                                 </div>
                                 <div className="flex justify-between text-gray-600 mt-1">
                                   <span>座号: {result.seat_number}</span>
                                   <span>考场: {result.exam_room}</span>
                                 </div>
                               </div>
                             ))}
                             {batchResults.length > 10 && (
                               <div className="text-center text-gray-500 py-2">
                                 还有 {batchResults.length - 10} 个条形码...
                               </div>
                             )}
                           </div>
                         </div>
                       </Card>
                     ) : (
                       <Card title="预览区域" size="small">
                         <div className="text-center text-gray-500 py-8">
                           <TeamOutlined className="text-4xl mb-4" />
                           <div>请上传CSV文件并点击批量生成</div>
                         </div>
                       </Card>
                     )}
                   </Col>
                 </Row>
               </div>
             )
           }
         ]}
       />
    </Modal>
  );
};

export default BarcodeGenerator;