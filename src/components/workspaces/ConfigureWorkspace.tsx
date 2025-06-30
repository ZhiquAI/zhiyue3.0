import React, { useState, useMemo, useEffect } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Segmented, Collapse, Input, Tooltip, message, Tabs, Upload, Progress, Alert, Tag, Spin } from 'antd';
import { CheckCircleOutlined, FileImageOutlined, FileDoneOutlined, EyeOutlined, SwapOutlined, UploadOutlined, FilePdfOutlined, ZoomInOutlined, ZoomOutOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockConfigureData } from '../../data/mockData';

interface ConfigureWorkspaceProps {
  exam: Exam;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  originalFile?: File;
  pages?: string[];
}

const ConfigureWorkspace: React.FC<ConfigureWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo } = useAppContext();
  const [selectedQuestionId, setSelectedQuestionId] = useState('q13');
  const [activePreviewTab, setActivePreviewTab] = useState('paper');
  const [uploadedFiles, setUploadedFiles] = useState<{
    paper: UploadedFile | null;
    answer: UploadedFile | null;
  }>({
    paper: null,
    answer: null
  });
  const [processingStatus, setProcessingStatus] = useState({
    paper: 'none' as 'none' | 'uploading' | 'processing' | 'completed' | 'error',
    answer: 'none' as 'none' | 'uploading' | 'processing' | 'completed' | 'error'
  });
  const [currentPage, setCurrentPage] = useState({
    paper: 0,
    answer: 0
  });
  const [zoomLevel, setZoomLevel] = useState(100);

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
  };

  // 将PDF文件转换为图片页面
  const convertPdfToImages = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // 模拟PDF转换 - 实际项目中使用PDF.js
        // 这里我们创建一个基于文件内容的预览
        const dataUrl = reader.result as string;
        
        // 对于PDF文件，我们模拟多页转换
        if (file.type === 'application/pdf') {
          // 模拟PDF的多页内容
          const mockPages = [
            dataUrl, // 第一页使用实际文件的预览
            dataUrl  // 第二页也使用相同内容（实际中会是不同页面）
          ];
          resolve(mockPages);
        } else {
          // 图片文件直接返回
          resolve([dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = (type: 'paper' | 'answer') => async (info: any) => {
    const { file, fileList } = info;
    
    if (file.status === 'uploading') {
      setProcessingStatus(prev => ({ ...prev, [type]: 'uploading' }));
      return;
    }
    
    if (fileList.length === 0) {
      // 文件被移除
      setUploadedFiles(prev => ({ ...prev, [type]: null }));
      setProcessingStatus(prev => ({ ...prev, [type]: 'none' }));
      setCurrentPage(prev => ({ ...prev, [type]: 0 }));
      return;
    }

    const uploadedFile = fileList[fileList.length - 1];
    const fileObj = uploadedFile.originFileObj || uploadedFile;
    
    if (fileObj) {
      try {
        setProcessingStatus(prev => ({ ...prev, [type]: 'processing' }));
        
        // 转换文件为预览图片
        const pages = await convertPdfToImages(fileObj);
        
        const newFile: UploadedFile = {
          name: fileObj.name,
          url: pages[0], // 主预览图
          type: fileObj.type,
          size: fileObj.size,
          originalFile: fileObj,
          pages: pages
        };
        
        setUploadedFiles(prev => ({ ...prev, [type]: newFile }));
        setProcessingStatus(prev => ({ ...prev, [type]: 'completed' }));
        setCurrentPage(prev => ({ ...prev, [type]: 0 }));
        
        message.success(`${type === 'paper' ? '试卷' : '参考答案'}文件上传成功！`);
        
      } catch (error) {
        setProcessingStatus(prev => ({ ...prev, [type]: 'error' }));
        message.error(`文件处理失败: ${error}`);
      }
    }
  };

  // 删除文件
  const handleDeleteFile = (type: 'paper' | 'answer') => {
    setUploadedFiles(prev => ({ ...prev, [type]: null }));
    setProcessingStatus(prev => ({ ...prev, [type]: 'none' }));
    setCurrentPage(prev => ({ ...prev, [type]: 0 }));
    message.success(`${type === 'paper' ? '试卷' : '参考答案'}文件已删除`);
  };

  const renderFilePreview = (fileType: 'paper' | 'answer') => {
    const file = uploadedFiles[fileType];
    const status = processingStatus[fileType];
    const currentPageIndex = currentPage[fileType];
    
    if (status === 'none' || !file) {
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
              <p className="text-xs text-gray-400 mb-3">
                支持 PDF、JPG、PNG 格式，最大 10MB
              </p>
              <Button type="primary" ghost icon={<UploadOutlined />}>
                选择文件
              </Button>
            </div>
          </Upload>
        </div>
      );
    }

    if (status === 'uploading') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-blue-50 rounded-lg">
          <Progress 
            type="circle" 
            percent={30}
            status="active"
            className="mb-4"
          />
          <p className="text-blue-600 font-medium">正在上传文件...</p>
          <p className="text-sm text-gray-500">{file.name}</p>
        </div>
      );
    }

    if (status === 'processing') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-purple-50 rounded-lg">
          <Spin size="large" className="mb-4" />
          <p className="text-purple-600 font-medium">
            {file.type === 'application/pdf' ? 'AI正在处理PDF文档...' : '正在处理图片...'}
          </p>
          <p className="text-sm text-gray-500">{file.name}</p>
          <div className="mt-4 text-xs text-gray-400 text-center">
            <p>• 识别文档结构</p>
            <p>• 提取题目信息</p>
            <p>• 生成预览图片</p>
          </div>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-red-50 rounded-lg">
          <Alert
            message="文件处理失败"
            description="请检查文件格式是否正确，或重新上传文件"
            type="error"
            showIcon
            className="mb-4"
          />
          <Button 
            type="primary" 
            danger 
            onClick={() => handleDeleteFile(fileType)}
          >
            重新上传
          </Button>
        </div>
      );
    }

    if (status === 'completed' && file.pages && file.pages.length > 0) {
      const currentImage = file.pages[currentPageIndex];
      
      return (
        <div className="relative h-full bg-gray-100 rounded-lg overflow-hidden">
          {/* 文件信息栏 */}
          <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-b border-gray-200 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag color={fileType === 'paper' ? 'blue' : 'green'}>
                  {fileType === 'paper' ? '试卷原件' : '参考答案'}
                </Tag>
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                {file.type === 'application/pdf' && (
                  <Tag icon={<FilePdfOutlined />} color="red">PDF</Tag>
                )}
                <span className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="flex items-center gap-2">
                {file.pages.length > 1 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Button 
                      type="text" 
                      size="small"
                      disabled={currentPageIndex === 0}
                      onClick={() => setCurrentPage(prev => ({ ...prev, [fileType]: Math.max(0, prev[fileType] - 1) }))}
                    >
                      ←
                    </Button>
                    <span className="px-2">
                      {currentPageIndex + 1} / {file.pages.length}
                    </span>
                    <Button 
                      type="text" 
                      size="small"
                      disabled={currentPageIndex === file.pages.length - 1}
                      onClick={() => setCurrentPage(prev => ({ ...prev, [fileType]: Math.min(file.pages!.length - 1, prev[fileType] + 1) }))}
                    >
                      →
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<ZoomOutOutlined />}
                    disabled={zoomLevel <= 50}
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                  />
                  <span className="text-xs px-1">{zoomLevel}%</span>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<ZoomInOutlined />}
                    disabled={zoomLevel >= 200}
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                  />
                </div>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<EyeOutlined />}
                  onClick={() => window.open(currentImage, '_blank')}
                >
                  全屏查看
                </Button>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteFile(fileType)}
                  danger
                >
                  删除
                </Button>
              </div>
            </div>
          </div>

          {/* 文件预览区域 */}
          <div className="pt-16 h-full overflow-auto">
            <div className="flex justify-center p-4">
              <div 
                className="relative bg-white shadow-lg rounded-lg overflow-hidden"
                style={{ 
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.3s ease'
                }}
              >
                <img
                  src={currentImage}
                  alt={`${fileType === 'paper' ? '试卷' : '参考答案'}第${currentPageIndex + 1}页`}
                  className="max-w-full h-auto"
                  style={{ maxHeight: '800px' }}
                />
                
                {/* 题目标注区域（仅试卷显示） */}
                {fileType === 'paper' && currentPageIndex === 0 && (
                  <div className="absolute inset-0">
                    {mockConfigureData.questions.map(q => (
                      <Tooltip key={q.id} title={q.title}>
                        <div
                          className={`absolute border-2 transition-all duration-300 cursor-pointer ${
                            selectedQuestionId === q.id
                              ? 'border-blue-500 bg-blue-500/30 ring-4 ring-blue-300'
                              : 'border-dashed border-gray-400 hover:border-blue-300 hover:bg-blue-100/20'
                          }`}
                          style={{ ...q.area }}
                          onClick={() => setSelectedQuestionId(q.id)}
                        >
                          <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            {q.title}
                          </div>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <Spin size="large" />
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
          {uploadedFiles.paper && (
            <Tag color="blue" size="small">
              {processingStatus.paper === 'completed' ? '已处理' : '处理中'}
            </Tag>
          )}
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
          {uploadedFiles.answer && (
            <Tag color="green" size="small">
              {processingStatus.answer === 'completed' ? '已处理' : '处理中'}
            </Tag>
          )}
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
          {processingStatus.paper === 'completed' && processingStatus.answer === 'completed' && (
            <Tag color="purple" size="small">可用</Tag>
          )}
        </div>
      ),
      children: (
        <div className="h-full">
          {processingStatus.paper === 'completed' && processingStatus.answer === 'completed' && 
           uploadedFiles.paper?.pages && uploadedFiles.answer?.pages ? (
            <div className="grid grid-cols-2 gap-4 h-full p-4">
              <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
                <div className="absolute top-2 left-2 z-10">
                  <Tag color="blue">试卷原件</Tag>
                </div>
                <img
                  src={uploadedFiles.paper.pages[currentPage.paper]}
                  alt="试卷预览"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
                <div className="absolute top-2 left-2 z-10">
                  <Tag color="green">参考答案</Tag>
                </div>
                <img
                  src={uploadedFiles.answer.pages[currentPage.answer]}
                  alt="参考答案预览"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <SwapOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} className="mb-4" />
                <p className="text-gray-500 mb-2">对比视图需要同时上传并处理完成试卷和参考答案</p>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>试卷状态: {
                    processingStatus.paper === 'none' ? '未上传' :
                    processingStatus.paper === 'completed' ? '✓ 已完成' : '处理中...'
                  }</p>
                  <p>答案状态: {
                    processingStatus.answer === 'none' ? '未上传' :
                    processingStatus.answer === 'completed' ? '✓ 已完成' : '处理中...'
                  }</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      disabled: processingStatus.paper !== 'completed' || processingStatus.answer !== 'completed'
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
          disabled={processingStatus.paper !== 'completed'}
        >
          完成并保存所有配置
        </Button>
      </div>

      {/* 文件状态提示 */}
      {(processingStatus.paper === 'none' || processingStatus.answer === 'none') && (
        <Alert
          message="文件上传提醒"
          description={
            <div>
              {processingStatus.paper === 'none' && <p>• 试卷文件是必需的，请先上传试卷原件（支持PDF、JPG、PNG格式）</p>}
              {processingStatus.answer === 'none' && <p>• 参考答案是可选的，上传后可以自动生成评分标准</p>}
              <p>• 上传的文件将实时显示在预览区域，支持缩放和分页浏览</p>
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
            {processingStatus.paper === 'completed' ? (
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
                  <p className="text-gray-500 mb-2">请先上传并处理试卷文件</p>
                  <p className="text-sm text-gray-400">
                    {processingStatus.paper === 'none' && '上传PDF或图片格式的试卷文件'}
                    {processingStatus.paper === 'uploading' && '文件上传中...'}
                    {processingStatus.paper === 'processing' && 'AI正在分析试卷内容...'}
                    {processingStatus.paper === 'error' && '文件处理失败，请重新上传'}
                  </p>
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