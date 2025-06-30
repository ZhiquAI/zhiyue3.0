import React, { useState, useMemo, useEffect } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Segmented, Collapse, Input, Tooltip, message, Tabs, Upload, Progress, Alert, Tag } from 'antd';
import { CheckCircleOutlined, FileImageOutlined, FileDoneOutlined, EyeOutlined, SwapOutlined, UploadOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockConfigureData } from '../../data/mockData';

interface ConfigureWorkspaceProps {
  exam: Exam;
}

const ConfigureWorkspace: React.FC<ConfigureWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo } = useAppContext();
  const [selectedQuestionId, setSelectedQuestionId] = useState('q13');
  const [activePreviewTab, setActivePreviewTab] = useState('paper');
  const [uploadedFiles, setUploadedFiles] = useState({
    paper: null as any,
    answer: null as any
  });
  const [processingStatus, setProcessingStatus] = useState({
    paper: 'completed' as 'uploading' | 'processing' | 'completed' | 'error',
    answer: 'completed' as 'uploading' | 'processing' | 'completed' | 'error'
  });

  // 模拟已上传的文件（实际项目中这些数据会从后端获取）
  useEffect(() => {
    // 模拟从考试数据中获取已上传的文件
    setUploadedFiles({
      paper: {
        name: '经开八年级历史期末答案.pdf',
        url: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
        type: 'image/jpeg',
        size: 2048576
      },
      answer: {
        name: '经开八年级历史期末答案.pdf',
        url: 'https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?auto=compress&cs=tinysrgb&w=800',
        type: 'image/jpeg',
        size: 1536789
      }
    });
  }, [exam]);

  const selectedQuestion = useMemo(() => {
    return mockConfigureData.questions.find(q => q.id === selectedQuestionId);
  }, [selectedQuestionId]);

  const selectedRubric = useMemo(() => {
    return mockConfigureData.rubrics[selectedQuestionId];
  }, [selectedQuestionId]);

  const handleBack = () => {
    setSubViewInfo({ view: null, exam: null });
  };

  const handleSaveConfiguration = () => {
    message.success('所有配置已保存！');
    // 这里会将配置保存到后端
  };

  const handleFileUpload = (type: 'paper' | 'answer') => (info: any) => {
    const { file, fileList } = info;
    
    if (file.status === 'uploading') {
      setProcessingStatus(prev => ({ ...prev, [type]: 'uploading' }));
    } else if (file.status === 'done') {
      setProcessingStatus(prev => ({ ...prev, [type]: 'processing' }));
      
      // 模拟文件处理
      setTimeout(() => {
        setUploadedFiles(prev => ({
          ...prev,
          [type]: {
            name: file.name,
            url: URL.createObjectURL(file.originFileObj),
            type: file.type,
            size: file.size
          }
        }));
        setProcessingStatus(prev => ({ ...prev, [type]: 'completed' }));
        message.success(`${type === 'paper' ? '试卷' : '参考答案'}上传成功！`);
      }, 2000);
    } else if (file.status === 'error') {
      setProcessingStatus(prev => ({ ...prev, [type]: 'error' }));
      message.error(`${type === 'paper' ? '试卷' : '参考答案'}上传失败`);
    }
  };

  const renderFilePreview = (fileType: 'paper' | 'answer') => {
    const file = uploadedFiles[fileType];
    const status = processingStatus[fileType];
    
    if (!file) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Upload
            name="file"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleFileUpload(fileType)}
            accept=".pdf,.jpg,.jpeg,.png"
          >
            <div className="text-center p-8">
              <div className="mb-4">
                {fileType === 'paper' ? (
                  <FileImageOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                ) : (
                  <FileDoneOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                )}
              </div>
              <p className="text-gray-500 mb-2">
                {fileType === 'paper' ? '点击上传试卷文件' : '点击上传参考答案'}
              </p>
              <Button type="primary" ghost icon={<UploadOutlined />}>
                选择文件
              </Button>
            </div>
          </Upload>
        </div>
      );
    }

    if (status === 'uploading' || status === 'processing') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-blue-50 rounded-lg">
          <Progress 
            type="circle" 
            percent={status === 'uploading' ? 60 : 85}
            status="active"
            className="mb-4"
          />
          <p className="text-blue-600 font-medium">
            {status === 'uploading' ? '正在上传...' : 'AI正在分析文档...'}
          </p>
          <p className="text-sm text-gray-500">{file.name}</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-red-50 rounded-lg">
          <Alert
            message="文件处理失败"
            description="请重新上传文件或联系技术支持"
            type="error"
            showIcon
            className="mb-4"
          />
          <Button type="primary" danger onClick={() => setUploadedFiles(prev => ({ ...prev, [fileType]: null }))}>
            重新上传
          </Button>
        </div>
      );
    }

    return (
      <div className="relative h-full bg-gray-100 rounded-lg overflow-hidden">
        {/* 文件信息栏 */}
        <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-b border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag color={fileType === 'paper' ? 'blue' : 'green'}>
                {fileType === 'paper' ? '试卷原件' : '参考答案'}
              </Tag>
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="text" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => window.open(file.url, '_blank')}
              >
                全屏查看
              </Button>
              <Button 
                type="text" 
                size="small" 
                icon={<UploadOutlined />}
                onClick={() => setUploadedFiles(prev => ({ ...prev, [fileType]: null }))}
              >
                重新上传
              </Button>
            </div>
          </div>
        </div>

        {/* 文件预览 */}
        <div className="pt-16 h-full">
          <img
            src={file.url}
            alt={`${fileType === 'paper' ? '试卷' : '参考答案'}预览`}
            className="w-full h-full object-contain"
            style={{ maxHeight: 'calc(100% - 64px)' }}
          />
        </div>

        {/* 题目标注区域（仅试卷显示） */}
        {fileType === 'paper' && (
          <div className="absolute inset-0 pt-16">
            {mockConfigureData.questions.map(q => (
              <Tooltip key={q.id} title={q.title}>
                <div
                  className={`absolute border-2 transition-all duration-300 cursor-pointer ${
                    selectedQuestionId === q.id
                      ? 'border-blue-500 bg-blue-500/30 ring-4 ring-blue-300'
                      : 'border-dashed border-gray-400 hover:border-blue-300'
                  }`}
                  style={{ ...q.area }}
                  onClick={() => setSelectedQuestionId(q.id)}
                />
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    );
  };

  const previewTabs = [
    {
      key: 'paper',
      label: (
        <div className="flex items-center gap-2">
          <FileImageOutlined />
          <span>试卷原件</span>
          {uploadedFiles.paper && <Tag color="blue" size="small">已上传</Tag>}
        </div>
      ),
      children: renderFilePreview('paper')
    },
    {
      key: 'answer',
      label: (
        <div className="flex items-center gap-2">
          <FileDoneOutlined />
          <span>参考答案</span>
          {uploadedFiles.answer && <Tag color="green" size="small">已上传</Tag>}
        </div>
      ),
      children: renderFilePreview('answer')
    },
    {
      key: 'compare',
      label: (
        <div className="flex items-center gap-2">
          <SwapOutlined />
          <span>对比视图</span>
          {uploadedFiles.paper && uploadedFiles.answer && <Tag color="purple" size="small">可用</Tag>}
        </div>
      ),
      children: (
        <div className="h-full">
          {uploadedFiles.paper && uploadedFiles.answer ? (
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="relative">
                <div className="absolute top-2 left-2 z-10">
                  <Tag color="blue">试卷原件</Tag>
                </div>
                <img
                  src={uploadedFiles.paper.url}
                  alt="试卷预览"
                  className="w-full h-full object-contain bg-gray-50 rounded-lg"
                />
              </div>
              <div className="relative">
                <div className="absolute top-2 left-2 z-10">
                  <Tag color="green">参考答案</Tag>
                </div>
                <img
                  src={uploadedFiles.answer.url}
                  alt="参考答案预览"
                  className="w-full h-full object-contain bg-gray-50 rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <SwapOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} className="mb-4" />
                <p className="text-gray-500 mb-2">对比视图需要同时上传试卷和参考答案</p>
                <p className="text-sm text-gray-400">
                  当前状态: 
                  {!uploadedFiles.paper && !uploadedFiles.answer && ' 未上传任何文件'}
                  {uploadedFiles.paper && !uploadedFiles.answer && ' 仅上传了试卷'}
                  {!uploadedFiles.paper && uploadedFiles.answer && ' 仅上传了参考答案'}
                </p>
              </div>
            </div>
          )}
        </div>
      ),
      disabled: !uploadedFiles.paper || !uploadedFiles.answer
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Breadcrumb
          items={[
            { title: <a onClick={handleBack}>考试管理</a> },
            { title: exam.name },
            { title: '配置试卷' }
          ]}
        />
        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleSaveConfiguration}
          disabled={!uploadedFiles.paper}
        >
          完成并保存所有配置
        </Button>
      </div>

      {/* 文件状态提示 */}
      {(!uploadedFiles.paper || !uploadedFiles.answer) && (
        <Alert
          message="文件上传提醒"
          description={
            <div>
              {!uploadedFiles.paper && <p>• 试卷文件是必需的，请先上传试卷原件</p>}
              {!uploadedFiles.answer && <p>• 参考答案是可选的，上传后可以自动生成评分标准</p>}
            </div>
          }
          type="info"
          showIcon
          className="mb-4"
        />
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12} className="flex flex-col">
          <Card title="文档预览" className="flex-grow">
            <Tabs
              activeKey={activePreviewTab}
              onChange={setActivePreviewTab}
              items={previewTabs}
              className="h-full"
              tabBarStyle={{ marginBottom: 16 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12} className="flex flex-col">
          <Card title="主观题配置工作台" className="flex-grow">
            {uploadedFiles.paper ? (
              <>
                <Segmented
                  block
                  options={mockConfigureData.questions.map(q => ({
                    label: `第${q.id.slice(1)}题`,
                    value: q.id,
                    title: q.title
                  }))}
                  value={selectedQuestionId}
                  onChange={setSelectedQuestionId}
                  className="mb-4"
                />

                <div className="flex flex-col gap-4 mt-4">
                  <Card type="inner" title="官方参考答案" size="small">
                    <p className="text-gray-600 text-sm">
                      {selectedQuestion?.answer}
                    </p>
                  </Card>

                  <Card type="inner" title="多维评分标准编辑器" className="flex-grow">
                    <Collapse
                      defaultActiveKey={selectedRubric?.dimensions.map(d => d.id)}
                    >
                      {selectedRubric?.dimensions.map(dim => (
                        <Collapse.Panel
                          key={dim.id}
                          header={
                            <div className="flex justify-between items-center w-full">
                              <span className="font-semibold">{dim.name}</span>
                              <Input
                                defaultValue={dim.points}
                                onClick={e => e.stopPropagation()}
                                className="w-20 text-center"
                                type="number"
                                addonAfter="分"
                              />
                            </div>
                          }
                        >
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium w-20">评分指引</span>
                              <Input.TextArea
                                rows={2}
                                defaultValue={dim.guide}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium w-20">关键词</span>
                              <Input
                                defaultValue={(dim.keywords || []).join('，')}
                              />
                            </div>
                          </div>
                        </Collapse.Panel>
                      ))}
                    </Collapse>
                  </Card>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileImageOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} className="mb-4" />
                  <p className="text-gray-500 mb-2">请先上传试卷文件</p>
                  <p className="text-sm text-gray-400">上传后即可开始配置主观题评分标准</p>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConfigureWorkspace;