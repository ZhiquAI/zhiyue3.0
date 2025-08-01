import React, { ReactNode, useState } from 'react';
import { Table, Card, Drawer, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useBreakpoints } from '../../hooks/useMediaQuery';
import type { ColumnsType, ColumnType } from 'antd/es/table';

interface ResponsiveTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;
  pagination?: unknown;
  rowKey?: string | ((record: T) => string);
  className?: string;
  // 移动端配置
  mobileCardRender?: (record: T, index: number) => ReactNode;
  mobileTitle?: (record: T) => string;
  mobileDescription?: (record: T) => string;
  mobileActions?: (record: T) => ReactNode;
  // 响应式配置
  hideColumnsOnMobile?: string[]; // 在移动端隐藏的列key
  showDetailsDrawer?: boolean; // 是否显示详情抽屉
}

const ResponsiveTable = <T extends Record<string, unknown>>({
  columns,
  dataSource,
  loading = false,
  pagination,
  rowKey = 'id',
  className = '',
  mobileCardRender,
  mobileTitle,
  mobileDescription,
  mobileActions,
  hideColumnsOnMobile = [],
  showDetailsDrawer = true
}: ResponsiveTableProps<T>) => {
  const { isMobile, isTablet } = useBreakpoints();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<T | null>(null);

  // 处理移动端列显示
  const getResponsiveColumns = () => {
    if (!isMobile && !isTablet) return columns;

    return columns.filter(col => {
      const columnType = col as ColumnType<T>;
      if (typeof col.key === 'string') {
        return !hideColumnsOnMobile.includes(col.key);
      }
      if (typeof columnType.dataIndex === 'string') {
        return !hideColumnsOnMobile.includes(columnType.dataIndex);
      }
      return true;
    }).map(col => ({
      ...col,
      width: undefined, // 移除固定宽度
      ellipsis: true, // 自动省略
    }));
  };

  // 移动端卡片渲染
  const renderMobileCard = (record: T, index: number) => {
    if (mobileCardRender) {
      return mobileCardRender(record, index);
    }

    return (
      <Card
        key={typeof rowKey === 'function' ? rowKey(record) : record[rowKey]}
        className="mobile-card mb-3"
        size="small"
        title={
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {mobileTitle ? mobileTitle(record) : `项目 ${index + 1}`}
            </span>
            {showDetailsDrawer && (
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedRecord(record);
                  setDrawerVisible(true);
                }}
              />
            )}
          </div>
        }
        bodyStyle={{ padding: '12px 16px' }}
      >
        {/* 主要信息 */}
        {mobileDescription && (
          <p className="text-gray-600 text-sm mb-2">
            {mobileDescription(record)}
          </p>
        )}

        {/* 关键字段显示 */}
        <div className="space-y-2">
          {columns.slice(0, 3).map((col, colIndex) => {
            const columnType = col as ColumnType<T>;
            const key = col.key || columnType.dataIndex;
            const value = columnType.dataIndex ? record[columnType.dataIndex as keyof T] : '';
            
            if (!value || hideColumnsOnMobile.includes(key as string)) {
              return null;
            }

            return (
              <div key={colIndex} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{col.title as string}:</span>
                <span className="font-medium">
                  {columnType.render ? columnType.render(value, record, colIndex) : String(value)}
                </span>
              </div>
            );
          })}
        </div>

        {/* 操作按钮 */}
        {mobileActions && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            {mobileActions(record)}
          </div>
        )}
      </Card>
    );
  };

  // 详情抽屉内容
  const renderDrawerContent = () => {
    if (!selectedRecord) return null;

    return (
      <div className="space-y-4">
        {columns.map((col, index) => {
          const columnType = col as ColumnType<T>;
          const value = columnType.dataIndex ? selectedRecord[columnType.dataIndex as keyof T] : '';
          
          if (!value && value !== 0) return null;

          return (
            <div key={index} className="border-b border-gray-100 pb-3">
              <div className="text-sm text-gray-500 mb-1">{col.title as string}</div>
              <div className="text-base">
                {columnType.render ? columnType.render(value, selectedRecord, index) : String(value)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 移动端渲染
  if (isMobile) {
    return (
      <div className={`responsive-table-mobile ${className}`}>
        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        )}

        {/* 数据列表 */}
        {!loading && dataSource.length > 0 && (
          <div className="mobile-list">
            {dataSource.map((record, index) => renderMobileCard(record, index))}
          </div>
        )}

        {/* 空状态 */}
        {!loading && dataSource.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}

        {/* 分页 */}
        {pagination && dataSource.length > 0 && (
          <div className="mt-4 flex justify-center">
            <div className="ant-pagination-simple">
              {/* 这里可以渲染简化的分页组件 */}
            </div>
          </div>
        )}

        {/* 详情抽屉 */}
        <Drawer
          title="详细信息"
          placement="bottom"
          closable={true}
          onClose={() => {
            setDrawerVisible(false);
            setSelectedRecord(null);
          }}
          open={drawerVisible}
          height="80%"
        >
          {renderDrawerContent()}
        </Drawer>
      </div>
    );
  }

  // 桌面端/平板渲染
  return (
    <div className={`responsive-table-desktop ${className}`}>
      <Table
        columns={getResponsiveColumns()}
        dataSource={dataSource}
        loading={loading}
        pagination={pagination}
        rowKey={rowKey}
        scroll={{ x: isTablet ? 'max-content' : undefined }}
        size={isTablet ? 'small' : 'middle'}
      />
    </div>
  );
};

export default ResponsiveTable;
