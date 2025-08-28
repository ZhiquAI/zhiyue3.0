# 阅卷中心实施方案 - 详细实现指南

## 1. 项目实施概览

### 1.1 核心目标
基于新阅卷中心设计方案，创建一个统一的阅卷协调枢纽，实现与现有模块的流畅集成。

### 1.2 实施策略
- **渐进式开发**：分阶段实现，每个阶段都有可用的功能
- **模块化集成**：保持现有模块独立性，通过标准接口集成
- **向后兼容**：确保不影响现有功能的正常使用

## 2. 第一阶段：核心组件实现 (4周)

### 2.1 创建阅卷中心主组件

```typescript
// src/components/views/GradingCenterView.tsx
import React, { useState, useEffect } from 'react';
import { Layout, Card, Steps, Row, Col, Button, Progress, Alert } from 'antd';
import { useGradingCenter } from '../../hooks/useGradingCenter';
import { WorkflowNavigator } from '../grading/WorkflowNavigator';
import { StageWorkspace } from '../grading/StageWorkspace';
import { MonitoringPanel } from '../grading/MonitoringPanel';
import { GradingActionBar } from '../grading/GradingActionBar';

interface GradingCenterViewProps {
  exam?: Exam;
  onBack?: () => void;
}

const GradingCenterView: React.FC<GradingCenterViewProps> = ({ 
  exam, 
  onBack 
}) => {
  const {
    session,
    currentStage,
    progress,
    metrics,
    alerts,
    startSession,
    switchStage,
    completeStage,
    pauseSession
  } = useGradingCenter();

  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (exam && !session) {
      initializeSession();
    }
  }, [exam]);

  const initializeSession = async () => {
    if (!exam) return;
    
    setIsInitializing(true);
    try {
      await startSession(exam);
    } catch (error) {
      console.error('Failed to initialize grading session:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStageComplete = async () => {
    try {
      await completeStage(currentStage?.id);
    } catch (error) {
      console.error('Failed to complete stage:', error);
    }
  };

  const handlePause = async () => {
    try {
      await pauseSession();
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  if (!exam) {
    return (
      <Card>
        <Alert
          message="请选择考试"
          description="请从考试管理页面选择要处理的考试，然后进入阅卷中心。"
          type="info"
          showIcon
          action={
            <Button type="primary" onClick={onBack}>
              返回考试管理
            </Button>
          }
        />
      </Card>
    );
  }

  if (isInitializing) {
    return (
      <Card>
        <div className="text-center py-8">
          <Progress type="circle" percent={0} />
          <p className="mt-4">正在初始化阅卷会话...</p>
        </div>
      </Card>
    );
  }

  return (
    <Layout className="grading-center-layout">
      {/* 顶部状态栏 */}
      <Layout.Header className="grading-status-bar">
        <GradingStatusBar 
          session={session}
          progress={progress}
          onBack={onBack}
        />
      </Layout.Header>

      {/* 主内容区 */}
      <Layout.Content className="grading-content">
        <Row gutter={16} className="h-full">
          {/* 左侧工作流导航 */}
          <Col span={6}>
            <Card className="h-full">
              <WorkflowNavigator
                workflow={session?.workflow}
                currentStage={currentStage}
                onStageSelect={switchStage}
              />
            </Card>
          </Col>

          {/* 中间主工作区 */}
          <Col span={12}>
            <Card className="h-full">
              <StageWorkspace
                stage={currentStage}
                exam={exam}
                session={session}
                onStageComplete={handleStageComplete}
              />
            </Card>
          </Col>

          {/* 右侧监控面板 */}
          <Col span={6}>
            <Card className="h-full">
              <MonitoringPanel
                metrics={metrics}
                alerts={alerts}
                onAlertAction={handleAlertAction}
              />
            </Card>
          </Col>
        </Row>
      </Layout.Content>

      {/* 底部操作栏 */}
      <Layout.Footer className="grading-footer">
        <GradingActionBar
          stage={currentStage}
          session={session}
          onPause={handlePause}
          onContinue={handleContinue}
          onComplete={handleComplete}
        />
      </Layout.Footer>
    </Layout>
  );
};

export default GradingCenterView;
```

### 2.2 创建阅卷中心状态管理

