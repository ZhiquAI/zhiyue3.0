"""
模型映射配置
统一所有数据模型的导入和配置
"""

from backend.models.core_models import (
    Base,
    User,
    Student,
    Exam,
    AnswerSheetTemplate,
    AnswerSheet,
    GradingTask,
    TemplateUsage,
    SystemConfig,
    # 枚举类型
    ExamStatus,
    GradingStatus,
    UserRole
)

# 导出所有模型用于 Alembic 自动发现
__all__ = [
    'Base',
    'User',
    'Student', 
    'Exam',
    'AnswerSheetTemplate',
    'AnswerSheet',
    'GradingTask',
    'TemplateUsage',
    'SystemConfig',
    'ExamStatus',
    'GradingStatus', 
    'UserRole'
]

# 模型注册表 - 用于动态模型操作
MODEL_REGISTRY = {
    'user': User,
    'student': Student,
    'exam': Exam,
    'answer_sheet_template': AnswerSheetTemplate,
    'answer_sheet': AnswerSheet,
    'grading_task': GradingTask,
    'template_usage': TemplateUsage,
    'system_config': SystemConfig
}

# 模型关系映射 - 用于级联操作
MODEL_RELATIONSHIPS = {
    'exam': {
        'students': 'student',
        'answer_sheets': 'answer_sheet',
        'creator': 'user'
    },
    'student': {
        'exam': 'exam',
        'answer_sheets': 'answer_sheet',
        'creator': 'user'
    },
    'answer_sheet': {
        'exam': 'exam',
        'student': 'student',
        'reviewer': 'user',
        'grading_tasks': 'grading_task'
    },
    'user': {
        'created_exams': 'exam',
        'reviewed_answer_sheets': 'answer_sheet',
        'created_templates': 'answer_sheet_template'
    }
}

# 状态流转配置
STATUS_TRANSITIONS = {
    'exam_status': {
        ExamStatus.DRAFT: [ExamStatus.PREPARING],
        ExamStatus.PREPARING: [ExamStatus.READY, ExamStatus.DRAFT],
        ExamStatus.READY: [ExamStatus.IN_PROGRESS, ExamStatus.PREPARING],
        ExamStatus.IN_PROGRESS: [ExamStatus.GRADING],
        ExamStatus.GRADING: [ExamStatus.COMPLETED],
        ExamStatus.COMPLETED: [ExamStatus.ARCHIVED],
        ExamStatus.ARCHIVED: []  # 终态
    },
    'grading_status': {
        GradingStatus.PENDING: [GradingStatus.PROCESSING, GradingStatus.ERROR],
        GradingStatus.PROCESSING: [GradingStatus.OCR_COMPLETED, GradingStatus.ERROR],
        GradingStatus.OCR_COMPLETED: [GradingStatus.AI_GRADED, GradingStatus.ERROR],
        GradingStatus.AI_GRADED: [GradingStatus.REVIEWED, GradingStatus.FINALIZED],
        GradingStatus.REVIEWED: [GradingStatus.FINALIZED],
        GradingStatus.FINALIZED: [],  # 终态
        GradingStatus.ERROR: [GradingStatus.PENDING]  # 可重试
    }
}

# 权限配置
ROLE_PERMISSIONS = {
    UserRole.ADMIN: {
        'can_create_exam': True,
        'can_manage_users': True,
        'can_view_all_data': True,
        'can_modify_system_config': True,
        'can_access_admin_panel': True
    },
    UserRole.TEACHER: {
        'can_create_exam': True,
        'can_manage_students': True,
        'can_grade_papers': True,
        'can_view_own_data': True,
        'can_export_results': True
    },
    UserRole.REVIEWER: {
        'can_review_grading': True,
        'can_quality_check': True,
        'can_view_assigned_data': True
    },
    UserRole.STUDENT: {
        'can_view_own_results': True
    }
}

def get_model(model_name: str):
    """根据模型名获取模型类"""
    return MODEL_REGISTRY.get(model_name.lower())

def get_model_relationships(model_name: str):
    """获取模型关系映射"""
    return MODEL_RELATIONSHIPS.get(model_name.lower(), {})

def can_transition_status(current_status, target_status, status_type='exam_status'):
    """检查状态是否可以转换"""
    transitions = STATUS_TRANSITIONS.get(status_type, {})
    allowed_transitions = transitions.get(current_status, [])
    return target_status in allowed_transitions

def check_permission(user_role: UserRole, permission: str) -> bool:
    """检查用户是否有特定权限"""
    permissions = ROLE_PERMISSIONS.get(user_role, {})
    return permissions.get(permission, False)