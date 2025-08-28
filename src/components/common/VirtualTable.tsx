// 虚拟表格组件 - 处理大数据量
import React, { useMemo, useState, useCallback } from 'react';
import { Table, TableProps } from 'antd';
import { FixedSizeList as List } from 'react-window';
import { cn } from '../../design-system';

interface VirtualTableProps extends TableProps<any> {
  height?: number;
  itemHeight?: number;
}

const VirtualTable: React.FC<VirtualTableProps> = ({
  height = 400,
  itemHeight = 54,
  dataSource = [],
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleData = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(height / itemHeight) + 1,
      dataSource.length
    );
    
    return dataSource.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      key: item.key || startIndex + index,
    }));
  }, [dataSource, scrollTop, itemHeight, height]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const components = useMemo(() => ({
    body: {
      wrapper: (props: any) => (
        <div
          {...props}
          style={{
            ...props.style,
            height,
            overflow: 'auto',
          }}
          onScroll={handleScroll}
        />
      ),
    },
  }), [height, handleScroll]);

  return (
    <Table
      {...props}
      dataSource={visibleData}
      components={components}
      pagination={false}
      scroll={{ y: height }}
    />
  );
};

export default VirtualTable;