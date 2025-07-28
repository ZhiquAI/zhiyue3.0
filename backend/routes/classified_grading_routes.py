from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, ValidationError
import asyncio
import logging
from typing import Dict, List, Any

from services.classified_grading_service import ClassifiedGradingService
from services.question_segmentation_service import QuestionSegmentationService
from services.question_classifier_service import QuestionClassifierService
from models.production_models import AnswerSheet, Exam
from utils.response_utils import success_response, error_response
from utils.validation_utils import validate_json

# 创建蓝图
classified_grading_bp = Blueprint('classified_grading', __name__, url_prefix='/api/grading/classified')
question_segmentation_bp = Blueprint('question_segmentation', __name__, url_prefix='/api/question-segmentation')
question_classifier_bp = Blueprint('question_classifier', __name__, url_prefix='/api/question-classifier')

# 配置日志
logger = logging.getLogger(__name__)

# 初始化服务
classified_grading_service = ClassifiedGradingService()
question_segmentation_service = QuestionSegmentationService()
question_classifier_service = QuestionClassifierService()

# ==================== 数据验证模式 ====================

class QuestionGradingSchema(Schema):
    """单个题目评分请求模式"""
    question_type = fields.Str(required=True)
    question_text = fields.Str(required=True)
    student_answer = fields.Str(allow_none=True)
    correct_answer = fields.Str(allow_none=True)
    total_points = fields.Float(required=True, validate=lambda x: x > 0)
    config = fields.Dict(missing={})

class BatchGradingSchema(Schema):
    """批量评分请求模式"""
    questions = fields.List(fields.Nested(QuestionGradingSchema), required=True)
    config = fields.Dict(missing={})

class AIAnalysisSchema(Schema):
    """AI分析请求模式"""
    question = fields.Dict(required=True)
    gradingResult = fields.Dict(required=True)

class QualityAssessmentSchema(Schema):
    """质量评估请求模式"""
    questions = fields.List(fields.Dict(), required=True)
    gradingResults = fields.List(fields.Dict(), required=True)

class ScoreAdjustmentSchema(Schema):
    """分数调整请求模式"""
    question_id = fields.Str(required=True)
    new_score = fields.Float(required=True, validate=lambda x: x >= 0)
    reason = fields.Str(required=True)

class QuestionSegmentationSchema(Schema):
    """题目分割请求模式"""
    ocr_result = fields.Dict(required=True)
    exam_config = fields.Dict(missing={})

class QuestionClassificationSchema(Schema):
    """题目分类请求模式"""
    question_text = fields.Str(required=True)
    context = fields.Dict(missing={})

# ==================== 分类评分路由 ====================

@classified_grading_bp.route('/grade-question', methods=['POST'])
@jwt_required()
@validate_json(QuestionGradingSchema)
def grade_single_question():
    """评分单个题目"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 开始评分单个题目，类型: {data['question_type']}")
        
        # 异步执行评分
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                classified_grading_service.grade_single_question(
                    question_type=data['question_type'],
                    question_text=data['question_text'],
                    student_answer=data.get('student_answer'),
                    correct_answer=data.get('correct_answer'),
                    total_points=data['total_points'],
                    config=data.get('config', {})
                )
            )
        finally:
            loop.close()
        
        logger.info(f"题目评分完成，得分: {result.score}/{result.max_score}")
        
        return success_response(
            data=result.to_dict(),
            message="题目评分完成"
        )
        
    except Exception as e:
        logger.error(f"题目评分失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"题目评分失败: {str(e)}",
            status_code=500
        )

@classified_grading_bp.route('/batch-grade', methods=['POST'])
@jwt_required()
@validate_json(BatchGradingSchema)
def batch_grade_questions():
    """批量评分题目"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        questions = data['questions']
        
        logger.info(f"用户 {user_id} 开始批量评分 {len(questions)} 道题目")
        
        # 异步执行批量评分
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(
                classified_grading_service.batch_grade_questions(
                    questions=questions,
                    config=data.get('config', {})
                )
            )
        finally:
            loop.close()
        
        # 统计结果
        total_score = sum(r.score for r in results)
        total_max_score = sum(r.max_score for r in results)
        
        logger.info(f"批量评分完成，总分: {total_score}/{total_max_score}")
        
        return success_response(
            data={
                'results': [r.to_dict() for r in results],
                'summary': {
                    'total_questions': len(results),
                    'total_score': total_score,
                    'total_max_score': total_max_score,
                    'average_percentage': (total_score / total_max_score * 100) if total_max_score > 0 else 0
                }
            },
            message="批量评分完成"
        )
        
    except Exception as e:
        logger.error(f"批量评分失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"批量评分失败: {str(e)}",
            status_code=500
        )

