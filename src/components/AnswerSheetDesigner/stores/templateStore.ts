/**
 * 模板数据状态管理
 * 使用 Zustand + Immer 实现不可变状态更新
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  TemplateData, 
  TemplateRegion, 
  HistoryState, 
  HistoryItem, 
  OperationResult, 
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_EXPORT_SETTINGS 
} from '../types/schema';
import { generateId } from '../utils/helpers';

interface TemplateState {
  // 当前模板数据
  templateData: TemplateData;
  
  // 历史记录
  history: HistoryState;
  
  // 加载状态
  loading: boolean;
  error: string | null;
  
  // Actions
  actions: {
    // 模板基本操作
    setTemplate: (template: TemplateData) => void;
    updateTemplate: (updates: Partial<TemplateData>) => void;
    resetTemplate: () => void;
    
    // 区域操作
    addRegion: (region: TemplateRegion) => void;
    updateRegion: (id: string, updates: Partial<TemplateRegion>) => void;
    deleteRegion: (id: string) => void;
    deleteRegions: (ids: string[]) => void;
    duplicateRegion: (id: string) => TemplateRegion | null;
    moveRegion: (id: string, deltaX: number, deltaY: number) => void;
    resizeRegion: (id: string, width: number, height: number) => void;
    
    // 批量操作
    updateRegions: (updates: Array<{ id: string; updates: Partial<TemplateRegion> }>) => void;
    alignRegions: (ids: string[], alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical') => void;
    distributeRegions: (ids: string[], distribution: 'horizontal' | 'vertical') => void;
    
    // 历史记录操作
    undo: () => boolean;
    redo: () => boolean;
    clearHistory: () => void;
    addToHistory: (action: string, description: string) => void;
    
    // 模板验证
    validateTemplate: () => OperationResult<boolean>;
    
    // 导入导出
    exportTemplate: () => string;
    importTemplate: (jsonData: string) => OperationResult<TemplateData>;
    
    // 错误处理
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
  };
}

const createDefaultTemplate = (): TemplateData => ({
  id: generateId(),
  name: '新建模板',
  description: '',
  version: '1.0.0',
  schemaVersion: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  canvas: { ...DEFAULT_CANVAS_SETTINGS },
  regions: [],
  metadata: {},
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS }
});

const createDefaultHistory = (): HistoryState => ({
  items: [],
  currentIndex: -1,
  maxItems: 50
});

export const useTemplateStore = create<TemplateState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      templateData: createDefaultTemplate(),
      history: createDefaultHistory(),
      loading: false,
      error: null,
      
      actions: {
        // 设置模板
        setTemplate: (template: TemplateData) => {
          set((state) => {
            state.templateData = { ...template };
            state.error = null;
            // 添加到历史记录
            const historyItem: HistoryItem = {
              id: generateId(),
              timestamp: new Date().toISOString(),
              action: 'set_template',
              data: { ...template },
              description: '加载模板'
            };
            state.history.items = [historyItem];
            state.history.currentIndex = 0;
          });
        },
        
        // 更新模板
        updateTemplate: (updates: Partial<TemplateData>) => {
          set((state) => {
            Object.assign(state.templateData, updates);
            state.templateData.updatedAt = new Date().toISOString();
          });
        },
        
        // 重置模板
        resetTemplate: () => {
          set((state) => {
            state.templateData = createDefaultTemplate();
            state.history = createDefaultHistory();
            state.error = null;
          });
        },
        
        // 添加区域
        addRegion: (region: TemplateRegion) => {
          set((state) => {
            state.templateData.regions.push(region);
            state.templateData.updatedAt = new Date().toISOString();
          });
          get().actions.addToHistory('add_region', `添加区域：${region.name}`);
        },
        
        // 更新区域
        updateRegion: (id: string, updates: Partial<TemplateRegion>) => {
          set((state) => {
            const index = state.templateData.regions.findIndex(r => r.id === id);
            if (index !== -1) {
              Object.assign(state.templateData.regions[index], updates);
              state.templateData.updatedAt = new Date().toISOString();
            }
          });
        },
        
        // 删除区域
        deleteRegion: (id: string) => {
          let regionName = '';
          set((state) => {
            const index = state.templateData.regions.findIndex(r => r.id === id);
            if (index !== -1) {
              regionName = state.templateData.regions[index].name;
              state.templateData.regions.splice(index, 1);
              state.templateData.updatedAt = new Date().toISOString();
            }
          });
          if (regionName) {
            get().actions.addToHistory('delete_region', `删除区域：${regionName}`);
          }
        },
        
        // 删除多个区域
        deleteRegions: (ids: string[]) => {
          set((state) => {
            state.templateData.regions = state.templateData.regions.filter(
              region => !ids.includes(region.id)
            );
            state.templateData.updatedAt = new Date().toISOString();
          });
          get().actions.addToHistory('delete_regions', `删除 ${ids.length} 个区域`);
        },
        
        // 复制区域
        duplicateRegion: (id: string): TemplateRegion | null => {
          const state = get();
          const region = state.templateData.regions.find(r => r.id === id);
          if (!region) return null;
          
          const duplicatedRegion: TemplateRegion = {
            ...region,
            id: generateId(),
            name: `${region.name}_副本`,
            x: region.x + 20,
            y: region.y + 20
          } as TemplateRegion;
          
          state.actions.addRegion(duplicatedRegion);
          return duplicatedRegion;
        },
        
        // 移动区域
        moveRegion: (id: string, deltaX: number, deltaY: number) => {
          set((state) => {
            const region = state.templateData.regions.find(r => r.id === id);
            if (region) {
              region.x += deltaX;
              region.y += deltaY;
              state.templateData.updatedAt = new Date().toISOString();
            }
          });
        },
        
        // 调整区域大小
        resizeRegion: (id: string, width: number, height: number) => {
          set((state) => {
            const region = state.templateData.regions.find(r => r.id === id);
            if (region) {
              region.width = Math.max(1, width);
              region.height = Math.max(1, height);
              state.templateData.updatedAt = new Date().toISOString();
            }
          });
        },
        
        // 批量更新区域
        updateRegions: (updates: Array<{ id: string; updates: Partial<TemplateRegion> }>) => {
          set((state) => {
            updates.forEach(({ id, updates }) => {
              const region = state.templateData.regions.find(r => r.id === id);
              if (region) {
                Object.assign(region, updates);
              }
            });
            state.templateData.updatedAt = new Date().toISOString();
          });
          get().actions.addToHistory('update_regions', `批量更新 ${updates.length} 个区域`);
        },
        
        // 对齐区域
        alignRegions: (ids: string[], alignment: string) => {
          set((state) => {
            const regions = state.templateData.regions.filter(r => ids.includes(r.id));
            if (regions.length < 2) return;
            
            const first = regions[0];
            
            regions.forEach(region => {
              switch (alignment) {
                case 'left':
                  region.x = first.x;
                  break;
                case 'right':
                  region.x = first.x + first.width - region.width;
                  break;
                case 'top':
                  region.y = first.y;
                  break;
                case 'bottom':
                  region.y = first.y + first.height - region.height;
                  break;
                case 'center-horizontal':
                  region.x = first.x + (first.width - region.width) / 2;
                  break;
                case 'center-vertical':
                  region.y = first.y + (first.height - region.height) / 2;
                  break;
              }
            });
            
            state.templateData.updatedAt = new Date().toISOString();
          });
          get().actions.addToHistory('align_regions', `对齐 ${ids.length} 个区域`);
        },
        
        // 分布区域
        distributeRegions: (ids: string[], distribution: 'horizontal' | 'vertical') => {
          set((state) => {
            const regions = state.templateData.regions.filter(r => ids.includes(r.id));
            if (regions.length < 3) return;
            
            regions.sort((a, b) => distribution === 'horizontal' ? a.x - b.x : a.y - b.y);
            
            const first = regions[0];
            const last = regions[regions.length - 1];
            const totalSpace = distribution === 'horizontal' 
              ? last.x + last.width - first.x
              : last.y + last.height - first.y;
            
            const spacing = (totalSpace - regions.reduce((sum, r) => 
              sum + (distribution === 'horizontal' ? r.width : r.height), 0
            )) / (regions.length - 1);
            
            let currentPos = distribution === 'horizontal' ? first.x : first.y;
            
            regions.forEach(region => {
              if (distribution === 'horizontal') {
                region.x = currentPos;
                currentPos += region.width + spacing;
              } else {
                region.y = currentPos;
                currentPos += region.height + spacing;
              }
            });
            
            state.templateData.updatedAt = new Date().toISOString();
          });
          get().actions.addToHistory('distribute_regions', `分布 ${ids.length} 个区域`);
        },
        
        // 撤销
        undo: (): boolean => {
          const state = get();
          if (state.history.currentIndex > 0) {
            set((draft) => {
              draft.history.currentIndex--;
              draft.templateData = { ...state.history.items[draft.history.currentIndex].data };
            });
            return true;
          }
          return false;
        },
        
        // 重做
        redo: (): boolean => {
          const state = get();
          if (state.history.currentIndex < state.history.items.length - 1) {
            set((draft) => {
              draft.history.currentIndex++;
              draft.templateData = { ...state.history.items[draft.history.currentIndex].data };
            });
            return true;
          }
          return false;
        },
        
        // 清空历史记录
        clearHistory: () => {
          set((state) => {
            state.history.items = [];
            state.history.currentIndex = -1;
          });
        },
        
        // 添加到历史记录
        addToHistory: (action: string, description: string) => {
          set((state) => {
            const historyItem: HistoryItem = {
              id: generateId(),
              timestamp: new Date().toISOString(),
              action,
              data: { ...state.templateData },
              description
            };
            
            // 移除当前索引之后的项
            state.history.items = state.history.items.slice(0, state.history.currentIndex + 1);
            
            // 添加新项
            state.history.items.push(historyItem);
            
            // 限制历史记录数量
            if (state.history.items.length > state.history.maxItems) {
              state.history.items = state.history.items.slice(-state.history.maxItems);
            }
            
            state.history.currentIndex = state.history.items.length - 1;
          });
        },
        
        // 验证模板
        validateTemplate: (): OperationResult<boolean> => {
          const state = get();
          const template = state.templateData;
          
          // 基本验证
          if (!template.name.trim()) {
            return { success: false, error: '模板名称不能为空' };
          }
          
          if (template.regions.length === 0) {
            return { success: false, error: '模板必须包含至少一个区域' };
          }
          
          // 区域验证
          const warnings: string[] = [];
          for (const region of template.regions) {
            if (region.width <= 0 || region.height <= 0) {
              return { success: false, error: `区域 ${region.name} 的尺寸无效` };
            }
            
            if (region.x < 0 || region.y < 0 || 
                region.x + region.width > template.canvas.width ||
                region.y + region.height > template.canvas.height) {
              warnings.push(`区域 ${region.name} 超出画布范围`);
            }
          }
          
          return { success: true, warnings };
        },
        
        // 导出模板
        exportTemplate: (): string => {
          const state = get();
          return JSON.stringify(state.templateData, null, 2);
        },
        
        // 导入模板
        importTemplate: (jsonData: string): OperationResult<TemplateData> => {
          try {
            const template = JSON.parse(jsonData) as TemplateData;
            
            // 基本验证
            if (!template.id || !template.name || !template.version) {
              return { success: false, error: '无效的模板格式' };
            }
            
            // Schema 版本检查
            if (template.schemaVersion !== '1.0.0') {
              return { 
                success: false, 
                error: `不支持的 Schema 版本: ${template.schemaVersion}`,
                warnings: ['建议升级模板格式']
              };
            }
            
            get().actions.setTemplate(template);
            return { success: true, data: template };
            
          } catch (error) {
            return { success: false, error: '模板文件格式错误' };
          }
        },
        
        // 设置错误
        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },
        
        // 设置加载状态
        setLoading: (loading: boolean) => {
          set((state) => {
            state.loading = loading;
          });
        }
      }
    }))
  )
);

// 选择器
export const useTemplate = () => useTemplateStore(state => state.templateData);
export const useTemplateActions = () => useTemplateStore(state => state.actions);
export const useTemplateHistory = () => useTemplateStore(state => state.history);
export const useTemplateLoading = () => useTemplateStore(state => state.loading);
export const useTemplateError = () => useTemplateStore(state => state.error);