```typescript
// src/hooks/useGradingCenter.ts
import { useState, useCallback } from 'react';
import { create } from 'zustand';
import { gradingCenterApi } from '../services/gradingCenterApi';

interface GradingCenterState {
  session: GradingSession | null;
  currentStage: WorkflowStage | null;
  progress: GradingProgress | null;
  metrics: RealTimeMetrics | null;
  alerts: GradingAlert[];
  
  // Actions
  setSession: (session: GradingSession) => void;
  setCurrentStage: (stage: WorkflowStage) => void;
  updateProgress: (progress: GradingProgress) => void;
  updateMetrics: (metrics: RealTimeMetrics) => void;
  addAlert: (alert: GradingAlert) => void;
  removeAlert: (alertId: string) => void;
}

const useGradingCenterStore = create<GradingCenterState>((set, get) => ({
  session: null,
  currentStage: null,
  progress: null,
  metrics: null,
  alerts: [],

  setSession: (session) => set({ session }),
  setCurrentStage: (stage) => set({ currentStage: stage }),
  updateProgress: (progress) => set({ progress }),
  updateMetrics: (metrics) => set({ metrics }),
  addAlert: (alert) => set((state) => ({ 
    alerts: [...state.alerts, alert] 
  })),
  removeAlert: (alertId) => set((state) => ({ 
    alerts: state.alerts.filter(a => a.id !== alertId) 
  }))
}));

export const useGradingCenter = () => {
  const store = useGradingCenterStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startSession = useCallback(async (exam: Exam) => {
    try {
      setLoading(true);
      setError(null);
      
      const session = await gradingCenterApi.startSession(exam.id);
      store.setSession(session);
      
      // 设置初始阶段
      const initialStage = session.workflow.stages[0];
      store.setCurrentStage(initialStage);
      
      // 启动实时监控
      await startRealTimeMonitoring(session.id);
      
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [store]);

  const switchStage = useCallback(async (stageId: string) => {
    if (!store.session) return;
    
    try {
      setLoading(true);
      
      const stage = store.session.workflow.stages.find(s => s.id === stageId);
      if (!stage) throw new Error('Stage not found');
      
      // 验证阶段切换权限
      await gradingCenterApi.validateStageTransition(
        store.session.id,
        store.currentStage?.id,
        stageId
      );
      
      store.setCurrentStage(stage);
      
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [store]);

  const completeStage = useCallback(async (stageId?: string) => {
    if (!store.session || !stageId) return;
    
    try {
      setLoading(true);
      
      const result = await gradingCenterApi.completeStage(
        store.session.id,
        stageId
      );
      
      // 更新进度
      store.updateProgress(result.progress);
      
      // 自动切换到下一阶段
      const nextStage = getNextStage(store.session.workflow, stageId);
      if (nextStage) {
        store.setCurrentStage(nextStage);
      }
      
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [store]);

  const pauseSession = useCallback(async () => {
    if (!store.session) return;
    
    try {
      await gradingCenterApi.pauseSession(store.session.id);
      
      // 更新会话状态
      store.setSession({
        ...store.session,
        status: 'paused'
      });
      
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [store]);

  return {
    ...store,
    loading,
    error,
    startSession,
    switchStage,
    completeStage,
    pauseSession
  };
};
```

### 2.3 创建API服务层

