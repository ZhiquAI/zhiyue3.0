"""
数据库性能分析器
用于识别慢查询、分析性能瓶颈、提供优化建议
"""

import logging
import time
import json
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from datetime import datetime, timedelta
from dataclasses import dataclass
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@dataclass
class QueryPerformanceMetric:
    """查询性能指标"""
    query_hash: str
    sql: str
    execution_time: float
    execution_count: int
    avg_execution_time: float
    max_execution_time: float
    min_execution_time: float
    table_scans: int
    index_usage: Dict[str, int]
    timestamp: datetime
    database: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'query_hash': self.query_hash,
            'sql': self.sql,
            'execution_time': self.execution_time,
            'execution_count': self.execution_count,
            'avg_execution_time': self.avg_execution_time,
            'max_execution_time': self.max_execution_time,
            'min_execution_time': self.min_execution_time,
            'table_scans': self.table_scans,
            'index_usage': self.index_usage,
            'timestamp': self.timestamp.isoformat(),
            'database': self.database
        }


@dataclass
class TableAnalysis:
    """表分析结果"""
    table_name: str
    row_count: int
    size_mb: float
    index_count: int
    missing_indexes: List[str]
    unused_indexes: List[str]
    fragmentation_ratio: float
    last_analyzed: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'table_name': self.table_name,
            'row_count': self.row_count,
            'size_mb': self.size_mb,
            'index_count': self.index_count,
            'missing_indexes': self.missing_indexes,
            'unused_indexes': self.unused_indexes,
            'fragmentation_ratio': self.fragmentation_ratio,
            'last_analyzed': self.last_analyzed.isoformat()
        }


@dataclass
class DatabasePerformanceReport:
    """数据库性能报告"""
    database_name: str
    report_time: datetime
    slow_queries: List[QueryPerformanceMetric]
    table_analysis: List[TableAnalysis]
    recommendations: List[str]
    overall_score: int  # 0-100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'database_name': self.database_name,
            'report_time': self.report_time.isoformat(),
            'slow_queries': [q.to_dict() for q in self.slow_queries],
            'table_analysis': [t.to_dict() for t in self.table_analysis],
            'recommendations': self.recommendations,
            'overall_score': self.overall_score
        }


