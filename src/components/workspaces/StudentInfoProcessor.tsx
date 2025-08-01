import React, { useState, useEffect } from 'react';
import {
  Modal, Card, Form, Input, Select, Button, Space, Alert, 
  Divider, Tag, Tooltip, Row, Col, Image
} from 'antd';
import {
  UserOutlined, IdcardOutlined, TeamOutlined, 
  EditOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  BarcodeOutlined, CameraOutlined, QrcodeOutlined
} from '@ant-design/icons';
import BarcodeGenerator from '../tools/BarcodeGenerator';
import { message } from '../../utils/message';

interface StudentInfo {
  student_id?: string;
  name?: string;
  class?: string;
  exam_number?: string;
  paper_type?: string;
  source?: string;
  barcode_type?: string;
  barcode_info?: {
    detected: boolean;
    results?: Array<{
      type: string;
      data: string;
      confidence: number;
      student_info?: {
        student_id?: string;
        name?: string;
        class?: string;
        exam_number?: string;
        paper_type?: string;
      };
    }>;
    confidence?: number;
  };
}

interface RecognitionResult {
  confidence: number;
  issues: string[];
  regions: {
    student_info_region?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    barcode_region?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

interface StudentInfoProcessorProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  studentInfo: StudentInfo;
  recognitionResult: RecognitionResult;
  onSave: (updatedInfo: StudentInfo) => void;
  onReprocess?: () => void;
}

const StudentInfoProcessor: React.FC<StudentInfoProcessorProps> = ({
  visible,
  onClose,
  imageUrl,
  studentInfo,
  recognitionResult,
  onSave,
  onReprocess
}) => {
  const [form] = Form.useForm();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [barcodeGeneratorVisible, setBarcodeGeneratorVisible] = useState(false);

  useEffect(() => {
    if (visible && studentInfo) {
      form.setFieldsValue({
        student_id: studentInfo.student_id || '',
        name: studentInfo.name || '',
        class: studentInfo.class || '',
        exam_number: studentInfo.exam_number || '',
        paper_type: studentInfo.paper_type || ''
      });
    }
  }, [visible, studentInfo, form]);

  // 获取识别质量状态
  const getQualityStatus = () => {
    const { confidence, issues } = recognitionResult;
    
    if (confidence >= 0.9 && issues.length === 0) {
      return { status: 'success', text: '识别质量优秀', color: 'green' };
    } else if (confidence >= 0.7 && issues.length <= 2) {
      return { status: 'warning', text: '识别质量良好', color: 'orange' };
    } else {
      return { status: 'error', text: '识别质量较差', color: 'red' };
    }
  };

  // 检查信息完整性
  const checkCompleteness = () => {
    const required = ['student_id', 'name'];
    const missing = required.filter(field => !studentInfo[field as keyof StudentInfo]);
    return {
      isComplete: missing.length === 0,
      missing
    };
  };

  // 保存修改
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const updatedInfo: StudentInfo = {
        ...studentInfo,
        ...values
      };
      
      onSave(updatedInfo);
      setEditMode(false);
      message.success('学生信息已更新');
    } catch (error) {
      message.error('请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  // 重新识别
  const handleReprocess = async () => {
    if (onReprocess) {
      setLoading(true);
      try {
        await onReprocess();
        message.success('重新识别完成');
      } catch (error) {
        message.error('重新识别失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const qualityStatus = getQualityStatus();
  const completeness = checkCompleteness();

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UserOutlined className="text-blue-600" />
          <span>学生信息处理</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            {onReprocess && (
              <Button 
                icon={<CameraOutlined />} 
                onClick={handleReprocess}
                loading={loading}
              >
                重新识别
              </Button>
            )}
            <Button 
              icon={<QrcodeOutlined />} 
              onClick={() => setBarcodeGeneratorVisible(true)}
            >
              条形码生成器
            </Button>
          </div>
          <Space>
            <Button onClick={onClose}>取消</Button>
            {editMode ? (
              <>
                <Button onClick={() => setEditMode(false)}>取消编辑</Button>
                <Button 
                  type="primary" 
                  onClick={handleSave}
                  loading={loading}
                >
                  保存修改
                </Button>
              </>
            ) : (
              <>
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => setEditMode(true)}
                >
                  编辑信息
                </Button>
                <Button 
                  type="primary" 
                  onClick={onClose}
                  disabled={!completeness.isComplete}
                >
                  确认使用
                </Button>
              </>
            )}
          </Space>
        </div>
      }
    >
      <Row gutter={[24, 24]}>
        {/* 左侧：答题卡图像 */}
        <Col xs={24} lg={12}>
          <Card title="答题卡图像" size="small">
            <div className="relative">
              <Image
                src={imageUrl}
                alt="答题卡"
                style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }}
                preview={{
                  mask: '点击预览大图'
                }}
              />
              
              {/* 标记识别区域 */}
              {recognitionResult.regions.student_info_region && (
                <div 
                  className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30"
                  style={{
                    left: `${recognitionResult.regions.student_info_region.x}%`,
                    top: `${recognitionResult.regions.student_info_region.y}%`,
                    width: `${recognitionResult.regions.student_info_region.width}%`,
                    height: `${recognitionResult.regions.student_info_region.height}%`
                  }}
                >
                  <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-1 rounded">
                    个人信息区
                  </div>
                </div>
              )}
              
              {recognitionResult.regions.barcode_region && (
                <div 
                  className="absolute border-2 border-green-500 bg-green-100 bg-opacity-30"
                  style={{
                    left: `${recognitionResult.regions.barcode_region.x}%`,
                    top: `${recognitionResult.regions.barcode_region.y}%`,
                    width: `${recognitionResult.regions.barcode_region.width}%`,
                    height: `${recognitionResult.regions.barcode_region.height}%`
                  }}
                >
                  <div className="absolute -top-6 left-0 text-xs bg-green-500 text-white px-1 rounded">
                    条形码区
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 右侧：信息处理 */}
        <Col xs={24} lg={12}>
          <div className="space-y-4">
            {/* 识别质量评估 */}
            <Card title="识别质量评估" size="small">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>整体质量：</span>
                  <Tag color={qualityStatus.color}>{qualityStatus.text}</Tag>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>置信度：</span>
                  <span className="font-medium">{Math.round(recognitionResult.confidence * 100)}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>信息完整性：</span>
                  {completeness.isComplete ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>完整</Tag>
                  ) : (
                    <Tooltip title={`缺少：${completeness.missing.join('、')}`}>
                      <Tag color="orange" icon={<ExclamationCircleOutlined />}>不完整</Tag>
                    </Tooltip>
                  )}
                </div>
                
                {recognitionResult.issues.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">识别问题：</div>
                    <div className="space-y-1">
                      {recognitionResult.issues.map((issue, index) => (
                        <div key={index} className="text-xs text-orange-600 bg-orange-50 p-1 rounded">
                          • {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 学生信息 */}
            <Card 
              title={
                <div className="flex items-center justify-between">
                  <span>学生信息</span>
                  {!editMode && (
                    <Button 
                      size="small" 
                      icon={<EditOutlined />} 
                      onClick={() => setEditMode(true)}
                    >
                      编辑
                    </Button>
                  )}
                </div>
              } 
              size="small"
            >
              <Form
                form={form}
                layout="vertical"
                disabled={!editMode}
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
                      rules={[{ required: true, message: '请输入姓名' }]}
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
                      name="class"
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

            {/* 条形码信息 */}
            {studentInfo.barcode_info?.detected && (
              <Card 
                title={
                  <div className="flex items-center gap-2">
                    <BarcodeOutlined className="text-green-600" />
                    <span>条形码信息</span>
                    <Tag color="green">已检测</Tag>
                  </div>
                } 
                size="small"
              >
                {studentInfo.barcode_info.results && studentInfo.barcode_info.results.length > 0 ? (
                  <div className="space-y-3">
                    {studentInfo.barcode_info.results.map((result, index) => (
                      <div key={index} className="border rounded p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Tag color="blue">{result.type}</Tag>
                            <span className="text-sm text-gray-600">置信度: {Math.round(result.confidence * 100)}%</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-2">
                          原始数据: <code className="bg-white px-1 rounded">{result.data}</code>
                        </div>
                        
                        {result.student_info && (
                          <div className="space-y-1 text-sm">
                            {result.student_info.student_id && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">学号：</span>
                                <span>{result.student_info.student_id}</span>
                              </div>
                            )}
                            {result.student_info.name && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">姓名：</span>
                                <span>{result.student_info.name}</span>
                              </div>
                            )}
                            {result.student_info.class && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">班级：</span>
                                <span>{result.student_info.class}</span>
                              </div>
                            )}
                            {result.student_info.exam_number && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">准考证号：</span>
                                <span>{result.student_info.exam_number}</span>
                              </div>
                            )}
                            {result.student_info.paper_type && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">试卷类型：</span>
                                <span>{result.student_info.paper_type}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* 信息来源标识 */}
                    {studentInfo.source === 'barcode' && (
                      <>
                        <Divider style={{ margin: '12px 0' }} />
                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                          <div className="flex items-center gap-1">
                            <CheckCircleOutlined />
                            <span>当前学生信息主要来源于条形码识别</span>
                            {studentInfo.barcode_type && (
                               <Tag color="green">{studentInfo.barcode_type}</Tag>
                             )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <BarcodeOutlined className="text-2xl mb-2" />
                    <div>条形码已检测但无法解析学生信息</div>
                  </div>
                )}
              </Card>
            )}
            
            {/* 条形码未检测提示 */}
            {studentInfo.barcode_info && !studentInfo.barcode_info.detected && (
              <Alert
                message="条形码信息"
                description="未检测到条形码，学生信息完全依赖OCR识别，建议仔细核对"
                type="info"
                icon={<BarcodeOutlined />}
                showIcon
              />
            )}

            {/* 处理建议 */}
            {(!completeness.isComplete || recognitionResult.issues.length > 0) && (
              <Alert
                message="处理建议"
                description={
                  <div className="space-y-1 text-sm">
                    {!completeness.isComplete && (
                      <div>• 请补充缺失的必要信息：{completeness.missing.join('、')}</div>
                    )}
                    {recognitionResult.confidence < 0.7 && (
                      <div>• 识别置信度较低，建议人工核对所有信息</div>
                    )}
                    {recognitionResult.issues.includes('图片模糊') && (
                      <div>• 图片质量较差，建议重新拍摄或扫描</div>
                    )}
                    {recognitionResult.issues.includes('条形码识别失败') && (
                      <div>• 条形码无法识别，请手动输入相关信息</div>
                    )}
                  </div>
                }
                type="warning"
                showIcon
              />
            )}
          </div>
        </Col>
      </Row>
      
      {/* 条形码生成器 */}
      <BarcodeGenerator
        visible={barcodeGeneratorVisible}
        onClose={() => setBarcodeGeneratorVisible(false)}
        initialData={{
          student_id: studentInfo.student_id || '',
          name: studentInfo.name || '',
          class_name: studentInfo.class || '',
          exam_number: studentInfo.exam_number || '',
          paper_type: studentInfo.paper_type || ''
        }}
      />
    </Modal>
  );
};

export default StudentInfoProcessor;