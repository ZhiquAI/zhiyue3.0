import React, { useState } from 'react';
import { Modal, Card, Row, Col, Image, Tag, Button, Divider, Space, Tooltip } from 'antd';
import { EyeOutlined, ScissorOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface QuestionSegment {
  questionNumber: number;
  questionType: 'choice' | 'fill' | 'calculation' | 'essay' | 'analysis';
  content: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  studentAnswer?: string;
  points?: number;
}

interface SegmentationData {
  totalQuestions: number;
  subjectiveQuestions: number;
  qualityScore: number;
  issues: string[];
  questions: QuestionSegment[];
  originalImageUrl: string;
}

interface QuestionSegmentationViewerProps {
  visible: boolean;
  onClose: () => void;
  data: SegmentationData;
  sheetInfo: {
    filename: string;
    studentName?: string;
    studentId?: string;
  };
}

const QuestionSegmentationViewer: React.FC<QuestionSegmentationViewerProps> = ({
  visible,
  onClose,
  data,
  sheetInfo
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionSegment | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const getQuestionTypeLabel = (type: string) => {
    const typeMap = {
      choice: { label: '选择题', color: 'blue' },
      fill: { label: '填空题', color: 'green' },
      calculation: { label: '计算题', color: 'orange' },
      essay: { label: '简答题', color: 'purple' },
      analysis: { label: '分析题', color: 'red' }
    };
    return typeMap[type as keyof typeof typeMap] || { label: '未知', color: 'default' };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'green';
    if (confidence >= 80) return 'blue';
    if (confidence >= 70) return 'orange';
    return 'red';
  };

  const subjectiveQuestions = data.questions.filter(q => 
    ['calculation', 'essay', 'analysis'].includes(q.questionType)
  );

  const objectiveQuestions = data.questions.filter(q => 
    ['choice', 'fill'].includes(q.questionType)
  );

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-3">
            <ScissorOutlined className="text-blue-600" />
            <div>
              <div className="text-lg font-semibold">题目分割结果</div>
              <div className="text-sm text-gray-500 font-normal">
                {sheetInfo.filename} {sheetInfo.studentName && `· ${sheetInfo.studentName}`}
              </div>
            </div>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
          <Button key="preview" type="primary" icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)}>
            查看原图
          </Button>
        ]}
        className="question-segmentation-modal"
      >
        <div className="space-y-6">
          {/* 分割概览 */}
          <Card size="small" className="bg-blue-50">
            <Row gutter={16}>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.totalQuestions}</div>
                  <div className="text-sm text-gray-600">总题数</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.subjectiveQuestions}</div>
                  <div className="text-sm text-gray-600">主观题</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{data.totalQuestions - data.subjectiveQuestions}</div>
                  <div className="text-sm text-gray-600">客观题</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-purple-600">{data.qualityScore}</span>
                    <span className="text-sm text-gray-600">分</span>
                  </div>
                  <div className="text-sm text-gray-600">分割质量</div>
                </div>
              </Col>
            </Row>
            
            {data.issues.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationCircleOutlined className="text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">质量问题</span>
                </div>
                <div className="text-sm text-orange-600">
                  {data.issues.join('、')}
                </div>
              </div>
            )}
          </Card>

          {/* 主观题列表 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold mb-0">主观题分割结果</h3>
              <Tag color="green">{subjectiveQuestions.length} 题</Tag>
            </div>
            
            <Row gutter={[16, 16]}>
              {subjectiveQuestions.map((question) => {
                const typeInfo = getQuestionTypeLabel(question.questionType);
                return (
                  <Col key={question.questionNumber} xs={24} sm={12} lg={8}>
                    <Card 
                      size="small" 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-600">
                            第 {question.questionNumber} 题
                          </span>
                          <Tag color={typeInfo.color}>
                            {typeInfo.label}
                          </Tag>
                        </div>
                        
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {question.content || '题目内容识别中...'}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Tag color={getConfidenceColor(question.confidence)}>
                            置信度 {question.confidence}%
                          </Tag>
                          {question.points && (
                            <span className="text-xs text-gray-500">
                              {question.points} 分
                            </span>
                          )}
                        </div>
                        
                        {question.studentAnswer && (
                          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                            学生答案: {question.studentAnswer.substring(0, 30)}...
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>

          {/* 客观题概览 */}
          {objectiveQuestions.length > 0 && (
            <div>
              <Divider />
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold mb-0">客观题概览</h3>
                <Tag color="blue">{objectiveQuestions.length} 题</Tag>
              </div>
              
              <div className="grid grid-cols-8 gap-2">
                {objectiveQuestions.map((question) => {
                  const typeInfo = getQuestionTypeLabel(question.questionType);
                  return (
                    <Tooltip 
                      key={question.questionNumber}
                      title={`第${question.questionNumber}题 · ${typeInfo.label} · 置信度${question.confidence}%`}
                    >
                      <div className="text-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <div className="text-sm font-medium">{question.questionNumber}</div>
                        <div className="text-xs text-gray-500">{typeInfo.label}</div>
                        <div className={`text-xs ${
                          question.confidence >= 90 ? 'text-green-600' :
                          question.confidence >= 80 ? 'text-blue-600' :
                          question.confidence >= 70 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {question.confidence}%
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 题目详情模态框 */}
      <Modal
        title={`第 ${selectedQuestion?.questionNumber} 题详情`}
        open={!!selectedQuestion}
        onCancel={() => setSelectedQuestion(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedQuestion(null)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Tag color={getQuestionTypeLabel(selectedQuestion.questionType).color}>
                {getQuestionTypeLabel(selectedQuestion.questionType).label}
              </Tag>
              <Tag color={getConfidenceColor(selectedQuestion.confidence)}>
                置信度 {selectedQuestion.confidence}%
              </Tag>
              {selectedQuestion.points && (
                <Tag color="purple">{selectedQuestion.points} 分</Tag>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">题目内容</h4>
              <div className="p-3 bg-gray-50 rounded">
                {selectedQuestion.content || '题目内容识别中...'}
              </div>
            </div>
            
            {selectedQuestion.studentAnswer && (
              <div>
                <h4 className="font-semibold mb-2">学生答案</h4>
                <div className="p-3 bg-blue-50 rounded">
                  {selectedQuestion.studentAnswer}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-semibold mb-2">位置信息</h4>
              <div className="text-sm text-gray-600">
                坐标: ({selectedQuestion.coordinates.x}, {selectedQuestion.coordinates.y})<br/>
                尺寸: {selectedQuestion.coordinates.width} × {selectedQuestion.coordinates.height}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 原图预览 */}
      <Modal
        title="答题卡原图"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={1000}
        centered
      >
        <div className="text-center">
          <Image
            src={data.originalImageUrl}
            alt="答题卡原图"
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
          />
        </div>
      </Modal>
    </>
  );
};

export default QuestionSegmentationViewer;