import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Progress,
  Button,
  Alert,
  Space,
  Statistic,
  Row,
  Col,
  Table,
  Tag,
  Tooltip,
  Switch,
  InputNumber,
  Select,
  Timeline
} from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  StopOutlined,
  ReloadOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { message } from '../../utils/message';

interface ProcessingTask {
  id: string;
  name: string;
  type: 'ocr' | 'quality_check' | 'structure_analysis' | 'identity_recognition';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
  itemsTotal: number;
  itemsProcessed: number;
  itemsFailed: number;
  throughput: number; // items per second
  errorRate: number; // percentage
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

interface PerformanceMetrics {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageThroughput: number;
  averageErrorRate: number;
  systemMemoryUsage: number;
  systemCpuUsage: number;
  queueLength: number;
}

interface BatchProcessingMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

const BatchProcessingMonitor: React.FC<BatchProcessingMonitorProps> = ({
  autoRefresh = true,
  refreshInterval = 2
}) => {
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageThroughput: 0,
    averageErrorRate: 0,
    systemMemoryUsage: 0,
    systemCpuUsage: 0,
    queueLength: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('all');
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState(3);
  const [enableAutoOptimization, setEnableAutoOptimization] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<Array<{
    timestamp: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  }>>([]);

  // 模拟生成任务数据
  const generateMockTasks = useCallback((): ProcessingTask[] => {
    const taskTypes: ProcessingTask['type'][] = ['ocr', 'quality_check', 'structure_analysis', 'identity_recognition'];
    const statuses: ProcessingTask['status'][] = ['pending', 'processing', 'completed', 'failed', 'paused'];
    
    return Array.from({ length: 8 }, (_, index) => {
      const type = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const itemsTotal = Math.floor(Math.random() * 1000) + 100;
      const itemsProcessed = status === 'completed' ? itemsTotal : Math.floor(Math.random() * itemsTotal);
      const itemsFailed = Math.floor(Math.random() * itemsProcessed * 0.1);
      const progress = status === 'completed' ? 100 : (itemsProcessed / itemsTotal) * 100;
      const startTime = Date.now() - Math.random() * 3600000; // Random start time within last hour
      const duration = status === 'completed' ? Math.random() * 1800000 : Date.now() - startTime; // Random duration
      
      return {
        id: `task_${index + 1}`,
        name: `${type.replace('_', ' ').toUpperCase()} 任务 ${index + 1}`,
        type,
        status,
        progress,
        startTime,
        endTime: status === 'completed' ? startTime + duration : undefined,
        duration: status === 'completed' ? duration : undefined,
        itemsTotal,
        itemsProcessed,
        itemsFailed,
        throughput: itemsProcessed > 0 ? (itemsProcessed / (duration / 1000)) : 0,
        errorRate: itemsProcessed > 0 ? (itemsFailed / itemsProcessed) * 100 : 0,
        memoryUsage: Math.random() * 512 + 128, // 128-640 MB
        cpuUsage: Math.random() * 80 + 10 // 10-90%
      };
    });
  }, []);

  // 计算性能指标
  const calculateMetrics = useCallback((taskList: ProcessingTask[]): PerformanceMetrics => {
    const totalTasks = taskList.length;
    const activeTasks = taskList.filter(t => t.status === 'processing').length;
    const completedTasks = taskList.filter(t => t.status === 'completed').length;
    const failedTasks = taskList.filter(t => t.status === 'failed').length;
    
    const averageThroughput = taskList.length > 0 
      ? taskList.reduce((sum, task) => sum + task.throughput, 0) / taskList.length 
      : 0;
    
    const averageErrorRate = taskList.length > 0 
      ? taskList.reduce((sum, task) => sum + task.errorRate, 0) / taskList.length 
      : 0;
    
    const systemMemoryUsage = taskList.reduce((sum, task) => sum + task.memoryUsage, 0);
    const systemCpuUsage = taskList.length > 0 
      ? taskList.reduce((sum, task) => sum + task.cpuUsage, 0) / taskList.length 
      : 0;
    
    return {
      totalTasks,
      activeTasks,
      completedTasks,
      failedTasks,
      averageThroughput,
      averageErrorRate,
      systemMemoryUsage,
      systemCpuUsage,
      queueLength: taskList.filter(t => t.status === 'pending').length
    };
  }, []);

  // 更新数据
  const updateData = useCallback(() => {
    const newTasks = generateMockTasks();
    const newMetrics = calculateMetrics(newTasks);
    
    setTasks(newTasks);
    setMetrics(newMetrics);
    
    // 添加到性能历史
    setPerformanceHistory(prev => {
      const newRecord = {
        timestamp: Date.now(),
        throughput: newMetrics.averageThroughput,
        errorRate: newMetrics.averageErrorRate,
        memoryUsage: newMetrics.systemMemoryUsage,
        cpuUsage: newMetrics.systemCpuUsage
      };
      
      // 保留最近50条记录
      const updated = [...prev, newRecord].slice(-50);
      return updated;
    });
  }, [generateMockTasks, calculateMetrics]);

  // 自动刷新
  useEffect(() => {
    if (!isMonitoring || !autoRefresh) return;
    
    const interval = setInterval(updateData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isMonitoring, autoRefresh, refreshInterval, updateData]);

  // 开始监控
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    updateData();
    message.success('开始监控批量处理性能');
  }, [updateData]);

