import React, { useState, useEffect } from 'react';
import { Card, Button, Progress, Table, Modal, Form, Input, Select, Tag, Space, Alert, Spin, Divider, Typography, Row, Col, Statistic } from 'antd';
import { Wand2, Edit, CheckCircle, AlertCircle, FileText, Eye } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Question {
  id: string;
  type: string;
  content: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  studentAnswer?: string;
  confidence: number;
  difficulty?: string;
}

interface SegmentationResult {
  questions: Question[];
  totalQuestions: number;
  confidence: number;
  processingTime: number;
  qualityScore: number;
}

interface OCRResult {
  text: string;
  regions: Array<{
    text: string;
    bbox: number[];
    confidence: number;
  }>;
}

const QuestionSegmentationView: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [segmentationResult, setSegmentationResult] = useState<SegmentationResult | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [hasOcrResult, setHasOcrResult] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [form] = Form.useForm();

  // 模拟OCR结果
  useEffect(() => {
    // 模拟已有OCR结果
    const mockOcrResult: OCRResult = {
      text: "1. 下列哪个选项是正确的？\nA. 选项A\nB. 选项B\nC. 选项C\nD. 选项D\n\n2. 请简述你的观点。\n\n3. 计算下列表达式的值：\n2x + 3y = 15\n",
      regions: [
        { text: "1. 下列哪个选项是正确的？", bbox: [10, 10, 300, 30], confidence: 0.95 },
        { text: "A. 选项A", bbox: [20, 40, 100, 60], confidence: 0.92 },
        { text: "B. 选项B", bbox: [20, 70, 100, 90], confidence: 0.93 },
        { text: "C. 选项C", bbox: [20, 100, 100, 120], confidence: 0.91 },
        { text: "D. 选项D", bbox: [20, 130, 100, 150], confidence: 0.94 },
        { text: "2. 请简述你的观点。", bbox: [10, 180, 250, 200], confidence: 0.96 },
        { text: "3. 计算下列表达式的值：", bbox: [10, 230, 280, 250], confidence: 0.89 },
        { text: "2x + 3y = 15", bbox: [20, 260, 150, 280], confidence: 0.87 }
      ]
    };
    setOcrResult(mockOcrResult);
    setHasOcrResult(true);
  }, []);

  const startSegmentation = async () => {
    if (!ocrResult) {
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 调用切题API (暂时注释，使用模拟数据)
      // const response = await questionSegmentationApi.segmentQuestions({
      //   ocr_result: ocrResult,
      //   exam_config: {
      //     exam_type: 'standard',
      //     question_types: ['choice', 'subjective', 'calculation']
      //   }
      // });

      clearInterval(progressInterval);
      setProgress(100);

      // 模拟结果
      const mockResult: SegmentationResult = {
        questions: [
          {
            id: '1',
            type: 'choice',
            content: '下列哪个选项是正确的？\nA. 选项A\nB. 选项B\nC. 选项C\nD. 选项D',
            region: { x: 10, y: 10, width: 300, height: 150 },
            studentAnswer: 'B',
            confidence: 0.95,
            difficulty: 'easy'
          },
          {
            id: '2',
            type: 'subjective',
            content: '请简述你的观点。',
            region: { x: 10, y: 180, width: 250, height: 40 },
            studentAnswer: '我认为这个问题需要从多个角度来分析...',
            confidence: 0.88,
            difficulty: 'medium'
          },
          {
            id: '3',
            type: 'calculation',
            content: '计算下列表达式的值：\n2x + 3y = 15',
            region: { x: 10, y: 230, width: 280, height: 60 },
            studentAnswer: 'x = 3, y = 3',
            confidence: 0.92,
            difficulty: 'hard'
          }
        ],
        totalQuestions: 3,
        confidence: 0.92,
        processingTime: 2.5,
        qualityScore: 0.89
      };

      setSegmentationResult(mockResult);
    } catch (error) {
      console.error('切题失败:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    form.setFieldsValue({
      type: question.type,
      content: question.content,
      difficulty: question.difficulty
    });
    setEditModalVisible(true);
  };

  const handleViewDetail = (question: Question) => {
    setSelectedQuestion(question);
    setDetailModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedQuestion && segmentationResult) {
        const updatedQuestions = segmentationResult.questions.map(q =>
          q.id === selectedQuestion.id
            ? { ...q, ...values }
            : q
        );
        setSegmentationResult({
          ...segmentationResult,
          questions: updatedQuestions
        });
      }
      setEditModalVisible(false);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'choice': return 'blue';
      case 'subjective': return 'green';
      case 'calculation': return 'orange';
      case 'fill_blank': return 'purple';
      default: return 'default';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'choice': return '选择题';
      case 'subjective': return '主观题';
      case 'calculation': return '计算题';
      case 'fill_blank': return '填空题';
      default: return '未知类型';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'default';
    }
  };

  const getDifficultyName = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  const columns = [
    {
      title: '题目编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{getTypeName(type)}</Tag>
      ),
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Text ellipsis={{ tooltip: content }} style={{ maxWidth: 200 }}>
          {content}
        </Text>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty?: string) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {getDifficultyName(difficulty)}
        </Tag>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (confidence: number) => (
        <Progress
          percent={Math.round(confidence * 100)}
          size="small"
          status={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Question) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Edit size={14} />}
            onClick={() => handleEditQuestion(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="question-segmentation p-6">
      {/* 头部工具栏 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={2} className="mb-2">
              <Wand2 className="inline mr-2" size={24} />
              智能切题
            </Title>
            <Text type="secondary">自动识别和分割试卷题目</Text>
          </div>
          <div className="space-x-2">
            <Button
              type="primary"
              loading={processing}
              onClick={startSegmentation}
              disabled={!hasOcrResult}
              icon={<Wand2 size={16} />}
            >
              开始切题
            </Button>
            {segmentationResult && (
              <Button
                type="default"
                icon={<FileText size={16} />}
              >
                导出结果
              </Button>
            )}
          </div>
        </div>

        {!hasOcrResult && (
          <Alert
            message="请先上传并处理答题卡图片"
            description="需要先进行OCR识别才能开始智能切题"
            type="warning"
            showIcon
          />
        )}
      </div>

      {/* OCR结果展示 */}
      {hasOcrResult && (
        <Card title="OCR识别结果" className="mb-6">
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="识别文本块数量" value={ocrResult?.regions.length || 0} />
            </Col>
            <Col span={12}>
              <Statistic 
                title="平均置信度" 
                value={ocrResult ? ocrResult.regions.reduce((acc, r) => acc + r.confidence, 0) / (ocrResult.regions.length || 1) : 0} 
                precision={2}
                suffix="%"
                formatter={(value) => `${((value as number) * 100).toFixed(1)}%`}
              />
            </Col>
          </Row>
          <Divider />
          <Text strong>识别文本预览：</Text>
          <Paragraph
            ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
            className="mt-2 p-3 bg-gray-50 rounded"
          >
            {ocrResult?.text}
          </Paragraph>
        </Card>
      )}

      {/* 切题进度 */}
      {processing && (
        <Card className="mb-6">
          <div className="text-center">
            <Spin size="large" className="mb-4" />
            <Title level={4}>正在进行智能切题...</Title>
            <Progress percent={progress} status="active" className="mb-2" />
            <Text type="secondary">
              {progress < 30 && '正在分析文本结构...'}
              {progress >= 30 && progress < 60 && '正在识别题目边界...'}
              {progress >= 60 && progress < 90 && '正在分类题目类型...'}
              {progress >= 90 && '正在生成切题结果...'}
            </Text>
          </div>
        </Card>
      )}

      {/* 切题结果 */}
      {segmentationResult && (
        <>
          {/* 结果统计 */}
          <Card title="切题结果统计" className="mb-6">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="识别题目数量" value={segmentationResult.totalQuestions} />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="整体置信度" 
                  value={segmentationResult.confidence} 
                  precision={2}
                  suffix="%"
                  formatter={(value) => `${((value as number) * 100).toFixed(1)}%`}
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="处理时间" 
                  value={segmentationResult.processingTime} 
                  precision={1}
                  suffix="秒"
                />
              </Col>
              <Col span={6}>
                <Statistic 
                  title="质量评分" 
                  value={segmentationResult.qualityScore} 
                  precision={2}
                  suffix="%"
                  formatter={(value) => `${((value as number) * 100).toFixed(1)}%`}
                />
              </Col>
            </Row>
          </Card>

          {/* 题目列表 */}
          <Card title="题目列表" className="mb-6">
            <Table
              columns={columns}
              dataSource={segmentationResult.questions}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 道题目`,
              }}
            />
          </Card>

          {/* 质量验证 */}
          <Card title="切题质量验证">
            <Row gutter={16}>
              <Col span={8}>
                <div className="text-center p-4">
                  <CheckCircle size={32} className="text-green-500 mb-2" />
                  <div>
                    <Text strong>题目完整性</Text>
                    <br />
                    <Text type="secondary">95%</Text>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center p-4">
                  <CheckCircle size={32} className="text-green-500 mb-2" />
                  <div>
                    <Text strong>边界准确性</Text>
                    <br />
                    <Text type="secondary">92%</Text>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center p-4">
                  <AlertCircle size={32} className="text-orange-500 mb-2" />
                  <div>
                    <Text strong>类型识别</Text>
                    <br />
                    <Text type="secondary">88%</Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </>
      )}

      {/* 编辑题目对话框 */}
      <Modal
        title="编辑题目"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="type"
            label="题目类型"
            rules={[{ required: true, message: '请选择题目类型' }]}
          >
            <Select>
              <Option value="choice">选择题</Option>
              <Option value="subjective">主观题</Option>
              <Option value="calculation">计算题</Option>
              <Option value="fill_blank">填空题</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="题目内容"
            rules={[{ required: true, message: '请输入题目内容' }]}
          >
            <TextArea rows={6} />
          </Form.Item>
          <Form.Item
            name="difficulty"
            label="难度等级"
          >
            <Select>
              <Option value="easy">简单</Option>
              <Option value="medium">中等</Option>
              <Option value="hard">困难</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 题目详情对话框 */}
      <Modal
        title="题目详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedQuestion && (
          <div>
            <Row gutter={16} className="mb-4">
              <Col span={12}>
                <Text strong>题目编号：</Text>
                <Text>{selectedQuestion.id}</Text>
              </Col>
              <Col span={12}>
                <Text strong>题目类型：</Text>
                <Tag color={getTypeColor(selectedQuestion.type)}>
                  {getTypeName(selectedQuestion.type)}
                </Tag>
              </Col>
            </Row>
            <Row gutter={16} className="mb-4">
              <Col span={12}>
                <Text strong>难度等级：</Text>
                <Tag color={getDifficultyColor(selectedQuestion.difficulty)}>
                  {getDifficultyName(selectedQuestion.difficulty)}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>置信度：</Text>
                <Text>{(selectedQuestion.confidence * 100).toFixed(1)}%</Text>
              </Col>
            </Row>
            <Divider />
            <div className="mb-4">
              <Text strong>题目内容：</Text>
              <Paragraph className="mt-2 p-3 bg-gray-50 rounded">
                {selectedQuestion.content}
              </Paragraph>
            </div>
            {selectedQuestion.studentAnswer && (
              <div className="mb-4">
                <Text strong>学生答案：</Text>
                <Paragraph className="mt-2 p-3 bg-blue-50 rounded">
                  {selectedQuestion.studentAnswer}
                </Paragraph>
              </div>
            )}
            <div>
              <Text strong>区域坐标：</Text>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <Text>X: {selectedQuestion.region.x}, Y: {selectedQuestion.region.y}</Text>
                <br />
                <Text>宽度: {selectedQuestion.region.width}, 高度: {selectedQuestion.region.height}</Text>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuestionSegmentationView;