/**
 * 智阅3.0设计系统 - 主入口文件
 * 统一导出设计系统的所有组件、工具和配置
 */

// 设计令牌
export { designTokens, colors, typography, spacing, borderRadius, boxShadow, animation, breakpoints, zIndex } from './tokens';

// 主题配置
export { antdTheme, cssVariables, darkTheme } from './theme';
export { completeDarkTheme, darkColors, darkCssVariables } from './dark-theme';

// 工具函数
export { 
  cn, 
  responsive, 
  colors as colorUtils, 
  states, 
  variants, 
  animations, 
  layout, 
  helpers,
  styleUtils 
} from './utils';

// 组件样式
export { 
  buttonStyles, 
  cardStyles, 
  inputStyles, 
  badgeStyles, 
  alertStyles, 
  modalStyles, 
  tableStyles, 
  navigationStyles, 
  formStyles, 
  loadingStyles, 
  responsiveStyles,
  componentStyles 
} from './components';

// 导入用于默认导出
import { designTokens } from './tokens';
import { antdTheme } from './theme';
import { styleUtils } from './utils';
import { componentStyles } from './components';

// 无障碍性工具
export { 
  srOnly,
  SkipToContent,
  focusStyles,
  ariaProps,
  roles,
  keyboardNav,
  colorContrast,
  focusManagement,
  liveRegion
} from './accessibility';

// 动画和微交互系统
export { 
  durations,
  easings,
  microInteractions,
  createAnimation,
  animationClasses,
  pageTransitions,
  responsiveAnimations,
  prefersReducedMotion,
  getAnimationConfig,
  fadeIn,
  slideInDown,
  slideInUp,
  slideInLeft,
  slideInRight,
  scaleIn,
  bounceIn,
  pulse,
  shake,
  spin
} from './animations';

// 动画组件
export {
  AnimatedContainer,
  StaggeredAnimation,
  ScrollAnimation,
  HoverAnimation,
  TapAnimation,
  LoadingAnimation,
  PageTransition,
  InteractiveAnimation
} from './animations/components';

// 图表系统
export {
  chartTheme,
  darkChartTheme,
  chartSizes,
  getChartTheme,
  getSeriesColors,
  formatNumber,
  formatPercentage,
  formatDate,
  getResponsiveSize
} from './charts';

// 图表组件
export { default as ChartContainer } from './charts/ChartContainer';
export { default as BarChart } from './charts/BarChart';
export { default as LineChart } from './charts/LineChart';
export { default as PieChart } from './charts/PieChart';

// 性能优化组件
export { default as PerformanceMonitor } from '../components/performance/PerformanceMonitor';
export { default as LazyWrapper, AdvancedLazyWrapper } from '../components/performance/LazyWrapper';

// 性能工具
export {
  useDebounce,
  useThrottle,
  useVirtualScroll,
  useLazyImage,
  useSafeState,
  useMemoryMonitor,
  observeWebVitals,
  lazyWithRetry,
  preloadResource,
  observeLongTasks
} from '../utils/performance';

// 移动端优化
export { default as MobileOptimizer } from '../components/mobile/MobileOptimizer';
export { getDeviceInfo } from '../utils/mobile';
export { 
  useDeviceInfo,
  useBreakpoint,
  useNetworkStatus,
  usePWAInstall,
  useSwipeGesture,
  useVirtualKeyboard,
  useScrollDirection,
  useSafeArea,
  usePerformanceMonitor
} from '../hooks/useMobile';

// PWA组件
export { default as PWAInstallPrompt, PWAStatusBadge, PWAInstallButton } from '../components/pwa/PWAInstallPrompt';

// 类型定义
export type { ComponentVariant } from './components';
export type { 
  BaseChartProps, 
  ChartContainerProps, 
  DataSeries, 
  AxisConfig, 
  LegendConfig, 
  TooltipConfig 
} from './charts';
export type { PerformanceMetrics } from '../utils/performance';
export type { DeviceInfo } from '../utils/mobile';

// 设计系统版本
export const DESIGN_SYSTEM_VERSION = '1.0.0';

// 默认导出
export default {
  tokens: designTokens,
  theme: antdTheme,
  utils: styleUtils,
  components: componentStyles,
  version: DESIGN_SYSTEM_VERSION
};