```typescript
// src/services/gradingCenterApi.ts
import { httpClient } from './httpClient';

export interface GradingSession {
  id: string;
  examId: string;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'error';
  workflow: GradingWorkflow;
  currentStageId: string;
  startTime: Date;
  estimatedEndTime: Date;
  statistics: SessionStatistics;
}

export interface GradingWorkflow {
  id: string;
  name: string;
  stages: WorkflowStage[];
  transitions: StageTransition[];
}

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'upload' | 'preprocessing' | 'ai_grading' | 'human_review' | 'quality_check' | 'publishing';
  description: string;
  estimatedDuration: number;
  requiredRoles: string[];
  completionCriteria: CompletionCriteria;
}

class GradingCenterApi {
  private baseUrl = '/api/grading-center';

  async startSession(examId: string): Promise<GradingSession> {
    const response = await httpClient.post(`${this.baseUrl}/sessions`, {
      exam_id: examId
    });
    return this.transformSession(response.data);
  }

  async getSession(sessionId: string): Promise<GradingSession> {
    const response = await httpClient.get(`${this.baseUrl}/sessions/${sessionId}`);
    return this.transformSession(response.data);
  }

  async pauseSession(sessionId: string): Promise<void> {
    await httpClient.post(`${this.baseUrl}/sessions/${sessionId}/pause`);
  }

  async resumeSession(sessionId: string): Promise<void> {
    await httpClient.post(`${this.baseUrl}/sessions/${sessionId}/resume`);
  }

  async completeStage(
    sessionId: string, 
    stageId: string
  ): Promise<StageCompletionResult> {
    const response = await httpClient.post(
      `${this.baseUrl}/sessions/${sessionId}/stages/${stageId}/complete`
    );
    return response.data;
  }

  async validateStageTransition(
    sessionId: string,
    fromStage?: string,
    toStage?: string
  ): Promise<boolean> {
    const response = await httpClient.post(
      `${this.baseUrl}/sessions/${sessionId}/validate-transition`,
      {
        from_stage: fromStage,
        to_stage: toStage
      }
    );
    return response.data.valid;
  }

  async getProgress(sessionId: string): Promise<GradingProgress> {
    const response = await httpClient.get(
      `${this.baseUrl}/sessions/${sessionId}/progress`
    );
    return response.data;
  }

  async getMetrics(sessionId: string): Promise<RealTimeMetrics> {
    const response = await httpClient.get(
      `${this.baseUrl}/sessions/${sessionId}/metrics`
    );
    return response.data;
  }

  async getAlerts(sessionId: string): Promise<GradingAlert[]> {
    const response = await httpClient.get(
      `${this.baseUrl}/sessions/${sessionId}/alerts`
    );
    return response.data;
  }

  async executeStageAction(
    sessionId: string,
    stageId: string,
    action: string,
    params?: any
  ): Promise<ActionResult> {
    const response = await httpClient.post(
      `${this.baseUrl}/sessions/${sessionId}/stages/${stageId}/actions/${action}`,
      params
    );
    return response.data;
  }

  private transformSession(data: any): GradingSession {
    return {
      ...data,
      startTime: new Date(data.start_time),
      estimatedEndTime: new Date(data.estimated_end_time)
    };
  }
}

export const gradingCenterApi = new GradingCenterApi();
```

## 3. 第二阶段：工作区组件实现 (4周)

### 3.1 阶段工作区组件

```typescript
// src/components/grading/StageWorkspace.tsx
import React, { Suspense, lazy } from 'react';
import { Card, Spin, Alert } from 'antd';
import { WorkflowStage, GradingSession, Exam } from '../../types';

// 懒加载各个工作区组件
const UploadWorkspace = lazy(() => import('../workspaces/AnswerSheetUploadWorkspace'));
const PreprocessingWorkspace = lazy(() => import('./PreprocessingWorkspace'));
const AIGradingWorkspace = lazy(() => import('./AIGradingWorkspace'));
const HumanReviewWorkspace = lazy(() => import('./HumanReviewWorkspace'));
const QualityCheckWorkspace = lazy(() => import('./QualityCheckWorkspace'));
const PublishingWorkspace = lazy(() => import('./PublishingWorkspace'));

interface StageWorkspaceProps {
  stage: WorkflowStage | null;
  exam: Exam;
  session: GradingSession | null;
  onStageComplete: () => Promise<void>;
}

const StageWorkspace: React.FC<StageWorkspaceProps> = ({
  stage,
  exam,
  session,
  onStageComplete
}) => {
  if (!stage || !session) {
    return (
      <Alert
        message="阅卷会话未初始化"
        description="请等待系统初始化阅卷会话"
        type="info"
        showIcon
      />
    );
  }

  const renderWorkspace = () => {
    const commonProps = {
      exam,
      session,
      onStageComplete
    };

    switch (stage.type) {
      case 'upload':
        return <UploadWorkspace {...commonProps} />;
      
      case 'preprocessing':
        return <PreprocessingWorkspace {...commonProps} />;
      
      case 'ai_grading':
        return <AIGradingWorkspace {...commonProps} />;
      
      case 'human_review':
        return <HumanReviewWorkspace {...commonProps} />;
      
      case 'quality_check':
        return <QualityCheckWorkspace {...commonProps} />;
      
      case 'publishing':
        return <PublishingWorkspace {...commonProps} />;
      
      default:
        return (
          <Alert
            message="未知的工作阶段"
            description={`阶段类型 "${stage.type}" 暂不支持`}
            type="error"
            showIcon
          />
        );
    }
  };

  return (
    <div className="stage-workspace">
      <div className="workspace-header mb-4">
        <h3>{stage.name}</h3>
        <p className="text-gray-600">{stage.description}</p>
      </div>
      
      <div className="workspace-content">
        <Suspense fallback={
          <div className="flex justify-center items-center py-12">
            <Spin size="large" tip="正在加载工作区..." />
          </div>
        }>
          {renderWorkspace()}
        </Suspense>
      </div>
    </div>
  );
};

export default StageWorkspace;
```

