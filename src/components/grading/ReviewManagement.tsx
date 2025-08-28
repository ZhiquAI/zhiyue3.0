// 阅卷复核管理主组件
import React, { useState } from 'react';

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

interface ReviewRecord {
  id: string;
  reviewerName: string;
  reviewType: string;
  score: number;
  comments?: string;
  createdAt: string;
}
import { Card, Tabs, Modal, message } from 'antd';
import {
  UnorderedListOutlined,
  EditOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import ReviewTaskList from './ReviewTaskList';
import ReviewInterface from './ReviewInterface';
import ReviewStatistics from './ReviewStatistics';

interface ReviewTaskBase {
  id: string;
  answerSheetId: string;
  studentName: string;
  studentId: string;
  reviewType: 'double' | 'triple' | 'dispute';
  status: 'pending' | 'in_progress' | 'completed' | 'disputed';
  priority: 'high' | 'medium' | 'low';
  originalScore: number;
  reviewScore?: number;
  scoreDifference?: number;
  assignedReviewer?: string;
  createdAt: string;
  deadline: string;
  questionCount: number;
  disputeReason?: string;
}

interface ReviewTaskDetailed extends ReviewTaskBase {
  questions: Question[];
  reviewHistory?: ReviewRecord[];
}

interface ReviewManagementProps {
  examId: string;
}

const ReviewManagement: React.FC<ReviewManagementProps> = ({ examId }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [currentTask, setCurrentTask] = useState<ReviewTaskDetailed | null>(null);
  const [showReviewInterface, setShowReviewInterface] = useState(false);

  // 处理开始复核任务
  const handleReviewTask = async (task: ReviewTaskBase) => {
    try {
      // 获取完整的任务详情，包括题目信息
      const response = await fetch(`/api/grading-review/tasks/${task.id}/details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取任务详情失败');
      }

      const data = await response.json();
      setCurrentTask(data.data);
      setShowReviewInterface(true);
    } catch (error) {
      message.error('获取任务详情失败: ' + (error as Error).message);
    }
  };

  // 处理复核完成
  const handleReviewComplete = () => {
    setShowReviewInterface(false);
    setCurrentTask(null);
    message.success('复核任务完成');
    // 刷新任务列表
    window.location.reload();
  };

  // 处理取消复核
  const handleReviewCancel = () => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消当前复核吗？未保存的进度将丢失。',
      onOk: () => {
        setShowReviewInterface(false);
        setCurrentTask(null);
      }
    });
  };

  const tabItems = [
    {
      key: 'tasks',
      label: (
        <span>
          <UnorderedListOutlined />
          复核任务
        </span>
      ),
      children: (
        <ReviewTaskList
          examId={examId}
          onReviewTask={handleReviewTask}
        />
      )
    },
    {
      key: 'statistics',
      label: (
        <span>
          <BarChartOutlined />
          统计分析
        </span>
      ),
      children: (
        <ReviewStatistics examId={examId} />
      )
    }
  ];

  return (
    <div className="review-management">
      <Card title="阅卷复核管理" className="min-h-screen">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>

      {/* 复核界面弹窗 */}
      <Modal
        title={
          <span>
            <EditOutlined className="mr-2" />
            复核任务 - {currentTask?.studentName}
          </span>
        }
        open={showReviewInterface}
        onCancel={handleReviewCancel}
        footer={null}
        width="95%"
        style={{ top: 20 }}
        destroyOnClose
      >
        {currentTask && (
          <ReviewInterface
            task={currentTask}
            onComplete={handleReviewComplete}
            onCancel={handleReviewCancel}
          />
        )}
      </Modal>
    </div>
  );
};

export default ReviewManagement;