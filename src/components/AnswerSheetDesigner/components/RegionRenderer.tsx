/**
 * 区域渲染器 - 统一渲染各类型区域
 */

import React, { memo } from 'react';
import { Rect, Circle, Text, Group } from 'react-konva';
import { TemplateRegion, RegionType } from '../types/schema';
import { getRegionColor, getRegionTypeName } from '../utils/helpers';

interface RegionRendererProps {
  region: TemplateRegion;
  isSelected: boolean;
  isPreview: boolean;
  onClick?: (regionId: string) => void;
  onDoubleClick?: (regionId: string) => void;
  onDragEnd?: (regionId: string, x: number, y: number) => void;
  onTransformEnd?: (regionId: string, x: number, y: number, width: number, height: number) => void;
}

export const RegionRenderer: React.FC<RegionRendererProps> = memo(({
  region,
  isSelected,
  isPreview,
  onClick,
  onDoubleClick,
  onDragEnd,
  onTransformEnd
}) => {
  if (!region.visible) return null;
  
  const color = getRegionColor(region.type);
  const strokeWidth = isSelected ? 3 : 2;
  const opacity = isPreview ? 0.3 : (region.type === RegionType.ANCHOR ? 0.5 : 0.2);
  
  const handleClick = () => {
    if (onClick && !isPreview) {
      onClick(region.id);
    }
  };
  
  const handleDoubleClick = () => {
    if (onDoubleClick && !isPreview) {
      onDoubleClick(region.id);
    }
  };
  
  const handleDragEnd = (e: any) => {
    if (onDragEnd && !isPreview && !region.locked) {
      onDragEnd(region.id, e.target.x(), e.target.y());
    }
  };
  
  return (
    <Group
      x={region.x}
      y={region.y}
      draggable={!isPreview && !region.locked}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDoubleClick}
    >
      {/* 主要形状 */}
      {region.type === RegionType.ANCHOR ? (
        <AnchorRegionShape
          region={region}
          color={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      ) : (
        <Rect
          width={region.width}
          height={region.height}
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`}
          dash={region.type === RegionType.ANCHOR ? [5, 5] : undefined}
        />
      )}
      
      {/* 区域标签 */}
      {!isPreview && (
        <RegionLabel
          region={region}
          color={color}
          isSelected={isSelected}
        />
      )}
      
      {/* 特殊内容渲染 */}
      {renderRegionContent(region, isPreview)}
    </Group>
  );
});

// 定位点形状组件
const AnchorRegionShape: React.FC<{
  region: TemplateRegion;
  color: string;
  strokeWidth: number;
  opacity: number;
}> = ({ region, color, strokeWidth, opacity }) => {
  if (region.type !== RegionType.ANCHOR) return null;
  
  const { shape } = region.properties;
  const centerX = region.width / 2;
  const centerY = region.height / 2;
  const size = Math.min(region.width, region.height) * 0.8;
  
  switch (shape) {
    case 'circle':
      return (
        <Circle
          x={centerX}
          y={centerY}
          radius={size / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`}
        />
      );
      
    case 'cross':
      return (
        <Group>
          <Rect
            x={centerX - size / 8}
            y={centerY - size / 2}
            width={size / 4}
            height={size}
            fill={color}
          />
          <Rect
            x={centerX - size / 2}
            y={centerY - size / 8}
            width={size}
            height={size / 4}
            fill={color}
          />
        </Group>
      );
      
    default: // square
      return (
        <Rect
          x={centerX - size / 2}
          y={centerY - size / 2}
          width={size}
          height={size}
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`}
        />
      );
  }
};

// 区域标签组件
const RegionLabel: React.FC<{
  region: TemplateRegion;
  color: string;
  isSelected: boolean;
}> = ({ region, color, isSelected }) => {
  const fontSize = Math.max(10, Math.min(region.width / 8, region.height / 3, 16));
  
  return (
    <Group>
      {/* 标签背景 */}
      <Rect
        x={0}
        y={-fontSize - 4}
        width={region.name.length * fontSize * 0.6 + 8}
        height={fontSize + 4}
        fill={color}
        opacity={0.8}
        cornerRadius={2}
      />
      
      {/* 标签文字 */}
      <Text
        x={4}
        y={-fontSize - 2}
        text={region.name}
        fontSize={fontSize}
        fill="white"
        fontStyle={isSelected ? 'bold' : 'normal'}
      />
    </Group>
  );
};

// 渲染区域特殊内容
function renderRegionContent(region: TemplateRegion, isPreview: boolean) {
  if (isPreview) return null;
  
  switch (region.type) {
    case RegionType.BARCODE:
      return <BarcodeContent region={region} />;
      
    case RegionType.OBJECTIVE:
      return <ObjectiveContent region={region} />;
      
    case RegionType.SUBJECTIVE:
      return <SubjectiveContent region={region} />;
      
    default:
      return null;
  }
}

// 条码区域内容
const BarcodeContent: React.FC<{ region: TemplateRegion }> = ({ region }) => {
  if (region.type !== RegionType.BARCODE) return null;
  
  const { barcodeType, orientation } = region.properties;
  const padding = 8;
  
  if (barcodeType === 'qr') {
    // 简单的二维码示意图
    const qrSize = Math.min(region.width, region.height) - padding * 2;
    const cellSize = qrSize / 10;
    
    return (
      <Group x={padding} y={padding}>
        {Array.from({ length: 100 }, (_, i) => {
          const row = Math.floor(i / 10);
          const col = i % 10;
          const filled = Math.random() > 0.5; // 随机填充
          
          return filled ? (
            <Rect
              key={i}
              x={col * cellSize}
              y={row * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#000"
            />
          ) : null;
        })}
      </Group>
    );
  } else {
    // 条形码示意图
    const barWidth = (region.width - padding * 2) / 20;
    const barHeight = region.height - padding * 2;
    
    return (
      <Group x={padding} y={padding}>
        {Array.from({ length: 20 }, (_, i) => (
          <Rect
            key={i}
            x={i * barWidth}
            y={0}
            width={barWidth * (Math.random() > 0.5 ? 0.5 : 1)}
            height={barHeight}
            fill="#000"
          />
        ))}
      </Group>
    );
  }
};

// 客观题区域内容
const ObjectiveContent: React.FC<{ region: TemplateRegion }> = ({ region }) => {
  if (region.type !== RegionType.OBJECTIVE) return null;
  
  const { 
    questionCount, 
    optionsPerQuestion, 
    questionsPerRow, 
    bubbleStyle, 
    bubbleSize,
    spacing 
  } = region.properties;
  
  const padding = 8;
  const availableWidth = region.width - padding * 2;
  const availableHeight = region.height - padding * 2;
  
  const questionWidth = availableWidth / questionsPerRow;
  const rows = Math.ceil(questionCount / questionsPerRow);
  const questionHeight = availableHeight / rows;
  
  const bubbles = [];
  
  for (let i = 0; i < questionCount; i++) {
    const row = Math.floor(i / questionsPerRow);
    const col = i % questionsPerRow;
    
    const questionX = col * questionWidth;
    const questionY = row * questionHeight;
    
    // 题号
    bubbles.push(
      <Text
        key={`q${i}`}
        x={questionX + 4}
        y={questionY + 4}
        text={`${i + 1}.`}
        fontSize={10}
        fill="#666"
      />
    );
    
    // 选项气泡
    for (let j = 0; j < optionsPerQuestion; j++) {
      const optionX = questionX + 20 + j * spacing.option;
      const optionY = questionY + 4;
      
      if (bubbleStyle === 'circle') {
        bubbles.push(
          <Circle
            key={`q${i}o${j}`}
            x={optionX + bubbleSize / 2}
            y={optionY + bubbleSize / 2}
            radius={bubbleSize / 2}
            stroke="#ccc"
            strokeWidth={1}
          />
        );
      } else {
        bubbles.push(
          <Rect
            key={`q${i}o${j}`}
            x={optionX}
            y={optionY}
            width={bubbleSize}
            height={bubbleSize}
            stroke="#ccc"
            strokeWidth={1}
          />
        );
      }
      
      // 选项标签
      bubbles.push(
        <Text
          key={`q${i}o${j}label`}
          x={optionX + bubbleSize + 2}
          y={optionY + 2}
          text={String.fromCharCode(65 + j)} // A, B, C, D
          fontSize={8}
          fill="#666"
        />
      );
    }
  }
  
  return (
    <Group x={padding} y={padding}>
      {bubbles}
    </Group>
  );
};

// 主观题区域内容
const SubjectiveContent: React.FC<{ region: TemplateRegion }> = ({ region }) => {
  if (region.type !== RegionType.SUBJECTIVE) return null;
  
  const { hasLines, lineSpacing = 24, margin } = region.properties;
  
  if (!hasLines) return null;
  
  const lines = [];
  const startY = margin.top;
  const endY = region.height - margin.bottom;
  const lineCount = Math.floor((endY - startY) / lineSpacing);
  
  for (let i = 0; i < lineCount; i++) {
    const y = startY + i * lineSpacing;
    lines.push(
      <Rect
        key={i}
        x={margin.left}
        y={y}
        width={region.width - margin.left - margin.right}
        height={1}
        fill="#e0e0e0"
      />
    );
  }
  
  return <Group>{lines}</Group>;
};

export default RegionRenderer;