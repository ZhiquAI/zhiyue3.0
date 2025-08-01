import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Alert, Row, Col, Modal } from 'antd';
import { message } from '../../utils/message';
import apiClient from '../../services/api';
import QuestionSegmentationViewer from './QuestionSegmentationViewer';
import LoadingSpinner from '../common/LoadingSpinner';
import { ExclamationCircleOutlined, CloseOutlined } from '@ant-design/icons';

const { Option } = Select;

interface QuestionSegmentationWorkspaceProps {
  visible: boolean;
  answerSheet: {
    id: string;
    filename: string;
    previewUrl: string;
    studentInfo?: any;
  };
  onSave: (result: any) => void;
  onClose: () => void;
  existingResult?: any;
}

const QuestionSegmentationWorkspace: React.FC<QuestionSegmentationWorkspaceProps> = ({ 
  visible, 
  answerSheet, 
  onSave, 
  onClose, 
  existingResult 
}) => {
  const [segmentationInfo, setSegmentationInfo] = useState<any>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentationType, setSegmentationType] = useState<string>('subjective');

  useEffect(() => {
    // 使用一个局部变量来存储临时的 Blob URL
    let objectUrl: string | null = null;

    const fetchSegmentationData = async () => {
      if (!answerSheet?.id) return;

      setIsLoading(true);
      setError(null);
      setSegmentationInfo(null); // 重置旧数据
      setImageUrl(''); // 重置图片

      try {
        // 直接使用 previewUrl 作为图片地址
        setImageUrl(answerSheet.previewUrl);
          objectUrl = answerSheet.previewUrl; // 保存 Blob URL 以便后续释放
        
        // 获取分割信息
        const segmentationResponse = await apiClient.get(`/segmentation/${answerSheet.id}`);
        setSegmentationInfo(segmentationResponse.data);

      } catch (err: any) {
        console.error("加载分割数据时出错:", err);
        let errorMessage = "无法加载试题数据。";
        if (err.response) {
            if (err.response.status === 401) {
                errorMessage = "认证失败，请重新登录。";
            } else if (err.response.status === 404) {
                errorMessage = "找不到对应的文件资源。";
            }
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSegmentationData();

    // 组件卸载时的清理函数
    return () => {
      if (objectUrl) {
        // 释放之前创建的 Blob URL，防止内存泄漏
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [answerSheet?.id, answerSheet?.previewUrl]); // 仅当 answerSheet 变化时重新执行

  const handleSelectQuestion = (id: string) => {
     setSelectedQuestionId(id);
   };

  const handleSave = async () => {
     if (!segmentationInfo) {
       message.error('没有可保存的分割信息。');
       return;
     }
     try {
       setIsLoading(true);
       await apiClient.post(`/segmentation/${answerSheet.id}`, segmentationInfo);
       message.success('分割信息已成功保存！');
       onSave(segmentationInfo);
     } catch (err) {
       message.error('保存失败，请稍后重试。');
       console.error("保存分割信息失败:", err);
     } finally {
       setIsLoading(false);
     }
   };
  
  const selectedQuestion = segmentationInfo?.questions.find((q: any) => q.id === selectedQuestionId);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <Alert
        message="加载错误"
        description={error}
        type="error"
        icon={<ExclamationCircleOutlined />}
        style={{ margin: 16 }}
      />
    );
  }

  return (
    <Modal
      title={`题目分割工作台 - ${answerSheet?.filename || '未知文件'}`}
      open={visible}
      onCancel={onClose}
      width={1200}
      style={{ top: 20 }}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button 
          key="save" 
          type="primary"
          onClick={handleSave} 
          disabled={isLoading}
          loading={isLoading}
        >
          保存分割
        </Button>
      ]}
    >
      <Row gutter={16} style={{ height: '70vh' }}>
        <Col span={16}>
          <Card title="答题卡预览" style={{ height: '100%' }}>
            {imageUrl ? (
               <div style={{ position: 'relative', height: '100%' }}>
                 <img 
                   src={imageUrl} 
                   alt="答题卡预览" 
                   style={{ 
                     width: '100%', 
                     height: 'auto', 
                     maxHeight: '500px', 
                     objectFit: 'contain' 
                   }} 
                 />
                 {segmentationInfo?.questions && (
                   <div style={{ 
                     position: 'absolute', 
                     top: 10, 
                     right: 10, 
                     background: 'rgba(255,255,255,0.9)', 
                     padding: '8px 12px', 
                     borderRadius: '4px',
                     fontSize: '12px'
                   }}>
                     共检测到 {segmentationInfo.questions.length} 个题目区域
                   </div>
                 )}
               </div>
             ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '400px',
                color: '#666'
              }}>
                <p>正在加载答题卡预览...</p>
              </div>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="题目信息" style={{ height: '100%' }}>
            {selectedQuestion ? (
              <div>
                <p><strong>题目 ID:</strong> {selectedQuestion.id}</p>
                <p><strong>题目类型:</strong> {selectedQuestion.type}</p>
                {/* 可以添加更多题目信息的编辑功能 */}
              </div>
            ) : (
              <p>请在左侧预览中选择一个题目区域。</p>
            )}
            <div style={{ marginTop: 16 }}>
              <Select 
                value={segmentationType} 
                onChange={setSegmentationType}
                style={{ width: '100%' }}
                placeholder="选择分割类型"
              >
                <Option value="subjective">主观题</Option>
                <Option value="objective">客观题</Option>
                <Option value="student_info">学生信息</Option>
              </Select>
            </div>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default QuestionSegmentationWorkspace;