  // 停止监控
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    message.info('停止监控');
  }, []);

  // 暂停任务
  const pauseTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'paused' as const } : task
    ));
    message.info('任务已暂停');
  }, []);

  // 恢复任务
  const resumeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'processing' as const } : task
    ));
    message.info('任务已恢复');
  }, []);

  // 重试失败任务
  const retryTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { 
        ...task, 
        status: 'processing' as const,
        itemsFailed: 0,
        errorRate: 0
      } : task
    ));
    message.info('任务重试中');
  }, []);

  // 自动优化
  const autoOptimize = useCallback(() => {
    if (metrics.averageErrorRate > 10) {
      setMaxConcurrentTasks(prev => Math.max(1, prev - 1));
      message.warning('检测到高错误率，降低并发数以提高稳定性');
    } else if (metrics.systemCpuUsage < 50 && metrics.averageThroughput < 10) {
      setMaxConcurrentTasks(prev => Math.min(10, prev + 1));
      message.info('系统资源充足，增加并发数以提高吞吐量');
    }
  }, [metrics]);

  // 自动优化效果
  useEffect(() => {
    if (enableAutoOptimization && isMonitoring) {
      autoOptimize();
    }
  }, [enableAutoOptimization, isMonitoring, autoOptimize]);

  // 过滤任务
  const filteredTasks = selectedTaskType === 'all' 
    ? tasks 
    : tasks.filter(task => task.type === selectedTaskType);

  // 表格列定义
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap = {
          ocr: { color: 'blue', text: 'OCR识别' },
          quality_check: { color: 'green', text: '质量检查' },
          structure_analysis: { color: 'orange', text: '结构分析' },
          identity_recognition: { color: 'purple', text: '身份识别' }
        };
        const config = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          pending: { color: 'default', text: '等待中' },
          processing: { color: 'blue', text: '处理中' },
          completed: { color: 'green', text: '已完成' },
          failed: { color: 'red', text: '失败' },
          paused: { color: 'orange', text: '已暂停' }
        };
        const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: ProcessingTask) => (
        <div>
          <Progress 
            percent={progress} 
            size="small" 
            status={record.status === 'failed' ? 'exception' : 'normal'}
          />
          <div className="text-xs text-gray-500">
            {record.itemsProcessed}/{record.itemsTotal} 项
          </div>
        </div>
      )
    },
    {
      title: '吞吐量',
      dataIndex: 'throughput',
      key: 'throughput',
      width: 100,
      render: (throughput: number) => (
        <Tooltip title="每秒处理项数">
          <span>{throughput.toFixed(2)} 项/秒</span>
        </Tooltip>
      )
    },
    {
      title: '错误率',
      dataIndex: 'errorRate',
      key: 'errorRate',
      width: 100,
      render: (errorRate: number) => (
        <span className={errorRate > 10 ? 'text-red-500' : errorRate > 5 ? 'text-orange-500' : 'text-green-500'}>
          {errorRate.toFixed(1)}%
        </span>
      )
    },
    {
      title: '资源使用',
      key: 'resources',
      width: 120,
      render: (record: ProcessingTask) => (
        <div className="text-xs">
          <div>内存: {record.memoryUsage.toFixed(0)} MB</div>
          <div>CPU: {record.cpuUsage.toFixed(0)}%</div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (record: ProcessingTask) => (
        <Space size="small">
          {record.status === 'processing' && (
            <Button 
              size="small" 
              icon={<PauseOutlined />}
              onClick={() => pauseTask(record.id)}
            >
              暂停
            </Button>
          )}
          {record.status === 'paused' && (
            <Button 
              size="small" 
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => resumeTask(record.id)}
            >
              恢复
            </Button>
          )}
          {record.status === 'failed' && (
            <Button 
              size="small" 
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => retryTask(record.id)}
            >
              重试
            </Button>
          )}
        </Space>
      )
    }
  ];



  return (
    <div className="batch-processing-monitor">
      <Card 
        title="批量处理性能监控" 
        extra={
          <Space>
            <Button 
              icon={<SettingOutlined />}
              onClick={() => message.info('配置功能开发中')}
            >
              配置
            </Button>
            {!isMonitoring ? (
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startMonitoring}
              >
                开始监控
              </Button>
            ) : (
              <Button 
                danger
                icon={<StopOutlined />}
                onClick={stopMonitoring}
              >
                停止监控
              </Button>
            )}
          </Space>
        }
      >
        {/* 性能指标概览 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <Statistic
              title="活跃任务"
              value={metrics.activeTasks}
              suffix={`/ ${metrics.totalTasks}`}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: metrics.activeTasks > 0 ? '#1890ff' : '#666' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均吞吐量"
              value={metrics.averageThroughput}
              precision={2}
              suffix="项/秒"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: metrics.averageThroughput > 10 ? '#52c41a' : '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均错误率"
              value={metrics.averageErrorRate}
              precision={1}
              suffix="%"
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: metrics.averageErrorRate > 10 ? '#ff4d4f' : '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="队列长度"
              value={metrics.queueLength}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: metrics.queueLength > 5 ? '#faad14' : '#52c41a' }}
            />
          </Col>
        </Row>

        {/* 系统资源使用 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={12}>
            <Card title="内存使用" size="small">
              <Progress 
                percent={(metrics.systemMemoryUsage / 2048) * 100} 
                format={() => `${metrics.systemMemoryUsage.toFixed(0)} MB / 2048 MB`}
                status={metrics.systemMemoryUsage > 1536 ? 'exception' : 'normal'}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="CPU使用" size="small">
              <Progress 
                percent={metrics.systemCpuUsage} 
                format={(percent) => `${percent?.toFixed(0)}%`}
                status={metrics.systemCpuUsage > 80 ? 'exception' : 'normal'}
              />
            </Card>
          </Col>
        </Row>

        {/* 控制面板 */}
        <Card title="控制面板" size="small" className="mb-6">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <div className="flex items-center justify-between">
                <span>任务类型过滤</span>
                <Select
                  value={selectedTaskType}
                  onChange={setSelectedTaskType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Select.Option value="all">全部</Select.Option>
                  <Select.Option value="ocr">OCR识别</Select.Option>
                  <Select.Option value="quality_check">质量检查</Select.Option>
                  <Select.Option value="structure_analysis">结构分析</Select.Option>
                  <Select.Option value="identity_recognition">身份识别</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={6}>
              <div className="flex items-center justify-between">
                <span>最大并发数</span>
                <InputNumber
                  min={1}
                  max={10}
                  value={maxConcurrentTasks}
                  onChange={(value) => setMaxConcurrentTasks(value || 3)}
                  size="small"
                  style={{ width: 80 }}
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="flex items-center justify-between">
                <span>自动刷新</span>
                <Switch
                  checked={autoRefresh}
                  size="small"
                  disabled
                />
              </div>
            </Col>
            <Col span={6}>
              <div className="flex items-center justify-between">
                <span>自动优化</span>
                <Switch
                  checked={enableAutoOptimization}
                  onChange={setEnableAutoOptimization}
                  size="small"
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* 任务列表 */}
        <Card title={`任务列表 (${filteredTasks.length})`} size="small">
          <Table
            columns={columns}
            dataSource={filteredTasks}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个任务`
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* 性能趋势 */}
        {performanceHistory.length > 0 && (
          <Card title="性能趋势" size="small" className="mt-6">
            <Timeline mode="left">
              {performanceHistory.slice(-10).map((record, index) => (
                <Timeline.Item 
                  key={index}
                  color={record.errorRate > 10 ? 'red' : record.throughput > 15 ? 'green' : 'blue'}
                >
                  <div className="text-sm">
                    <div className="font-medium">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-gray-600">
                      吞吐量: {record.throughput.toFixed(2)} 项/秒 | 
                      错误率: {record.errorRate.toFixed(1)}% | 
                      内存: {record.memoryUsage.toFixed(0)} MB | 
                      CPU: {record.cpuUsage.toFixed(0)}%
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}

        {/* 提示信息 */}
        {!isMonitoring && (
          <Alert
            message="监控提示"
            description={
              <ul className="mb-0">
                <li>点击"开始监控"开始实时监控批量处理性能</li>
                <li>启用自动优化可根据系统负载自动调整并发参数</li>
                <li>监控错误率和吞吐量，及时发现性能瓶颈</li>
                <li>合理设置并发数，避免系统过载</li>
              </ul>
            }
            type="info"
            showIcon
            className="mt-6"
          />
        )}
      </Card>
    </div>
  );
};

export default BatchProcessingMonitor;