### 3.2 AI评分工作区组件

```typescript
// src/components/grading/AIGradingWorkspace.tsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Progress, 
  Table, 
  Tag, 
  Space, 
  Alert,
  Statistic,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  RobotOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAIGrading } from '../../hooks/useAIGrading';

interface AIGradingWorkspaceProps {
  exam: Exam;
  session: GradingSession;
  onStageComplete: () => Promise<void>;
}

const AIGradingWorkspace: React.FC<AIGradingWorkspaceProps> = ({
  exam,
  session,
  onStageComplete
}) => {
  const {
    gradingProgress,
    confidenceStats,
    routingDecisions,
    startAIGrading,
    pauseGrading,
    resumeGrading,
    retryFailedTasks,
    loading
  } = useAIGrading(session.id);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 自动开始AI评分
    if (session.currentStageId === 'ai_grading' && !gradingProgress) {
      handleStartGrading();
    }
  }, [session]);

  const handleStartGrading = async () => {
    try {
      setIsProcessing(true);
      await startAIGrading();
    } catch (error) {
      console.error('Failed to start AI grading:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteStage = async () => {
    if (gradingProgress?.completion_rate === 100) {
      await onStageComplete();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'orange';
    return 'red';
  };

  const routingColumns = [
    {
      title: '题目',
      dataIndex: 'question_id',
      key: 'question_id'
    },
    {
      title: 'AI置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (
        <Tag color={getConfidenceColor(confidence)}>
          {(confidence * 100).toFixed(1)}%
        </Tag>
      )
    },
    {
      title: '路由决策',
      dataIndex: 'routing_decision',
      key: 'routing_decision',
      render: (decision: string) => {
        const colorMap = {
          'auto_accept': 'green',
          'human_review': 'orange', 
          'expert_arbitration': 'red',
          'quality_check': 'blue'
        };
        return <Tag color={colorMap[decision]}>{decision}</Tag>;
      }
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const iconMap = {
          'completed': <CheckCircleOutlined style={{ color: 'green' }} />,
          'pending': <ExclamationCircleOutlined style={{ color: 'orange' }} />,
          'failed': <ExclamationCircleOutlined style={{ color: 'red' }} />
        };
        return <Space>{iconMap[status]} {status}</Space>;
      }
    }
  ];

  return (
    <div className="ai-grading-workspace">
      <Card>
        <div className="workspace-header mb-6">
          <Row align="middle" justify="space-between">
            <Col>
              <Space align="center">
                <RobotOutlined className="text-2xl text-blue-600" />
                <div>
                  <h3 className="mb-0">AI智能评分</h3>
                  <p className="text-gray-600 mb-0">使用人工智能进行自动评分</p>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                {gradingProgress && gradingProgress.completion_rate < 100 && (
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={retryFailedTasks}
                    disabled={loading}
                  >
                    重试失败任务
                  </Button>
                )}
                <Button
                  type="primary"
                  onClick={handleCompleteStage}
                  disabled={!gradingProgress || gradingProgress.completion_rate < 100}
                >
                  完成AI评分
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 进度概览 */}
        {gradingProgress && (
          <>
            <Row gutter={16} className="mb-6">
              <Col span={6}>
                <Statistic
                  title="总题目数"
                  value={gradingProgress.total_questions}
                  suffix="题"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已完成"
                  value={gradingProgress.completed_questions}
                  suffix="题"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="平均置信度"
                  value={confidenceStats?.average_confidence || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: getConfidenceColor((confidenceStats?.average_confidence || 0) / 100) 
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="完成率"
                  value={gradingProgress.completion_rate}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
            </Row>

            <Progress
              percent={gradingProgress.completion_rate}
              status={gradingProgress.completion_rate === 100 ? 'success' : 'active'}
              className="mb-6"
            />
          </>
        )}

        {/* 置信度分布统计 */}
        {confidenceStats && (
          <>
            <Divider orientation="left">置信度分布</Divider>
            <Row gutter={16} className="mb-6">
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="高置信度 (≥90%)"
                    value={confidenceStats.high_confidence_count}
                    suffix={`/ ${confidenceStats.total_questions}`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="中等置信度 (70-89%)"
                    value={confidenceStats.medium_confidence_count}
                    suffix={`/ ${confidenceStats.total_questions}`}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="低置信度 (<70%)"
                    value={confidenceStats.low_confidence_count}
                    suffix={`/ ${confidenceStats.total_questions}`}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* 路由决策表 */}
        {routingDecisions && (
          <>
            <Divider orientation="left">智能路由决策</Divider>
            <Table
              columns={routingColumns}
              dataSource={routingDecisions}
              size="small"
              pagination={{ pageSize: 10 }}
              rowKey="question_id"
            />
          </>
        )}

        {/* 状态提示 */}
        {!gradingProgress && !loading && (
          <Alert
            message="准备开始AI评分"
            description="点击下方按钮开始AI智能评分过程"
            type="info"
            showIcon
            className="mb-4"
            action={
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleStartGrading}
                loading={isProcessing}
              >
                开始AI评分
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default AIGradingWorkspace;
```

