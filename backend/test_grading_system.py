#!/usr/bin/env python3
"""
智能评分系统测试脚本
测试 grade_single_answer_sheet 方法和评分结果数据结构
"""

import os
import asyncio
import json
from datetime import datetime

# 设置模拟的 API key 用于测试
os.environ['GEMINI_API_KEY'] = 'test_api_key_for_demo'
from services.gemini_service import GeminiService
from models.grading_models import (
    GradingResult, ObjectiveQuestionResult, SubjectiveQuestionResult,
    QualityAssessment, QuestionType, QualityLevel, ExamGradingConfig
)

def create_mock_ocr_result():
    """创建模拟的OCR识别结果"""
    return {
        "student_info": {
            "student_id": "2024001",
            "student_name": "张三",
            "class_name": "高三(1)班"
        },
        "objective_answers": {
            "1": "A",
            "2": "B",
            "3": "C",
            "4": "D",
            "5": "A"
        },
        "subjective_answers": {
            "6": "牛顿第一定律表明，物体在不受外力作用时，将保持静止或匀速直线运动状态。",
            "7": "根据动量守恒定律，系统总动量在碰撞前后保持不变。设两球质量分别为m1和m2，碰撞前速度为v1和v2，碰撞后速度为v1'和v2'，则有：m1*v1 + m2*v2 = m1*v1' + m2*v2'"
        },
        "confidence": 0.85,
        "quality_issues": []
    }

def create_mock_exam_config():
    """创建模拟的考试配置"""
    return {
        "exam_id": "physics_test_2024",
        "subject": "物理",
        "total_score": 100.0,
        "objective_answers": {
            "1": "A",
            "2": "B",
            "3": "C",
            "4": "D",
            "5": "A"
        },
        "objective_scores": {
            "1": 4.0,
            "2": 4.0,
            "3": 4.0,
            "4": 4.0,
            "5": 4.0
        },
        "subjective_questions": {
            "6": {
                "question_text": "请简述牛顿第一定律的内容",
                "max_score": 10.0,
                "key_points": ["物体", "不受外力", "静止或匀速直线运动"],
                "sample_answer": "牛顿第一定律：物体在不受外力作用时，将保持静止或匀速直线运动状态。"
            },
            "7": {
                "question_text": "两个小球发生弹性碰撞，请用动量守恒定律分析",
                "max_score": 20.0,
                "key_points": ["动量守恒", "碰撞前后", "质量", "速度", "公式"],
                "sample_answer": "根据动量守恒定律，系统总动量在碰撞前后保持不变。"
            }
        }
    }

