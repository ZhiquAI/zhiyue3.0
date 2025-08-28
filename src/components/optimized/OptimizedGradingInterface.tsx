import React, { useState, useMemo } from 'react';
import { Layout, Tabs, Steps, Progress, Typography, Button, Space } from 'antd';
import { 
  FileTextOutlined, 
  CheckCircleOutlined, 
  LoadingOutlined,
  SettingOutlined,
  BarChartOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { cn, layout, cardStyles } from '../../design-system';
import { WorkflowProgressIndicator } from './WorkflowProgressIndicator';
import { ProcessingToolsPanel } from './ProcessingToolsPanel';
import { QualityMonitoringPanel } from './QualityMonitoringPanel';
import { BatchOperationsPanel } from './BatchOperationsPanel';
import { RealTimeStatistics } from './RealTimeStatistics';
import { ProcessingLogs } from './ProcessingLogs';
import { ContextualHelp } from './ContextualHelp';
import { StageRenderer } from './StageRenderer';
import { SystemStatusIndicator } from './SystemStatusIndicator';
import { QuickActions } from './QuickActions';
import { useOptimizedWorkflow } from '../../hooks/useOptimizedWorkflow';
import { useAppContext } from '../../contexts/AppContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

const { Header, Content, Sider, Footer } = Layout;
const { TabPane } = Tabs;
const { Text } = Typography;

interface OptimizedGradingInterfaceProps {
  examId?: string;
}

export const OptimizedGradingInterface: React.FC<OptimizedGradingInterfaceProps> = ({ 
  examId 
}) => {
  const { exams, subViewInfo } = useAppContext();
  const currentExam = subViewInfo.exam || exams.find(e => e.id === examId);
  const { workflowStage, nextStage, progress } = useOptimizedWorkflow(examId);
  const { screenSize, layoutConfig } = useResponsiveLayout();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // 响应式布局配置
  const responsiveConfig = useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return {
          leftSiderWidth: 0,
          rightSiderWidth: 0,
          showSiders: false,
          collapsible: false
        };
      case 'tablet':
        return {
          leftSiderWidth: 250,
          rightSiderWidth: 300,
          showSiders: true,
          collapsible: true
        };
      default:
        return {
          leftSiderWidth: 300,
          rightSiderWidth: 350,
          showSiders: true,
          collapsible: true
        };
    }
  }, [screenSize]);

  const handleStageNavigation = (stage: any) => {
    // 实现阶段导航逻辑
    console.log('Navigate to stage:', stage);
  };

  return (
    <Layout className={cn("optimized-grading-interface", "h-screen")}>
      {/* 顶部工作流进度指示器 */}
      <Header className={cn("workflow-header", "bg-neutral-0 border-b border-neutral-200")} style={{ 
        padding: layoutConfig.headerPadding
      }}>
        <div className={cn(layout.flex.between(), "h-full")}>
          <div style={{ flex: 1 }}>
            <WorkflowProgressIndicator 
              currentStage={workflowStage}
              progress={progress}
              onStageClick={handleStageNavigation}
              compact={screenSize === 'mobile'}
            />
          </div>
          <QuickActions />
        </div>
      </Header>
      
      {/* 主工作区 */}
      <Content className={cn("main-workspace", "overflow-hidden")}>
        <Layout className="h-full">
          {/* 左侧工具面板 */}
          {responsiveConfig.showSiders && (
            <Sider 
              width={responsiveConfig.leftSiderWidth}
              collapsible={responsiveConfig.collapsible}
              collapsed={leftPanelCollapsed}
              onCollapse={setLeftPanelCollapsed}
              className={cn("tools-panel", "bg-neutral-50 border-r border-neutral-200")}
            >
              <Tabs 
                defaultActiveKey="processing" 
                size="small"
                className="h-full"
                tabBarStyle={{ padding: '0 16px' }}
              >
                <TabPane 
                  tab={
                    <span>
                      <SettingOutlined />
                      {!leftPanelCollapsed && '处理工具'}
                    </span>
                  } 
                  key="processing"
                >
                  <ProcessingToolsPanel 
                    examId={examId}
                    compact={leftPanelCollapsed}
                  />
                </TabPane>
                <TabPane 
                  tab={
                    <span>
                      <BarChartOutlined />
                      {!leftPanelCollapsed && '质量监控'}
                    </span>
                  } 
                  key="quality"
                >
                  <QualityMonitoringPanel 
                    examId={examId}
                    compact={leftPanelCollapsed}
                  />
                </TabPane>
                <TabPane 
                  tab={
                    <span>
                      <TeamOutlined />
                      {!leftPanelCollapsed && '批量操作'}
                    </span>
                  } 
                  key="batch"
                >
                  <BatchOperationsPanel 
                    examId={examId}
                    compact={leftPanelCollapsed}
                  />
                </TabPane>
              </Tabs>
            </Sider>
          )}
          
          {/* 中央工作区 */}
          <Content 
            className={cn("central-workspace", "bg-neutral-0", "overflow-auto")}
            style={{ 
              padding: layoutConfig.contentPadding
            }}
          >
            <StageRenderer 
              stage={workflowStage} 
              examId={examId}
              screenSize={screenSize}
            />
          </Content>
          
          {/* 右侧信息面板 */}
          {responsiveConfig.showSiders && (
            <Sider 
              width={responsiveConfig.rightSiderWidth}
              collapsible={responsiveConfig.collapsible}
              collapsed={rightPanelCollapsed}
              onCollapse={setRightPanelCollapsed}
              className={cn("info-panel", "bg-neutral-50 border-l border-neutral-200")}
            >
              <Tabs 
                defaultActiveKey="stats" 
                size="small"
                className="h-full"
                tabBarStyle={{ padding: '0 16px' }}
              >
                <TabPane 
                  tab={
                    <span>
                      <BarChartOutlined />
                      {!rightPanelCollapsed && '实时统计'}
                    </span>
                  } 
                  key="stats"
                >
                  <RealTimeStatistics 
                    examId={examId}
                    compact={rightPanelCollapsed}
                  />
                </TabPane>
                <TabPane 
                  tab={
                    <span>
                      <FileTextOutlined />
                      {!rightPanelCollapsed && '处理日志'}
                    </span>
                  } 
                  key="logs"
                >
                  <ProcessingLogs 
                    examId={examId}
                    compact={rightPanelCollapsed}
                  />
                </TabPane>
                <TabPane 
                  tab={
                    <span>
                      <CheckCircleOutlined />
                      {!rightPanelCollapsed && '帮助指南'}
                    </span>
                  } 
                  key="help"
                >
                  <ContextualHelp 
                    currentStage={workflowStage}
                    compact={rightPanelCollapsed}
                  />
                </TabPane>
              </Tabs>
            </Sider>
          )}
        </Layout>
      </Content>
      
      {/* 底部状态栏 */}
      <Footer 
        className={cn("status-bar", "bg-neutral-100 border-t border-neutral-200")}
        style={{ 
          padding: '8px 16px',
          height: 'auto'
        }}
      >
        <div className={cn(
          layout.flex.between(), 
          screenSize === 'mobile' ? 'flex-wrap' : 'flex-nowrap'
        )}>
          <SystemStatusIndicator compact={screenSize === 'mobile'} />
          <div style={{ flex: 1, margin: '0 16px' }}>
            <Progress
              percent={progress.overall}
              size="small"
              showInfo={screenSize !== 'mobile'}
              status={progress.status}
            />
          </div>
          <Space>
            <Text type="secondary">
              {screenSize !== 'mobile' && '进度: '}
              {progress.processed}/{progress.total}
            </Text>
            {screenSize !== 'mobile' && (
              <Text type="secondary">
                速度: {progress.speed} 份/分钟
              </Text>
            )}
          </Space>
        </div>
      </Footer>
    </Layout>
  );
};

export default OptimizedGradingInterface;