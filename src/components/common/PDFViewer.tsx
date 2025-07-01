import React, { useState, useEffect, useRef } from 'react';
import { Button, Spin, Alert, Progress, Tag } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, EyeOutlined, LeftOutlined, RightOutlined, DeleteOutlined } from '@ant-design/icons';
import * as pdfjsLib from 'pdfjs-dist';

// 设置PDF.js worker - 使用Vite兼容的方式
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.entry', import.meta.url).toString();

interface PDFViewerProps {
  file: File;
  onDelete?: () => void;
  showControls?: boolean;
  className?: string;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
}

interface PDFPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  imageUrl: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  onDelete,
  showControls = true,
  className = '',
  onPageChange,
  onZoomChange
}) => {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
  }, [file]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);

      const arrayBuffer = await file.arrayBuffer();
      
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true,
      }).promise;

      setTotalPages(pdf.numPages);
      const pdfPages: PDFPage[] = [];

      // 渲染所有页面
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setLoadingProgress((pageNum / pdf.numPages) * 100);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const imageUrl = canvas.toDataURL('image/png');
          
          pdfPages.push({
            pageNumber: pageNum,
            canvas,
            imageUrl
          });
        }
      }

      setPages(pdfPages);
      setCurrentPage(0);
      setLoading(false);
      
    } catch (err) {
      console.error('PDF loading error:', err);
      setError('PDF文件加载失败，请检查文件是否损坏');
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(50, Math.min(200, newZoom));
    setZoomLevel(clampedZoom);
    onZoomChange?.(clampedZoom);
  };

  const handleFullscreen = () => {
    if (pages[currentPage]) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${file.name} - 第${currentPage + 1}页</title>
              <style>
                body { margin: 0; padding: 20px; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                img { max-width: 100%; max-height: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
              </style>
            </head>
            <body>
              <img src="${pages[currentPage].imageUrl}" alt="PDF页面" />
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  if (loading) {
    return (
      <div className={`h-full flex flex-col items-center justify-center bg-blue-50 rounded-lg ${className}`}>
        <Spin size="large" className="mb-4" />
        <p className="text-blue-600 font-medium mb-2">正在处理PDF文档...</p>
        <p className="text-sm text-gray-500 mb-4">{file.name}</p>
        <Progress 
          percent={Math.round(loadingProgress)} 
          size="small" 
          className="w-48"
          status="active"
        />
        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>• 解析PDF结构</p>
          <p>• 渲染页面内容</p>
          <p>• 生成预览图片</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex flex-col items-center justify-center bg-red-50 rounded-lg ${className}`}>
        <Alert
          message="PDF处理失败"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
        <Button type="primary" danger onClick={onDelete}>
          重新上传
        </Button>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">PDF文档为空</p>
      </div>
    );
  }

  const currentPageData = pages[currentPage];

  return (
    <div className={`relative h-full bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* 控制栏 */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-b border-gray-200 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag color="red" icon={<span>📄</span>}>PDF</Tag>
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
              <span className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* 分页控制 */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 text-sm">
                  <Button 
                    type="text" 
                    size="small"
                    icon={<LeftOutlined />}
                    disabled={currentPage === 0}
                    onClick={() => handlePageChange(currentPage - 1)}
                  />
                  <span className="px-2 min-w-[60px] text-center">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<RightOutlined />}
                    disabled={currentPage === totalPages - 1}
                    onClick={() => handlePageChange(currentPage + 1)}
                  />
                </div>
              )}
              
              {/* 缩放控制 */}
              <div className="flex items-center gap-1">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<ZoomOutOutlined />}
                  disabled={zoomLevel <= 50}
                  onClick={() => handleZoomChange(zoomLevel - 25)}
                />
                <span className="text-xs px-1 min-w-[45px] text-center">{zoomLevel}%</span>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<ZoomInOutlined />}
                  disabled={zoomLevel >= 200}
                  onClick={() => handleZoomChange(zoomLevel + 25)}
                />
              </div>
              
              {/* 其他控制 */}
              <Button 
                type="text" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={handleFullscreen}
              >
                全屏查看
              </Button>
              
              {onDelete && (
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DeleteOutlined />}
                  onClick={onDelete}
                  danger
                >
                  删除
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF内容区域 */}
      <div className={`${showControls ? 'pt-16' : ''} h-full overflow-auto`}>
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
              src={currentPageData.imageUrl}
              alt={`PDF第${currentPage + 1}页`}
              className="max-w-full h-auto"
              style={{ maxHeight: '800px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;