import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  message,
  Divider,
  Row,
  Col,
  Typography,
  Space,
  Table,
  Tag,
  Progress,
  Alert
} from 'antd';
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ChoiceGrading = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [fileList, setFileList] = useState([]);

  // 默认参考答案（12道选择题）
  const defaultReferenceAnswers = {
    "1": "A",
    "2": "B", 
    "3": "C",
    "4": "D",
    "5": "A",
    "6": "B",
    "7": "C",
    "8": "D",
    "9": "A",
    "10": "B",
    "11": "C",
    "12": "D"
  };

  // 默认分值配置（每题5分）
  const defaultScoreConfig = {
    "1": 5.0, "2": 5.0, "3": 5.0, "4": 5.0,
    "5": 5.0, "6": 5.0, "7": 5.0, "8": 5.0,
    "9": 5.0, "10": 5.0, "11": 5.0, "12": 5.0
  };

  const handleManualGrading = async (values) => {
    setLoading(true);
    try {
      const studentAnswers = {};
      for (let i = 1; i <= 12; i++) {
        if (values[`answer_${i}`]) {
          studentAnswers[i.toString()] = values[`answer_${i}`];
        }
      }

      const response = await axios.post('/api/choice-grading/grade', {
        student_answers: studentAnswers,
        reference_answers: defaultReferenceAnswers,
        score_config: defaultScoreConfig,
        enable_bubble_analysis: false
      });

      if (response.data.success) {
        setGradingResult(response.data.data);
        message.success('评分完成！');
      } else {
        message.error('评分失败');
      }
    } catch (error) {
      console.error('评分错误:', error);
      message.error('评分失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOCRGrading = async () => {
    if (fileList.length === 0) {
      message.error('请先上传答题卡图片');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj);
      formData.append('reference_answers', JSON.stringify(defaultReferenceAnswers));
      formData.append('score_config', JSON.stringify(defaultScoreConfig));
      formData.append('enable_bubble_analysis', 'true');

      const response = await axios.post('/api/choice-grading/grade-with-ocr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setGradingResult(response.data.data.grading_result);
        message.success('OCR识别和评分完成！');
      } else {
        message.error('OCR评分失败');
      }
    } catch (error) {
      console.error('OCR评分错误:', error);
      message.error('OCR评分失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    fileList,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
        return false;
      }
      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    }
  };

  const renderGradingResult = () => {
    if (!gradingResult) return null;

    const columns = [
      {
        title: '题号',
        dataIndex: 'question_number',
        key: 'question_number',
        width: 80,
      },
      {
        title: '学生答案',
        dataIndex: 'student_answer',
        key: 'student_answer',
        width: 100,
        render: (text) => text || '-'
      },
      {
        title: '参考答案',
        dataIndex: 'reference_answer',
        key: 'reference_answer',
        width: 100,
      },
      {
        title: '是否正确',
        dataIndex: 'is_correct',
        key: 'is_correct',
        width: 100,
        render: (correct) => (
          <Tag color={correct ? 'success' : 'error'} icon={correct ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
            {correct ? '正确' : '错误'}
          </Tag>
        )
      },
      {
        title: '得分',
        dataIndex: 'score',
        key: 'score',
        width: 80,
        render: (score) => `${score}分`
      },
      {
        title: '置信度',
        dataIndex: 'confidence',
        key: 'confidence',
        width: 100,
        render: (confidence) => (
          <Progress 
            percent={Math.round(confidence * 100)} 
            size="small" 
            status={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'normal' : 'exception'}
          />
        )
      }
    ];

    const dataSource = gradingResult.question_scores?.map(score => ({
      key: score.question_number,
      question_number: score.question_number,
      student_answer: score.student_answer,
      reference_answer: score.reference_answer,
      is_correct: score.is_correct,
      score: score.score,
      confidence: score.confidence
    })) || [];

    return (
      <Card title="评分结果" style={{ marginTop: 24 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  {gradingResult.total_score || 0}
                </Title>
                <Text type="secondary">总分</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                  {gradingResult.correct_count || 0}
                </Title>
                <Text type="secondary">正确题数</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#f5222d' }}>
                  {gradingResult.incorrect_count || 0}
                </Title>
                <Text type="secondary">错误题数</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#722ed1' }}>
                  {Math.round((gradingResult.accuracy_rate || 0) * 100)}%
                </Title>
                <Text type="secondary">正确率</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {gradingResult.quality_summary && (
          <Alert
            message="质量分析"
            description={gradingResult.quality_summary}
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          bordered
        />
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>选择题快速评分</Title>
      <Text type="secondary">
        支持手动输入答案评分和基于OCR识别的自动评分，适用于12道选择题的快速批改。
      </Text>

      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="手动输入评分" size="small">
            <Form form={form} onFinish={handleManualGrading} layout="vertical">
              <Row gutter={16}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                  <Col span={6} key={num}>
                    <Form.Item
                      label={`第${num}题`}
                      name={`answer_${num}`}
                      rules={[{ pattern: /^[ABCD]$/, message: '请输入A、B、C或D' }]}
                    >
                      <Input placeholder="A/B/C/D" maxLength={1} style={{ textAlign: 'center' }} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  开始评分
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="OCR识别评分" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>上传答题卡图片</Button>
              </Upload>
              
              <Alert
                message="使用说明"
                description="上传清晰的答题卡图片，系统将自动识别选择题答案并进行评分。支持涂卡和手写答案识别。"
                type="info"
                showIcon
              />
              
              <Button 
                type="primary" 
                onClick={handleOCRGrading} 
                loading={loading}
                disabled={fileList.length === 0}
                block
              >
                OCR识别并评分
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />
      
      <Card title="参考答案" size="small">
        <Row gutter={8}>
          {Object.entries(defaultReferenceAnswers).map(([num, answer]) => (
            <Col span={2} key={num}>
              <div style={{ textAlign: 'center', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>第{num}题</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>{answer}</div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {renderGradingResult()}
    </div>
  );
};

export default ChoiceGrading;