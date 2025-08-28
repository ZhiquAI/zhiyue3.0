import React from 'react';
import { Card, Typography, Steps, Alert, Collapse, Space, Button } from 'antd';
import {
  QuestionCircleOutlined,
  BookOutlined,
  VideoCameraOutlined,
  CustomerServiceOutlined,
  BulbOutlined
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

interface WorkflowStage {
  id: string;
  title: string;
}

interface ContextualHelpProps {
  currentStage?: WorkflowStage;
  compact?: boolean;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  currentStage,
  compact = false
}) => {
  const getStageHelp = (stageId?: string) => {
    const helpContent = {
      upload: {
        title: '文件上传帮助',
        tips: [
          '支持PDF、JPG、PNG、TIFF格式文件',
          '单个文件大小不超过50MB',
          '建议图片分辨率300DPI以上',
          '确保答题卡图像清晰、完整'
        ],
        steps: [
          '点击上传按钮或拖拽文件到上传区域',
          '等待文件验证完成',
          '查看上传结果和文件列表',
          '继续上传更多文件或开始处理'
        ]
      },
      preprocessing: {
        title: '智能预处理帮助',
        tips: [
          'OCR识别需要一定时间，请耐心等待',
          '系统会自动检测和修正图像倾斜',
          '识别过程中请勿关闭浏览器',
          '可以实时查看处理进度和状态'
        ],
        steps: [
          '系统自动进行图像质量检测',
          '使用AI技术进行OCR文字识别',
          '分析答题卡版面结构',
          '提取学生信息和答题内容'
        ]
      },
      validation: {
        title: '数据验证帮助',
        tips: [
          '仔细检查识别结果的准确性',
          '发现错误可以手动修正',
          '验证学生信息是否正确',
          '确认后才能进入评分阶段'
        ],
        steps: [
          '查看OCR识别结果',
          '核对学生身份信息',
          '检查答题内容识别准确性',
          '确认无误后进入下一步'
        ]
      },
      grading: {
        title: '智能阅卷帮助',
        tips: [
          '客观题会自动快速评分',
          '主观题使用AI智能评分',
          '可以查看AI评分的置信度',
          '评分过程支持暂停和继续'
        ],
        steps: [
          '客观题自动识别和评分',
          'AI分析主观题答案内容',
          '生成多维度评分结果',
          '进行评分质量检查'
        ]
      },
      review: {
        title: '质量复核帮助',
        tips: [
          '重点关注低置信度的评分结果',
          '可以调整AI给出的分数',
          '建议多人复核重要考试',
          '复核完成后结果不可更改'
        ],
        steps: [
          '查看需要复核的答题卡',
          '逐一检查评分准确性',
          '必要时调整分数和评语',
          '确认所有复核完成'
        ]
      },
      analysis: {
        title: '数据分析帮助',
        tips: [
          '可以生成多种统计报表',
          '支持导出Excel和PDF格式',
          '可以按班级、学生等维度分析',
          '图表支持交互式查看'
        ],
        steps: [
          '选择需要的分析维度',
          '查看自动生成的统计图表',
          '导出详细的分析报告',
          '分享结果给相关人员'
        ]
      }
    };

    return helpContent[stageId] || {
      title: '系统帮助',
      tips: [
        '智阅AI是专业的智能阅卷系统',
        '支持客观题和主观题自动评分',
        '提供完整的阅卷工作流程',
        '确保评分结果准确可靠'
      ],
      steps: [
        '上传答题卡文件',
        '进行智能预处理',
        'AI自动评分',
        '质量复核确认'
      ]
    };
  };

  const currentHelp = getStageHelp(currentStage?.id);

  const commonQuestions = [
    {
      key: 'upload',
      label: '如何上传文件？',
      children: (
        <div>
          <Paragraph>
            您可以通过以下方式上传答题卡文件：
          </Paragraph>
          <ul>
            <li>点击"选择文件"按钮选择本地文件</li>
            <li>直接拖拽文件到上传区域</li>
            <li>支持批量选择多个文件</li>
          </ul>
        </div>
      )
    },
    {
      key: 'format',
      label: '支持哪些文件格式？',
      children: (
        <div>
          <Paragraph>系统支持以下格式：</Paragraph>
          <ul>
            <li>PDF文档 (.pdf)</li>
            <li>JPEG图片 (.jpg, .jpeg)</li>
            <li>PNG图片 (.png)</li>
            <li>TIFF图片 (.tiff, .tif)</li>
          </ul>
          <Alert
            message="建议使用高分辨率图片以获得更好的识别效果"
            type="info"
            showIcon
            size="small"
          />
        </div>
      )
    },
    {
      key: 'accuracy',
      label: '如何提高识别准确率？',
      children: (
        <div>
          <ul>
            <li>确保图像清晰，避免模糊</li>
            <li>保持答题卡平整，减少褶皱</li>
            <li>使用300DPI以上扫描分辨率</li>
            <li>避免强光反射和阴影</li>
            <li>确保答题卡完整，无遮挡</li>
          </ul>
        </div>
      )
    },
    {
      key: 'ai',
      label: 'AI评分准确吗？',
      children: (
        <div>
          <Paragraph>
            智阅AI使用先进的机器学习技术：
          </Paragraph>
          <ul>
            <li>客观题识别准确率达99%以上</li>
            <li>主观题评分综合考虑多个维度</li>
            <li>提供评分置信度参考</li>
            <li>支持人工复核和调整</li>
          </ul>
        </div>
      )
    }
  ];

  if (compact) {
    return (
      <div style={{ padding: '8px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '12px' }}>
            {currentHelp.title}
          </Text>
          
          <div>
            <Text style={{ fontSize: '11px' }}>快速提示:</Text>
            {currentHelp.tips.slice(0, 2).map((tip, index) => (
              <div key={index} style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                • {tip}
              </div>
            ))}
          </div>
          
          <Button type="link" size="small" style={{ padding: 0, height: 'auto' }}>
            查看详细帮助
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Title level={5} style={{ margin: 0 }}>帮助指南</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            使用帮助和操作指导
          </Text>
        </div>

        {/* 当前阶段帮助 */}
        {currentStage && (
          <Card size="small" title={currentHelp.title} extra={<BulbOutlined />}>
            <Alert
              message="操作提示"
              description={
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {currentHelp.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              }
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <div>
              <Text strong>操作步骤：</Text>
              <Steps
                direction="vertical"
                size="small"
                current={-1}
                style={{ marginTop: '12px' }}
              >
                {currentHelp.steps.map((step, index) => (
                  <Step key={index} title={step} />
                ))}
              </Steps>
            </div>
          </Card>
        )}

        {/* 常见问题 */}
        <Card size="small" title="常见问题" extra={<QuestionCircleOutlined />}>
          <Collapse ghost size="small">
            {commonQuestions.map(item => (
              <Panel header={item.label} key={item.key}>
                {item.children}
              </Panel>
            ))}
          </Collapse>
        </Card>

        {/* 快速链接 */}
        <Card size="small" title="更多帮助">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="link" icon={<BookOutlined />} style={{ paddingLeft: 0 }}>
              完整用户手册
            </Button>
            
            <Button type="link" icon={<VideoCameraOutlined />} style={{ paddingLeft: 0 }}>
              视频教程
            </Button>
            
            <Button type="link" icon={<CustomerServiceOutlined />} style={{ paddingLeft: 0 }}>
              联系技术支持
            </Button>
          </Space>
        </Card>

        {/* 快捷键说明 */}
        <Card size="small" title="快捷键">
          <Space direction="vertical" style={{ width: '100%', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>刷新页面</Text>
              <Text code>F5</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>全屏显示</Text>
              <Text code>F11</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>打开帮助</Text>
              <Text code>F1</Text>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ContextualHelp;