## 4. 第三阶段：模块集成实现 (4周)

### 4.1 更新路由配置

```typescript
// src/AppRouter.tsx - 添加阅卷中心路由
import GradingCenterView from './components/views/GradingCenterView';

// 在现有路由中添加
<Route
  path="/grading-center/:examId?"
  element={
    <ProtectedRoute>
      <MainApplication />
    </ProtectedRoute>
  }
/>
```

### 4.2 更新ContentRouter集成

```typescript
// src/components/layout/ContentRouter.tsx - 更新内容路由
case 'gradingCenter':
  return <GradingCenterView exam={subViewInfo.exam} onBack={handleBack} />;

// 添加处理逻辑
const handleBack = () => {
  setCurrentView('examList');
  setSubViewInfo({ view: null, exam: null, source: null });
};
```

### 4.3 更新Header导航菜单

```typescript
// src/components/layout/Header.tsx - 恢复阅卷中心菜单项
const menuItems = [
  {
    key: 'dashboard',
    icon: <DesktopOutlined />,
    label: '工作台'
  },
  {
    key: 'examManagement',
    icon: <ProfileOutlined />,
    label: '考试管理'
  },
  {
    key: 'gradingCenter',
    icon: <EditOutlined />,
    label: '阅卷中心'
  },
  {
    key: 'dataAnalysis',
    icon: <BarChartOutlined />,
    label: '数据分析'
  }
];

// 更新导航处理逻辑
case 'gradingCenter':
  navigate('/grading-center');
  break;
```

### 4.4 更新ExamManagementView集成

```typescript
// src/components/views/ExamManagementView.tsx - 更新考试操作
const handleExamAction = (exam: Exam) => {
  console.log('Handling exam action for:', exam.name, 'status:', exam.status);

  // 进入新的阅卷中心
  setCurrentView('gradingCenter');
  setSubViewInfo({
    view: null,
    exam,
    source: 'examManagement'
  });
};
```

## 5. 后端API实现

### 5.1 阅卷中心控制器

