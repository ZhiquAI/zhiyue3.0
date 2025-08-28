import React, { useState, useCallback, useRef } from 'react';
import {
  Card,
  Progress,
  Button,
  Alert,
  Space,
  Statistic,
  Row,
  Col,
  Switch,
  InputNumber,
  Tag
} from 'antd';
import {
  CloudUploadOutlined,
  ThunderboltOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import { message } from '../../utils/message';

interface FileChunk {
  id: string;
  file: File;
  start: number;
  end: number;
  data: Blob;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
}

interface UploadTask {
  id: string;
  file: File;
  chunks: FileChunk[];
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  uploadedBytes: number;
  speed: number; // bytes/second
  estimatedTime: number; // seconds
}

interface FileUploadOptimizerProps {
  maxConcurrentUploads?: number;
  chunkSize?: number; // MB
  enableChunkedUpload?: boolean;
}

const FileUploadOptimizer: React.FC<FileUploadOptimizerProps> = ({
  maxConcurrentUploads = 3,
  chunkSize = 10,
  enableChunkedUpload = true
}) => {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [concurrentUploads, setConcurrentUploads] = useState(maxConcurrentUploads);
  const [currentChunkSize, setCurrentChunkSize] = useState(chunkSize);
  const [enableChunked, setEnableChunked] = useState(enableChunkedUpload);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const speedCalculationRef = useRef<{ startTime: number; uploadedBytes: number }>({ startTime: 0, uploadedBytes: 0 });

  // 创建文件分块
  const createFileChunks = useCallback((file: File): FileChunk[] => {
    if (!enableChunked) {
      return [{
        id: `chunk_0`,
        file,
        start: 0,
        end: file.size,
        data: file,
        status: 'pending',
        progress: 0,
        retryCount: 0
      }];
    }

    const chunks: FileChunk[] = [];
    const chunkSizeBytes = currentChunkSize * 1024 * 1024; // Convert MB to bytes
    let start = 0;
    let chunkIndex = 0;

    while (start < file.size) {
      const end = Math.min(start + chunkSizeBytes, file.size);
      const chunkData = file.slice(start, end);
      
      chunks.push({
        id: `chunk_${chunkIndex}`,
        file,
        start,
        end,
        data: chunkData,
        status: 'pending',
        progress: 0,
        retryCount: 0
      });
      
      start = end;
      chunkIndex++;
    }

    return chunks;
  }, [enableChunked, currentChunkSize]);

  // 上传单个分块
  const uploadChunk = useCallback(async (chunk: FileChunk, taskId: string): Promise<void> => {
    const formData = new FormData();
    formData.append('chunk', chunk.data);
    formData.append('chunkId', chunk.id);
    formData.append('taskId', taskId);
    formData.append('start', chunk.start.toString());
    formData.append('end', chunk.end.toString());
    formData.append('totalSize', chunk.file.size.toString());
    formData.append('filename', chunk.file.name);

    try {
      // 模拟上传过程
      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            
            setUploadTasks(prev => prev.map(task => {
              if (task.id === taskId) {
                const updatedChunks = task.chunks.map(c => 
                  c.id === chunk.id ? { ...c, progress } : c
                );
                
                const totalProgress = updatedChunks.reduce((sum, c) => sum + c.progress, 0) / updatedChunks.length;
                const uploadedBytes = updatedChunks.reduce((sum, c) => 
                  c.status === 'completed' ? sum + (c.end - c.start) : sum, 0
                ) + (event.loaded);
                
                return {
                  ...task,
                  chunks: updatedChunks,
                  progress: totalProgress,
                  uploadedBytes
                };
              }
              return task;
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.onabort = () => reject(new Error('Upload aborted'));

        // 模拟上传到服务器
        xhr.open('POST', '/api/upload/chunk');
        
        // 模拟延迟
        setTimeout(() => {
          xhr.send(formData);
        }, Math.random() * 1000 + 500);
      });

      await uploadPromise;
      
      // 更新分块状态为完成
      setUploadTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          const updatedChunks = task.chunks.map(c => 
            c.id === chunk.id ? { ...c, status: 'completed' as const, progress: 100 } : c
          );
          
          const allCompleted = updatedChunks.every(c => c.status === 'completed');
          const totalProgress = updatedChunks.reduce((sum, c) => sum + c.progress, 0) / updatedChunks.length;
          
          return {
            ...task,
            chunks: updatedChunks,
            status: allCompleted ? 'completed' as const : task.status,
            progress: totalProgress
          };
        }
        return task;
      }));
      
    } catch (error) {
      // 更新分块状态为失败
      setUploadTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          const updatedChunks = task.chunks.map(c => 
            c.id === chunk.id ? { 
              ...c, 
              status: 'failed' as const, 
              retryCount: c.retryCount + 1 
            } : c
          );
          
          return {
            ...task,
            chunks: updatedChunks
          };
        }
        return task;
      }));
      
      throw error;
    }
  }, []);

  // 上传文件任务
  const uploadTask = useCallback(async (task: UploadTask): Promise<void> => {
    const semaphore = new Array(concurrentUploads).fill(null);
    let chunkIndex = 0;
    
    const uploadNextChunk = async (): Promise<void> => {
      if (chunkIndex >= task.chunks.length) return;
      
      const chunk = task.chunks[chunkIndex++];
      if (chunk.status === 'completed') {
        return uploadNextChunk();
      }
      
      try {
        // 更新分块状态为上传中
        setUploadTasks(prev => prev.map(t => {
          if (t.id === task.id) {
            const updatedChunks = t.chunks.map(c => 
              c.id === chunk.id ? { ...c, status: 'uploading' as const } : c
            );
            return { ...t, chunks: updatedChunks };
          }
          return t;
        }));
        
        await uploadChunk(chunk, task.id);
        
      } catch (error) {
        console.error(`Failed to upload chunk ${chunk.id}:`, error);
        
        // 如果重试次数未超限，重新加入队列
        if (chunk.retryCount < 3) {
          chunkIndex--; // 重试当前分块
        }
      } finally {
        // 继续上传下一个分块
        if (chunkIndex < task.chunks.length) {
          await uploadNextChunk();
        }
      }
    };
    
    // 启动并发上传
    const uploadPromises = semaphore.map(() => uploadNextChunk());
    await Promise.all(uploadPromises);
  }, [concurrentUploads, uploadChunk]);

  // 处理文件选择
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newTasks: UploadTask[] = Array.from(files).map(file => {
      const chunks = createFileChunks(file);
      
      return {
        id: `task_${Date.now()}_${Math.random()}`,
        file,
        chunks,
        status: 'pending',
        progress: 0,
        uploadedBytes: 0,
        speed: 0,
        estimatedTime: 0
      };
    });
    
    setUploadTasks(prev => [...prev, ...newTasks]);
  }, [createFileChunks]);

  // 开始上传
  const startUpload = useCallback(async () => {
    const pendingTasks = uploadTasks.filter(task => task.status === 'pending' || task.status === 'paused');
    
    if (pendingTasks.length === 0) {
      message.warning('没有待上传的文件');
      return;
    }
    
    setIsUploading(true);
    uploadControllerRef.current = new AbortController();
    speedCalculationRef.current = { startTime: Date.now(), uploadedBytes: 0 };
    
    try {
      // 更新任务状态
      setUploadTasks(prev => prev.map(task => 
        pendingTasks.some(pt => pt.id === task.id) 
          ? { ...task, status: 'uploading' as const }
          : task
      ));
      
      // 并发上传任务
      await Promise.all(pendingTasks.map(task => uploadTask(task)));
      
      message.success('所有文件上传完成');
      
    } catch {
      message.error('上传过程中发生错误');
    } finally {
      setIsUploading(false);
    }
  }, [uploadTasks, uploadTask]);

  // 暂停上传
  const pauseUpload = useCallback(() => {
    uploadControllerRef.current?.abort();
    setIsUploading(false);
    
    setUploadTasks(prev => prev.map(task => 
      task.status === 'uploading' ? { ...task, status: 'paused' as const } : task
    ));
    
    message.info('上传已暂停');
  }, []);

  // 停止上传
  const stopUpload = useCallback(() => {
    uploadControllerRef.current?.abort();
    setIsUploading(false);
    setUploadTasks([]);
    setGlobalProgress(0);
    
    message.info('上传已停止');
  }, []);

  // 计算全局进度和速度
  React.useEffect(() => {
    const totalFiles = uploadTasks.length;
    if (totalFiles === 0) {
      setGlobalProgress(0);
      setUploadSpeed(0);
      return;
    }
    
    const totalProgress = uploadTasks.reduce((sum, task) => sum + task.progress, 0) / totalFiles;
    const totalUploadedBytes = uploadTasks.reduce((sum, task) => sum + task.uploadedBytes, 0);
    
    setGlobalProgress(totalProgress);
    
    // 计算上传速度
    const now = Date.now();
    const timeDiff = (now - speedCalculationRef.current.startTime) / 1000; // seconds
    const bytesDiff = totalUploadedBytes - speedCalculationRef.current.uploadedBytes;
    
    if (timeDiff > 1) { // 每秒更新一次速度
      const speed = bytesDiff / timeDiff; // bytes/second
      setUploadSpeed(speed);
      speedCalculationRef.current = { startTime: now, uploadedBytes: totalUploadedBytes };
    }
  }, [uploadTasks]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化速度
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  return (
    <div className="file-upload-optimizer">
      <Card title="文件上传优化器" extra={
        <Space>
          <Button 
            icon={<CloudUploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            选择文件
          </Button>
          {!isUploading ? (
            <Button 
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={startUpload}
              disabled={uploadTasks.length === 0}
            >
              开始上传
            </Button>
          ) : (
            <Space>
              <Button 
                icon={<PauseOutlined />}
                onClick={pauseUpload}
              >
                暂停
              </Button>
              <Button 
                danger
                icon={<StopOutlined />}
                onClick={stopUpload}
              >
                停止
              </Button>
            </Space>
          )}
        </Space>
      }>
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        
        {/* 全局进度 */}
        {uploadTasks.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span>总体进度</span>
              <span>{globalProgress.toFixed(1)}%</span>
            </div>
            <Progress 
              percent={globalProgress} 
              status={isUploading ? 'active' : 'normal'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        )}
        
        {/* 统计信息 */}
        {uploadTasks.length > 0 && (
          <Row gutter={[16, 16]} className="mb-6">
            <Col span={6}>
              <Statistic
                title="上传速度"
                value={formatSpeed(uploadSpeed)}
                prefix={<ThunderboltOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="文件总数"
                value={uploadTasks.length}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已完成"
                value={uploadTasks.filter(t => t.status === 'completed').length}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="失败"
                value={uploadTasks.filter(t => t.status === 'failed').length}
              />
            </Col>
          </Row>
        )}
        
        {/* 优化设置 */}
        <Card title="优化设置" size="small" className="mb-6">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div className="flex items-center justify-between">
                <span>启用分块上传</span>
                <Switch
                  checked={enableChunked}
                  onChange={setEnableChunked}
                  disabled={isUploading}
                />
              </div>
            </Col>
            <Col span={8}>
              <div className="flex items-center justify-between">
                <span>并发上传数</span>
                <InputNumber
                  min={1}
                  max={10}
                  value={concurrentUploads}
                  onChange={(value) => setConcurrentUploads(value || 3)}
                  disabled={isUploading}
                  style={{ width: 80 }}
                />
              </div>
            </Col>
            <Col span={8}>
              <div className="flex items-center justify-between">
                <span>分块大小 (MB)</span>
                <InputNumber
                  min={1}
                  max={100}
                  value={currentChunkSize}
                  onChange={(value) => setCurrentChunkSize(value || 10)}
                  disabled={isUploading || !enableChunked}
                  style={{ width: 80 }}
                />
              </div>
            </Col>
          </Row>
        </Card>
        
        {/* 文件列表 */}
        {uploadTasks.length > 0 && (
          <Card title="上传任务" size="small">
            <div className="space-y-4">
              {uploadTasks.map(task => (
                <div key={task.id} className="border rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-medium">{task.file.name}</span>
                      <span className="text-gray-500 ml-2">({formatFileSize(task.file.size)})</span>
                    </div>
                    <Tag color={
                      task.status === 'completed' ? 'green' :
                      task.status === 'uploading' ? 'blue' :
                      task.status === 'failed' ? 'red' :
                      task.status === 'paused' ? 'orange' : 'default'
                    }>
                      {task.status === 'completed' ? '已完成' :
                       task.status === 'uploading' ? '上传中' :
                       task.status === 'failed' ? '失败' :
                       task.status === 'paused' ? '已暂停' : '等待中'}
                    </Tag>
                  </div>
                  
                  <Progress 
                    percent={task.progress} 
                    size="small"
                    status={
                      task.status === 'failed' ? 'exception' :
                      task.status === 'completed' ? 'success' : 'normal'
                    }
                  />
                  
                  {enableChunked && task.chunks.length > 1 && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-500 mb-1">
                        分块进度 ({task.chunks.length} 个分块)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {task.chunks.map(chunk => (
                          <div
                            key={chunk.id}
                            className={`w-4 h-4 rounded ${
                              chunk.status === 'completed' ? 'bg-green-500' :
                              chunk.status === 'uploading' ? 'bg-blue-500' :
                              chunk.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                            title={`分块 ${chunk.id}: ${chunk.status} (${chunk.progress.toFixed(1)}%)`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* 提示信息 */}
        {uploadTasks.length === 0 && (
          <Alert
            message="优化提示"
            description={
              <ul className="mb-0">
                <li>启用分块上传可以提高大文件上传的稳定性</li>
                <li>适当增加并发数可以提升上传速度，但会增加服务器负载</li>
                <li>较小的分块大小适合网络不稳定的环境</li>
                <li>支持断点续传，上传失败的分块会自动重试</li>
              </ul>
            }
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );
};

export default FileUploadOptimizer;