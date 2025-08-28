import React from 'react';
import { Card, Empty, Button, Space, Typography } from 'antd';
import { 
  UploadOutlined, 
  ScanOutlined, 
  CheckCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface WorkflowStage {
  id: string;
  title: string;
  description: string;
  index: number;
}

interface StageRendererProps {
  stage: WorkflowStage;
  examId?: string;
  screenSize?: string;
}

export const StageRenderer: React.FC<StageRendererProps> = ({
  stage,
  examId,
  screenSize = 'desktop'
}) => {
  const renderStageContent = () => {
    switch (stage.id) {
      case 'upload':
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <UploadOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={3}>文件上传阶段</Title>
              <Text type="secondary">
                请上传答题卡文件进行处理。支持 PDF、JPG、PNG、TIFF 格式。
              </Text>
              
              <div style={{ marginTop: '32px' }}>
                <Button type="primary" size="large" icon={<UploadOutlined />}>
                  选择文件上传
                </Button>
              </div>
              
              <div style={{ marginTop: '24px', textAlign: 'left', maxWidth: '400px', margin: '24px auto 0' }}>
                <Text strong>支持格式：</Text>
                <ul style={{ marginTop: '8px' }}>
                  <li>PDF文档 (*.pdf)</li>
                  <li>JPEG图片 (*.jpg, *.jpeg)</li>
                  <li>PNG图片 (*.png)</li>
                  <li>TIFF图片 (*.tiff)</li>
                </ul>
                
                <Text strong style={{ marginTop: '16px', display: 'block' }}>文件要求：</Text>
                <ul style={{ marginTop: '8px' }}>
                  <li>单个文件不超过50MB</li>
                  <li>图片分辨率建议300DPI以上</li>
                  <li>答题卡图像清晰，无严重倾斜</li>
                </ul>
              </div>
            </div>
          </Card>
        );

      case 'preprocessing':
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <ScanOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={3}>智能预处理阶段</Title>
              <Text type="secondary">
                系统正在进行OCR文字识别和图像预处理...
              </Text>
              
              <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '500px', margin: '32px auto 0' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>图像质量检测</Text>
                    <Text style={{ color: '#52c41a' }}>✓ 完成</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>OCR文字识别</Text>
                    <Text style={{ color: '#1890ff' }}>⏳ 处理中</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>版面结构分析</Text>
                    <Text style={{ color: '#d9d9d9' }}>⏸ 等待中</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>学生信息提取</Text>
                    <Text style={{ color: '#d9d9d9' }}>⏸ 等待中</Text>
                  </div>
                </Space>
              </div>
            </div>
          </Card>
        );

      case 'validation':
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircleOutlined style={{ fontSize: '48px', color: '#faad14', marginBottom: '16px' }} />
              <Title level={3}>数据验证阶段</Title>
              <Text type="secondary">
                验证预处理结果的准确性和完整性
              </Text>
              
              <div style={{ marginTop: '32px' }}>
                <Space>
                  <Button type="primary">确认结果</Button>
                  <Button>重新处理</Button>
                  <Button type="link">查看详情</Button>
                </Space>
              </div>
            </div>
          </Card>
        );

      case 'grading':
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <EditOutlined style={{ fontSize: '48px', color: '#722ed1', marginBottom: '16px' }} />
              <Title level={3}>智能阅卷阶段</Title>
              <Text type="secondary">
                AI正在进行智能评分，请稍候...
              </Text>
              
              <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '500px', margin: '32px auto 0' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>客观题评分</Text>
                    <Text style={{ color: '#52c41a' }}>✓ 已完成 (45/45)</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>主观题AI评分</Text>
                    <Text style={{ color: '#1890ff' }}>⏳ 进行中 (12/20)</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>评分质量检查</Text>
                    <Text style={{ color: '#d9d9d9' }}>⏸ 等待中</Text>
                  </div>
                </Space>
              </div>
            </div>
          </Card>
        );

      case 'review':
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <FileTextOutlined style={{ fontSize: '48px', color: '#eb2f96', marginBottom: '16px' }} />
              <Title level={3}>质量复核阶段</Title>
              <Text type="secondary">
                对评分结果进行质量复核和确认
              </Text>
              
              <div style={{ marginTop: '32px' }}>
                <Space>
                  <Button type="primary">开始复核</Button>
                  <Button>查看异常项</Button>
                  <Button type="link">跳过复核</Button>
                </Space>
              </div>
            </div>
          </Card>
        );

      case 'analysis':
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <BarChartOutlined style={{ fontSize: '48px', color: '#13c2c2', marginBottom: '16px' }} />
              <Title level={3}>数据分析阶段</Title>
              <Text type="secondary">
                生成详细的分析报告和统计图表
              </Text>
              
              <div style={{ marginTop: '32px' }}>
                <Space>
                  <Button type="primary">查看报告</Button>
                  <Button>导出数据</Button>
                  <Button type="link">分享结果</Button>
                </Space>
              </div>
            </div>
          </Card>
        );

      default:
        return (
          <Card>
            <Empty 
              description="当前阶段内容正在开发中" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        );
    }
  };

  return (
    <div style={{ 
      padding: screenSize === 'mobile' ? '16px' : '24px',
      height: '100%',
      overflow: 'auto'
    }}>
      {renderStageContent()}
    </div>
  );
};

export default StageRenderer;