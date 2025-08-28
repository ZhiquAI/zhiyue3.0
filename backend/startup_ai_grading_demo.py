#!/usr/bin/env python3
"""
AI智能评分引擎演示脚本 - Phase 3 Week 16
展示多模态评分引擎的核心功能和性能
"""

import asyncio
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Any

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 导入评分引擎组件
try:
    from services.multimodal_grading_engine import (
        get_grading_engine,
        QuestionType,
        GradingMode,
        GradingCriteria,
        StudentAnswer,
        demo_grading
    )
except ImportError as e:
    logger.error(f"导入评分引擎失败: {e}")
    exit(1)


class AIGradingDemo:
    """AI评分演示类"""
    
    def __init__(self):
        self.engine = None
        self.demo_data = self._prepare_demo_data()
        
    async def initialize(self):
        """初始化演示环境"""
        logger.info("🚀 初始化AI智能评分演示环境...")
        
        try:
            self.engine = await get_grading_engine()
            logger.info("✅ AI评分引擎初始化完成")
            return True
        except Exception as e:
            logger.error(f"❌ 初始化失败: {e}")
            return False
    
    def _prepare_demo_data(self) -> Dict[str, Any]:
        """准备演示数据"""
        return {
            "multiple_choice_demos": [
                {
                    "question": "以下哪个是光合作用的主要产物？",
                    "student_answer": "B",
                    "correct_answer": "B",
                    "options": {"A": "水", "B": "氧气", "C": "二氧化碳", "D": "氮气"}
                },
                {
                    "question": "地球的卫星是什么？",
                    "student_answer": "A",
                    "correct_answer": "A", 
                    "options": {"A": "月球", "B": "太阳", "C": "火星", "D": "金星"}
                }
            ],
            "short_answer_demos": [
                {
                    "question": "请简述光合作用的过程",
                    "student_answer": "光合作用是植物利用阳光、水和二氧化碳制造有机物的过程，同时释放氧气",
                    "standard_answer": "光合作用是植物利用阳光、水分和二氧化碳合成有机物质的生物过程，产生氧气作为副产品",
                    "keywords": ["光合作用", "阳光", "水", "二氧化碳", "有机物", "氧气"]
                },
                {
                    "question": "什么是人工智能？",
                    "student_answer": "人工智能是让机器模拟人类智能行为的技术，包括学习、推理和决策",
                    "standard_answer": "人工智能是使机器能够执行通常需要人类智能的任务的技术领域",
                    "keywords": ["人工智能", "机器", "智能", "学习", "推理"]
                }
            ],
            "essay_demos": [
                {
                    "question": "请以'我的梦想'为题写一篇短文",
                    "student_answer": """我的梦想
我的梦想是成为一名科学家。从小我就对科学充满好奇，喜欢探索自然的奥秘。
我希望能够通过自己的研究，为人类社会做出贡献。科学家可以发明新技术，
解决实际问题，让世界变得更美好。为了实现这个梦想，我要努力学习，
掌握扎实的科学知识，培养创新思维和实验能力。
虽然道路可能充满挑战，但我相信只要坚持不懈，梦想一定能实现。""",
                    "criteria": {
                        "content": "内容丰富，主题明确",
                        "structure": "结构清晰，逻辑合理", 
                        "language": "语言流畅，表达准确",
                        "creativity": "有一定的创新性"
                    }
                }
            ],
            "calculation_demos": [
                {
                    "question": "计算：3x + 5 = 14，求x的值",
                    "student_answer": "x = 3",
                    "correct_answers": ["3", "x=3", "x = 3"]
                },
                {
                    "question": "一个圆的半径是5cm，求其面积（π取3.14）",
                    "student_answer": "面积 = 78.5平方厘米",
                    "correct_answers": ["78.5", "78.5平方厘米", "78.5cm²"]
                }
            ]
        }
    
    async def demo_multiple_choice_grading(self):
        """演示选择题评分"""
        logger.info("\n📝 === 选择题评分演示 ===")
        
        for i, demo in enumerate(self.demo_data["multiple_choice_demos"], 1):
            logger.info(f"\n选择题 {i}: {demo['question']}")
            
            # 创建学生答案
            answer = StudentAnswer(
                question_id=f"MC{i:03d}",
                question_type=QuestionType.MULTIPLE_CHOICE,
                raw_text=demo["student_answer"],
                processed_text=demo["student_answer"]
            )
            
            # 创建评分标准
            criteria = GradingCriteria(
                max_score=5.0,
                rubric={"type": "选择题", "options": demo["options"]},
                acceptable_answers=[demo["correct_answer"]]
            )
            
            # 执行评分
            start_time = time.time()
            result = await self.engine.grade_answer(answer, criteria, GradingMode.AUTOMATIC)
            processing_time = time.time() - start_time
            
            # 显示结果
            logger.info(f"学生选择: {demo['student_answer']}")
            logger.info(f"正确答案: {demo['correct_answer']}")
            logger.info(f"评分结果: {result.score}/{result.max_score}")
            logger.info(f"AI置信度: {result.confidence:.2f}")
            logger.info(f"处理时间: {processing_time:.3f}秒")
            logger.info(f"AI推理: {result.ai_reasoning}")
    
    async def demo_short_answer_grading(self):
        """演示简答题评分"""
        logger.info("\n✍️ === 简答题评分演示 ===")
        
        for i, demo in enumerate(self.demo_data["short_answer_demos"], 1):
            logger.info(f"\n简答题 {i}: {demo['question']}")
            
            # 创建学生答案
            answer = StudentAnswer(
                question_id=f"SA{i:03d}",
                question_type=QuestionType.SHORT_ANSWER,
                raw_text=demo["student_answer"],
                processed_text=demo["student_answer"]
            )
            
            # 创建评分标准
            criteria = GradingCriteria(
                max_score=10.0,
                rubric={"type": "简答题", "evaluation": "语义相似度+关键词"},
                keywords=demo["keywords"],
                acceptable_answers=[demo["standard_answer"]],
                bonus_rules={kw: 0.5 for kw in demo["keywords"]}
            )
            
            # 执行评分
            start_time = time.time()
            result = await self.engine.grade_answer(answer, criteria, GradingMode.AUTOMATIC)
            processing_time = time.time() - start_time
            
            # 显示结果
            logger.info(f"学生答案: {demo['student_answer']}")
            logger.info(f"标准答案: {demo['standard_answer']}")
            logger.info(f"评分结果: {result.score:.1f}/{result.max_score}")
            logger.info(f"AI置信度: {result.confidence:.2f}")
            logger.info(f"处理时间: {processing_time:.3f}秒")
            logger.info(f"匹配关键词: {result.detailed_feedback.get('matched_keywords', [])}")
            logger.info(f"语义相似度: {result.detailed_feedback.get('semantic_similarity', 0):.2f}")
            logger.info(f"AI推理: {result.ai_reasoning}")
            
            if result.review_required:
                logger.warning("⚠️ 此答案需要人工复核")
    
    async def demo_essay_grading(self):
        """演示作文评分"""
        logger.info("\n📖 === 作文评分演示 ===")
        
        for i, demo in enumerate(self.demo_data["essay_demos"], 1):
            logger.info(f"\n作文题 {i}: {demo['question']}")
            
            # 创建学生答案
            answer = StudentAnswer(
                question_id=f"ES{i:03d}",
                question_type=QuestionType.ESSAY,
                raw_text=demo["student_answer"],
                processed_text=demo["student_answer"]
            )
            
            # 创建评分标准
            criteria = GradingCriteria(
                max_score=20.0,
                rubric=demo["criteria"]
            )
            
            # 执行评分
            start_time = time.time()
            result = await self.engine.grade_answer(answer, criteria, GradingMode.ASSISTED)
            processing_time = time.time() - start_time
            
            # 显示结果
            logger.info(f"作文内容长度: {len(demo['student_answer'])}字")
            logger.info(f"评分结果: {result.score:.1f}/{result.max_score}")
            logger.info(f"AI置信度: {result.confidence:.2f}")
            logger.info(f"处理时间: {processing_time:.3f}秒")
            
            # 显示各维度得分
            dimension_scores = result.detailed_feedback.get('dimension_scores', {})
            for dimension, score in dimension_scores.items():
                logger.info(f"  {dimension}: {score:.2f}")
            
            logger.info(f"AI推理: {result.ai_reasoning}")
            logger.info(f"改进建议: {', '.join(result.suggestions)}")
            
            if result.review_required:
                logger.warning("⚠️ 此作文需要人工复核")
    
    async def demo_calculation_grading(self):
        """演示计算题评分"""
        logger.info("\n🔢 === 计算题评分演示 ===")
        
        for i, demo in enumerate(self.demo_data["calculation_demos"], 1):
            logger.info(f"\n计算题 {i}: {demo['question']}")
            
            # 创建学生答案
            answer = StudentAnswer(
                question_id=f"CA{i:03d}",
                question_type=QuestionType.CALCULATION,
                raw_text=demo["student_answer"],
                processed_text=demo["student_answer"]
            )
            
            # 创建评分标准
            criteria = GradingCriteria(
                max_score=8.0,
                rubric={"type": "计算题", "evaluation": "数值匹配"},
                acceptable_answers=demo["correct_answers"]
            )
            
            # 执行评分
            start_time = time.time()
            result = await self.engine.grade_answer(answer, criteria, GradingMode.AUTOMATIC)
            processing_time = time.time() - start_time
            
            # 显示结果
            logger.info(f"学生答案: {demo['student_answer']}")
            logger.info(f"标准答案: {', '.join(demo['correct_answers'])}")
            logger.info(f"评分结果: {result.score:.1f}/{result.max_score}")
            logger.info(f"AI置信度: {result.confidence:.2f}")
            logger.info(f"处理时间: {processing_time:.3f}秒")
            logger.info(f"AI推理: {result.ai_reasoning}")
    
    async def demo_batch_grading(self):
        """演示批量评分"""
        logger.info("\n🚀 === 批量评分演示 ===")
        
        # 准备批量数据
        answers = []
        criteria_list = []
        
        # 添加多种题型的答案
        for demo in self.demo_data["multiple_choice_demos"]:
            answers.append(StudentAnswer(
                question_id=f"BATCH_MC_{len(answers)+1:03d}",
                question_type=QuestionType.MULTIPLE_CHOICE,
                raw_text=demo["student_answer"],
                processed_text=demo["student_answer"]
            ))
            criteria_list.append(GradingCriteria(
                max_score=5.0,
                acceptable_answers=[demo["correct_answer"]]
            ))
        
        for demo in self.demo_data["short_answer_demos"]:
            answers.append(StudentAnswer(
                question_id=f"BATCH_SA_{len(answers)+1:03d}",
                question_type=QuestionType.SHORT_ANSWER,
                raw_text=demo["student_answer"],
                processed_text=demo["student_answer"]
            ))
            criteria_list.append(GradingCriteria(
                max_score=10.0,
                keywords=demo["keywords"],
                acceptable_answers=[demo["standard_answer"]]
            ))
        
        logger.info(f"准备批量评分 {len(answers)} 道题目...")
        
        # 执行批量评分
        start_time = time.time()
        results = await self.engine.batch_grade(answers, criteria_list, GradingMode.AUTOMATIC)
        total_time = time.time() - start_time
        
        # 统计结果
        total_score = sum(r.score for r in results)
        total_possible = sum(r.max_score for r in results)
        avg_confidence = sum(r.confidence for r in results) / len(results)
        review_count = sum(1 for r in results if r.review_required)
        
        logger.info(f"\n📊 批量评分统计:")
        logger.info(f"总题数: {len(results)}")
        logger.info(f"总得分: {total_score:.1f}/{total_possible}")
        logger.info(f"平均分: {(total_score/total_possible)*100:.1f}%")
        logger.info(f"平均置信度: {avg_confidence:.2f}")
        logger.info(f"需复核数量: {review_count}")
        logger.info(f"总处理时间: {total_time:.2f}秒")
        logger.info(f"平均每题用时: {total_time/len(results):.3f}秒")
        
        # 显示题型分布
        type_stats = {}
        for answer, result in zip(answers, results):
            qt = answer.question_type.value
            if qt not in type_stats:
                type_stats[qt] = {"count": 0, "total_score": 0, "total_possible": 0}
            type_stats[qt]["count"] += 1
            type_stats[qt]["total_score"] += result.score
            type_stats[qt]["total_possible"] += result.max_score
        
        logger.info(f"\n📈 题型统计:")
        for question_type, stats in type_stats.items():
            accuracy = (stats["total_score"] / stats["total_possible"]) * 100
            logger.info(f"  {question_type}: {stats['count']}题, 准确率: {accuracy:.1f}%")
    
    async def demo_performance_metrics(self):
        """演示性能指标"""
        logger.info("\n⚡ === 性能指标演示 ===")
        
        # 获取引擎状态
        status = self.engine.get_engine_status()
        
        logger.info(f"引擎状态: {'已初始化' if status['initialized'] else '未初始化'}")
        logger.info(f"加载的模型数量: {len(status['models'])}")
        
        logger.info("\n🤖 AI模型信息:")
        for model_name, model_info in status["models"].items():
            logger.info(f"  {model_name}:")
            logger.info(f"    类型: {model_info.get('type', 'Unknown')}")
            logger.info(f"    版本: {model_info.get('version', 'Unknown')}")
            logger.info(f"    设备: {model_info.get('device', 'Unknown')}")
        
        logger.info(f"\n支持的题型: {', '.join(status['supported_question_types'])}")
        logger.info(f"支持的评分模式: {', '.join(status['supported_grading_modes'])}")
        
        # 性能压测
        logger.info("\n🔥 === 性能压测 ===")
        test_answer = StudentAnswer(
            question_id="PERF_TEST",
            question_type=QuestionType.SHORT_ANSWER,
            raw_text="这是一个性能测试答案",
            processed_text="这是一个性能测试答案"
        )
        
        test_criteria = GradingCriteria(
            max_score=10.0,
            acceptable_answers=["这是标准答案"]
        )
        
        # 连续评分测试
        test_count = 10
        times = []
        
        for i in range(test_count):
            start = time.time()
            await self.engine.grade_answer(test_answer, test_criteria, GradingMode.AUTOMATIC)
            times.append(time.time() - start)
        
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        logger.info(f"连续评分测试 ({test_count}次):")
        logger.info(f"  平均时间: {avg_time:.3f}秒")
        logger.info(f"  最快时间: {min_time:.3f}秒")
        logger.info(f"  最慢时间: {max_time:.3f}秒")
        logger.info(f"  理论QPS: {1/avg_time:.1f}")
    
    async def run_full_demo(self):
        """运行完整演示"""
        logger.info("🎯 开始AI智能评分引擎完整演示")
        logger.info("=" * 60)
        
        # 初始化
        if not await self.initialize():
            return False
        
        try:
            # 各种题型演示
            await self.demo_multiple_choice_grading()
            await self.demo_short_answer_grading()
            await self.demo_essay_grading()
            await self.demo_calculation_grading()
            
            # 批量评分演示
            await self.demo_batch_grading()
            
            # 性能指标演示
            await self.demo_performance_metrics()
            
            logger.info("\n🎉 === 演示完成 ===")
            logger.info("AI智能评分引擎已成功展示所有核心功能!")
            logger.info("✅ 多模态评分支持: 选择题、简答题、作文、计算题")
            logger.info("✅ 智能分析能力: 语义相似度、关键词匹配、结构分析")
            logger.info("✅ 批量处理能力: 并行评分、统计分析、性能优化")
            logger.info("✅ 质量控制机制: 置信度评估、异常检测、人工复核")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ 演示过程中发生错误: {e}")
            return False


async def main():
    """主函数"""
    logger.info("🚀 智阅AI 3.0 - Phase 3 Week 16")
    logger.info("多模态评分引擎演示程序")
    logger.info("=" * 60)
    
    demo = AIGradingDemo()
    success = await demo.run_full_demo()
    
    if success:
        logger.info("\n🎯 演示程序执行成功!")
        logger.info("Phase 3 Week 16 多模态评分引擎开发完成 ✅")
    else:
        logger.error("\n❌ 演示程序执行失败!")
        return 1
    
    return 0


if __name__ == "__main__":
    # 运行演示
    exit_code = asyncio.run(main())