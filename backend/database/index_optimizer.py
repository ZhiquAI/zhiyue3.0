"""
数据库索引优化器
基于性能分析结果自动创建和优化数据库索引
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text, MetaData, Table, Column, Index
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class IndexOptimization:
    """索引优化信息"""
    table_name: str
    index_name: str
    columns: List[str]
    index_type: str  # btree, hash, gin, etc.
    is_unique: bool
    is_partial: bool
    condition: Optional[str]
    estimated_benefit: int  # 1-10 scale
    creation_sql: str
    size_impact_mb: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'table_name': self.table_name,
            'index_name': self.index_name,
            'columns': self.columns,
            'index_type': self.index_type,
            'is_unique': self.is_unique,
            'is_partial': self.is_partial,
            'condition': self.condition,
            'estimated_benefit': self.estimated_benefit,
            'creation_sql': self.creation_sql,
            'size_impact_mb': self.size_impact_mb
        }


class DatabaseIndexOptimizer:
    """数据库索引优化器"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.metadata = MetaData()
        
        # 优化策略配置
        self.optimization_strategies = {
            'high_frequency_queries': self._high_frequency_query_indexes,
            'foreign_key_relationships': self._foreign_key_indexes,
            'search_columns': self._search_column_indexes,
            'sorting_columns': self._sorting_column_indexes,
            'composite_conditions': self._composite_condition_indexes,
            'partial_indexes': self._partial_indexes
        }
    
    def analyze_and_recommend_indexes(self) -> List[IndexOptimization]:
        """分析并推荐索引优化"""
        recommendations = []
        
        # 应用各种优化策略
        for strategy_name, strategy_func in self.optimization_strategies.items():
            try:
                strategy_recommendations = strategy_func()
                recommendations.extend(strategy_recommendations)
                logger.info(f"Strategy '{strategy_name}' generated {len(strategy_recommendations)} recommendations")
            except Exception as e:
                logger.error(f"Strategy '{strategy_name}' failed: {e}")
        
        # 按预期收益排序
        recommendations.sort(key=lambda x: x.estimated_benefit, reverse=True)
        
        # 去重（基于SQL语句）
        unique_recommendations = []
        seen_sqls = set()
        for rec in recommendations:
            if rec.creation_sql not in seen_sqls:
                unique_recommendations.append(rec)
                seen_sqls.add(rec.creation_sql)
        
        logger.info(f"Generated {len(unique_recommendations)} unique index recommendations")
        return unique_recommendations
    
    def _high_frequency_query_indexes(self) -> List[IndexOptimization]:
        """高频查询索引优化"""
        recommendations = []
        
        # 考试查询优化
        recommendations.extend([
            IndexOptimization(
                table_name='exams',
                index_name='idx_exams_status_created',
                columns=['status', 'created_at'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=9,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_exams_status_created ON exams(status, created_at);',
                size_impact_mb=0.5
            ),
            IndexOptimization(
                table_name='exams',
                index_name='idx_exams_creator_subject',
                columns=['created_by', 'subject'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=7,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_exams_creator_subject ON exams(created_by, subject);',
                size_impact_mb=0.3
            ),
            IndexOptimization(
                table_name='exams',
                index_name='idx_exams_active',
                columns=['is_active'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition='is_active = true',
                estimated_benefit=6,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_exams_active ON exams(is_active) WHERE is_active = true;',
                size_impact_mb=0.1
            )
        ])
        
        # 答题卡查询优化
        recommendations.extend([
            IndexOptimization(
                table_name='answer_sheets',
                index_name='idx_answer_sheets_exam_student',
                columns=['exam_id', 'student_id'],
                index_type='btree',
                is_unique=True,
                is_partial=False,
                condition=None,
                estimated_benefit=10,
                creation_sql='CREATE UNIQUE INDEX IF NOT EXISTS idx_answer_sheets_exam_student ON answer_sheets(exam_id, student_id);',
                size_impact_mb=2.0
            ),
            IndexOptimization(
                table_name='answer_sheets',
                index_name='idx_answer_sheets_grading_status',
                columns=['grading_status'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=8,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_answer_sheets_grading_status ON answer_sheets(grading_status);',
                size_impact_mb=1.0
            ),
            IndexOptimization(
                table_name='answer_sheets',
                index_name='idx_answer_sheets_needs_review',
                columns=['needs_review', 'grading_status'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition='needs_review = true',
                estimated_benefit=7,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_answer_sheets_needs_review ON answer_sheets(needs_review, grading_status) WHERE needs_review = true;',
                size_impact_mb=0.5
            )
        ])
        
        return recommendations
    
    def _foreign_key_indexes(self) -> List[IndexOptimization]:
        """外键关系索引优化"""
        recommendations = []
        
        # 学生-考试关系
        recommendations.append(
            IndexOptimization(
                table_name='students',
                index_name='idx_students_exam_id',
                columns=['exam_id'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=8,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_students_exam_id ON students(exam_id);',
                size_impact_mb=0.8
            )
        )
        
        # 评分任务-答题卡关系
        recommendations.append(
            IndexOptimization(
                table_name='grading_tasks',
                index_name='idx_grading_tasks_answer_sheet',
                columns=['answer_sheet_id'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=7,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_grading_tasks_answer_sheet ON grading_tasks(answer_sheet_id);',
                size_impact_mb=0.3
            )
        )
        
        # 模板使用记录
        recommendations.extend([
            IndexOptimization(
                table_name='template_usages',
                index_name='idx_template_usages_template_exam',
                columns=['template_id', 'exam_id'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=6,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_template_usages_template_exam ON template_usages(template_id, exam_id);',
                size_impact_mb=0.2
            ),
            IndexOptimization(
                table_name='template_usages',
                index_name='idx_template_usages_user_date',
                columns=['used_by', 'used_at'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=5,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_template_usages_user_date ON template_usages(used_by, used_at);',
                size_impact_mb=0.1
            )
        ])
        
        return recommendations
    
    def _search_column_indexes(self) -> List[IndexOptimization]:
        """搜索列索引优化"""
        recommendations = []
        
        # 学生姓名搜索
        recommendations.extend([
            IndexOptimization(
                table_name='students',
                index_name='idx_students_name',
                columns=['name'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=7,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);',
                size_impact_mb=0.5
            ),
            IndexOptimization(
                table_name='students',
                index_name='idx_students_student_id',
                columns=['student_id'],
                index_type='btree',
                is_unique=True,
                is_partial=False,
                condition=None,
                estimated_benefit=9,
                creation_sql='CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);',
                size_impact_mb=0.4
            ),
            IndexOptimization(
                table_name='students',
                index_name='idx_students_class_name',
                columns=['class_name'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=6,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);',
                size_impact_mb=0.3
            )
        ])
        
        # 用户搜索
        recommendations.extend([
            IndexOptimization(
                table_name='users',
                index_name='idx_users_username',
                columns=['username'],
                index_type='btree',
                is_unique=True,
                is_partial=False,
                condition=None,
                estimated_benefit=9,
                creation_sql='CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);',
                size_impact_mb=0.2
            ),
            IndexOptimization(
                table_name='users',
                index_name='idx_users_email',
                columns=['email'],
                index_type='btree',
                is_unique=True,
                is_partial=False,
                condition=None,
                estimated_benefit=8,
                creation_sql='CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);',
                size_impact_mb=0.2
            )
        ])
        
        return recommendations
    
    def _sorting_column_indexes(self) -> List[IndexOptimization]:
        """排序列索引优化"""
        recommendations = []
        
        # 时间排序索引
        recommendations.extend([
            IndexOptimization(
                table_name='exams',
                index_name='idx_exams_created_at',
                columns=['created_at'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=6,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at);',
                size_impact_mb=0.3
            ),
            IndexOptimization(
                table_name='answer_sheets',
                index_name='idx_answer_sheets_updated_at',
                columns=['updated_at'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=5,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_answer_sheets_updated_at ON answer_sheets(updated_at);',
                size_impact_mb=1.0
            ),
            IndexOptimization(
                table_name='grading_tasks',
                index_name='idx_grading_tasks_created_at',
                columns=['created_at'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=6,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_grading_tasks_created_at ON grading_tasks(created_at);',
                size_impact_mb=0.2
            )
        ])
        
        # 分数排序索引
        recommendations.extend([
            IndexOptimization(
                table_name='answer_sheets',
                index_name='idx_answer_sheets_total_score',
                columns=['total_score'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition='total_score IS NOT NULL',
                estimated_benefit=7,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_answer_sheets_total_score ON answer_sheets(total_score) WHERE total_score IS NOT NULL;',
                size_impact_mb=0.8
            ),
            IndexOptimization(
                table_name='answer_sheets',
                index_name='idx_answer_sheets_exam_score',
                columns=['exam_id', 'total_score'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition='total_score IS NOT NULL',
                estimated_benefit=8,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_answer_sheets_exam_score ON answer_sheets(exam_id, total_score) WHERE total_score IS NOT NULL;',
                size_impact_mb=1.2
            )
        ])
        
        return recommendations
    
    def _composite_condition_indexes(self) -> List[IndexOptimization]:
        """复合条件索引优化"""
        recommendations = []
        
        # 考试状态和创建者复合查询
        recommendations.append(
            IndexOptimization(
                table_name='exams',
                index_name='idx_exams_creator_status_date',
                columns=['created_by', 'status', 'created_at'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=8,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_exams_creator_status_date ON exams(created_by, status, created_at);',
                size_impact_mb=0.6
            )
        )
        
        # 学生考试班级复合查询
        recommendations.append(
            IndexOptimization(
                table_name='students',
                index_name='idx_students_exam_class_name',
                columns=['exam_id', 'class_name', 'name'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=8,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_students_exam_class_name ON students(exam_id, class_name, name);',
                size_impact_mb=1.0
            )
        )
        
        # 评分任务状态和优先级
        recommendations.append(
            IndexOptimization(
                table_name='grading_tasks',
                index_name='idx_grading_tasks_status_priority',
                columns=['status', 'priority', 'created_at'],
                index_type='btree',
                is_unique=False,
                is_partial=False,
                condition=None,
                estimated_benefit=9,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_grading_tasks_status_priority ON grading_tasks(status, priority, created_at);',
                size_impact_mb=0.4
            )
        )
        
        # 用户角色和活跃状态
        recommendations.append(
            IndexOptimization(
                table_name='users',
                index_name='idx_users_active_role_login',
                columns=['is_active', 'role', 'last_login'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition='is_active = true',
                estimated_benefit=6,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_users_active_role_login ON users(is_active, role, last_login) WHERE is_active = true;',
                size_impact_mb=0.2
            )
        )
        
        return recommendations
    
    def _partial_indexes(self) -> List[IndexOptimization]:
        """部分索引优化"""
        recommendations = []
        
        # 只索引需要复核的答题卡
        recommendations.append(
            IndexOptimization(
                table_name='answer_sheets',
                index_name='idx_answer_sheets_review_pending',
                columns=['exam_id', 'grading_status', 'updated_at'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition='needs_review = true AND reviewed_at IS NULL',
                estimated_benefit=8,
                creation_sql='CREATE INDEX IF NOT EXISTS idx_answer_sheets_review_pending ON answer_sheets(exam_id, grading_status, updated_at) WHERE needs_review = true AND reviewed_at IS NULL;',
                size_impact_mb=0.3
            )
        )
        
        # 只索引待处理的评分任务
        recommendations.append(
            IndexOptimization(
                table_name='grading_tasks',
                index_name='idx_grading_tasks_pending',
                columns=['task_type', 'priority', 'created_at'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition="status = 'pending'",
                estimated_benefit=9,
                creation_sql="CREATE INDEX IF NOT EXISTS idx_grading_tasks_pending ON grading_tasks(task_type, priority, created_at) WHERE status = 'pending';",
                size_impact_mb=0.2
            )
        )
        
        # 只索引活跃的考试
        recommendations.append(
            IndexOptimization(
                table_name='exams',
                index_name='idx_exams_active_recent',
                columns=['subject', 'grade', 'created_at'],
                index_type='btree',
                is_unique=False,
                is_partial=True,
                condition="is_active = true AND created_at > datetime('now', '-3 months')",
                estimated_benefit=7,
                creation_sql="CREATE INDEX IF NOT EXISTS idx_exams_active_recent ON exams(subject, grade, created_at) WHERE is_active = true AND created_at > datetime('now', '-3 months');",
                size_impact_mb=0.2
            )
        )
        
        return recommendations
    
    def apply_index_optimizations(self, recommendations: List[IndexOptimization], 
                                dry_run: bool = True) -> Dict[str, Any]:
        """应用索引优化"""
        results = {
            'applied': [],
            'failed': [],
            'skipped': [],
            'total_time': 0,
            'total_size_impact': 0
        }
        
        if dry_run:
            logger.info(f"DRY RUN: Would apply {len(recommendations)} index optimizations")
            for rec in recommendations:
                results['applied'].append({
                    'sql': rec.creation_sql,
                    'benefit': rec.estimated_benefit,
                    'size_impact': rec.size_impact_mb
                })
            return results
        
        start_time = datetime.utcnow()
        
        with self.SessionLocal() as session:
            for rec in recommendations:
                try:
                    logger.info(f"Applying index: {rec.index_name}")
                    session.execute(text(rec.creation_sql))
                    session.commit()
                    
                    results['applied'].append({
                        'index_name': rec.index_name,
                        'table_name': rec.table_name,
                        'sql': rec.creation_sql,
                        'benefit': rec.estimated_benefit,
                        'size_impact': rec.size_impact_mb
                    })
                    results['total_size_impact'] += rec.size_impact_mb
                    
                    logger.info(f"Successfully created index: {rec.index_name}")
                    
                except Exception as e:
                    error_msg = str(e)
                    if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                        results['skipped'].append({
                            'index_name': rec.index_name,
                            'reason': 'Already exists'
                        })
                        logger.info(f"Index already exists: {rec.index_name}")
                    else:
                        results['failed'].append({
                            'index_name': rec.index_name,
                            'error': error_msg,
                            'sql': rec.creation_sql
                        })
                        logger.error(f"Failed to create index {rec.index_name}: {e}")
                    
                    session.rollback()
        
        results['total_time'] = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"Index optimization completed: "
                   f"{len(results['applied'])} applied, "
                   f"{len(results['failed'])} failed, "
                   f"{len(results['skipped'])} skipped")
        
        return results
    
    def analyze_existing_indexes(self) -> Dict[str, List[Dict[str, Any]]]:
        """分析现有索引"""
        existing_indexes = {}
        
        tables = ['exams', 'answer_sheets', 'students', 'users', 'grading_tasks', 
                 'answer_sheet_templates', 'template_usages']
        
        with self.SessionLocal() as session:
            for table_name in tables:
                indexes = []
                try:
                    if 'sqlite' in self.database_url.lower():
                        # SQLite索引查询
                        result = session.execute(text(f"PRAGMA index_list({table_name})"))
                        for row in result:
                            index_info = {
                                'name': row[1],
                                'unique': bool(row[2]),
                                'origin': row[3] if len(row) > 3 else 'c',
                                'columns': []
                            }
                            
                            # 获取索引列信息
                            col_result = session.execute(text(f"PRAGMA index_info({row[1]})"))
                            index_info['columns'] = [col_row[2] for col_row in col_result]
                            indexes.append(index_info)
                    
                    elif 'postgresql' in self.database_url.lower():
                        # PostgreSQL索引查询
                        result = session.execute(text("""
                            SELECT indexname, indexdef, indisunique, indisprimary
                            FROM pg_indexes
                            LEFT JOIN pg_index ON pg_index.indexrelid = pg_class.oid
                            LEFT JOIN pg_class ON pg_class.relname = indexname
                            WHERE tablename = :table_name
                        """), {'table_name': table_name})
                        
                        for row in result:
                            indexes.append({
                                'name': row[0],
                                'definition': row[1],
                                'unique': row[2] if len(row) > 2 else False,
                                'primary': row[3] if len(row) > 3 else False
                            })
                
                except Exception as e:
                    logger.warning(f"Failed to analyze indexes for table {table_name}: {e}")
                
                existing_indexes[table_name] = indexes
        
        return existing_indexes
    
    def generate_optimization_report(self) -> Dict[str, Any]:
        """生成索引优化报告"""
        recommendations = self.analyze_and_recommend_indexes()
        existing_indexes = self.analyze_existing_indexes()
        
        # 计算统计信息
        total_benefit = sum(rec.estimated_benefit for rec in recommendations)
        total_size_impact = sum(rec.size_impact_mb for rec in recommendations)
        
        high_priority = [rec for rec in recommendations if rec.estimated_benefit >= 8]
        medium_priority = [rec for rec in recommendations if 5 <= rec.estimated_benefit < 8]
        low_priority = [rec for rec in recommendations if rec.estimated_benefit < 5]
        
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'summary': {
                'total_recommendations': len(recommendations),
                'high_priority': len(high_priority),
                'medium_priority': len(medium_priority),
                'low_priority': len(low_priority),
                'total_estimated_benefit': total_benefit,
                'total_size_impact_mb': total_size_impact
            },
            'recommendations_by_priority': {
                'high': [rec.to_dict() for rec in high_priority],
                'medium': [rec.to_dict() for rec in medium_priority],
                'low': [rec.to_dict() for rec in low_priority]
            },
            'existing_indexes': existing_indexes,
            'optimization_strategies_used': list(self.optimization_strategies.keys())
        }
        
        return report


# 使用示例
def optimize_database_indexes(database_url: str, dry_run: bool = True) -> Dict[str, Any]:
    """优化数据库索引"""
    optimizer = DatabaseIndexOptimizer(database_url)
    
    # 生成推荐
    logger.info("Analyzing database for index optimizations...")
    recommendations = optimizer.analyze_and_recommend_indexes()
    
    if not recommendations:
        logger.info("No index optimizations recommended")
        return {'message': 'No optimizations needed'}
    
    # 应用优化（或干运行）
    logger.info(f"Applying {len(recommendations)} index optimizations (dry_run={dry_run})")
    results = optimizer.apply_index_optimizations(recommendations, dry_run=dry_run)
    
    # 生成报告
    report = optimizer.generate_optimization_report()
    
    return {
        'optimization_results': results,
        'optimization_report': report,
        'recommendations_applied': len(results['applied']),
        'total_benefit_score': sum(rec.estimated_benefit for rec in recommendations)
    }


# 创建全局实例
index_optimizer = None

def get_index_optimizer(engine=None):
    """获取数据库索引优化器实例"""
    global index_optimizer
    if index_optimizer is None:
        if engine:
            database_url = str(engine.url)
        else:
            from config.settings import settings
            database_url = settings.DATABASE_URL
        index_optimizer = DatabaseIndexOptimizer(database_url)
    return index_optimizer

if __name__ == "__main__":
    from config.settings import settings
    
    # 运行索引优化
    result = optimize_database_indexes(settings.DATABASE_URL, dry_run=True)
    print(f"Index optimization completed with {result['recommendations_applied']} recommendations")