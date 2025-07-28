import React from 'react';
import { Card, Progress, Tag, Alert, Descriptions, List, Tooltip } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface BubbleSheetAnalysisProps {
  bubbleAnalysis?: {
    total_bubbles_detected: number;
    filled_bubbles: number;
    unclear_bubbles: number;
    quality_issues: string[];
  };
  bubbleQualityScore?: number;
  bubbleValidation?: {
    is_consistent: boolean;
    inconsistencies: string[];
    recommendations: string[];
  };
}

const BubbleSheetAnalysis: React.FC<BubbleSheetAnalysisProps> = ({
  bubbleAnalysis,
  bubbleQualityScore,
  bubbleValidation
}) => {
  if (!bubbleAnalysis) {
    return null;
  }

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getQualityText = (score: number) => {
    if (score >= 0.8) return '优秀';
    if (score >= 0.6) return '良好';
    return '需要改进';
  };

  return (
    <div className="bubble-sheet-analysis">
      <Card title="涂卡识别分析" size="small" style={{ marginBottom: 16 }}>
        {/* 整体质量评分 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ marginRight: 8 }}>涂卡质量评分:</span>
            <Progress
              percent={Math.round((bubbleQualityScore || 0) * 100)}
              status={getQualityColor(bubbleQualityScore || 0) as any}
              size="small"
              style={{ flex: 1, marginRight: 8 }}
            />
            <Tag color={getQualityColor(bubbleQualityScore || 0)}>
              {getQualityText(bubbleQualityScore || 0)}
            </Tag>
          </div>
        </div>

        {/* 涂卡统计 */}
        <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="检测到涂卡">
            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
              {bubbleAnalysis.total_bubbles_detected}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="已填涂">
            <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
              {bubbleAnalysis.filled_bubbles}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="不清晰">
            <span style={{ fontWeight: 'bold', color: '#faad14' }}>
              {bubbleAnalysis.unclear_bubbles}
            </span>
          </Descriptions.Item>
        </Descriptions>

        {/* 填涂率 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ marginRight: 8 }}>填涂完成率:</span>
            <Progress
              percent={bubbleAnalysis.total_bubbles_detected > 0 
                ? Math.round((bubbleAnalysis.filled_bubbles / bubbleAnalysis.total_bubbles_detected) * 100)
                : 0
              }
              size="small"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        {/* 质量问题 */}
        {bubbleAnalysis.quality_issues && bubbleAnalysis.quality_issues.length > 0 && (
          <Alert
            message="涂卡质量问题"
            description={
              <List
                size="small"
                dataSource={bubbleAnalysis.quality_issues}
                renderItem={(item) => (
                  <List.Item style={{ padding: '4px 0', border: 'none' }}>
                    <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    {item}
                  </List.Item>
                )}
              />
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 验证结果 */}
        {bubbleValidation && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ marginRight: 8 }}>答案一致性:</span>
              {bubbleValidation.is_consistent ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  一致
                </Tag>
              ) : (
                <Tag icon={<ExclamationCircleOutlined />} color="warning">
                  存在问题
                </Tag>
              )}
            </div>

            {/* 不一致问题 */}
            {bubbleValidation.inconsistencies && bubbleValidation.inconsistencies.length > 0 && (
              <Alert
                message="发现不一致问题"
                description={
                  <List
                    size="small"
                    dataSource={bubbleValidation.inconsistencies}
                    renderItem={(item) => (
                      <List.Item style={{ padding: '4px 0', border: 'none' }}>
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                        {item}
                      </List.Item>
                    )}
                  />
                }
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}

            {/* 建议 */}
            {bubbleValidation.recommendations && bubbleValidation.recommendations.length > 0 && (
              <Alert
                message="处理建议"
                description={
                  <List
                    size="small"
                    dataSource={bubbleValidation.recommendations}
                    renderItem={(item) => (
                      <List.Item style={{ padding: '4px 0', border: 'none' }}>
                        <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                        {item}
                      </List.Item>
                    )}
                  />
                }
                type="info"
                showIcon
              />
            )}
          </div>
        )}
      </Card>

      {/* 涂卡识别说明 */}
      <Card title="涂卡识别说明" size="small">
        <div style={{ fontSize: '12px', color: '#666' }}>
          <p><strong>涂卡识别技术：</strong></p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>使用AI视觉识别技术自动检测涂卡区域</li>
            <li>支持圆形和方形涂卡格式</li>
            <li>自动分析涂黑程度和填涂质量</li>
            <li>检测擦除痕迹和重复涂卡</li>
          </ul>
          
          <p style={{ marginTop: 12 }}><strong>质量评分标准：</strong></p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>优秀(80-100分)：涂卡规范，识别清晰</li>
            <li>良好(60-79分)：涂卡基本规范，少量问题</li>
            <li>需要改进(0-59分)：涂卡不规范，建议重新填涂</li>
          </ul>
          
          <p style={{ marginTop: 12 }}><strong>注意事项：</strong></p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>请使用2B铅笔完全涂黑选项</li>
            <li>涂卡时不要超出边界</li>
            <li>如需修改，请用橡皮擦干净后重新涂卡</li>
            <li>保持答题卡清洁，避免污损</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default BubbleSheetAnalysis;