// 批量阅卷操作面板
import React, { useState } from 'react';
import { Card, Button, Progress, Alert, Table, Tag, Space, Modal, Statistic, Row, Col, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined, ReloadOutlined, FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';


interface BatchGradingPanelProps {
  examId: string;
  onComplete: () => void;
}

const BatchGradingPanel: React.FC<BatchGradingPanelProps> = ({ examId, onComplete }) => {
  const [status, setStatus] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [showDetails, setShowDetails] = useState(false);

  const handleStartBatch = async () => {
    try {
      setBatchStatus('running');
      
      // 调用批量阅卷API
      const response = await fetch(`/api/exams/${examId}/batch-grading`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('批量阅卷启动失败');
      }

      message.success('批量阅卷已启动');
    } catch (error) {
      setBatchStatus('idle');
      message.error('启动失败: ' + error.message);
    }
  };

  const handlePauseBatch = async () => {
    try {
      await fetch(`/api/exams/${examId}/batch-grading/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      setBatchStatus('paused');
      message.info('批量阅卷已暂停');
    } catch (error) {
      message.error('暂停失败');
    }
  };

  const handleStopBatch = () => {
    Modal.confirm({
      title: '确认停止',
      content: '确定要停止批量阅卷吗？已处理的结果将保留。',
      onOk: async () => {
        try {
          await fetch(`/api/exams/${examId}/batch-grading/stop`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          setBatchStatus('idle');
          message.info('批量阅卷已停止');
        } catch (error) {
          message.error('停止失败');
        }
      }
    });
  };

  const progressPercent = status ? Math.round((status.processedSheets / status.totalSheets) * 100) : 0;

  return (
    <Card title="批量阅卷控制台" className="mb-6">
      {/* 状态统计 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Statistic
            title="总答题卡数"
            value={status?.totalSheets || 0}
            prefix={<FileTextOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已处理"
            value={status?.processedSheets || 0}
            valueStyle={{ color: '#3f8600' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="处理进度"
            value={progressPercent}
            suffix="%"
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="错误数量"
            value={status?.errors?.length || 0}
            valueStyle={{ color: '#cf1322' }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Col>
      </Row>

      {/* 进度条 */}
      <Progress
        percent={progressPercent}
        status={batchStatus === 'running' ? 'active' : 'normal'}
        strokeColor={{
          '0%': '#108ee9',
          '100%': '#87d068',
        }}
        className="mb-4"
      />

      {/* 连接状态 */}
      <Alert
        message={
          <div className="flex items-center justify-between">
            <span>
              实时连接状态: {connected ? 
                <Tag color="green">已连接</Tag> : 
                <Tag color="red">未连接</Tag>
              }
            </span>
            <span>当前状态: {status?.currentStatus || '等待中'}</span>
          </div>
        }
        type={connected ? 'success' : 'warning'}
        className="mb-4"
      />

      {/* 控制按钮 */}
      <Space className="mb-4">
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleStartBatch}
          disabled={batchStatus === 'running' || !status?.totalSheets}
          loading={batchStatus === 'running'}
        >
          {batchStatus === 'running' ? '阅卷中...' : '开始批量阅卷'}
        </Button>

        <Button
          icon={<PauseCircleOutlined />}
          onClick={handlePauseBatch}
          disabled={batchStatus !== 'running'}
        >
          暂停
        </Button>

        <Button
          danger
          icon={<StopOutlined />}
          onClick={handleStopBatch}
          disabled={batchStatus === 'idle'}
        >
          停止
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
        >
          刷新状态
        </Button>

        <Button
          type="link"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '隐藏详情' : '查看详情'}
        </Button>
      </Space>

      {/* 错误列表 */}
      {status?.errors && status.errors.length > 0 && (
        <Alert
          message="处理错误"
          description={
            <div>
              <p>发现 {status.errors.length} 个错误，需要人工处理：</p>
              <ul>
                {status.errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
                {status.errors.length > 3 && <li>... 还有 {status.errors.length - 3} 个错误</li>}
              </ul>
            </div>
          }
          type="error"
          showIcon
          className="mt-4"
        />
      )}

      {/* 详细信息模态框 */}
      <Modal
        title="批量阅卷详情"
        open={showDetails}
        onCancel={() => setShowDetails(false)}
        footer={null}
        width={800}
      >
        <div className="space-y-4">
          <div>
            <h4>处理统计</h4>
            <Progress
              percent={progressPercent}
              format={() => `${status?.processedSheets || 0}/${status?.totalSheets || 0}`}
            />
          </div>

          {status?.errors && status.errors.length > 0 && (
            <div>
              <h4>错误详情</h4>
              <Table
                size="small"
                dataSource={status.errors}
                columns={[
                  { title: '文件名', dataIndex: 'filename', key: 'filename' },
                  { title: '错误类型', dataIndex: 'type', key: 'type' },
                  { title: '错误信息', dataIndex: 'message', key: 'message' },
                ]}
                pagination={{ pageSize: 5 }}
              />
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default BatchGradingPanel;