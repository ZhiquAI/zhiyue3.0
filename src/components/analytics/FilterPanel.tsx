import React from 'react';
import { Card, Row, Col, Select, DatePicker, Button, Space, Form, Divider } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export interface FilterConfig {
  subject?: string;
  grade?: string;
  class?: string;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  examType?: string;
}

interface FilterPanelProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
  className?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  loading = false,
  className = ''
}) => {
  const [form] = Form.useForm();

  const handleFieldChange = (field: keyof FilterConfig, value: any) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  const subjectOptions = [
    { label: '历史', value: 'history' },
    { label: '语文', value: 'chinese' },
    { label: '数学', value: 'math' },
    { label: '英语', value: 'english' },
    { label: '物理', value: 'physics' },
    { label: '化学', value: 'chemistry' }
  ];

  const gradeOptions = [
    { label: '七年级', value: 'g7' },
    { label: '八年级', value: 'g8' },
    { label: '九年级', value: 'g9' }
  ];

  const classOptions = [
    { label: '全部班级', value: 'all' },
    { label: '一班', value: 'class1' },
    { label: '二班', value: 'class2' },
    { label: '三班', value: 'class3' },
    { label: '四班', value: 'class4' },
    { label: '五班', value: 'class5' }
  ];

  const examTypeOptions = [
    { label: '全部考试', value: 'all' },
    { label: '月考', value: 'monthly' },
    { label: '期中考试', value: 'midterm' },
    { label: '期末考试', value: 'final' },
    { label: '模拟考试', value: 'mock' }
  ];

  return (
    <Card 
      className={`filter-panel ${className}`}
      title={
        <Space>
          <FilterOutlined className="text-slate-600" />
          <span>筛选条件</span>
        </Space>
      }
      size="small"
    >
      <Form form={form} layout="vertical">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item label="学科" className="mb-0">
              <Select
                value={filters.subject}
                onChange={(value) => handleFieldChange('subject', value)}
                options={subjectOptions}
                placeholder="选择学科"
                allowClear
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item label="年级" className="mb-0">
              <Select
                value={filters.grade}
                onChange={(value) => handleFieldChange('grade', value)}
                options={gradeOptions}
                placeholder="选择年级"
                allowClear
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item label="班级" className="mb-0">
              <Select
                value={filters.class}
                onChange={(value) => handleFieldChange('class', value)}
                options={classOptions}
                placeholder="选择班级"
                allowClear
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={6} lg={4}>
            <Form.Item label="考试类型" className="mb-0">
              <Select
                value={filters.examType}
                onChange={(value) => handleFieldChange('examType', value)}
                options={examTypeOptions}
                placeholder="考试类型"
                allowClear
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={24} md={12} lg={6}>
            <Form.Item label="时间范围" className="mb-0">
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => handleFieldChange('dateRange', dates)}
                placeholder={['开始日期', '结束日期']}
                className="w-full"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={24} md={12} lg={2}>
            <Form.Item label=" " className="mb-0">
              <Space>
                <Button 
                  type="primary" 
                  onClick={onApply}
                  loading={loading}
                  icon={<FilterOutlined />}
                >
                  应用
                </Button>
                <Button 
                  onClick={handleReset}
                  icon={<ReloadOutlined />}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default FilterPanel;
