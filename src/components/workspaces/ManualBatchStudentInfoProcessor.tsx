import React, { useState, useEffect } from 'react';
import {
  Modal, Card, Row, Col, Button, Space, Tag, Divider,
  Progress, Table, Alert, Select,
  Input, Form, Radio, Tooltip, Badge,
  Steps, List, Typography, Drawer
} from 'antd';
import {
  UserOutlined, EditOutlined, SaveOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, PlayCircleOutlined,
  EyeOutlined, FileImageOutlined, TeamOutlined,
  FormOutlined, HistoryOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { message } from '../../utils/message';

const { Step } = Steps;
const { TextArea } = Input;

interface ManualProcessItem {
  id: string;
  filename: string;
  imageUrl: string;
  status: 'pending' | 'editing' | 'completed' | 'skipped';
  studentInfo?: {
    studentId?: string;
    studentName?: string;
    className?: string;
    examNumber?: string;
    paperType?: string;
    barcode?: string;
  };
  editedBy?: string;
  editedAt?: Date;
  notes?: string;
}

interface ManualBatchStudentInfoProcessorProps {
  visible: boolean;
  onClose: () => void;
  answerSheets: {
    id: string;
    filename: string;
    imageUrl: string;
  }[];
  onComplete: (results: ManualProcessItem[]) => void;
}

const ManualBatchStudentInfoProcessor: React.FC<ManualBatchStudentInfoProcessorProps> = ({
  visible,
  onClose,
  answerSheets,
  onComplete
}) => {
  // 状态管理
  const [processItems, setProcessItems] = useState<ManualProcessItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentEditingItem, setCurrentEditingItem] = useState<ManualProcessItem | null>(null);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [statistics, setStatistics] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    skipped: 0
  });

  // 初始化处理项目
  useEffect(() => {
    if (visible && answerSheets.length > 0) {
      const items: ManualProcessItem[] = answerSheets.map(sheet => ({
        id: sheet.id,
        filename: sheet.filename,
        imageUrl: sheet.imageUrl,
        status: 'pending'
      }));
      
      setProcessItems(items);
      setStatistics({
        total: items.length,
        completed: 0,
        pending: items.length,
        skipped: 0
      });
    }
  }, [visible, answerSheets]);

  // 更新统计信息
  useEffect(() => {
    const stats = processItems.reduce((acc, item) => {
      switch (item.status) {
        case 'completed':
          acc.completed++;
          break;
        case 'pending':
          acc.pending++;
          break;
        case 'skipped':
          acc.skipped++;
          break;
      }
      return acc;
    }, {
      total: processItems.length,
      completed: 0,
      pending: 0,
      skipped: 0
    });
    
    setStatistics(stats);
  }, [processItems]);

  // 开始编辑单个项目
  const startEditItem = (item: ManualProcessItem) => {
    setCurrentEditingItem(item);
    setEditDrawerVisible(true);
    
    // 预填充表单
    form.setFieldsValue({
      studentId: item.studentInfo?.studentId || '',
      studentName: item.studentInfo?.studentName || '',
      className: item.studentInfo?.className || '',
      examNumber: item.studentInfo?.examNumber || '',
      paperType: item.studentInfo?.paperType || 'A卷',
      barcode: item.studentInfo?.barcode || '',
      notes: item.notes || ''
    });
    
    // 更新状态为编辑中
    updateItemStatus(item.id, 'editing');
  };

  // 保存编辑结果
  const saveEditResult = async () => {
    try {
      const values = await form.validateFields();
      
      if (!currentEditingItem) return;
      
      const updatedItem: ManualProcessItem = {
        ...currentEditingItem,
        status: 'completed',
        studentInfo: {
          studentId: values.studentId,
          studentName: values.studentName,
          className: values.className,
          examNumber: values.examNumber,
          paperType: values.paperType,
          barcode: values.barcode
        },
        notes: values.notes,
        editedBy: '当前用户', // 实际应用中应该从用户上下文获取
        editedAt: new Date()
      };
      
      setProcessItems(prev => prev.map(item => 
        item.id === currentEditingItem.id ? updatedItem : item
      ));
      
      setEditDrawerVisible(false);
      setCurrentEditingItem(null);
      form.resetFields();
      
      message.success('学生信息已保存');
      
    } catch (error) {
      message.error('请填写必要的学生信息');
    }
  };

  // 跳过项目
  const skipItem = (item: ManualProcessItem) => {
    updateItemStatus(item.id, 'skipped');
    message.info(`已跳过 ${item.filename}`);
  };

  // 更新项目状态
  const updateItemStatus = (id: string, status: ManualProcessItem['status']) => {
    setProcessItems(prev => prev.map(item => 
      item.id === id ? { ...item, status } : item
    ));
  };

  // 批量应用模板
  const applyBatchTemplate = async () => {
    try {
      const values = await form.validateFields();
      
      const updatedItems = processItems.map(item => {
        if (selectedItems.includes(item.id) && item.status === 'pending') {
          return {
            ...item,
            status: 'completed' as const,
            studentInfo: {
              studentId: values.studentId || '',
              studentName: values.studentName || '',
              className: values.className || '',
              examNumber: values.examNumber || '',
              paperType: values.paperType || 'A卷',
              barcode: values.barcode || ''
            },
            notes: values.notes || '',
            editedBy: '当前用户',
            editedAt: new Date()
          };
        }
        return item;
      });
      
      setProcessItems(updatedItems);
      setBatchEditMode(false);
      setSelectedItems([]);
      form.resetFields();
      
      message.success(`已批量处理 ${selectedItems.length} 个项目`);
      
    } catch (error) {
      message.error('请填写批量模板信息');
    }
  };

  // 完成处理
  const handleComplete = () => {
    if (statistics.pending > 0) {
      message.warning(`还有 ${statistics.pending} 个项目未处理`);
      return;
    }
    
    onComplete(processItems);
    onClose();
  };

  // 表格列定义
  const columns: ColumnsType<ManualProcessItem> = [
    {
      title: '选择',
      width: 50,
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedItems([...selectedItems, record.id]);
            } else {
              setSelectedItems(selectedItems.filter(id => id !== record.id));
            }
          }}
          disabled={record.status === 'completed'}
        />
      )
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      width: 200,
      render: (filename, record) => (
        <div className="flex items-center gap-2">
          <FileImageOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{filename}</div>
            <div className="text-xs text-gray-500">{record.id}</div>
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: ManualProcessItem['status']) => {
        const statusConfig = {
          pending: { color: 'default', text: '待处理', icon: <ClockCircleOutlined /> },
          editing: { color: 'processing', text: '编辑中', icon: <EditOutlined /> },
          completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
          skipped: { color: 'warning', text: '已跳过', icon: <ExclamationCircleOutlined /> }
        };
        
        const config = statusConfig[status];
        return (
          <div className="flex items-center gap-1">
            {config.icon}
            <Tag color={config.color}>{config.text}</Tag>
          </div>
        );
      }
    },
    {
      title: '学生信息',
      width: 200,
      render: (_, record) => {
        if (!record.studentInfo) return <span className="text-gray-400">未填写</span>;
        
        return (
          <div className="space-y-1">
            <div className="text-sm">
              <strong>{record.studentInfo.studentName}</strong>
            </div>
            <div className="text-xs text-gray-600">
              学号: {record.studentInfo.studentId}
            </div>
            <div className="text-xs text-gray-600">
              班级: {record.studentInfo.className}
            </div>
          </div>
        );
      }
    },
    {
      title: '编辑信息',
      width: 150,
      render: (_, record) => {
        if (!record.editedAt) return null;
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600">
              编辑者: {record.editedBy}
            </div>
            <div className="text-xs text-gray-600">
              时间: {record.editedAt.toLocaleString()}
            </div>
          </div>
        );
      }
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="预览图片">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => window.open(record.imageUrl, '_blank')}
            />
          </Tooltip>
          
          <Tooltip title="编辑信息">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => startEditItem(record)}
              disabled={record.status === 'editing'}
            />
          </Tooltip>
          
          {record.status === 'pending' && (
            <Tooltip title="跳过">
              <Button 
                size="small" 
                icon={<ExclamationCircleOutlined />}
                onClick={() => skipItem(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const totalProgress = statistics.total > 0 
    ? Math.round((statistics.completed + statistics.skipped) / statistics.total * 100)
    : 0;

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-3">
            <FormOutlined className="text-blue-600" />
            <div>
              <div className="text-lg font-semibold">人工批量学生信息处理</div>
              <div className="text-sm text-gray-500 font-normal">
                共 {answerSheets.length} 张答题卡
              </div>
            </div>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width="95vw"
        style={{ top: 20, maxWidth: 1600 }}
        footer={[
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button 
            key="batch" 
            icon={<FormOutlined />}
            onClick={() => setBatchEditMode(true)}
            disabled={selectedItems.length === 0}
          >
            批量填写 ({selectedItems.length})
          </Button>,
          <Button 
            key="complete" 
            type="primary" 
            onClick={handleComplete}
            disabled={statistics.pending > 0}
          >
            完成处理
          </Button>
        ]}
        className="manual-batch-processor-modal"
      >
        <div className="space-y-4">
          {/* 处理步骤 */}
          <Steps current={currentStep} className="mb-6">
            <Step title="准备阶段" description="查看待处理文件" />
            <Step title="人工处理" description="逐一填写学生信息" />
            <Step title="完成处理" description="检查和导出结果" />
          </Steps>

          {/* 统计信息 */}
          <Row gutter={16} className="mb-4">
            <Col span={6}>
              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                  <div className="text-sm text-gray-600">总数</div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
                  <div className="text-sm text-gray-600">已完成</div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{statistics.pending}</div>
                  <div className="text-sm text-gray-600">待处理</div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{statistics.skipped}</div>
                  <div className="text-sm text-gray-600">已跳过</div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 总体进度 */}
          <Card size="small">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span>总体进度</span>
                  <span>{totalProgress}%</span>
                </div>
                <Progress percent={totalProgress} />
              </div>
            </div>
          </Card>

          {/* 处理列表 */}
          <Card title={`处理列表 (${processItems.length})`} size="small">
            <Table
              columns={columns}
              dataSource={processItems}
              rowKey="id"
              size="small"
              scroll={{ y: 400 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`
              }}
              rowClassName={(record) => {
                if (record.status === 'completed') return 'bg-green-50';
                if (record.status === 'editing') return 'bg-blue-50';
                if (record.status === 'skipped') return 'bg-gray-50';
                return '';
              }}
            />
          </Card>

          {/* 处理说明 */}
          <Alert
            message="人工处理说明"
            description={
              <div className="space-y-2">
                <div>• 点击"编辑信息"按钮为每张答题卡手动填写学生信息</div>
                <div>• 可以选择多个项目进行批量填写相同信息</div>
                <div>• 无法识别的答题卡可以选择跳过</div>
                <div>• 所有项目处理完成后才能导出结果</div>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      </Modal>

      {/* 编辑抽屉 */}
      <Drawer
        title="编辑学生信息"
        placement="right"
        width={600}
        open={editDrawerVisible}
        onClose={() => {
          setEditDrawerVisible(false);
          setCurrentEditingItem(null);
          if (currentEditingItem) {
            updateItemStatus(currentEditingItem.id, 'pending');
          }
        }}
        extra={
          <Space>
            <Button onClick={() => setEditDrawerVisible(false)}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={saveEditResult}>
              保存
            </Button>
          </Space>
        }
      >
        {currentEditingItem && (
          <div className="space-y-4">
            {/* 图片预览 */}
            <Card title="答题卡预览" size="small">
              <img 
                src={currentEditingItem.imageUrl} 
                alt={currentEditingItem.filename}
                className="w-full max-h-64 object-contain border rounded"
              />
              <div className="text-sm text-gray-600 mt-2">
                文件名: {currentEditingItem.filename}
              </div>
            </Card>

            {/* 学生信息表单 */}
            <Card title="学生信息" size="small">
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      label="学生姓名" 
                      name="studentName"
                      rules={[{ required: true, message: '请输入学生姓名' }]}
                    >
                      <Input placeholder="请输入学生姓名" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      label="学号" 
                      name="studentId"
                      rules={[{ required: true, message: '请输入学号' }]}
                    >
                      <Input placeholder="请输入学号" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      label="班级" 
                      name="className"
                      rules={[{ required: true, message: '请输入班级' }]}
                    >
                      <Input placeholder="请输入班级" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="准考证号" name="examNumber">
                      <Input placeholder="请输入准考证号" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="试卷类型" name="paperType">
                      <Select placeholder="请选择试卷类型">
                        <Select.Option value="A卷">A卷</Select.Option>
                        <Select.Option value="B卷">B卷</Select.Option>
                        <Select.Option value="C卷">C卷</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="条形码" name="barcode">
                      <Input placeholder="请输入条形码" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item label="备注" name="notes">
                  <TextArea rows={3} placeholder="请输入备注信息" />
                </Form.Item>
              </Form>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 批量编辑模态框 */}
      <Modal
        title="批量填写学生信息"
        open={batchEditMode}
        onCancel={() => setBatchEditMode(false)}
        onOk={applyBatchTemplate}
        width={600}
      >
        <Alert
          message={`将为选中的 ${selectedItems.length} 个项目批量填写相同的学生信息`}
          type="info"
          className="mb-4"
        />
        
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="学生姓名" name="studentName">
                <Input placeholder="批量设置学生姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="学号" name="studentId">
                <Input placeholder="批量设置学号" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="班级" name="className">
                <Input placeholder="批量设置班级" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="试卷类型" name="paperType">
                <Select placeholder="批量设置试卷类型">
                  <Select.Option value="A卷">A卷</Select.Option>
                  <Select.Option value="B卷">B卷</Select.Option>
                  <Select.Option value="C卷">C卷</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item label="备注" name="notes">
            <TextArea rows={3} placeholder="批量设置备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ManualBatchStudentInfoProcessor;