@classified_grading_bp.route('/ai-analysis', methods=['POST'])
@jwt_required()
@validate_json(AIAnalysisSchema)
def get_ai_analysis():
    """获取AI分析结果"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 请求AI分析")
        
        # 异步执行AI分析
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            analysis = loop.run_until_complete(
                classified_grading_service.get_ai_analysis(
                    question=data['question'],
                    grading_result=data['gradingResult']
                )
            )
        finally:
            loop.close()
        
        return success_response(
            data=analysis,
            message="AI分析完成"
        )
        
    except Exception as e:
        logger.error(f"AI分析失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"AI分析失败: {str(e)}",
            status_code=500
        )

@classified_grading_bp.route('/assess-quality', methods=['POST'])
@jwt_required()
@validate_json(QualityAssessmentSchema)
def assess_grading_quality():
    """评估评分质量"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 请求评分质量评估")
        
        # 异步执行质量评估
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            quality = loop.run_until_complete(
                classified_grading_service.assess_grading_quality(
                    questions=data['questions'],
                    grading_results=data['gradingResults']
                )
            )
        finally:
            loop.close()
        
        return success_response(
            data=quality,
            message="质量评估完成"
        )
        
    except Exception as e:
        logger.error(f"质量评估失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"质量评估失败: {str(e)}",
            status_code=500
        )

@classified_grading_bp.route('/generate-report', methods=['POST'])
@jwt_required()
def generate_grading_report():
    """生成评分报告"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 请求生成评分报告")
        
        # 异步生成报告
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            report = loop.run_until_complete(
                classified_grading_service.generate_grading_report(
                    questions=data.get('questions', []),
                    answer_sheet=data.get('answerSheet')
                )
            )
        finally:
            loop.close()
        
        return success_response(
            data=report,
            message="报告生成完成"
        )
        
    except Exception as e:
        logger.error(f"报告生成失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"报告生成失败: {str(e)}",
            status_code=500
        )

@classified_grading_bp.route('/config', methods=['GET', 'POST'])
@jwt_required()
def handle_grading_config():
    """处理评分配置"""
    try:
        user_id = get_jwt_identity()
        
        if request.method == 'GET':
            exam_type = request.args.get('exam_type', 'default')
            config = classified_grading_service.get_grading_config(exam_type)
            
            return success_response(
                data=config,
                message="配置获取成功"
            )
        
        elif request.method == 'POST':
            data = request.get_json()
            config = classified_grading_service.save_grading_config(data)
            
            logger.info(f"用户 {user_id} 保存评分配置")
            
            return success_response(
                data=config,
                message="配置保存成功"
            )
            
    except Exception as e:
        logger.error(f"配置处理失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"配置处理失败: {str(e)}",
            status_code=500
        )

@classified_grading_bp.route('/adjust-score', methods=['POST'])
@jwt_required()
@validate_json(ScoreAdjustmentSchema)
def adjust_question_score():
    """调整题目分数"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 调整题目 {data['question_id']} 分数")
        
        # 这里应该更新数据库中的分数
        # 暂时返回成功响应
        result = {
            'question_id': data['question_id'],
            'old_score': 0,  # 从数据库获取
            'new_score': data['new_score'],
            'reason': data['reason'],
            'adjusted_by': user_id,
            'adjusted_at': '2024-01-01T00:00:00Z'  # 当前时间
        }
        
        return success_response(
            data=result,
            message="分数调整成功"
        )
        
    except Exception as e:
        logger.error(f"分数调整失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"分数调整失败: {str(e)}",
            status_code=500
        )