```python
# backend/api/grading_center.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..services.grading_center_service import GradingCenterService
from ..schemas.grading_center import *
from ..middleware.permissions import require_permission

router = APIRouter(prefix="/api/grading-center", tags=["grading-center"])

@router.post("/sessions", response_model=GradingSessionResponse)
async def create_grading_session(
    request: CreateGradingSessionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grading.create"))
):
    """创建阅卷会话"""
    service = GradingCenterService(db)
    
    try:
        session = await service.create_session(
            exam_id=request.exam_id,
            config=request.config,
            user_id=current_user.id
        )
        return GradingSessionResponse.from_orm(session)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}", response_model=GradingSessionResponse)
async def get_grading_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grading.read"))
):
    """获取阅卷会话信息"""
    service = GradingCenterService(db)
    
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return GradingSessionResponse.from_orm(session)

@router.post("/sessions/{session_id}/stages/{stage_id}/complete")
async def complete_stage(
    session_id: str,
    stage_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grading.execute"))
):
    """完成工作流阶段"""
    service = GradingCenterService(db)
    
    try:
        result = await service.complete_stage(
            session_id=session_id,
            stage_id=stage_id,
            user_id=current_user.id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}/progress", response_model=GradingProgressResponse)
async def get_grading_progress(
    session_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grading.read"))
):
    """获取阅卷进度"""
    service = GradingCenterService(db)
    
    progress = await service.get_progress(session_id)
    return progress

@router.get("/sessions/{session_id}/metrics", response_model=RealTimeMetricsResponse)
async def get_real_time_metrics(
    session_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("grading.read"))
):
    """获取实时指标"""
    service = GradingCenterService(db)
    
    metrics = await service.get_real_time_metrics(session_id)
    return metrics

@router.websocket("/sessions/{session_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket连接用于实时更新"""
    await websocket.accept()
    
    service = GradingCenterService(db)
    await service.handle_websocket_connection(websocket, session_id)
```

### 5.2 阅卷中心服务层

```python
# backend/services/grading_center_service.py
import asyncio
import json
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from fastapi import WebSocket

from ..models.grading_models import GradingSession, WorkflowStage, GradingTask
from .workflow_engine import WorkflowEngine
from .task_manager import TaskManager
from .state_manager import StateManager

class GradingCenterService:
    def __init__(self, db: Session):
        self.db = db
        self.workflow_engine = WorkflowEngine(db)
        self.task_manager = TaskManager(db)
        self.state_manager = StateManager(db)
        self.websocket_connections: Dict[str, List[WebSocket]] = {}

    async def create_session(
        self,
        exam_id: str,
        config: GradingConfig,
        user_id: str
    ) -> GradingSession:
        """创建阅卷会话"""
        
        # 1. 创建工作流
        workflow = await self.workflow_engine.create_workflow(exam_id, config)
        
        # 2. 创建会话
        session = GradingSession(
            exam_id=exam_id,
            workflow_id=workflow.id,
            status='initializing',
            created_by=user_id,
            config=config.dict()
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        # 3. 初始化任务批次
        await self.task_manager.initialize_batch(session.id, exam_id)
        
        # 4. 设置初始状态
        await self.state_manager.set_initial_state(session.id)
        
        # 5. 启动会话监控
        await self._start_session_monitoring(session.id)
        
        return session

    async def complete_stage(
        self,
        session_id: str,
        stage_id: str,
        user_id: str
    ) -> StageCompletionResult:
        """完成工作流阶段"""
        
        session = await self.get_session(session_id)
        if not session:
            raise ValueError("Session not found")
        
        # 1. 验证阶段完成条件
        stage = await self.workflow_engine.get_stage(stage_id)
        completion_valid = await self.workflow_engine.validate_stage_completion(
            stage, session
        )
        
        if not completion_valid:
            raise ValueError("Stage completion criteria not met")
        
        # 2. 执行阶段完成逻辑
        result = await self.workflow_engine.complete_stage(stage_id, session)
        
        # 3. 更新会话状态
        await self.state_manager.update_session_state(
            session_id,
            {'current_stage_id': result.next_stage_id}
        )
        
        # 4. 通知相关模块
        await self._notify_stage_completion(session, stage, result)
        
        # 5. 广播更新给WebSocket连接
        await self._broadcast_progress_update(session_id, result.progress)
        
        return result

    async def get_progress(self, session_id: str) -> GradingProgress:
        """获取阅卷进度"""
        
        session = await self.get_session(session_id)
        if not session:
            raise ValueError("Session not found")
        
        # 从任务管理器获取详细进度
        progress = await self.task_manager.get_batch_progress(session.batch_id)
        
        return progress

    async def get_real_time_metrics(self, session_id: str) -> RealTimeMetrics:
        """获取实时指标"""
        
        # 从缓存或数据库获取最新指标
        metrics = await self.state_manager.get_session_metrics(session_id)
        
        return metrics

    async def handle_websocket_connection(
        self,
        websocket: WebSocket,
        session_id: str
    ):
        """处理WebSocket连接"""
        
        # 添加连接到连接池
        if session_id not in self.websocket_connections:
            self.websocket_connections[session_id] = []
        
        self.websocket_connections[session_id].append(websocket)
        
        try:
            while True:
                # 接收客户端消息
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # 处理不同类型的消息
                await self._handle_websocket_message(session_id, message, websocket)
                
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            # 移除连接
            self.websocket_connections[session_id].remove(websocket)

    async def _broadcast_progress_update(
        self,
        session_id: str,
        progress: GradingProgress
    ):
        """广播进度更新"""
        
        if session_id in self.websocket_connections:
            message = {
                "type": "progress_update",
                "data": progress.dict()
            }
            
            # 向所有连接的客户端发送消息
            for websocket in self.websocket_connections[session_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    # 移除无效连接
                    self.websocket_connections[session_id].remove(websocket)

    async def _notify_stage_completion(
        self,
        session: GradingSession,
        stage: WorkflowStage,
        result: StageCompletionResult
    ):
        """通知阶段完成"""
        
        # 通知考试管理模块
        await self._notify_exam_management(session, stage, result)
        
        # 通知数据分析模块
        await self._notify_data_analysis(session, stage, result)
        
        # 通知工作台
        await self._notify_dashboard(session, stage, result)

    async def _start_session_monitoring(self, session_id: str):
        """启动会话监控"""
        
        # 创建后台任务监控会话状态
        asyncio.create_task(self._monitor_session_health(session_id))
        asyncio.create_task(self._monitor_session_metrics(session_id))
```

