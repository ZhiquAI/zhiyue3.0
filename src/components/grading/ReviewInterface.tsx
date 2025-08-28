// 阅卷复核界面组件
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  InputNumber,
  message,
  Modal,
  Tag,
  Space,
  Divider,
  Alert,
  Progress,
  Radio
} from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  HistoryOutlined,
  CommentOutlined
} from '@ant-design/icons';

interface Question {
  id: string;
  questionNumber: number;
  questionType: 'objective' | 'subjective';
  fullScore: number;
  originalScore?: number;
  reviewScore?: number;
  scoreDifference?: number;
  content?: string;
  studentAnswer?: string;
  standardAnswer?: string;
  scoringCriteria?: string;
  hasDispute?: boolean;
  disputeReason?: string;
}

interface ReviewTask {
  id: string;
  answerSheetId: string;
  studentName: string;
  studentId: string;
  reviewType: 'double' | 'triple' | 'dispute';
  status: 'pending' | 'in_progress' | 'completed' | 'disputed';
  originalScore: number;
  reviewScore?: number;
  questions: Question[];
  reviewHistory?: ReviewRecord[];
  deadline: string;
  assignedReviewer?: string;
}

interface ReviewRecord {
  id: string;
  reviewerName: string;
  reviewType: string;
  score: number;
  comments?: string;
  createdAt: string;
}

interface ReviewInterfaceProps {
  task: ReviewTask;
  onComplete: () => void;
  onCancel: () => void;
}

const { TextArea } = Input;