@classified_grading_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_grading_statistics():
    """获取评分统计信息"""
    try:
        exam_id = request.args.get('exam_id')
        question_type = request.args.get('question_type')
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 请求评分统计信息")
        
        # 异步获取统计信息
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            statistics = loop.run_until_complete(
                classified_grading_service.get_grading_statistics(
                    exam_id=exam_id,
                    question_type=question_type
                )
            )
        finally:
            loop.close()
        
        return success_response(
            data=statistics,
            message="统计信息获取成功"
        )
        
    except Exception as e:
        logger.error(f"统计信息获取失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"统计信息获取失败: {str(e)}",
            status_code=500
        )

# ==================== 题目分割路由 ====================

@question_segmentation_bp.route('/segment', methods=['POST'])
@jwt_required()
@validate_json(QuestionSegmentationSchema)
def segment_questions():
    """智能切题"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 开始智能切题")
        
        # 异步执行切题
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                question_segmentation_service.segment_questions(
                    ocr_result=data['ocr_result'],
                    exam_config=data.get('exam_config', {})
                )
            )
        finally:
            loop.close()
        
        logger.info(f"切题完成，识别到 {len(result.questions)} 道题目")
        
        return success_response(
            data=result.to_dict(),
            message="智能切题完成"
        )
        
    except Exception as e:
        logger.error(f"智能切题失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"智能切题失败: {str(e)}",
            status_code=500
        )

@question_segmentation_bp.route('/validate', methods=['POST'])
@jwt_required()
def validate_segmentation():
    """验证切题结果"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 验证切题结果")
        
        # 异步执行验证
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            validation_result = loop.run_until_complete(
                question_segmentation_service.validate_segmentation(
                    questions=data.get('questions', []),
                    original_ocr=data.get('original_ocr', {})
                )
            )
        finally:
            loop.close()
        
        return success_response(
            data=validation_result,
            message="切题验证完成"
        )
        
    except Exception as e:
        logger.error(f"切题验证失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"切题验证失败: {str(e)}",
            status_code=500
        )

@question_segmentation_bp.route('/config', methods=['GET', 'POST'])
@jwt_required()
def handle_segmentation_config():
    """处理切题配置"""
    try:
        user_id = get_jwt_identity()
        
        if request.method == 'GET':
            exam_type = request.args.get('exam_type', 'default')
            config = question_segmentation_service.get_segmentation_config(exam_type)
            
            return success_response(
                data=config,
                message="配置获取成功"
            )
        
        elif request.method == 'POST':
            data = request.get_json()
            config = question_segmentation_service.save_segmentation_config(data)
            
            logger.info(f"用户 {user_id} 保存切题配置")
            
            return success_response(
                data=config,
                message="配置保存成功"
            )
            
    except Exception as e:
        logger.error(f"配置处理失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"配置处理失败: {str(e)}",
            status_code=500
        )

# ==================== 题型分类路由 ====================