## 6. 数据库模型设计

### 6.1 阅卷会话表

```python
# backend/models/grading_models.py
from sqlalchemy import Column, String, DateTime, JSON, Integer, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class GradingSession(Base):
    __tablename__ = "grading_sessions"
    
    id = Column(String, primary_key=True)
    exam_id = Column(String, nullable=False)
    workflow_id = Column(String, nullable=False)
    status = Column(String, nullable=False, default='initializing')
    current_stage_id = Column(String)
    
    # 时间信息
    created_at = Column(DateTime, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    estimated_completion = Column(DateTime)
    
    # 配置信息
    config = Column(JSON)
    
    # 统计信息
    total_sheets = Column(Integer, default=0)
    processed_sheets = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    
    # 质量指标
    average_confidence = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    
    # 创建者
    created_by = Column(String, nullable=False)
    
    # 关联关系
    workflow = relationship("GradingWorkflow", back_populates="sessions")
    tasks = relationship("GradingTask", back_populates="session")
    metrics = relationship("SessionMetrics", back_populates="session")

class GradingWorkflow(Base):
    __tablename__ = "grading_workflows"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    exam_type = Column(String, nullable=False)
    version = Column(String, default='1.0')
    
    # 工作流配置
    stages_config = Column(JSON, nullable=False)
    routing_rules = Column(JSON)
    automation_config = Column(JSON)
    
    # 关联关系
    sessions = relationship("GradingSession", back_populates="workflow")

class GradingTask(Base):
    __tablename__ = "grading_tasks"
    
    id = Column(String, primary_key=True)
    session_id = Column(String, nullable=False)
    batch_id = Column(String, nullable=False)
    
    # 任务信息
    task_type = Column(String, nullable=False)
    priority = Column(Integer, default=1)
    status = Column(String, default='pending')
    
    # 分配信息
    assigned_to = Column(String)
    assigned_at = Column(DateTime)
    deadline = Column(DateTime)
    
    # 处理信息
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    processing_time = Column(Integer)  # 秒
    
    # 结果信息
    result_data = Column(JSON)
    confidence_score = Column(Float)
    needs_review = Column(Boolean, default=False)
    
    # 关联关系
    session = relationship("GradingSession", back_populates="tasks")
```

## 7. 测试策略

### 7.1 单元测试