class DatabasePerformanceAnalyzer:
    """数据库性能分析器"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # 性能阈值配置
        self.slow_query_threshold = 0.5  # 500ms
        self.large_table_threshold = 10000  # 10k rows
        self.fragmentation_threshold = 0.3  # 30% fragmentation
        
        # 查询性能缓存
        self.query_metrics: Dict[str, QueryPerformanceMetric] = {}
        
    @contextmanager
    def get_session(self):
        """获取数据库会话"""
        session = self.SessionLocal()
        try:
            yield session
        finally:
            session.close()
    
    def measure_query_performance(self, sql: str, params: Dict = None) -> QueryPerformanceMetric:
        """测量查询性能"""
        query_hash = hash(sql)
        start_time = time.time()
        
        with self.get_session() as session:
            try:
                result = session.execute(text(sql), params or {})
                execution_time = time.time() - start_time
                
                # 获取查询计划信息（如果支持）
                table_scans, index_usage = self._analyze_query_plan(session, sql)
                
                # 更新或创建性能指标
                if str(query_hash) in self.query_metrics:
                    metric = self.query_metrics[str(query_hash)]
                    metric.execution_count += 1
                    metric.execution_time = execution_time
                    metric.avg_execution_time = (
                        (metric.avg_execution_time * (metric.execution_count - 1) + execution_time) / 
                        metric.execution_count
                    )
                    metric.max_execution_time = max(metric.max_execution_time, execution_time)
                    metric.min_execution_time = min(metric.min_execution_time, execution_time)
                else:
                    metric = QueryPerformanceMetric(
                        query_hash=str(query_hash),
                        sql=sql,
                        execution_time=execution_time,
                        execution_count=1,
                        avg_execution_time=execution_time,
                        max_execution_time=execution_time,
                        min_execution_time=execution_time,
                        table_scans=table_scans,
                        index_usage=index_usage,
                        timestamp=datetime.utcnow(),
                        database=self.database_url.split('/')[-1]
                    )
                    self.query_metrics[str(query_hash)] = metric
                
                return metric
                
            except Exception as e:
                logger.error(f"Query execution failed: {e}")
                raise
    
    def _analyze_query_plan(self, session, sql: str) -> Tuple[int, Dict[str, int]]:
        """分析查询执行计划"""
        table_scans = 0
        index_usage = {}
        
        try:
            # 对于SQLite，使用EXPLAIN QUERY PLAN
            if 'sqlite' in self.database_url.lower():
                explain_result = session.execute(text(f"EXPLAIN QUERY PLAN {sql}"))
                for row in explain_result:
                    detail = str(row[3]) if len(row) > 3 else str(row)
                    if 'SCAN TABLE' in detail.upper():
                        table_scans += 1
                    elif 'USING INDEX' in detail.upper():
                        # 提取索引名称
                        parts = detail.upper().split('USING INDEX')
                        if len(parts) > 1:
                            index_name = parts[1].strip().split()[0]
                            index_usage[index_name] = index_usage.get(index_name, 0) + 1
            
            # 对于PostgreSQL，使用EXPLAIN (ANALYZE, BUFFERS)
            elif 'postgresql' in self.database_url.lower():
                explain_result = session.execute(text(f"EXPLAIN (ANALYZE, BUFFERS) {sql}"))
                for row in explain_result:
                    line = row[0]
                    if 'Seq Scan' in line:
                        table_scans += 1
                    elif 'Index' in line:
                        # 简单的索引使用计数
                        index_usage['index_usage'] = index_usage.get('index_usage', 0) + 1
                        
        except Exception as e:
            logger.warning(f"Failed to analyze query plan: {e}")
        
        return table_scans, index_usage
    
    def analyze_table_performance(self, table_name: str) -> TableAnalysis:
        """分析表性能"""
        with self.get_session() as session:
            try:
                # 获取表行数
                row_count_result = session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                row_count = row_count_result.scalar()
                
                # 获取表大小（近似）
                size_mb = self._get_table_size(session, table_name)
                
                # 分析索引
                index_info = self._analyze_table_indexes(session, table_name)
                missing_indexes = self._suggest_missing_indexes(session, table_name)
                
                # 计算碎片化率（简化版）
                fragmentation_ratio = self._calculate_fragmentation(session, table_name)
                
                return TableAnalysis(
                    table_name=table_name,
                    row_count=row_count,
                    size_mb=size_mb,
                    index_count=len(index_info['indexes']),
                    missing_indexes=missing_indexes,
                    unused_indexes=index_info['unused_indexes'],
                    fragmentation_ratio=fragmentation_ratio,
                    last_analyzed=datetime.utcnow()
                )
                
            except Exception as e:
                logger.error(f"Table analysis failed for {table_name}: {e}")
                # 返回默认分析结果
                return TableAnalysis(
                    table_name=table_name,
                    row_count=0,
                    size_mb=0.0,
                    index_count=0,
                    missing_indexes=[],
                    unused_indexes=[],
                    fragmentation_ratio=0.0,
                    last_analyzed=datetime.utcnow()
                )
    
    def _get_table_size(self, session, table_name: str) -> float:
        """获取表大小（MB）"""
        try:
            if 'sqlite' in self.database_url.lower():
                # SQLite使用PRAGMA
                result = session.execute(text(f"PRAGMA page_count"))
                page_count = result.scalar() or 0
                page_size_result = session.execute(text("PRAGMA page_size"))
                page_size = page_size_result.scalar() or 1024
                return (page_count * page_size) / (1024 * 1024)  # 转换为MB
            
            elif 'postgresql' in self.database_url.lower():
                # PostgreSQL使用pg_relation_size
                result = session.execute(text(
                    f"SELECT pg_size_pretty(pg_total_relation_size('{table_name}'))"
                ))
                size_str = result.scalar() or "0 MB"
                # 简单解析大小字符串
                if 'MB' in size_str:
                    return float(size_str.replace(' MB', ''))
                elif 'KB' in size_str:
                    return float(size_str.replace(' KB', '')) / 1024
                elif 'GB' in size_str:
                    return float(size_str.replace(' GB', '')) * 1024
        except Exception as e:
            logger.warning(f"Failed to get table size for {table_name}: {e}")
        
        return 0.0
    
    def _analyze_table_indexes(self, session, table_name: str) -> Dict[str, Any]:
        """分析表索引"""
        indexes = []
        unused_indexes = []
        
        try:
            if 'sqlite' in self.database_url.lower():
                # SQLite索引信息
                result = session.execute(text(f"PRAGMA index_list({table_name})"))
                for row in result:
                    index_name = row[1]
                    indexes.append({
                        'name': index_name,
                        'unique': bool(row[2]),
                        'columns': self._get_index_columns_sqlite(session, index_name)
                    })
            
            elif 'postgresql' in self.database_url.lower():
                # PostgreSQL索引信息
                result = session.execute(text("""
                    SELECT indexname, indexdef 
                    FROM pg_indexes 
                    WHERE tablename = :table_name
                """), {'table_name': table_name})
                
                for row in result:
                    indexes.append({
                        'name': row[0],
                        'definition': row[1]
                    })
                    
        except Exception as e:
            logger.warning(f"Failed to analyze indexes for {table_name}: {e}")
        
        return {
            'indexes': indexes,
            'unused_indexes': unused_indexes
        }
    
    def _get_index_columns_sqlite(self, session, index_name: str) -> List[str]:
        """获取SQLite索引的列信息"""
        try:
            result = session.execute(text(f"PRAGMA index_info({index_name})"))
            return [row[2] for row in result]  # column name is at index 2
        except:
            return []
    
    def _suggest_missing_indexes(self, session, table_name: str) -> List[str]:
        """建议缺失的索引"""
        suggestions = []
        
        # 根据表名提供建议
        table_index_suggestions = {
            'exams': [
                'CREATE INDEX IF NOT EXISTS idx_exams_status_created ON exams(status, created_at)',
                'CREATE INDEX IF NOT EXISTS idx_exams_creator_subject ON exams(created_by, subject)'
            ],
            'answer_sheets': [
                'CREATE INDEX IF NOT EXISTS idx_answer_sheets_exam_student ON answer_sheets(exam_id, student_id)',
                'CREATE INDEX IF NOT EXISTS idx_answer_sheets_grading_status ON answer_sheets(grading_status)',
                'CREATE INDEX IF NOT EXISTS idx_answer_sheets_score ON answer_sheets(total_score)'
            ],
            'students': [
                'CREATE INDEX IF NOT EXISTS idx_students_exam_class ON students(exam_id, class_name)',
                'CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)',
                'CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)'
            ],
            'users': [
                'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
                'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
                'CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(is_active, role)'
            ],
            'grading_tasks': [
                'CREATE INDEX IF NOT EXISTS idx_grading_tasks_status_priority ON grading_tasks(status, priority)',
                'CREATE INDEX IF NOT EXISTS idx_grading_tasks_created ON grading_tasks(created_at)'
            ]
        }
        
        return table_index_suggestions.get(table_name, [])
    
    def _calculate_fragmentation(self, session, table_name: str) -> float:
        """计算表碎片化率（简化版）"""
        try:
            if 'sqlite' in self.database_url.lower():
                # SQLite的简化碎片化检测
                # 使用页面利用率作为碎片化指标
                return 0.1  # 假设10%碎片化
            
            elif 'postgresql' in self.database_url.lower():
                # PostgreSQL可以使用pgstattuple扩展
                # 这里返回模拟值
                return 0.05  # 假设5%碎片化
                
        except Exception as e:
            logger.warning(f"Failed to calculate fragmentation for {table_name}: {e}")
        
        return 0.0
    
    def get_slow_queries(self, threshold_seconds: float = None) -> List[QueryPerformanceMetric]:
        """获取慢查询列表"""
        threshold = threshold_seconds or self.slow_query_threshold
        return [
            metric for metric in self.query_metrics.values()
            if metric.avg_execution_time > threshold
        ]
    
    def generate_performance_report(self) -> DatabasePerformanceReport:
        """生成性能分析报告"""
        # 分析主要表
        main_tables = ['exams', 'answer_sheets', 'students', 'users', 'grading_tasks']
        table_analyses = []
        
        for table_name in main_tables:
            try:
                analysis = self.analyze_table_performance(table_name)
                table_analyses.append(analysis)
            except Exception as e:
                logger.warning(f"Failed to analyze table {table_name}: {e}")
        
        # 获取慢查询
        slow_queries = self.get_slow_queries()
        
        # 生成优化建议
        recommendations = self._generate_recommendations(table_analyses, slow_queries)
        
        # 计算整体性能评分
        overall_score = self._calculate_performance_score(table_analyses, slow_queries)
        
        return DatabasePerformanceReport(
            database_name=self.database_url.split('/')[-1],
            report_time=datetime.utcnow(),
            slow_queries=slow_queries,
            table_analysis=table_analyses,
            recommendations=recommendations,
            overall_score=overall_score
        )
    
    def _generate_recommendations(self, table_analyses: List[TableAnalysis], 
                                slow_queries: List[QueryPerformanceMetric]) -> List[str]:
        """生成优化建议"""
        recommendations = []
        
        # 基于表分析的建议
        for analysis in table_analyses:
            if analysis.row_count > self.large_table_threshold:
                if len(analysis.missing_indexes) > 0:
                    recommendations.append(
                        f"表 {analysis.table_name} 有 {analysis.row_count:,} 行数据，"
                        f"建议添加 {len(analysis.missing_indexes)} 个索引以提升查询性能"
                    )
                
                if analysis.fragmentation_ratio > self.fragmentation_threshold:
                    recommendations.append(
                        f"表 {analysis.table_name} 碎片化率 {analysis.fragmentation_ratio:.1%}，"
                        "建议执行VACUUM或重建表"
                    )
        
        # 基于慢查询的建议
        if slow_queries:
            recommendations.append(
                f"发现 {len(slow_queries)} 个慢查询，平均执行时间超过 {self.slow_query_threshold}s，"
                "建议优化查询语句或添加适当索引"
            )
            
            # 分析最慢的查询
            slowest_query = max(slow_queries, key=lambda q: q.avg_execution_time)
            recommendations.append(
                f"最慢查询平均耗时 {slowest_query.avg_execution_time:.2f}s，"
                f"执行次数 {slowest_query.execution_count} 次，需要重点优化"
            )
        
        # 通用建议
        if not recommendations:
            recommendations.append("数据库性能良好，建议定期监控和维护")
        
        recommendations.extend([
            "建议启用查询日志记录，持续监控慢查询",
            "定期更新表统计信息，确保查询优化器做出正确决策",
            "考虑实施数据归档策略，控制表大小增长",
            "建议配置适当的数据库连接池大小"
        ])
        
        return recommendations
    
    def _calculate_performance_score(self, table_analyses: List[TableAnalysis], 
                                   slow_queries: List[QueryPerformanceMetric]) -> int:
        """计算性能评分 (0-100)"""
        score = 100
        
        # 慢查询惩罚
        score -= len(slow_queries) * 5
        
        # 大表无索引惩罚
        for analysis in table_analyses:
            if analysis.row_count > self.large_table_threshold:
                score -= len(analysis.missing_indexes) * 3
            
            if analysis.fragmentation_ratio > self.fragmentation_threshold:
                score -= 10
        
        # 确保分数在0-100范围内
        return max(0, min(100, score))
    
    def export_report(self, report: DatabasePerformanceReport, file_path: str):
        """导出性能报告"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)
            logger.info(f"Performance report exported to {file_path}")
        except Exception as e:
            logger.error(f"Failed to export report: {e}")
    
    def apply_index_recommendations(self, table_name: str, dry_run: bool = True) -> List[str]:
        """应用索引建议"""
        suggestions = self._suggest_missing_indexes(None, table_name)
        applied_statements = []
        
        if not dry_run:
            with self.get_session() as session:
                for suggestion in suggestions:
                    try:
                        session.execute(text(suggestion))
                        session.commit()
                        applied_statements.append(suggestion)
                        logger.info(f"Applied index: {suggestion}")
                    except Exception as e:
                        logger.error(f"Failed to apply index {suggestion}: {e}")
                        session.rollback()
        else:
            logger.info(f"DRY RUN - Would apply {len(suggestions)} indexes to {table_name}")
            applied_statements = suggestions
        
        return applied_statements


