import React from 'react';
import { Card, Form, Select, List, Button, Breadcrumb } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../contexts/AppContext';
import { mockScoreTrendData } from '../../data/mockData';
import { Exam } from '../../types/exam';

const DataAnalysisView: React.FC = () => {
  const { exams, setSubViewInfo } = useAppContext();

  const finishedExams = exams.filter(e => e.status === '已完成');

  const handleViewReport = (exam: Exam) => {
    setSubViewInfo({ view: 'analysis', exam });
  };

  return (
    <div>
      <Breadcrumb className="mb-4" items={[{ title: '数据分析' }]} />
      
      <Card title="全局数据洞察">
        <Form layout="inline" className="mb-6">
          <Form.Item label="选择学科">
            <Select defaultValue="history" style={{ width: 150 }}>
              <Select.Option value="history">历史</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="选择年级">
            <Select defaultValue="g8" style={{ width: 150 }}>
              <Select.Option value="g8">八年级</Select.Option>
            </Select>
          </Form.Item>
        </Form>
        
        <Card type="inner" title="八年级历史学科成绩趋势">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockScoreTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[80, 90]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="历史平均分" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Card>

      <Card title="已完成考试报告" className="mt-6">
        <List
          dataSource={finishedExams}
          renderItem={item => (
            <List.Item
              actions={[
                <Button 
                  type="primary" 
                  ghost 
                  onClick={() => handleViewReport(item)}
                >
                  查看详细报告
                </Button>
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={`科目: ${item.subject} | 年级: ${item.grade} | 完成于: ${item.createdAt}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default DataAnalysisView;