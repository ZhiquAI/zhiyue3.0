// 柱状图组件
import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: any[];
  dataKeys: string[];
  colors?: string[];
  height?: number;
  onClick?: (data: any) => void;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKeys,
  colors = ['#8884d8', '#82ca9d', '#ffc658'],
  height = 350,
  onClick,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} onClick={onClick}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;