const ReviewInterface: React.FC<ReviewInterfaceProps> = ({ task, onComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewScores, setReviewScores] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showOriginalAnswer, setShowOriginalAnswer] = useState(true);
  const [reviewResult, setReviewResult] = useState<'agree' | 'disagree' | 'partial'>('agree');
  const [overallComments, setOverallComments] = useState('');

  const currentQuestion = task.questions[currentQuestionIndex];
  const totalQuestions = task.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // 计算总分差异
  const calculateTotalDifference = () => {
    const reviewTotal = Object.values(reviewScores).reduce((sum, score) => sum + score, 0);
    return reviewTotal - task.originalScore;
  };

  // 提交复核结果
  const handleSubmitReview = async () => {
    try {
      // 验证所有题目都已复核
      const unReviewedQuestions = task.questions.filter(q => !(q.id in reviewScores));
      if (unReviewedQuestions.length > 0) {
        message.warning(`还有 ${unReviewedQuestions.length} 道题目未复核`);
        return;
      }

      setLoading(true);

      const reviewData = {
        task_id: task.id,
        review_result: reviewResult,
        question_scores: task.questions.map(q => ({
          question_id: q.id,
          original_score: q.originalScore,
          review_score: reviewScores[q.id],
          comments: reviewComments[q.id] || ''
        })),
        total_original_score: task.originalScore,
        total_review_score: Object.values(reviewScores).reduce((sum, score) => sum + score, 0),
        overall_comments: overallComments
      };

      const response = await fetch('/api/grading-review/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(reviewData)
      });

      if (!response.ok) {
        throw new Error('提交复核结果失败');
      }

      await response.json();
      message.success('复核结果提交成功');
      onComplete();
    } catch (error) {
      message.error('提交失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 保存当前进度
  const handleSaveProgress = async () => {
    try {
      const progressData = {
        task_id: task.id,
        current_question_index: currentQuestionIndex,
        review_scores: reviewScores,
        review_comments: reviewComments,
        overall_comments: overallComments
      };

      await fetch('/api/grading-review/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(progressData)
      });

      message.success('进度已保存');
    } catch (error) {
      message.error('保存失败: ' + (error as Error).message);
    }
  };

  // 更新题目分数
  const handleScoreChange = (questionId: string, score: number) => {
    setReviewScores(prev => ({ ...prev, [questionId]: score }));
  };

  // 更新题目评论
  const handleCommentChange = (questionId: string, comment: string) => {
    setReviewComments(prev => ({ ...prev, [questionId]: comment }));
  };

  // 获取分数差异标签
  const getScoreDifferenceTag = (difference: number) => {
    if (Math.abs(difference) === 0) {
      return <Tag color="green">一致</Tag>;
    } else if (Math.abs(difference) <= 2) {
      return <Tag color="orange">轻微差异 ({difference > 0 ? '+' : ''}{difference})</Tag>;
    } else {
      return <Tag color="red">显著差异 ({difference > 0 ? '+' : ''}{difference})</Tag>;
    }
  };

  // 渲染题目信息
  const renderQuestionInfo = (question: Question) => {
    const reviewScore = reviewScores[question.id];
    const scoreDifference = reviewScore !== undefined ? reviewScore - (question.originalScore || 0) : 0;

    return (
      <Card
        title={`第 ${question.questionNumber} 题 (${question.questionType === 'objective' ? '客观题' : '主观题'})`}
        extra={
          <Space>
            <span>满分: {question.fullScore}</span>
            <span>原始分数: {question.originalScore || 0}</span>
            {reviewScore !== undefined && getScoreDifferenceTag(scoreDifference)}
          </Space>
        }
        className="mb-4"
      >
        {/* 题目内容 */}
        {question.content && (
          <div className="mb-4">
            <h4>题目内容:</h4>
            <div className="p-3 bg-gray-50 rounded">{question.content}</div>
          </div>
        )}

        {/* 学生答案 */}
        {showOriginalAnswer && question.studentAnswer && (
          <div className="mb-4">
            <h4>学生答案:</h4>
            <div className="p-3 bg-blue-50 rounded">{question.studentAnswer}</div>
          </div>
        )}

        {/* 标准答案 */}
        {question.standardAnswer && (
          <div className="mb-4">
            <h4>标准答案:</h4>
            <div className="p-3 bg-green-50 rounded">{question.standardAnswer}</div>
          </div>
        )}

        {/* 评分标准 */}
        {question.scoringCriteria && (
          <div className="mb-4">
            <h4>评分标准:</h4>
            <div className="p-3 bg-yellow-50 rounded">{question.scoringCriteria}</div>
          </div>
        )}

        {/* 复核评分 */}
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <span>复核分数:</span>
              <InputNumber
                min={0}
                max={question.fullScore}
                step={0.5}
                value={reviewScores[question.id]}
                onChange={(value) => handleScoreChange(question.id, value || 0)}
                placeholder="请输入分数"
              />
              <span>/ {question.fullScore}</span>
            </Space>
          </Col>
          <Col span={16}>
            <Input
              placeholder="复核评语（可选）"
              value={reviewComments[question.id] || ''}
              onChange={(e) => handleCommentChange(question.id, e.target.value)}
              prefix={<CommentOutlined />}
            />
          </Col>
        </Row>

        {/* 争议信息 */}
        {question.hasDispute && question.disputeReason && (
          <Alert
            message="争议信息"
            description={question.disputeReason}
            type="warning"
            icon={<ExclamationCircleOutlined />}
            className="mt-4"
          />
        )}
      </Card>
    );
  };

  // 渲染复核历史
  const renderReviewHistory = () => (
    <Modal
      title="复核历史"
      open={showHistory}
      onCancel={() => setShowHistory(false)}
      footer={null}
      width={800}
    >
      {task.reviewHistory?.map((record) => (
        <Card key={record.id} className="mb-4">
          <Row gutter={16}>
            <Col span={6}>
              <strong>复核员:</strong> {record.reviewerName}
            </Col>
            <Col span={6}>
              <strong>复核类型:</strong> {record.reviewType}
            </Col>
            <Col span={6}>
              <strong>总分:</strong> {record.score}
            </Col>
            <Col span={6}>
              <strong>时间:</strong> {new Date(record.createdAt).toLocaleString()}
            </Col>
          </Row>
          {record.comments && (
            <div className="mt-2">
              <strong>评语:</strong> {record.comments}
            </div>
          )}
        </Card>
      )) || <div>暂无复核历史</div>}
    </Modal>
  );

  useEffect(() => {
    // 初始化已有的复核分数
    const initialScores: Record<string, number> = {};
    task.questions.forEach(q => {
      if (q.reviewScore !== undefined) {
        initialScores[q.id] = q.reviewScore;
      }
    });
    setReviewScores(initialScores);
  }, [task]);

  return (
    <div className="review-interface">
      {/* 头部信息 */}
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <h3>学生: {task.studentName} ({task.studentId})</h3>
            <p>复核类型: <Tag color="blue">{task.reviewType}</Tag></p>
          </Col>
          <Col span={8}>
            <Progress
              percent={Math.round(progress)}
              format={() => `${currentQuestionIndex + 1}/${totalQuestions}`}
            />
            <p className="mt-2">复核进度</p>
          </Col>
          <Col span={8}>
            <Space>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setShowHistory(true)}
                disabled={!task.reviewHistory?.length}
              >
                查看历史
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setShowOriginalAnswer(!showOriginalAnswer)}
              >
                {showOriginalAnswer ? '隐藏' : '显示'}学生答案
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 题目导航 */}
      <Card className="mb-4">
        <div className="question-navigation">
          <Space wrap>
            {task.questions.map((q, index) => {
              const isReviewed = q.id in reviewScores;
              const isCurrent = index === currentQuestionIndex;
              return (
                <Button
                  key={q.id}
                  type={isCurrent ? 'primary' : isReviewed ? 'default' : 'dashed'}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={isReviewed ? 'bg-green-100' : ''}
                >
                  {q.questionNumber}
                  {isReviewed && <CheckCircleOutlined className="ml-1" />}
                </Button>
              );
            })}
          </Space>
        </div>
      </Card>

      {/* 当前题目 */}
      {renderQuestionInfo(currentQuestion)}

      {/* 导航按钮 */}
      <Card>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <Button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              >
                上一题
              </Button>
              <Button
                disabled={currentQuestionIndex === totalQuestions - 1}
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              >
                下一题
              </Button>
            </Space>
          </Col>
          <Col span={8}>
            <div className="text-center">
              <p>总分差异: {getScoreDifferenceTag(calculateTotalDifference())}</p>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-right">
              <Space>
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveProgress}
                >
                  保存进度
                </Button>
                <Button onClick={onCancel}>
                  取消
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleSubmitReview}
                  loading={loading}
                >
                  提交复核
                </Button>
              </Space>
            </div>
          </Col>
        </Row>

        {/* 整体评语 */}
        <Divider />
        <div>
          <h4>整体复核意见:</h4>
          <Radio.Group
            value={reviewResult}
            onChange={(e) => setReviewResult(e.target.value)}
            className="mb-3"
          >
            <Radio value="agree">同意原始评分</Radio>
            <Radio value="partial">部分同意</Radio>
            <Radio value="disagree">不同意原始评分</Radio>
          </Radio.Group>
          <TextArea
            rows={3}
            placeholder="请输入整体复核意见..."
            value={overallComments}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOverallComments(e.target.value)}
          />
        </div>
      </Card>

      {/* 复核历史弹窗 */}
      {renderReviewHistory()}
    </div>
  );
};

export default ReviewInterface;