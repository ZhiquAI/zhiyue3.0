import React from 'react';
import { Card, Table, Button, Tag, Progress, Tooltip, Breadcrumb, message } from 'antd';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';

const MarkingCenterView: React.FC = () => {
  const { exams, setSubViewInfo } = useAppContext();

  const markingExams = exams.filter(e => 
    e.status === '阅卷中' || e.status === '待阅卷'
  );

  const handleEnterMarking = (exam: Exam) => {
    setSubViewInfo({ view: 'marking', exam });
  };

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === '阅卷中' ? 'processing' : 'geekblue'}>
          {status}
        </Tag>
      )
    },
    {
      title: '阅卷进度',
      key: 'progress',
      render: (_: any, record: Exam) => (
        <Tooltip title={`${record.tasks.completed} / ${record.tasks.total}`}>
          <Progress 
            percent={
              record.tasks.total > 0 
                ? Math.round((record.tasks.completed / record.tasks.total) * 100) 
                : 0
            } 
          />
        </Tooltip>
      )
    },
    {
      title: '异常答卷',
      key: 'errors',
      render: (_: any, record: Exam) => (
        record.tasks.hasError ? (
          <Button 
            type="link" 
            danger 
            onClick={() => message.info('正在打开异常处理工作台...')}
          >
            {record.tasks.errorCount} 份
          </Button>
        ) : (
          <Tag color="success">无</Tag>
        )
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Exam) => (
        <Button type="primary" onClick={() => handleEnterMarking(record)}>
          进入阅卷
        </Button>
      )
    }
  ];

  return (
    <div>
      <Breadcrumb className="mb-4" items={[{ title: '阅卷中心' }]} />
      
      <Card>
        <Table 
          columns={columns} 
          dataSource={markingExams} 
          rowKey="id" 
        />
      </Card>
    </div>
  );
};

export default MarkingCenterView;