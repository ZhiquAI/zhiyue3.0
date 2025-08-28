/**
 * 模板存储状态管理测试
 * 测试模板数据的CRUD操作、历史记录和验证功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTemplateStore } from '../templateStore';
import { TemplateData, TemplateRegion } from '../../types/schema';

// Mock生成ID的函数
vi.mock('../../utils/helpers', () => ({
  generateId: vi.fn(() => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
}));

describe('TemplateStore', () => {
  beforeEach(() => {
    // 重置store到初始状态
    useTemplateStore.setState({
      templateData: {
        id: 'template-1',
        name: '新建模板',
        description: '',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        canvas: {
          width: 794,
          height: 1123,
          scale: 1,
          backgroundColor: '#ffffff',
          showGrid: true,
          gridSize: 10,
          snapToGrid: true,
          dpi: 300
        },
        regions: [],
        metadata: {},
        exportSettings: {
          format: 'json',
          includeMetadata: true,
          compression: false
        }
      },
      history: {
        items: [],
        currentIndex: -1,
        maxItems: 50
      },
      loading: false,
      error: null
    });
  });

  describe('基本操作', () => {
    it('应该正确设置模板', () => {
      const store = useTemplateStore.getState();
      const newTemplate: TemplateData = {
        id: 'template-2',
        name: '测试模板',
        description: '这是一个测试模板',
        version: '2.0.0',
        schemaVersion: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        canvas: {
          width: 800,
          height: 1200,
          scale: 1.5,
          backgroundColor: '#f0f0f0',
          showGrid: false,
          gridSize: 20,
          snapToGrid: false,
          dpi: 150
        },
        regions: [],
        metadata: { author: '测试用户' },
        exportSettings: {
          format: 'pdf',
          includeMetadata: false,
          compression: true
        }
      };

      store.actions.setTemplate(newTemplate);

      const newState = useTemplateStore.getState();
      expect(newState.templateData).toEqual(newTemplate);
      expect(newState.history.items).toHaveLength(1);
      expect(newState.history.currentIndex).toBe(0);
    });

    it('应该正确更新模板', () => {
      const store = useTemplateStore.getState();
      const updates = {
        name: '更新后的模板',
        description: '更新后的描述'
      };

      store.actions.updateTemplate(updates);

      const newState = useTemplateStore.getState();
      expect(newState.templateData.name).toBe('更新后的模板');
      expect(newState.templateData.description).toBe('更新后的描述');
      expect(newState.templateData.updatedAt).toBeDefined();
    });

    it('应该正确重置模板', () => {
      const store = useTemplateStore.getState();
      
      // 先修改模板
      store.actions.updateTemplate({ name: '修改的模板' });
      
      // 重置
      store.actions.resetTemplate();

      const newState = useTemplateStore.getState();
      expect(newState.templateData.name).toBe('新建模板');
      expect(newState.history.items).toHaveLength(0);
      expect(newState.history.currentIndex).toBe(-1);
      expect(newState.error).toBeNull();
    });
  });

  describe('区域操作', () => {
    const mockRegion: TemplateRegion = {
      id: 'region-1',
      type: 'text',
      name: '文本区域',
      x: 100,
      y: 200,
      width: 300,
      height: 50,
      rotation: 0,
      visible: true,
      locked: false,
      zIndex: 1,
      properties: {
        text: '示例文本',
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#000000'
      },
      validation: {
        required: true,
        pattern: null,
        minLength: 1,
        maxLength: 100
      },
      metadata: {}
    } as TemplateRegion;

    it('应该正确添加区域', () => {
      const store = useTemplateStore.getState();
      
      store.actions.addRegion(mockRegion);

      const newState = useTemplateStore.getState();
      expect(newState.templateData.regions).toHaveLength(1);
      expect(newState.templateData.regions[0]).toEqual(mockRegion);
      expect(newState.history.items).toHaveLength(1);
    });

    it('应该正确更新区域', () => {
      const store = useTemplateStore.getState();
      
      // 先添加区域
      store.actions.addRegion(mockRegion);
      
      // 更新区域
      const updates = {
        name: '更新后的文本区域',
        width: 400,
        height: 60
      };
      store.actions.updateRegion('region-1', updates);

      const newState = useTemplateStore.getState();
      const region = newState.templateData.regions.find(r => r.id === 'region-1');
      expect(region?.name).toBe('更新后的文本区域');
      expect(region?.width).toBe(400);
      expect(region?.height).toBe(60);
    });

    it('应该正确删除区域', () => {
      const store = useTemplateStore.getState();
      
      // 添加区域
      store.actions.addRegion(mockRegion);
      expect(useTemplateStore.getState().templateData.regions).toHaveLength(1);
      
      // 删除区域
      store.actions.deleteRegion('region-1');

      const newState = useTemplateStore.getState();
      expect(newState.templateData.regions).toHaveLength(0);
      expect(newState.history.items.length).toBeGreaterThan(1); // 添加 + 删除操作
    });

    it('应该正确批量删除区域', () => {
      const store = useTemplateStore.getState();
      
      // 添加多个区域
      const region2: TemplateRegion = { ...mockRegion, id: 'region-2', name: '区域2' } as TemplateRegion;
      const region3: TemplateRegion = { ...mockRegion, id: 'region-3', name: '区域3' } as TemplateRegion;
      
      store.actions.addRegion(mockRegion);
      store.actions.addRegion(region2);
      store.actions.addRegion(region3);
      
      // 批量删除
      store.actions.deleteRegions(['region-1', 'region-3']);

      const newState = useTemplateStore.getState();
      expect(newState.templateData.regions).toHaveLength(1);
      expect(newState.templateData.regions[0].id).toBe('region-2');
    });

    it('应该正确复制区域', () => {
      const store = useTemplateStore.getState();
      
      store.actions.addRegion(mockRegion);
      
      const duplicatedRegion = store.actions.duplicateRegion('region-1');

      const newState = useTemplateStore.getState();
      expect(newState.templateData.regions).toHaveLength(2);
      expect(duplicatedRegion).toBeDefined();
      expect(duplicatedRegion?.name).toBe('文本区域_副本');
      expect(duplicatedRegion?.x).toBe(120); // 原x(100) + 20
      expect(duplicatedRegion?.y).toBe(220); // 原y(200) + 20
    });

    it('应该正确移动区域', () => {
      const store = useTemplateStore.getState();
      
      store.actions.addRegion(mockRegion);
      store.actions.moveRegion('region-1', 50, -30);

      const newState = useTemplateStore.getState();
      const region = newState.templateData.regions.find(r => r.id === 'region-1');
      expect(region?.x).toBe(150); // 100 + 50
      expect(region?.y).toBe(170); // 200 - 30
    });

    it('应该正确调整区域大小', () => {
      const store = useTemplateStore.getState();
      
      store.actions.addRegion(mockRegion);
      store.actions.resizeRegion('region-1', 500, 80);

      const newState = useTemplateStore.getState();
      const region = newState.templateData.regions.find(r => r.id === 'region-1');
      expect(region?.width).toBe(500);
      expect(region?.height).toBe(80);
    });

    it('应该防止区域尺寸小于1', () => {
      const store = useTemplateStore.getState();
      
      store.actions.addRegion(mockRegion);
      store.actions.resizeRegion('region-1', -10, 0);

      const newState = useTemplateStore.getState();
      const region = newState.templateData.regions.find(r => r.id === 'region-1');
      expect(region?.width).toBe(1);
      expect(region?.height).toBe(1);
    });
  });

  describe('批量区域操作', () => {
    const region1: TemplateRegion = {
      ...{
        id: 'region-1',
        type: 'text',
        name: '区域1',
        x: 100,
        y: 100,
        width: 200,
        height: 50
      }
    } as TemplateRegion;
    
    const region2: TemplateRegion = {
      ...{
        id: 'region-2', 
        type: 'text',
        name: '区域2',
        x: 150,
        y: 200,
        width: 180,
        height: 60
      }
    } as TemplateRegion;

    const region3: TemplateRegion = {
      ...{
        id: 'region-3',
        type: 'text', 
        name: '区域3',
        x: 200,
        y: 300,
        width: 220,
        height: 40
      }
    } as TemplateRegion;

    beforeEach(() => {
      const store = useTemplateStore.getState();
      store.actions.addRegion(region1);
      store.actions.addRegion(region2);
      store.actions.addRegion(region3);
    });

    it('应该正确对齐区域到左边', () => {
      const store = useTemplateStore.getState();
      
      store.actions.alignRegions(['region-1', 'region-2', 'region-3'], 'left');

      const newState = useTemplateStore.getState();
      const regions = newState.templateData.regions;
      expect(regions[0].x).toBe(100); // 基准
      expect(regions[1].x).toBe(100); // 对齐到region1的x
      expect(regions[2].x).toBe(100); // 对齐到region1的x
    });

    it('应该正确对齐区域到顶部', () => {
      const store = useTemplateStore.getState();
      
      store.actions.alignRegions(['region-1', 'region-2', 'region-3'], 'top');

      const newState = useTemplateStore.getState();
      const regions = newState.templateData.regions;
      expect(regions[0].y).toBe(100); // 基准
      expect(regions[1].y).toBe(100); // 对齐到region1的y
      expect(regions[2].y).toBe(100); // 对齐到region1的y
    });

    it('应该正确水平分布区域', () => {
      const store = useTemplateStore.getState();
      
      store.actions.distributeRegions(['region-1', 'region-2', 'region-3'], 'horizontal');

      const newState = useTemplateStore.getState();
      const regions = newState.templateData.regions.sort((a, b) => a.x - b.x);
      
      // 检查区域是否均匀分布
      expect(regions[0].x).toBe(100); // 第一个保持不变
      expect(regions[2].x + regions[2].width).toBe(420); // 最后一个的右边界
      // 中间的区域应该在均匀分布的位置
    });
  });

  describe('历史记录', () => {
    it('应该正确撤销操作', () => {
      const store = useTemplateStore.getState();
      
      // 设置初始模板
      const template1: TemplateData = {
        ...useTemplateStore.getState().templateData,
        name: '模板1'
      };
      store.actions.setTemplate(template1);
      
      // 更新模板
      store.actions.updateTemplate({ name: '模板2' });
      
      // 撤销
      const undoResult = store.actions.undo();
      
      expect(undoResult).toBe(true);
      const newState = useTemplateStore.getState();
      expect(newState.templateData.name).toBe('模板1');
    });

    it('应该正确重做操作', () => {
      const store = useTemplateStore.getState();
      
      const template1: TemplateData = {
        ...useTemplateStore.getState().templateData,
        name: '模板1'
      };
      store.actions.setTemplate(template1);
      store.actions.updateTemplate({ name: '模板2' });
      
      // 撤销后重做
      store.actions.undo();
      const redoResult = store.actions.redo();
      
      expect(redoResult).toBe(true);
      const newState = useTemplateStore.getState();
      expect(newState.templateData.name).toBe('模板2');
    });

    it('应该在没有可撤销操作时返回false', () => {
      const store = useTemplateStore.getState();
      
      const undoResult = store.actions.undo();
      
      expect(undoResult).toBe(false);
    });

    it('应该在没有可重做操作时返回false', () => {
      const store = useTemplateStore.getState();
      
      const redoResult = store.actions.redo();
      
      expect(redoResult).toBe(false);
    });

    it('应该正确清空历史记录', () => {
      const store = useTemplateStore.getState();
      
      // 创建一些历史记录
      store.actions.updateTemplate({ name: '测试1' });
      store.actions.updateTemplate({ name: '测试2' });
      
      // 清空历史记录
      store.actions.clearHistory();
      
      const newState = useTemplateStore.getState();
      expect(newState.history.items).toHaveLength(0);
      expect(newState.history.currentIndex).toBe(-1);
    });
  });

  describe('模板验证', () => {
    it('应该验证通过有效的模板', () => {
      const store = useTemplateStore.getState();
      
      // 设置有效的模板
      store.actions.updateTemplate({ name: '有效模板' });
      store.actions.addRegion({
        id: 'region-1',
        name: '有效区域',
        x: 10,
        y: 10,
        width: 100,
        height: 50
      } as TemplateRegion);
      
      const result = store.actions.validateTemplate();
      
      expect(result.success).toBe(true);
    });

    it('应该检测到空模板名称', () => {
      const store = useTemplateStore.getState();
      
      store.actions.updateTemplate({ name: '   ' }); // 空白名称
      
      const result = store.actions.validateTemplate();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('模板名称不能为空');
    });

    it('应该检测到没有区域的模板', () => {
      const store = useTemplateStore.getState();
      
      store.actions.updateTemplate({ name: '有效名称' });
      
      const result = store.actions.validateTemplate();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('模板必须包含至少一个区域');
    });

    it('应该检测到无效尺寸的区域', () => {
      const store = useTemplateStore.getState();
      
      store.actions.updateTemplate({ name: '有效名称' });
      store.actions.addRegion({
        id: 'invalid-region',
        name: '无效区域',
        x: 10,
        y: 10,
        width: 0, // 无效宽度
        height: 50
      } as TemplateRegion);
      
      const result = store.actions.validateTemplate();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('区域 无效区域 的尺寸无效');
    });

    it('应该警告区域超出画布范围', () => {
      const store = useTemplateStore.getState();
      
      store.actions.updateTemplate({ name: '有效名称' });
      store.actions.addRegion({
        id: 'out-of-bounds',
        name: '超出范围的区域',
        x: 800, // 超出画布宽度
        y: 10,
        width: 100,
        height: 50
      } as TemplateRegion);
      
      const result = store.actions.validateTemplate();
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('区域 超出范围的区域 超出画布范围');
    });
  });

  describe('导入导出', () => {
    it('应该正确导出模板', () => {
      const store = useTemplateStore.getState();
      
      const exported = store.actions.exportTemplate();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toEqual(store.templateData);
    });

    it('应该正确导入有效的模板', () => {
      const store = useTemplateStore.getState();
      
      const mockTemplate: TemplateData = {
        id: 'imported-template',
        name: '导入的模板',
        description: '从JSON导入',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        canvas: {
          width: 800,
          height: 1200,
          scale: 1,
          backgroundColor: '#ffffff',
          showGrid: true,
          gridSize: 10,
          snapToGrid: true,
          dpi: 300
        },
        regions: [],
        metadata: {},
        exportSettings: {
          format: 'json',
          includeMetadata: true,
          compression: false
        }
      };
      
      const result = store.actions.importTemplate(JSON.stringify(mockTemplate));
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
      
      const newState = useTemplateStore.getState();
      expect(newState.templateData).toEqual(mockTemplate);
    });

    it('应该拒绝无效的JSON格式', () => {
      const store = useTemplateStore.getState();
      
      const result = store.actions.importTemplate('invalid json');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('模板文件格式错误');
    });

    it('应该拒绝无效的模板格式', () => {
      const store = useTemplateStore.getState();
      
      const invalidTemplate = { someField: 'value' }; // 缺少必要字段
      
      const result = store.actions.importTemplate(JSON.stringify(invalidTemplate));
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('无效的模板格式');
    });

    it('应该拒绝不支持的Schema版本', () => {
      const store = useTemplateStore.getState();
      
      const incompatibleTemplate = {
        id: 'test',
        name: 'test',
        version: '1.0.0',
        schemaVersion: '2.0.0' // 不支持的版本
      };
      
      const result = store.actions.importTemplate(JSON.stringify(incompatibleTemplate));
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的 Schema 版本: 2.0.0');
      expect(result.warnings).toContain('建议升级模板格式');
    });
  });

  describe('错误和加载状态管理', () => {
    it('应该正确设置错误状态', () => {
      const store = useTemplateStore.getState();
      const errorMessage = '发生了错误';
      
      store.actions.setError(errorMessage);
      
      const newState = useTemplateStore.getState();
      expect(newState.error).toBe(errorMessage);
    });

    it('应该正确清除错误状态', () => {
      const store = useTemplateStore.getState();
      
      store.actions.setError('错误信息');
      store.actions.setError(null);
      
      const newState = useTemplateStore.getState();
      expect(newState.error).toBeNull();
    });

    it('应该正确设置加载状态', () => {
      const store = useTemplateStore.getState();
      
      store.actions.setLoading(true);
      expect(useTemplateStore.getState().loading).toBe(true);
      
      store.actions.setLoading(false);
      expect(useTemplateStore.getState().loading).toBe(false);
    });
  });

  describe('选择器', () => {
    it('应该正确返回模板数据', () => {
      const { useTemplate } = require('../templateStore');
      const template = useTemplate();
      
      expect(template).toEqual(useTemplateStore.getState().templateData);
    });

    it('应该正确返回模板操作', () => {
      const { useTemplateActions } = require('../templateStore');
      const actions = useTemplateActions();
      
      expect(actions).toEqual(useTemplateStore.getState().actions);
    });

    it('应该正确返回历史记录', () => {
      const { useTemplateHistory } = require('../templateStore');
      const history = useTemplateHistory();
      
      expect(history).toEqual(useTemplateStore.getState().history);
    });

    it('应该正确返回加载状态', () => {
      const { useTemplateLoading } = require('../templateStore');
      const loading = useTemplateLoading();
      
      expect(loading).toBe(false);
    });

    it('应该正确返回错误状态', () => {
      const { useTemplateError } = require('../templateStore');
      const error = useTemplateError();
      
      expect(error).toBeNull();
    });
  });
});