# 使用示例和测试函数
def test_performance_analyzer():
    """测试性能分析器"""
    from config.settings import settings
    
    analyzer = DatabasePerformanceAnalyzer(settings.DATABASE_URL)
    
    # 测试一些查询
    test_queries = [
        "SELECT COUNT(*) FROM exams",
        "SELECT * FROM exams WHERE status = 'active' ORDER BY created_at DESC LIMIT 10",
        "SELECT e.*, COUNT(a.id) as answer_count FROM exams e LEFT JOIN answer_sheets a ON e.id = a.exam_id GROUP BY e.id",
    ]
    
    print("Testing query performance...")
    for query in test_queries:
        try:
            metric = analyzer.measure_query_performance(query)
            print(f"Query: {query[:50]}...")
            print(f"Execution time: {metric.execution_time:.3f}s")
        except Exception as e:
            print(f"Query failed: {e}")
    
    # 生成性能报告
    print("\nGenerating performance report...")
    report = analyzer.generate_performance_report()
    
    print(f"Performance score: {report.overall_score}/100")
    print(f"Slow queries: {len(report.slow_queries)}")
    print(f"Tables analyzed: {len(report.table_analysis)}")
    print("\nRecommendations:")
    for i, rec in enumerate(report.recommendations, 1):
        print(f"{i}. {rec}")
    
    return report


# 创建全局实例
db_analyzer = None

def get_db_analyzer():
    """获取数据库性能分析器实例"""
    global db_analyzer
    if db_analyzer is None:
        from config.settings import settings
        db_analyzer = DatabasePerformanceAnalyzer(settings.DATABASE_URL)
    return db_analyzer

if __name__ == "__main__":
    # 运行测试
    test_report = test_performance_analyzer()
    print(f"\nTest completed. Report generated at {test_report.report_time}")