@question_classifier_bp.route('/classify', methods=['POST'])
@jwt_required()
@validate_json(QuestionClassificationSchema)
def classify_question():
    """分类单个题目"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 开始题目分类")
        
        # 异步执行分类
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                question_classifier_service.classify_question(
                    question_text=data['question_text'],
                    context=data.get('context', {})
                )
            )
        finally:
            loop.close()
        
        logger.info(f"题目分类完成，类型: {result.question_type}")
        
        return success_response(
            data=result.to_dict(),
            message="题目分类完成"
        )
        
    except Exception as e:
        logger.error(f"题目分类失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"题目分类失败: {str(e)}",
            status_code=500
        )

@question_classifier_bp.route('/batch-classify', methods=['POST'])
@jwt_required()
def batch_classify_questions():
    """批量分类题目"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        questions = data.get('questions', [])
        
        logger.info(f"用户 {user_id} 开始批量分类 {len(questions)} 道题目")
        
        # 异步执行批量分类
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(
                question_classifier_service.batch_classify_questions(questions)
            )
        finally:
            loop.close()
        
        # 统计结果
        type_distribution = {}
        for result in results:
            question_type = result.question_type
            type_distribution[question_type] = type_distribution.get(question_type, 0) + 1
        
        logger.info(f"批量分类完成，类型分布: {type_distribution}")
        
        return success_response(
            data={
                'results': [r.to_dict() for r in results],
                'statistics': {
                    'total_questions': len(results),
                    'type_distribution': type_distribution
                }
            },
            message="批量分类完成"
        )
        
    except Exception as e:
        logger.error(f"批量分类失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"批量分类失败: {str(e)}",
            status_code=500
        )

@question_classifier_bp.route('/supported-types', methods=['GET'])
@jwt_required()
def get_supported_question_types():
    """获取支持的题目类型"""
    try:
        supported_types = question_classifier_service.get_supported_question_types()
        
        return success_response(
            data=supported_types,
            message="支持的题目类型获取成功"
        )
        
    except Exception as e:
        logger.error(f"获取支持的题目类型失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"获取支持的题目类型失败: {str(e)}",
            status_code=500
        )

@question_classifier_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_classification_statistics():
    """获取分类统计信息"""
    try:
        user_id = get_jwt_identity()
        
        logger.info(f"用户 {user_id} 请求分类统计信息")
        
        # 异步获取统计信息
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            statistics = loop.run_until_complete(
                question_classifier_service.get_classification_statistics()
            )
        finally:
            loop.close()
        
        return success_response(
            data=statistics,
            message="分类统计信息获取成功"
        )
        
    except Exception as e:
        logger.error(f"分类统计信息获取失败: {str(e)}", exc_info=True)
        return error_response(
            message=f"分类统计信息获取失败: {str(e)}",
            status_code=500
        )

# ==================== 错误处理 ====================

@classified_grading_bp.errorhandler(ValidationError)
@question_segmentation_bp.errorhandler(ValidationError)
@question_classifier_bp.errorhandler(ValidationError)
def handle_validation_error(error):
    """处理数据验证错误"""
    return error_response(
        message="数据验证失败",
        details=error.messages,
        status_code=400
    )

@classified_grading_bp.errorhandler(404)
@question_segmentation_bp.errorhandler(404)
@question_classifier_bp.errorhandler(404)
def handle_not_found(error):
    """处理404错误"""
    return error_response(
        message="请求的资源不存在",
        status_code=404
    )

@classified_grading_bp.errorhandler(500)
@question_segmentation_bp.errorhandler(500)
@question_classifier_bp.errorhandler(500)
def handle_internal_error(error):
    """处理500错误"""
    logger.error(f"内部服务器错误: {str(error)}", exc_info=True)
    return error_response(
        message="内部服务器错误",
        status_code=500
    )

# ==================== 健康检查 ====================

@classified_grading_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return success_response(
        data={
            'status': 'healthy',
            'service': 'classified_grading',
            'version': '1.0.0'
        },
        message="服务正常"
    )

@question_segmentation_bp.route('/health', methods=['GET'])
def segmentation_health_check():
    """切题服务健康检查"""
    return success_response(
        data={
            'status': 'healthy',
            'service': 'question_segmentation',
            'version': '1.0.0'
        },
        message="服务正常"
    )

@question_classifier_bp.route('/health', methods=['GET'])
def classifier_health_check():
    """分类服务健康检查"""
    return success_response(
        data={
            'status': 'healthy',
            'service': 'question_classifier',
            'version': '1.0.0'
        },
        message="服务正常"
    )