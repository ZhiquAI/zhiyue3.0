import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Segmented, Collapse, Input, Tooltip, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockConfigureData } from '../../data/mockData';

interface ConfigureWorkspaceProps {
  exam: Exam;
}

const ConfigureWorkspace: React.FC<ConfigureWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo } = useAppContext();
  const [selectedQuestionId, setSelectedQuestionId] = useState('q13');

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
    // Here you would typically save the configuration to the backend
  };

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
        >
          完成并保存所有配置
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12} className="flex flex-col">
          <Card title="试卷预览" className="flex-grow">
            <div className="relative w-full bg-gray-100 rounded-md overflow-hidden border">
              <img
                src="https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="试卷图片"
                className="w-full h-auto"
              />
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
          </Card>
        </Col>

        <Col xs={24} lg={12} className="flex flex-col">
          <Card title="主观题配置工作台" className="flex-grow">
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
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ConfigureWorkspace;