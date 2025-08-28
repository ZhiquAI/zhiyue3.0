#!/usr/bin/env python3
"""
数据库性能优化管理脚本
用于运行性能分析和应用优化建议
"""

import sys
import os
import argparse
import json
from pathlib import Path

# 添加项目根路径到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from database.performance_analyzer import (
    DatabasePerformanceAnalyzer, 
    test_performance_analyzer
)
from database.index_optimizer import (
    DatabaseIndexOptimizer,
    optimize_database_indexes
)
from config.database import get_database_url
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_performance_analysis(database_url: str, output_file: str = None):
    """运行性能分析"""
    print("=" * 60)
    print("开始数据库性能分析...")
    print("=" * 60)
    
    analyzer = DatabasePerformanceAnalyzer(database_url)
    
    # 测试几个关键查询的性能
    test_queries = [
        {
            'name': '考试列表查询',
            'sql': 'SELECT COUNT(*) FROM exams WHERE status = ?',
            'params': {'status': 'active'}
        },
        {
            'name': '答题卡状态查询',
            'sql': 'SELECT COUNT(*) FROM answer_sheets WHERE grading_status = ?',
            'params': {'grading_status': 'pending'}
        },
        {
            'name': '学生考试关联查询',
            'sql': '''SELECT e.name, COUNT(s.id) as student_count 
                     FROM exams e 
                     LEFT JOIN students s ON e.id = s.exam_id 
                     GROUP BY e.id, e.name 
                     LIMIT 10'''
        },
        {
            'name': '评分任务优先级查询',
            'sql': '''SELECT task_type, COUNT(*) as task_count 
                     FROM grading_tasks 
                     WHERE status = ? 
                     GROUP BY task_type''',
            'params': {'status': 'pending'}
        }
    ]
    
    print("\n测试关键查询性能...")
    for query_info in test_queries:
        try:
            print(f"\n正在测试: {query_info['name']}")
            
            # 修正参数传递方式
            if 'params' in query_info:
                # 将命名参数转换为位置参数
                sql_with_params = query_info['sql']
                params_list = list(query_info['params'].values())
                
                # 简单的参数替换（用于SQLite风格的?参数）
                if '?' in sql_with_params:
                    metric = analyzer.measure_query_performance(
                        sql_with_params, 
                        dict(zip([f"param{i}" for i in range(len(params_list))], params_list))
                    )
                else:
                    metric = analyzer.measure_query_performance(
                        sql_with_params, 
                        query_info['params']
                    )
            else:
                metric = analyzer.measure_query_performance(query_info['sql'])
            
            print(f"  执行时间: {metric.execution_time:.3f}s")
            print(f"  表扫描次数: {metric.table_scans}")
            
        except Exception as e:
            print(f"  查询失败: {e}")
            logger.warning(f"Query '{query_info['name']}' failed: {e}")
    
    # 生成完整的性能报告
    print("\n生成性能报告...")
    try:
        report = analyzer.generate_performance_report()
        
        print(f"\n性能评分: {report.overall_score}/100")
        print(f"慢查询数量: {len(report.slow_queries)}")
        print(f"分析的表数量: {len(report.table_analysis)}")
        
        print("\n表分析结果:")
        for table in report.table_analysis:
            print(f"  - {table.table_name}: {table.row_count:,} 行, "
                  f"{table.size_mb:.2f}MB, {table.index_count} 个索引")
            if table.missing_indexes:
                print(f"    缺失索引建议: {len(table.missing_indexes)} 个")
        
        print("\n优化建议:")
        for i, recommendation in enumerate(report.recommendations, 1):
            print(f"  {i}. {recommendation}")
        
        # 导出报告
        if output_file:
            analyzer.export_report(report, output_file)
            print(f"\n性能报告已导出到: {output_file}")
        
        return report
        
    except Exception as e:
        logger.error(f"Failed to generate performance report: {e}")
        print(f"生成性能报告失败: {e}")
        return None


