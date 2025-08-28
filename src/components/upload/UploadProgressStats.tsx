import React, { useState, useEffect } from 'react';
import { Card, Progress, Statistic, Row, Col, Button, message } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import apiClient from '../../services/api';

interface UploadProgressStatsProps {
  examId: string;
  onRefresh?: () => void;
}

interface ProcessingStats {
  total: number;
  completed: number;
  processing: number;
  error: number;
  pending: number;
  student_matched: number;
  student_unmatched: number;
}

const UploadProgressStats: React.FC<UploadProgressStatsProps> = ({ examId, onRefresh }) => {
  const [stats, setStats] = useState<ProcessingStats>({
    total: 0,
    completed: 0,
    processing: 0,
    error: 0,
    pending: 0,
    student_matched: 0,
    student_unmatched: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/files/exam/${examId}/processing-stats`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('获取处理统计失败:', error);
      message.error('获取处理统计失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchStats();
    }
  }, [examId]);

  const handleRefresh = () => {
    fetchStats();
    onRefresh?.();
  };

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const errorRate = stats.total > 0 ? (stats.error / stats.total) * 100 : 0;
  const matchRate = stats.total > 0 ? (stats.student_matched / stats.total) * 100 : 0;

  return (
    <Card 
      title="处理进度统计" 
      size="small"
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          size="small" 
          onClick={handleRefresh}
          loading={loading}
        >
          刷新
        </Button>
      }
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="总数"
            value={stats.total}
            prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已完成"
            value={stats.completed}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="处理中"
            value={stats.processing}
            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="错误"
            value={stats.error}
            prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
          />
        </Col>
      </Row>
      
      <div className="mt-4">
        <div className="mb-2">
          <span className="text-sm text-gray-600">完成进度</span>
          <Progress 
            percent={Math.round(completionRate)} 
            status={errorRate > 10 ? 'exception' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>
        
        {stats.total > 0 && (
          <div className="mb-2">
            <span className="text-sm text-gray-600">学生信息匹配率</span>
            <Progress 
              percent={Math.round(matchRate)} 
              strokeColor="#52c41a"
            />
          </div>
        )}
        
        {stats.error > 0 && (
          <div className="text-sm text-red-500">
            发现 {stats.error} 个文件处理失败，请检查文件格式或重新上传
          </div>
        )}
        
        {stats.student_unmatched > 0 && (
          <div className="text-sm text-orange-500">
            有 {stats.student_unmatched} 份答题卡需要人工确认学生信息
          </div>
        )}
      </div>
    </Card>
  );
};

export default UploadProgressStats;