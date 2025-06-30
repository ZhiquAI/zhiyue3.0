// AI评分面板组件
import React, { useState } from 'react';
import { Card, Button, Progress, Alert, Divider, Tag, Space, Tooltip } from 'antd';
import { Brain, Zap, Target, BookOpen, MessageSquare } from 'lucide-react';
import { useGeminiAI } from '../../hooks/useGeminiAI';
import GeminiStatusIndicator from './GeminiStatusIndicator';

interface AIGradingPanelProps {
  question: {
    id: string;
    content: string;
    referenceAnswer: string;
    rubric: any;
  };
  studentAnswer: string;
  onGradingComplete: (result: any) => void;
}

const AIGradingPanel: React.FC<AIGradingPanelProps> = ({
  question,
  studentAnswer,
  onGradingComplete
}) => {
  const { gradeQuestion, isGradingLoading, isHealthy } = useGeminiAI();
  const [gradingResult, setGradingResult] = useState<any>(null);

  const handleAIGrading = async () => {
    try {
      const result = await gradeQuestion({
        question: question.content,
        referenceAnswer: question.referenceAnswer,
        rubric: question.rubric,
        studentAnswer
      });
      
      setGradingResult(result);
      onGradingComplete(result);
    } catch (error) {
      console.error('AI grading failed:', error);
    }
  };

  const renderGradingResult = () => {
    if (!gradingResult) return null;

    return (
      <div className="space-y-4">
        <Divider orientation="left">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <span>AI评分结果</span>
          </div>
        </Divider>
        
        {/* 总分显示 */}
        <Card size="small" className="bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <span className="font-medium">AI建议总分</span>
            <div className="text-2xl font-bold text-purple-600">
              {gradingResult.totalScore}
            </div>
          </div>
        </Card>

        {/* 维度评分 */}
        <div className="space-y-3">
          {gradingResult.dimensions.map((dim: any, index: number) => (
            <Card key={index} size="small" className="border-l-4 border-l-blue-500">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dim.name}</span>
                  <Tag color="blue">{dim.score}/{dim.maxScore}</Tag>
                </div>
                <Progress 
                  percent={(dim.score / dim.maxScore) * 100} 
                  size="small"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <p className="text-sm text-gray-600 mb-0">{dim.reason}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* AI反馈 */}
        {gradingResult.feedback && (
          <Alert
            message="AI评价反馈"
            description={gradingResult.feedback}
            type="info"
            showIcon
            icon={<MessageSquare className="w-4 h-4" />}
          />
        )}
      </div>
    );
  };

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <span>AI智能评分</span>
          </div>
          <GeminiStatusIndicator showLabel size="small" />
        </div>
      }
      className="h-full"
    >
      <div className="space-y-4">
        {/* AI功能说明 */}
        <Alert
          message="AI评分助手"
          description="基于Gemini 2.5 Pro的智能评分，结合历史学科特点进行多维度分析"
          type="info"
          showIcon
          className="mb-4"
        />

        {/* 评分按钮 */}
        <div className="flex gap-2">
          <Button
            type="primary"
            icon={<Zap className="w-4 h-4" />}
            loading={isGradingLoading}
            disabled={!isHealthy || !studentAnswer.trim()}
            onClick={handleAIGrading}
            className="flex-1"
          >
            {isGradingLoading ? 'AI评分中...' : '开始AI评分'}
          </Button>
          
          <Tooltip title="AI评分功能特点">
            <Button 
              icon={<Target className="w-4 h-4" />}
              disabled
            >
              多维度
            </Button>
          </Tooltip>
        </div>

        {/* 功能特点 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <BookOpen className="w-3 h-3" />
            <span>知识点识别</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Target className="w-3 h-3" />
            <span>论证分析</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <MessageSquare className="w-3 h-3" />
            <span>语言评价</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Brain className="w-3 h-3" />
            <span>智能建议</span>
          </div>
        </div>

        {/* 评分结果 */}
        {renderGradingResult()}

        {/* 服务状态提示 */}
        {!isHealthy && (
          <Alert
            message="AI服务不可用"
            description="当前使用本地评分算法，功能可能受限"
            type="warning"
            showIcon
            className="mt-4"
          />
        )}
      </div>
    </Card>
  );
};

export default AIGradingPanel;