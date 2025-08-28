/**
 * Webpack 性能优化配置
 * 用于代码分割、缓存优化和性能提升
 */

const path = require('path');

// 代码分割配置
const optimization = {
  // 代码分割
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // 第三方库单独分割
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,
      },
      
      // React 相关库
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
        name: 'react-vendor',
        chunks: 'all',
        priority: 20,
      },
      
      // Ant Design
      antd: {
        test: /[\\/]node_modules[\\/]antd[\\/]/,
        name: 'antd-vendor',
        chunks: 'all',
        priority: 15,
      },
      
      // 图表库
      charts: {
        test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)[\\/]/,
        name: 'charts-vendor',
        chunks: 'all',
        priority: 15,
      },
      
      // 工具库
      utils: {
        test: /[\\/]node_modules[\\/](lodash|moment|dayjs|axios)[\\/]/,
        name: 'utils-vendor',
        chunks: 'all',
        priority: 12,
      },
      
      // 设计系统
      designSystem: {
        test: /[\\/]src[\\/]design-system[\\/]/,
        name: 'design-system',
        chunks: 'all',
        priority: 30,
      },
      
      // 公共组件
      common: {
        name: 'common',
        minChunks: 2,
        chunks: 'all',
        priority: 5,
        enforce: true,
      },
    },
  },
  
  // 运行时代码分离
  runtimeChunk: {
    name: 'runtime',
  },
  
  // 模块连接优化
  concatenateModules: true,
  
  // 副作用标记
  sideEffects: false,
  
  // 压缩配置
  minimize: true,
  minimizer: [
    // 可以在这里添加自定义的压缩器
  ],
};

// 性能预算配置
const performance = {
  hints: 'warning',
  maxEntrypointSize: 512000,
  maxAssetSize: 256000,
  assetFilter: (assetFilename) => {
    // 只检查 JS 和 CSS 文件
    return /\.(js|css)$/.test(assetFilename);
  },
};

// 缓存配置
const cache = {
  type: 'filesystem',
  cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
  buildDependencies: {
    config: [__filename],
  },
  version: '1.0.0',
};

// 解析优化
const resolve = {
  // 模块解析缓存
  cache: true,
  
  // 别名配置
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@hooks': path.resolve(__dirname, 'src/hooks'),
    '@design-system': path.resolve(__dirname, 'src/design-system'),
  },
  
  // 扩展名解析
  extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  
  // 模块查找目录
  modules: ['node_modules', 'src'],
  
  // 优先使用 ES 模块
  mainFields: ['module', 'main'],
};

// 模块配置
const module = {
  rules: [
    {
      test: /\.(ts|tsx)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      ],
    },
    {
      test: /\.css$/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
          },
        },
        'postcss-loader',
      ],
    },
    {
      test: /\.(png|jpe?g|gif|svg)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'images/[name][ext][query]',
      },
    },
  ],
};

// 外部依赖配置（CDN 加载）
const externals = {
  // 如果需要从CDN加载大型库，可以配置在这里
  // 'react': 'React',
  // 'react-dom': 'ReactDOM',
};

// 开发服务器配置
const devServer = {
  hot: true,
  compress: true,
  historyApiFallback: true,
  client: {
    overlay: {
      errors: true,
      warnings: false,
    },
  },
};

// Webpack 插件优化
const plugins = [
  // Bundle 分析插件（开发时使用）
  // new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
  //   analyzerMode: 'server',
  //   openAnalyzer: false,
  // }),
  
  // 进度插件
  new (require('webpack')).ProgressPlugin(),
  
  // 定义插件
  new (require('webpack')).DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  }),
];

// 完整配置
const webpackConfig = {
  mode: process.env.NODE_ENV || 'development',
  
  entry: {
    main: './src/index.tsx',
  },
  
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
  },
  
  optimization,
  performance,
  cache,
  resolve,
  module,
  externals,
  plugins,
  
  ...(process.env.NODE_ENV === 'development' && { devServer }),
};

// 生产环境额外配置
if (process.env.NODE_ENV === 'production') {
  // 生产环境特定优化
  webpackConfig.optimization.minimize = true;
  
  // 添加压缩插件
  const TerserPlugin = require('terser-webpack-plugin');
  const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
  
  webpackConfig.optimization.minimizer = [
    new TerserPlugin({
      terserOptions: {
        parse: {
          ecma: 8,
        },
        compress: {
          ecma: 5,
          warnings: false,
          comparisons: false,
          inline: 2,
          drop_console: true,
        },
        mangle: {
          safari10: true,
        },
        output: {
          ecma: 5,
          comments: false,
          ascii_only: true,
        },
      },
    }),
    new CssMinimizerPlugin(),
  ];
}

module.exports = webpackConfig;