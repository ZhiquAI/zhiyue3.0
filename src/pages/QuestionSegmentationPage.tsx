import React, { useState } from 'react';
import { Card, Button, Upload, message, Row, Col } from 'antd';
import { UploadOutlined, FileImageOutlined } from '@ant-design/icons';
import QuestionSegmentation from '../components/QuestionSegmentation';
import type { QuestionRegion } from '../components/QuestionSegmentation';

const QuestionSegmentationPage: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [sheetInfo, setSheetInfo] = useState({
    filename: '',
    studentName: '',
    studentId: ''
  });

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageUrl(e.target.result as string);
        setSheetInfo({
          filename: file.name,
          studentName: '',
          studentId: ''
        });
        setVisible(true);
      }
    };
    reader.readAsDataURL(file);
    return false; // 阻止默认上传行为
  };

  const handleSave = (regions: QuestionRegion[]) => {
    console.log('保存的题目区域:', regions);
    message.success(`成功保存 ${regions.length} 个题目区域`);
    setVisible(false);
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Card title="试题分类切割" className="mb-6">
          <div className="text-center py-12">
            <FileImageOutlined className="text-6xl text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-4">
              上传试卷图片进行题目区域标注
            </h3>
            <p className="text-gray-500 mb-6">
              支持手动标注和批量切割两种模式，可以精确标记不同类型的题目区域
            </p>
            
            <Upload
              accept="image/*"
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <Button type="primary" size="large" icon={<UploadOutlined />}>
                选择试卷图片
              </Button>
            </Upload>
            
            <div className="mt-6 text-sm text-gray-400">
              支持 JPG、PNG、GIF 等图片格式
            </div>
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="功能特点" size="small">
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 手动精确标注题目区域</li>
                <li>• 批量快速生成题目区域</li>
                <li>• 支持多种题目类型分类</li>
                <li>• 选择题选项布局设置</li>
                <li>• 撤销/重做操作历史</li>
                <li>• 区域缩放和调整</li>
              </ul>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card title="题目类型" size="small">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 bg-blue-500 rounded"></span>
                  <span className="text-sm">选择题</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 bg-green-500 rounded"></span>
                  <span className="text-sm">填空题</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 bg-orange-500 rounded"></span>
                  <span className="text-sm">计算题</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 bg-purple-500 rounded"></span>
                  <span className="text-sm">论述题</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 bg-pink-500 rounded"></span>
                  <span className="text-sm">分析题</span>
                </div>
              </div>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card title="操作说明" size="small">
              <ul className="space-y-2 text-sm text-gray-600">
                <li>1. 上传试卷图片</li>
                <li>2. 选择标注模式</li>
                <li>3. 设置题目类型</li>
                <li>4. 绘制题目区域</li>
                <li>5. 调整和优化</li>
                <li>6. 保存标注结果</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </div>

      {visible && (
        <QuestionSegmentation
          visible={visible}
          onClose={handleClose}
          imageUrl={imageUrl}
          sheetInfo={sheetInfo}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default QuestionSegmentationPage;