def run_index_optimization(database_url: str, dry_run: bool = True, output_file: str = None):
    """运行索引优化"""
    print("=" * 60)
    print("开始数据库索引优化...")
    print(f"模式: {'预览模式' if dry_run else '执行模式'}")
    print("=" * 60)
    
    try:
        optimizer = DatabaseIndexOptimizer(database_url)
        
        # 分析现有索引
        print("\n分析现有索引...")
        existing_indexes = optimizer.analyze_existing_indexes()
        for table, indexes in existing_indexes.items():
            print(f"  - {table}: {len(indexes)} 个索引")
            for idx in indexes[:3]:  # 显示前3个
                if 'columns' in idx and idx['columns']:
                    print(f"    * {idx['name']}: {', '.join(idx['columns'])}")
                else:
                    print(f"    * {idx['name']}")
        
        # 生成优化建议
        print("\n生成索引优化建议...")
        recommendations = optimizer.analyze_and_recommend_indexes()
        
        print(f"\n共生成 {len(recommendations)} 个索引优化建议:")
        
        # 按优先级分组显示
        high_priority = [r for r in recommendations if r.estimated_benefit >= 8]
        medium_priority = [r for r in recommendations if 5 <= r.estimated_benefit < 8]
        low_priority = [r for r in recommendations if r.estimated_benefit < 5]
        
        if high_priority:
            print(f"\n高优先级建议 ({len(high_priority)} 个):")
            for rec in high_priority:
                print(f"  - {rec.table_name}.{rec.index_name} "
                      f"(收益: {rec.estimated_benefit}/10, 大小: {rec.size_impact_mb:.1f}MB)")
                print(f"    列: {', '.join(rec.columns)}")
                if rec.is_partial:
                    print(f"    条件: {rec.condition}")
        
        if medium_priority:
            print(f"\n中优先级建议 ({len(medium_priority)} 个):")
            for rec in medium_priority:
                print(f"  - {rec.table_name}.{rec.index_name} "
                      f"(收益: {rec.estimated_benefit}/10, 大小: {rec.size_impact_mb:.1f}MB)")
        
        if low_priority:
            print(f"\n低优先级建议 ({len(low_priority)} 个):")
            for rec in low_priority:
                print(f"  - {rec.table_name}.{rec.index_name} "
                      f"(收益: {rec.estimated_benefit}/10)")
        
        # 应用优化
        print(f"\n{'预览' if dry_run else '应用'}索引优化...")
        results = optimizer.apply_index_optimizations(recommendations, dry_run=dry_run)
        
        print(f"  应用成功: {len(results['applied'])} 个")
        print(f"  跳过(已存在): {len(results['skipped'])} 个")
        print(f"  失败: {len(results['failed'])} 个")
        
        if not dry_run:
            print(f"  总执行时间: {results['total_time']:.2f}s")
            print(f"  预计存储影响: {results['total_size_impact']:.2f}MB")
        
        # 显示失败的索引
        if results['failed']:
            print("\n失败的索引:")
            for failed in results['failed']:
                print(f"  - {failed['index_name']}: {failed['error']}")
        
        # 生成详细报告
        report = optimizer.generate_optimization_report()
        
        # 导出报告
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'optimization_results': results,
                    'optimization_report': report
                }, f, ensure_ascii=False, indent=2)
            print(f"\n优化报告已导出到: {output_file}")
        
        return results, report
        
    except Exception as e:
        logger.error(f"Index optimization failed: {e}")
        print(f"索引优化失败: {e}")
        return None, None


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='数据库性能优化工具')
    
    parser.add_argument('--action', choices=['analyze', 'optimize', 'both'], 
                       default='both', help='要执行的操作')
    parser.add_argument('--database-url', help='数据库连接URL')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='预览模式，不实际执行优化')
    parser.add_argument('--execute', action='store_true', 
                       help='实际执行优化（覆盖--dry-run）')
    parser.add_argument('--output-dir', default='./reports',
                       help='报告输出目录')
    
    args = parser.parse_args()
    
    # 确定执行模式
    dry_run = args.dry_run and not args.execute
    
    # 获取数据库URL
    if args.database_url:
        database_url = args.database_url
    else:
        try:
            database_url = get_database_url()
        except Exception as e:
            print(f"无法获取数据库连接: {e}")
            print("请使用 --database-url 参数指定数据库连接")
            return 1
    
    # 创建输出目录
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    # 生成报告文件名
    timestamp = __import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')
    performance_report_file = output_dir / f'performance_analysis_{timestamp}.json'
    optimization_report_file = output_dir / f'index_optimization_{timestamp}.json'
    
    print("数据库性能优化工具")
    print(f"数据库: {database_url}")
    print(f"执行模式: {'实际执行' if not dry_run else '预览模式'}")
    print(f"输出目录: {output_dir}")
    print()
    
    success = True
    
    # 运行性能分析
    if args.action in ['analyze', 'both']:
        try:
            performance_report = run_performance_analysis(
                database_url, 
                str(performance_report_file)
            )
            if not performance_report:
                success = False
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
            success = False
    
    # 运行索引优化
    if args.action in ['optimize', 'both']:
        try:
            optimization_results, optimization_report = run_index_optimization(
                database_url,
                dry_run=dry_run,
                output_file=str(optimization_report_file)
            )
            if not optimization_results:
                success = False
        except Exception as e:
            logger.error(f"Index optimization failed: {e}")
            success = False
    
    if success:
        print("\n" + "=" * 60)
        print("数据库优化完成！")
        print("=" * 60)
        
        if args.action in ['analyze', 'both']:
            print(f"性能分析报告: {performance_report_file}")
        
        if args.action in ['optimize', 'both']:
            print(f"索引优化报告: {optimization_report_file}")
            if dry_run:
                print("\n注意: 当前为预览模式，未实际应用索引优化。")
                print("要实际应用优化，请使用 --execute 参数。")
        
        return 0
    else:
        print("\n数据库优化过程中出现错误，请查看日志。")
        return 1


if __name__ == '__main__':
    sys.exit(main())