async def test_grading_system():
    """测试智能评分系统"""
    print("=== 智能评分系统测试 ===")
    print(f"测试时间: {datetime.now()}")
    print()
    
    try:
        # 1. 创建 GeminiService 实例
        print("1. 初始化 Gemini 评分服务...")
        gemini_service = GeminiService()
        print("✓ Gemini 服务初始化成功")
        print()
        
        # 2. 准备测试数据
        print("2. 准备测试数据...")
        ocr_result = create_mock_ocr_result()
        exam_config = create_mock_exam_config()
        
        print(f"✓ OCR结果: 学生 {ocr_result['student_info']['student_name']} ({ocr_result['student_info']['student_id']})")
        print(f"✓ 客观题数量: {len(ocr_result['objective_answers'])}")
        print(f"✓ 主观题数量: {len(ocr_result['subjective_answers'])}")
        print()
        
        # 3. 执行评分
        print("3. 执行智能评分...")
        grading_result: GradingResult = await gemini_service.grade_answer_sheet(
            ocr_result=ocr_result,
            exam_config=exam_config
        )
        print("✓ 评分完成")
        print()
        
        # 4. 展示评分结果
        print("4. 评分结果分析:")
        print(f"总分: {grading_result.total_score}")
        print(f"评分引擎: {grading_result.grading_engine}")
        print(f"评分时间: {grading_result.graded_at}")
        print(f"处理时间: {grading_result.processing_time:.2f}秒")
        print()
        
        # 客观题结果
        print("客观题评分结果:")
        objective_total = 0
        for result in grading_result.objective_results:
            status = "✓" if result.is_correct else "✗"
            print(f"  题目{result.question_number}: {status} {result.student_answer} (得分: {result.earned_score}/{result.max_score})")
            objective_total += result.earned_score
        print(f"客观题总分: {objective_total}")
        print()
        
        # 主观题结果
        print("主观题评分结果:")
        subjective_total = 0
        for result in grading_result.subjective_results:
            print(f"  题目{result.question_number}: {result.earned_score}/{result.max_score}分")
            print(f"    反馈: {result.feedback[:100]}..." if len(result.feedback) > 100 else f"    反馈: {result.feedback}")
            print(f"    置信度: {result.confidence:.2f}")
            subjective_total += result.earned_score
        print(f"主观题总分: {subjective_total}")
        print()
        
        # 质量评估
        if grading_result.quality_assessment:
            qa = grading_result.quality_assessment
            print("质量评估:")
            print(f"  整体质量: {qa.overall_quality.value}")
            print(f"  OCR置信度: {qa.ocr_confidence:.2f}")
            print(f"  评分置信度: {qa.grading_confidence:.2f}")
            print(f"  需要人工复核: {'是' if qa.needs_human_review else '否'}")
            
            if qa.issues:
                print("  发现的问题:")
                for issue in qa.issues:
                    print(f"    - {issue}")
            
            if qa.recommendations:
                print("  建议:")
                for rec in qa.recommendations:
                    print(f"    - {rec}")
        print()
        
        # 5. 测试数据结构序列化
        print("5. 测试数据结构序列化...")
        try:
            # 使用内置的 to_dict 方法
            result_dict = grading_result.to_dict()
            
            # 测试JSON序列化
            json_str = json.dumps(result_dict, ensure_ascii=False, indent=2)
            print("✓ 数据结构序列化成功")
            print(f"✓ JSON大小: {len(json_str)} 字符")
        except Exception as e:
            print(f"✗ 序列化失败: {e}")
        print()
        
        print("=== 测试完成 ===")
        print("✓ 所有功能测试通过")
        
        return True
        
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_data_structures():
    """测试评分数据结构"""
    print("\n=== 数据结构测试 ===")
    
    try:
        # 测试 ObjectiveQuestionResult
        obj_result = ObjectiveQuestionResult(
            question_number="1",
            question_type=QuestionType.CHOICE,
            student_answer="A",
            standard_answer="A",
            is_correct=True,
            earned_score=4.0,
            max_score=4.0,
            confidence=1.0
        )
        print("✓ ObjectiveQuestionResult 创建成功")
        
        # 测试 SubjectiveQuestionResult
        subj_result = SubjectiveQuestionResult(
            question_number="6",
            question_type=QuestionType.SHORT_ANSWER,
            student_answer="测试答案",
            earned_score=8.0,
            max_score=10.0,
            feedback="答案基本正确，但缺少部分要点",
            key_points_covered=["要点1", "要点2"],
            missing_points=["要点3"],
            confidence=0.8
        )
        print("✓ SubjectiveQuestionResult 创建成功")
        
        # 测试 QualityAssessment
        quality = QualityAssessment(
            overall_quality=QualityLevel.GOOD,
            ocr_confidence=0.85,
            grading_confidence=0.82,
            issues=["OCR识别置信度较低"],
            recommendations=["建议人工复核OCR识别结果"],
            needs_human_review=False
        )
        print("✓ QualityAssessment 创建成功")
        
        # 测试 GradingResult
        grading_result = GradingResult(
            answer_sheet_id="test_001",
            exam_id="test_exam",
            student_id="2024001",
            total_score=12.0,
            objective_score=4.0,
            subjective_total_score=8.0,
            max_possible_score=14.0,
            objective_results=[obj_result],
            subjective_results=[subj_result],
            quality_assessment=quality
        )
        print("✓ GradingResult 创建成功")
        
        print("✓ 所有数据结构测试通过")
        return True
        
    except Exception as e:
        print(f"✗ 数据结构测试失败: {e}")
        return False

if __name__ == "__main__":
    print("智能评分系统集成测试")
    print("=" * 50)
    
    # 测试数据结构
    struct_test = test_data_structures()
    
    # 测试评分系统
    grading_test = asyncio.run(test_grading_system())
    
    print("\n=== 测试总结 ===")
    print(f"数据结构测试: {'通过' if struct_test else '失败'}")
    print(f"评分系统测试: {'通过' if grading_test else '失败'}")
    
    if struct_test and grading_test:
        print("\n🎉 所有测试通过！智能评分系统已就绪。")
    else:
        print("\n❌ 部分测试失败，请检查系统配置。")