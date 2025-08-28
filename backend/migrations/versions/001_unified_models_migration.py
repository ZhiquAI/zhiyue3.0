"""
统一数据模型迁移脚本
从旧的分散模型迁移到新的core_models统一架构

Revision ID: 001_unified_models
Revises: fe43f18f40f2
Create Date: 2025-08-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite
import json

# revision identifiers
revision = '001_unified_models'
down_revision = 'fe43f18f40f2'
branch_labels = None
depends_on = None

def upgrade():
    """
    升级到统一数据模型
    """
    
    # 1. 创建新的用户表结构（如果不存在）
    try:
        # 检查users表是否存在更完整的结构
        op.add_column('users', sa.Column('school', sa.String(200), comment='学校/机构'))
        op.add_column('users', sa.Column('subject', sa.String(50), comment='任教科目'))
        op.add_column('users', sa.Column('grades', sa.JSON(), comment='任教年级列表'))
        op.add_column('users', sa.Column('department', sa.String(100), comment='部门'))
        op.add_column('users', sa.Column('phone', sa.String(20), comment='联系电话'))
        op.add_column('users', sa.Column('address', sa.String(500), comment='地址'))
        op.add_column('users', sa.Column('permissions', sa.JSON(), comment='特殊权限配置'))
    except:
        pass  # 列可能已存在
    
    # 2. 升级students表
    try:
        # 添加新字段
        op.add_column('students', sa.Column('gender', sa.String(10), comment='性别'))
        op.add_column('students', sa.Column('birth_date', sa.DateTime(), comment='出生日期'))
        op.add_column('students', sa.Column('id_card', sa.String(20), comment='身份证号'))
        op.add_column('students', sa.Column('parent_name', sa.String(100), comment='家长姓名'))
        op.add_column('students', sa.Column('parent_phone', sa.String(20), comment='家长电话'))
        op.add_column('students', sa.Column('address', sa.String(500), comment='家庭地址'))
        op.add_column('students', sa.Column('seat_number', sa.String(20), comment='座位号'))
        op.add_column('students', sa.Column('barcode_data', sa.String(500), comment='条形码数据'))
        op.add_column('students', sa.Column('subject_preferences', sa.JSON(), comment='学科特长'))
        op.add_column('students', sa.Column('special_needs', sa.Text(), comment='特殊需求说明'))
        op.add_column('students', sa.Column('created_by', sa.String(36), comment='创建人'))
        
        # 修改ID类型为UUID字符串（如果当前是整数）
        # 注意：SQLite不支持直接修改列类型，需要重建表
        pass
    except:
        pass
    
    # 3. 升级exams表
    try:
        op.add_column('exams', sa.Column('exam_type', sa.String(50), comment='考试类型'))
        op.add_column('exams', sa.Column('instructions', sa.Text(), comment='考试说明'))
        op.add_column('exams', sa.Column('start_time', sa.DateTime(), comment='开始时间'))
        op.add_column('exams', sa.Column('end_time', sa.DateTime(), comment='结束时间'))
        op.add_column('exams', sa.Column('paper_config', sa.JSON(), comment='试卷结构配置'))
        op.add_column('exams', sa.Column('grading_config', sa.JSON(), comment='评分规则配置'))
        op.add_column('exams', sa.Column('template_id', sa.Integer(), comment='答题卡模板'))
        op.add_column('exams', sa.Column('status', sa.String(20), comment='考试状态'))
        op.add_column('exams', sa.Column('submitted_count', sa.Integer(), comment='已提交答卷数'))
        op.add_column('exams', sa.Column('graded_count', sa.Integer(), comment='已评分数'))
        op.add_column('exams', sa.Column('max_score', sa.Float(), comment='最高分'))
        op.add_column('exams', sa.Column('min_score', sa.Float(), comment='最低分'))
        op.add_column('exams', sa.Column('pass_rate', sa.Float(), comment='及格率'))
        op.add_column('exams', sa.Column('ai_grading_enabled', sa.Boolean(), comment='启用AI评分'))
        op.add_column('exams', sa.Column('double_blind_review', sa.Boolean(), comment='双盲评阅'))
        op.add_column('exams', sa.Column('review_sample_rate', sa.Float(), comment='抽样复核比例'))
        op.add_column('exams', sa.Column('created_by', sa.String(36), comment='创建人'))
    except:
        pass
    
    # 4. 创建新表
    
    # 答题卡模板表
    op.create_table('answer_sheet_templates',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, comment='模板名称'),
        sa.Column('description', sa.String(500), comment='模板描述'),
        sa.Column('subject', sa.String(50), comment='适用科目'),
        sa.Column('grade_level', sa.String(20), comment='适用年级'),
        sa.Column('exam_type', sa.String(50), comment='适用考试类型'),
        sa.Column('template_data', sa.JSON(), nullable=False, comment='模板配置数据'),
        sa.Column('background_image', sa.String(500), comment='背景图片路径'),
        sa.Column('page_width', sa.Integer(), default=210, comment='页面宽度(mm)'),
        sa.Column('page_height', sa.Integer(), default=297, comment='页面高度(mm)'),
        sa.Column('dpi', sa.Integer(), default=300, comment='分辨率'),
        sa.Column('has_barcode_area', sa.Boolean(), default=True, comment='包含条码区'),
        sa.Column('has_student_info', sa.Boolean(), default=True, comment='包含学生信息区'),
        sa.Column('objective_questions', sa.Integer(), default=0, comment='客观题数量'),
        sa.Column('subjective_questions', sa.Integer(), default=0, comment='主观题数量'),
        sa.Column('version', sa.String(20), default='1.0', comment='版本号'),
        sa.Column('is_active', sa.Boolean(), default=True, comment='是否激活'),
        sa.Column('created_at', sa.DateTime(), comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(), comment='更新时间'),
        sa.Column('created_by', sa.String(36), comment='创建人'),
        sa.Column('updated_by', sa.String(36), comment='最后修改人'),
    )
    
    # 答题卡表（如果不存在）
    try:
        op.create_table('answer_sheets',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('exam_id', sa.String(36), nullable=False, comment='关联考试'),
            sa.Column('student_id', sa.String(36), nullable=False, comment='学生ID'),
            sa.Column('student_number', sa.String(50), comment='学号'),
            sa.Column('student_name', sa.String(100), comment='学生姓名'),
            sa.Column('class_name', sa.String(50), comment='班级'),
            sa.Column('original_file_path', sa.String(500), nullable=False, comment='原始扫描文件路径'),
            sa.Column('processed_file_path', sa.String(500), comment='处理后文件路径'),
            sa.Column('thumbnail_path', sa.String(500), comment='缩略图路径'),
            sa.Column('file_hash', sa.String(64), comment='文件MD5哈希'),
            sa.Column('file_size', sa.Integer(), comment='文件大小(字节)'),
            sa.Column('image_quality', sa.JSON(), comment='图像质量评估'),
            sa.Column('resolution', sa.String(20), comment='分辨率'),
            sa.Column('scan_quality_score', sa.Float(), comment='扫描质量评分'),
            sa.Column('ocr_status', sa.String(20), default='pending', comment='OCR状态'),
            sa.Column('ocr_result', sa.JSON(), comment='OCR识别结果'),
            sa.Column('ocr_confidence', sa.Float(), comment='OCR整体置信度'),
            sa.Column('ocr_processing_time', sa.Float(), comment='OCR处理耗时(秒)'),
            sa.Column('segmented_questions', sa.JSON(), comment='题目分割结果'),
            sa.Column('segmentation_quality', sa.JSON(), comment='分割质量评估'),
            sa.Column('manual_adjustments', sa.JSON(), comment='人工调整记录'),
            sa.Column('grading_status', sa.String(20), default='pending', comment='评分状态'),
            sa.Column('objective_score', sa.Float(), comment='客观题得分'),
            sa.Column('subjective_scores', sa.JSON(), comment='主观题详细得分'),
            sa.Column('total_score', sa.Float(), comment='总分'),
            sa.Column('score_breakdown', sa.JSON(), comment='得分明细'),
            sa.Column('ai_grading_result', sa.JSON(), comment='AI评分详细结果'),
            sa.Column('ai_confidence_scores', sa.JSON(), comment='AI各题目置信度'),
            sa.Column('ai_processing_time', sa.Float(), comment='AI评分耗时(秒)'),
            sa.Column('quality_issues', sa.JSON(), comment='识别的质量问题'),
            sa.Column('needs_review', sa.Boolean(), default=False, comment='需要人工复核'),
            sa.Column('review_reasons', sa.JSON(), comment='需要复核的原因'),
            sa.Column('reviewed_by', sa.String(36), comment='复核人'),
            sa.Column('reviewed_at', sa.DateTime(), comment='复核时间'),
            sa.Column('review_comments', sa.Text(), comment='复核意见'),
            sa.Column('review_score_changes', sa.JSON(), comment='复核分数调整'),
            sa.Column('finalized_by', sa.String(36), comment='最终确认人'),
            sa.Column('finalized_at', sa.DateTime(), comment='最终确认时间'),
            sa.Column('is_finalized', sa.Boolean(), default=False, comment='是否最终确认'),
            sa.Column('created_at', sa.DateTime(), comment='创建时间'),
            sa.Column('updated_at', sa.DateTime(), comment='更新时间'),
        )
    except:
        pass  # 表可能已存在
    
    # 评分任务队列表
    try:
        op.create_table('grading_tasks',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('answer_sheet_id', sa.String(36), nullable=False, comment='答题卡ID'),
            sa.Column('task_type', sa.String(50), nullable=False, comment='任务类型'),
            sa.Column('priority', sa.Integer(), default=5, comment='优先级1-10'),
            sa.Column('batch_id', sa.String(36), comment='批次ID'),
            sa.Column('status', sa.String(20), default='pending', comment='任务状态'),
            sa.Column('worker_id', sa.String(100), comment='处理节点ID'),
            sa.Column('progress', sa.Float(), default=0.0, comment='处理进度0-1'),
            sa.Column('result_data', sa.JSON(), comment='处理结果数据'),
            sa.Column('error_message', sa.Text(), comment='错误信息'),
            sa.Column('processing_logs', sa.JSON(), comment='处理日志'),
            sa.Column('created_at', sa.DateTime(), comment='创建时间'),
            sa.Column('started_at', sa.DateTime(), comment='开始处理时间'),
            sa.Column('completed_at', sa.DateTime(), comment='完成时间'),
            sa.Column('estimated_duration', sa.Integer(), comment='预估处理时长(秒)'),
            sa.Column('actual_duration', sa.Integer(), comment='实际处理时长(秒)'),
            sa.Column('retry_count', sa.Integer(), default=0, comment='重试次数'),
            sa.Column('max_retries', sa.Integer(), default=3, comment='最大重试次数'),
            sa.Column('next_retry_at', sa.DateTime(), comment='下次重试时间'),
            sa.Column('depends_on', sa.JSON(), comment='依赖的任务ID列表'),
            sa.Column('blocks_tasks', sa.JSON(), comment='阻塞的任务ID列表'),
        )
    except:
        pass
    
    # 模板使用记录表
    try:
        op.create_table('template_usages',
            sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
            sa.Column('template_id', sa.Integer(), nullable=False, comment='模板ID'),
            sa.Column('exam_id', sa.String(36), nullable=False, comment='考试ID'),
            sa.Column('used_by', sa.String(36), nullable=False, comment='使用人'),
            sa.Column('used_at', sa.DateTime(), comment='使用时间'),
            sa.Column('answer_sheets_count', sa.Integer(), default=0, comment='处理的答题卡数量'),
            sa.Column('success_rate', sa.Float(), comment='识别成功率'),
            sa.Column('average_confidence', sa.Float(), comment='平均置信度'),
            sa.Column('quality_rating', sa.Integer(), comment='模板质量评分1-5'),
            sa.Column('feedback_comments', sa.Text(), comment='使用反馈'),
        )
    except:
        pass
    
    # 系统配置表
    try:
        op.create_table('system_configs',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('config_key', sa.String(100), unique=True, nullable=False, comment='配置键'),
            sa.Column('config_value', sa.JSON(), comment='配置值'),
            sa.Column('description', sa.String(500), comment='配置说明'),
            sa.Column('category', sa.String(50), comment='配置分类'),
            sa.Column('is_public', sa.Boolean(), default=False, comment='是否公开配置'),
            sa.Column('required_role', sa.String(20), comment='访问所需角色'),
            sa.Column('version', sa.Integer(), default=1, comment='配置版本'),
            sa.Column('is_active', sa.Boolean(), default=True, comment='是否激活'),
            sa.Column('created_at', sa.DateTime(), comment='创建时间'),
            sa.Column('updated_at', sa.DateTime(), comment='更新时间'),
            sa.Column('updated_by', sa.String(36), comment='更新人'),
        )
    except:
        pass
    
    # 5. 创建索引
    try:
        # 用户表索引
        op.create_index('idx_user_school_subject', 'users', ['school', 'subject'])
        
        # 学生表索引
        op.create_index('idx_student_id_exam', 'students', ['student_id', 'exam_id'])
        op.create_index('idx_student_class_exam', 'students', ['class_name', 'exam_id'])
        op.create_index('idx_student_name_exam', 'students', ['name', 'exam_id'])
        op.create_index('idx_student_barcode', 'students', ['barcode_data'])
        
        # 考试表索引
        op.create_index('idx_exam_status_date', 'exams', ['status', 'exam_date'])
        op.create_index('idx_exam_creator_subject', 'exams', ['created_by', 'subject'])
        op.create_index('idx_exam_grade_type', 'exams', ['grade', 'exam_type'])
        
        # 答题卡表索引
        op.create_index('idx_answer_exam_student', 'answer_sheets', ['exam_id', 'student_id'])
        op.create_index('idx_answer_grading_status', 'answer_sheets', ['grading_status'])
        op.create_index('idx_answer_needs_review', 'answer_sheets', ['needs_review', 'reviewed_at'])
        op.create_index('idx_answer_file_hash', 'answer_sheets', ['file_hash'])
        
        # 任务表索引
        op.create_index('idx_task_status_priority', 'grading_tasks', ['status', 'priority'])
        op.create_index('idx_task_type_created', 'grading_tasks', ['task_type', 'created_at'])
        op.create_index('idx_task_batch_status', 'grading_tasks', ['batch_id', 'status'])
        
        # 模板表索引
        op.create_index('idx_template_name_creator', 'answer_sheet_templates', ['name', 'created_by'])
        op.create_index('idx_template_subject_grade', 'answer_sheet_templates', ['subject', 'grade_level'])
        
        # 配置表索引
        op.create_index('idx_config_key', 'system_configs', ['config_key'])
        op.create_index('idx_config_category', 'system_configs', ['category'])
        
    except Exception as e:
        print(f"索引创建警告: {e}")
        pass  # 索引可能已存在
    
    # 6. 插入默认配置
    connection = op.get_bind()
    
    # 默认系统配置
    default_configs = [
        {
            'config_key': 'ai_grading_enabled',
            'config_value': True,
            'description': '全局AI评分开关',
            'category': 'grading',
            'is_public': False
        },
        {
            'config_key': 'default_review_sample_rate',
            'config_value': 0.1,
            'description': '默认抽样复核比例',
            'category': 'quality_control',
            'is_public': False
        },
        {
            'config_key': 'ocr_confidence_threshold',
            'config_value': 0.85,
            'description': 'OCR置信度阈值',
            'category': 'processing',
            'is_public': False
        },
        {
            'config_key': 'supported_image_formats',
            'config_value': ['jpg', 'jpeg', 'png', 'pdf', 'tiff'],
            'description': '支持的图像格式',
            'category': 'upload',
            'is_public': True
        }
    ]
    
    try:
        for config in default_configs:
            connection.execute(
                sa.text("""
                    INSERT OR IGNORE INTO system_configs 
                    (id, config_key, config_value, description, category, is_public, created_at) 
                    VALUES (:id, :key, :value, :desc, :cat, :public, :created)
                """),
                {
                    'id': str(__import__('uuid').uuid4()),
                    'key': config['config_key'],
                    'value': json.dumps(config['config_value']),
                    'desc': config['description'],
                    'cat': config['category'],
                    'public': config['is_public'],
                    'created': __import__('datetime').datetime.utcnow()
                }
            )
    except Exception as e:
        print(f"默认配置插入警告: {e}")
        pass

def downgrade():
    """
    降级操作 - 回滚到旧模型
    """
    
    # 删除新创建的表
    op.drop_table('system_configs')
    op.drop_table('template_usages')
    op.drop_table('grading_tasks')
    op.drop_table('answer_sheet_templates')
    
    # 删除新增的列（SQLite限制，实际操作中需要重建表）
    # 这里仅做示例，实际生产环境建议谨慎操作
    pass