```typescript
// src/components/views/__tests__/GradingCenterView.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import GradingCenterView from '../GradingCenterView';
import { mockExam, mockGradingSession } from '../../../test/__mocks__';

// Mock API
jest.mock('../../../services/gradingCenterApi');

describe('GradingCenterView', () => {
  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <GradingCenterView exam={mockExam} {...props} />
      </BrowserRouter>
    );
  };

  test('should initialize grading session on mount', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('正在初始化阅卷会话...')).toBeInTheDocument();
    });
  });

  test('should display workflow navigation', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('上传答题卡')).toBeInTheDocument();
      expect(screen.getByText('预处理')).toBeInTheDocument();
      expect(screen.getByText('AI评分')).toBeInTheDocument();
    });
  });

  test('should handle stage completion', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('完成当前阶段')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('完成当前阶段'));
    
    await waitFor(() => {
      expect(screen.getByText('阶段已完成')).toBeInTheDocument();
    });
  });
});
```

### 7.2 集成测试

```python
# backend/tests/test_grading_center_integration.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db
from models.grading_models import Base

# 测试数据库设置
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    
    Base.metadata.drop_all(bind=engine)

def test_complete_grading_workflow(client):
    """测试完整的阅卷工作流程"""
    
    # 1. 创建考试
    exam_response = client.post("/api/exams", json={
        "name": "测试考试",
        "subject": "历史",
        "grade": "高一"
    })
    exam_id = exam_response.json()["id"]
    
    # 2. 创建阅卷会话
    session_response = client.post("/api/grading-center/sessions", json={
        "exam_id": exam_id
    })
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]
    
    # 3. 上传答题卡
    upload_response = client.post(
        f"/api/grading-center/sessions/{session_id}/stages/upload/actions/upload",
        files={"files": ("test.jpg", open("test_files/answer_sheet.jpg", "rb"), "image/jpeg")}
    )
    assert upload_response.status_code == 200
    
    # 4. 完成上传阶段
    complete_response = client.post(
        f"/api/grading-center/sessions/{session_id}/stages/upload/complete"
    )
    assert complete_response.status_code == 200
    
    # 5. 自动进入预处理阶段
    progress_response = client.get(
        f"/api/grading-center/sessions/{session_id}/progress"
    )
    progress = progress_response.json()
    assert progress["current_stage"] == "preprocessing"
    
    # 6. 等待预处理完成
    # (在实际测试中会使用mock或异步等待)
    
    # 7. 验证AI评分阶段
    # ... 继续测试其他阶段
```

## 8. 部署配置

### 8.1 Docker配置更新

```yaml
# docker-compose.yml - 添加阅卷中心服务
version: '3.8'
services:
  zhiyue-frontend:
    build: ./frontend
    ports:
      - "5174:5174"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_WS_URL=ws://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  zhiyue-backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/zhiyue
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - ./storage:/app/storage

  grading-worker:
    build: ./backend
    command: celery -A grading_tasks worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/zhiyue
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - ./storage:/app/storage

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=zhiyue
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 9. 总结

### 9.1 实施要点
1. **渐进式集成**：不破坏现有功能，逐步增强系统能力
2. **模块化设计**：各组件职责清晰，便于维护和扩展  
3. **实时响应**：WebSocket驱动的实时状态同步
4. **智能化决策**：AI置信度驱动的自动化流程控制

### 9.2 关键优势
- **统一入口**：阅卷中心成为所有阅卷活动的协调枢纽
- **流程可视化**：完整的工作流程一目了然
- **智能分流**：基于AI置信度的自动化决策
- **实时监控**：全程进度跟踪和质量监控

### 9.3 预期成果
- **用户体验提升**：从分散操作到统一流程管理
- **效率大幅提高**：自动化程度提升至85%以上
- **质量显著改善**：多层次质量保证机制
- **系统可扩展性**：模块化架构支持功能快速迭代

这个实施方案将让智阅AI系统拥有一个功能完善、流程顺畅的阅卷中心，成为连接各功能模块的核心枢纽。

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "\u5206\u6790\u73b0\u6709\u7cfb\u7edf\u67b6\u6784\u548c\u6a21\u5757\u5173\u7cfb", "status": "completed"}, {"id": "2", "content": "\u8bbe\u8ba1\u65b0\u9605\u5377\u4e2d\u5fc3\u6838\u5fc3\u67b6\u6784", "status": "completed"}, {"id": "3", "content": "\u5b9a\u4e49\u6a21\u5757\u95f4\u5de5\u4f5c\u6d41\u548c\u6570\u636e\u6d41", "status": "completed"}, {"id": "4", "content": "\u521b\u5efa\u8be6\u7ec6\u7684\u5b9e\u65bd\u65b9\u6848", "status": "completed"}]