// 雷达图组件
import React from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface RadarChartProps {
  data: any[];
  dataKeys: string[];
  colors?: string[];
  height?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  dataKeys,
  colors = ['#8884d8', '#82ca9d', '#ffc658'],
  height = 350,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="ability" />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        {dataKeys.map((key, index) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.6}
          />
        ))}
        <Legend />
        <Tooltip />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
};

export default RadarChart;