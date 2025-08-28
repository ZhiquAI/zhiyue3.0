from typing import Dict, List, Any, Optional, Union
import asyncio
import json
import re
import numpy as np
from datetime import datetime
from abc import ABC, abstractmethod

from .gemini_ocr_service import GeminiOCRService
from .enhanced_question_segmentation import EnhancedQuestionSegmentation
from models.production_models import Exam, AnswerSheet
from db_connection import get_db
from sqlalchemy.orm import Session

class QuestionAnalyzer(ABC):
    """题目分析器基类"""
    
    def __init__(self):
        self.gemini_service = GeminiOCRService()
    
    @abstractmethod
    async def analyze_and_score(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """分析并评分"""
        pass

class ChoiceQuestionAnalyzer(QuestionAnalyzer):
    """选择题分析器"""
    
    async def analyze_and_score(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """选择题评分"""
        try:
            # 清理和标准化答案
            student_clean = self._clean_choice_answer(student_answer)
            standard_clean = self._clean_choice_answer(standard_answer)
            
            # 直接比较
            is_correct = student_clean.upper() == standard_clean.upper()
            
            score = rubric.get('full_score', 1) if is_correct else 0
            
            feedback = {
                'correct': is_correct,
                'student_answer': student_clean,
                'correct_answer': standard_clean,
                'explanation': rubric.get('explanation', '')
            }
            
            return {
                'score': score,
                'feedback': feedback,
                'confidence': 0.95 if student_clean else 0.3,
                'analysis_type': 'choice'
            }
            
        except Exception as e:
            return {
                'score': 0,
                'feedback': {'error': str(e)},
                'confidence': 0.0,
                'analysis_type': 'choice'
            }
    
    def _clean_choice_answer(self, answer: str) -> str:
        """清理选择题答案"""
        if not answer:
            return ''
        
        # 提取字母选项
        match = re.search(r'[A-Za-z]', answer)
        return match.group(0) if match else ''

class FillInBlankAnalyzer(QuestionAnalyzer):
    """填空题分析器"""
    
    async def analyze_and_score(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """填空题评分"""
        try:
            # 使用Gemini进行智能评分
            prompt = f"""
            请评分以下填空题答案：
            
            标准答案: {standard_answer}
            学生答案: {student_answer}
            
            评分标准:
            - 满分: {rubric.get('full_score', 2)}分
            - 评分规则: {rubric.get('scoring_rules', '完全正确得满分，部分正确得部分分，错误得0分')}
            
            请返回JSON格式结果：
            {{
                "score": 分数(数字),
                "is_correct": true/false,
                "partial_credit": true/false,
                "explanation": "评分说明",
                "key_points_matched": ["匹配的关键点"],
                "missing_points": ["缺失的关键点"]
            }}
            """
            
            result = await self.gemini_service.process_text_with_prompt(prompt)
            
            if result.get('success'):
                try:
                    analysis = json.loads(result['response'])
                    return {
                        'score': analysis.get('score', 0),
                        'feedback': {
                            'is_correct': analysis.get('is_correct', False),
                            'partial_credit': analysis.get('partial_credit', False),
                            'explanation': analysis.get('explanation', ''),
                            'key_points_matched': analysis.get('key_points_matched', []),
                            'missing_points': analysis.get('missing_points', [])
                        },
                        'confidence': 0.85,
                        'analysis_type': 'fill_blank'
                    }
                except json.JSONDecodeError:
                    # 回退到简单比较
                    return self._simple_fill_blank_scoring(student_answer, standard_answer, rubric)
            else:
                return self._simple_fill_blank_scoring(student_answer, standard_answer, rubric)
                
        except Exception as e:
            return {
                'score': 0,
                'feedback': {'error': str(e)},
                'confidence': 0.0,
                'analysis_type': 'fill_blank'
            }
    
    def _simple_fill_blank_scoring(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """简单填空题评分"""
        student_clean = student_answer.strip().lower()
        standard_clean = standard_answer.strip().lower()
        
        if student_clean == standard_clean:
            score = rubric.get('full_score', 2)
            is_correct = True
        elif student_clean in standard_clean or standard_clean in student_clean:
            score = rubric.get('full_score', 2) * 0.5
            is_correct = False
        else:
            score = 0
            is_correct = False
        
        return {
            'score': score,
            'feedback': {
                'is_correct': is_correct,
                'explanation': '基于文本匹配的简单评分'
            },
            'confidence': 0.6,
            'analysis_type': 'fill_blank'
        }

class ShortAnswerAnalyzer(QuestionAnalyzer):
    """简答题分析器"""
    
    async def analyze_and_score(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """简答题评分"""
        try:
            prompt = f"""
            请评分以下简答题：
            
            题目要求: {rubric.get('question_requirement', '请根据标准答案评分')}
            标准答案: {standard_answer}
            学生答案: {student_answer}
            
            评分标准:
            - 满分: {rubric.get('full_score', 5)}分
            - 关键点: {rubric.get('key_points', [])}
            - 评分细则: {rubric.get('scoring_details', '根据答案完整性和准确性评分')}
            
            请返回JSON格式结果：
            {{
                "score": 分数(数字),
                "key_points_analysis": {{
                    "total_points": 总关键点数,
                    "matched_points": 匹配的关键点数,
                    "matched_details": ["具体匹配的关键点"],
                    "missing_details": ["缺失的关键点"]
                }},
                "language_quality": {{
                    "grammar_score": 语法分数(0-1),
                    "clarity_score": 表达清晰度(0-1),
                    "completeness_score": 完整性(0-1)
                }},
                "overall_feedback": "总体评价",
                "improvement_suggestions": ["改进建议"]
            }}
            """
            
            result = await self.gemini_service.process_text_with_prompt(prompt)
            
            if result.get('success'):
                try:
                    analysis = json.loads(result['response'])
                    return {
                        'score': analysis.get('score', 0),
                        'feedback': {
                            'key_points_analysis': analysis.get('key_points_analysis', {}),
                            'language_quality': analysis.get('language_quality', {}),
                            'overall_feedback': analysis.get('overall_feedback', ''),
                            'improvement_suggestions': analysis.get('improvement_suggestions', [])
                        },
                        'confidence': 0.8,
                        'analysis_type': 'short_answer'
                    }
                except json.JSONDecodeError:
                    return self._simple_short_answer_scoring(student_answer, standard_answer, rubric)
            else:
                return self._simple_short_answer_scoring(student_answer, standard_answer, rubric)
                
        except Exception as e:
            return {
                'score': 0,
                'feedback': {'error': str(e)},
                'confidence': 0.0,
                'analysis_type': 'short_answer'
            }
    
    def _simple_short_answer_scoring(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """简单简答题评分"""
        # 基于关键词匹配的简单评分
        key_points = rubric.get('key_points', [])
        if not key_points:
            # 从标准答案中提取关键词
            key_points = [word for word in standard_answer.split() if len(word) > 2]
        
        matched_points = 0
        for point in key_points:
            if point.lower() in student_answer.lower():
                matched_points += 1
        
        score_ratio = matched_points / len(key_points) if key_points else 0
        score = rubric.get('full_score', 5) * score_ratio
        
        return {
            'score': score,
            'feedback': {
                'matched_keywords': matched_points,
                'total_keywords': len(key_points),
                'score_ratio': score_ratio,
                'explanation': '基于关键词匹配的简单评分'
            },
            'confidence': 0.5,
            'analysis_type': 'short_answer'
        }

class EssayAnalyzer(QuestionAnalyzer):
    """作文/论述题分析器"""
    
    async def analyze_and_score(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """作文评分"""
        try:
            prompt = f"""
            请评分以下作文/论述题：
            
            题目要求: {rubric.get('question_requirement', '')}
            参考答案/评分要点: {standard_answer}
            学生答案: {student_answer}
            
            评分标准:
            - 满分: {rubric.get('full_score', 10)}分
            - 内容分值: {rubric.get('content_score', 6)}分
            - 语言分值: {rubric.get('language_score', 2)}分
            - 结构分值: {rubric.get('structure_score', 2)}分
            
            请从以下维度评分：
            1. 内容质量（观点正确性、论证充分性、创新性）
            2. 语言表达（语法正确性、词汇丰富性、表达流畅性）
            3. 文章结构（逻辑清晰性、层次分明性、首尾呼应）
            
            请返回JSON格式结果：
            {{
                "total_score": 总分,
                "dimension_scores": {{
                    "content_score": 内容分,
                    "language_score": 语言分,
                    "structure_score": 结构分
                }},
                "detailed_analysis": {{
                    "content_analysis": "内容分析",
                    "language_analysis": "语言分析",
                    "structure_analysis": "结构分析"
                }},
                "strengths": ["优点"],
                "weaknesses": ["不足"],
                "improvement_suggestions": ["改进建议"]
            }}
            """
            
            result = await self.gemini_service.process_text_with_prompt(prompt)
            
            if result.get('success'):
                try:
                    analysis = json.loads(result['response'])
                    return {
                        'score': analysis.get('total_score', 0),
                        'feedback': {
                            'dimension_scores': analysis.get('dimension_scores', {}),
                            'detailed_analysis': analysis.get('detailed_analysis', {}),
                            'strengths': analysis.get('strengths', []),
                            'weaknesses': analysis.get('weaknesses', []),
                            'improvement_suggestions': analysis.get('improvement_suggestions', [])
                        },
                        'confidence': 0.75,
                        'analysis_type': 'essay'
                    }
                except json.JSONDecodeError:
                    return self._simple_essay_scoring(student_answer, rubric)
            else:
                return self._simple_essay_scoring(student_answer, rubric)
                
        except Exception as e:
            return {
                'score': 0,
                'feedback': {'error': str(e)},
                'confidence': 0.0,
                'analysis_type': 'essay'
            }
    
    def _simple_essay_scoring(self, student_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """简单作文评分"""
        # 基于长度和基本质量的简单评分
        word_count = len(student_answer.split())
        char_count = len(student_answer)
        
        # 长度评分
        min_length = rubric.get('min_length', 100)
        if char_count >= min_length:
            length_score = 1.0
        else:
            length_score = char_count / min_length
        
        # 基础分数
        base_score = rubric.get('full_score', 10) * 0.6 * length_score
        
        return {
            'score': base_score,
            'feedback': {
                'word_count': word_count,
                'char_count': char_count,
                'length_score': length_score,
                'explanation': '基于长度和基本质量的简单评分'
            },
            'confidence': 0.4,
            'analysis_type': 'essay'
        }

class CalculationAnalyzer(QuestionAnalyzer):
    """计算题分析器"""
    
    async def analyze_and_score(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """计算题评分"""
        try:
            prompt = f"""
            请评分以下计算题：
            
            标准答案: {standard_answer}
            学生答案: {student_answer}
            
            评分标准:
            - 满分: {rubric.get('full_score', 8)}分
            - 过程分: {rubric.get('process_score', 5)}分
            - 结果分: {rubric.get('result_score', 3)}分
            - 计算步骤: {rubric.get('calculation_steps', [])}
            
            请分析：
            1. 计算过程是否正确
            2. 最终结果是否正确
            3. 解题思路是否清晰
            4. 计算步骤是否完整
            
            请返回JSON格式结果：
            {{
                "total_score": 总分,
                "process_score": 过程分,
                "result_score": 结果分,
                "step_analysis": {{
                    "correct_steps": ["正确的步骤"],
                    "incorrect_steps": ["错误的步骤"],
                    "missing_steps": ["缺失的步骤"]
                }},
                "final_result_correct": true/false,
                "calculation_errors": ["计算错误"],
                "feedback": "详细反馈"
            }}
            """
            
            result = await self.gemini_service.process_text_with_prompt(prompt)
            
            if result.get('success'):
                try:
                    analysis = json.loads(result['response'])
                    return {
                        'score': analysis.get('total_score', 0),
                        'feedback': {
                            'process_score': analysis.get('process_score', 0),
                            'result_score': analysis.get('result_score', 0),
                            'step_analysis': analysis.get('step_analysis', {}),
                            'final_result_correct': analysis.get('final_result_correct', False),
                            'calculation_errors': analysis.get('calculation_errors', []),
                            'detailed_feedback': analysis.get('feedback', '')
                        },
                        'confidence': 0.8,
                        'analysis_type': 'calculation'
                    }
                except json.JSONDecodeError:
                    return self._simple_calculation_scoring(student_answer, standard_answer, rubric)
            else:
                return self._simple_calculation_scoring(student_answer, standard_answer, rubric)
                
        except Exception as e:
            return {
                'score': 0,
                'feedback': {'error': str(e)},
                'confidence': 0.0,
                'analysis_type': 'calculation'
            }
    
    def _simple_calculation_scoring(self, student_answer: str, standard_answer: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        """简单计算题评分"""
        # 提取数字结果进行比较
        student_numbers = re.findall(r'-?\d+\.?\d*', student_answer)
        standard_numbers = re.findall(r'-?\d+\.?\d*', standard_answer)
        
        result_correct = False
        if student_numbers and standard_numbers:
            try:
                student_result = float(student_numbers[-1])  # 取最后一个数字作为结果
                standard_result = float(standard_numbers[-1])
                result_correct = abs(student_result - standard_result) < 0.01
            except ValueError:
                result_correct = False
        
        if result_correct:
            score = rubric.get('full_score', 8)
        else:
            # 给过程分
            score = rubric.get('full_score', 8) * 0.3
        
        return {
            'score': score,
            'feedback': {
                'result_correct': result_correct,
                'explanation': '基于数字结果比较的简单评分'
            },
            'confidence': 0.6,
            'analysis_type': 'calculation'
        }

class DynamicRubricGenerator:
    """动态评分标准生成器"""
    
    def __init__(self):
        self.gemini_service = GeminiOCRService()
    
    async def generate_rubric(self, question: Dict[str, Any], exam_config: Dict[str, Any]) -> Dict[str, Any]:
        """生成动态评分标准"""
        question_type = question.get('type', 'unknown')
        question_text = question.get('question_text', '')
        standard_answer = question.get('standard_answer', '')
        max_score = question.get('max_score', 5)
        
        # 基础评分标准
        base_rubric = {
            'full_score': max_score,
            'question_type': question_type,
            'question_text': question_text,
            'standard_answer': standard_answer
        }
        
        # 根据题型生成特定评分标准
        if question_type == 'choice':
            base_rubric.update({
                'scoring_method': 'exact_match',
                'partial_credit': False
            })
        elif question_type == 'fill':
            base_rubric.update({
                'scoring_method': 'keyword_match',
                'partial_credit': True,
                'key_points': self._extract_key_points(standard_answer)
            })
        elif question_type == 'short_answer':
            base_rubric.update({
                'scoring_method': 'content_analysis',
                'partial_credit': True,
                'key_points': self._extract_key_points(standard_answer),
                'scoring_details': '根据关键点完整性和表达准确性评分'
            })
        elif question_type == 'essay':
            base_rubric.update({
                'scoring_method': 'comprehensive_analysis',
                'content_score': max_score * 0.6,
                'language_score': max_score * 0.2,
                'structure_score': max_score * 0.2,
                'min_length': 100
            })
        elif question_type == 'calculation':
            base_rubric.update({
                'scoring_method': 'step_by_step',
                'process_score': max_score * 0.6,
                'result_score': max_score * 0.4,
                'calculation_steps': self._extract_calculation_steps(standard_answer)
            })
        
        return base_rubric
    
    def _extract_key_points(self, text: str) -> List[str]:
        """提取关键点"""
        # 简单的关键点提取
        sentences = re.split(r'[。！？；]', text)
        key_points = [s.strip() for s in sentences if len(s.strip()) > 3]
        return key_points[:5]  # 最多5个关键点
    
    def _extract_calculation_steps(self, text: str) -> List[str]:
        """提取计算步骤"""
        # 简单的步骤提取
        lines = text.split('\n')
        steps = [line.strip() for line in lines if line.strip() and ('=' in line or '：' in line)]
        return steps

class AdaptiveGradingEngine:
    """自适应评分引擎"""
    
    def __init__(self):
        self.question_analyzers = {
            'choice': ChoiceQuestionAnalyzer(),
            'fill': FillInBlankAnalyzer(),
            'short_answer': ShortAnswerAnalyzer(),
            'essay': EssayAnalyzer(),
            'calculation': CalculationAnalyzer()
        }
        self.rubric_generator = DynamicRubricGenerator()
        self.question_segmentation = EnhancedQuestionSegmentation()
    
    async def grade_answer_sheet(self, sheet_data: Dict[str, Any], exam_config: Dict[str, Any]) -> Dict[str, Any]:
        """自适应评分答题卡"""
        try:
            grading_results = []
            total_score = 0
            max_total_score = 0
            
            questions = sheet_data.get('segmented_questions', [])
            
            for question in questions:
                # 选择合适的分析器
                question_type = question.get('type', 'short_answer')
                analyzer = self.question_analyzers.get(question_type)
                
                if not analyzer:
                    # 默认使用简答题分析器
                    analyzer = self.question_analyzers['short_answer']
                
                # 动态生成评分标准
                rubric = await self.rubric_generator.generate_rubric(question, exam_config)
                
                # 执行评分
                score_result = await analyzer.analyze_and_score(
                    question.get('student_answer', ''),
                    question.get('standard_answer', ''),
                    rubric
                )
                
                question_result = {
                    'question_id': question.get('id', f"q_{len(grading_results) + 1}"),
                    'question_number': question.get('number'),
                    'question_type': question_type,
                    'score': score_result['score'],
                    'max_score': question.get('max_score', rubric['full_score']),
                    'feedback': score_result['feedback'],
                    'confidence': score_result['confidence'],
                    'analysis_type': score_result.get('analysis_type', question_type),
                    'rubric_used': rubric,
                    'grading_timestamp': datetime.now().isoformat()
                }
                
                grading_results.append(question_result)
                total_score += score_result['score']
                max_total_score += question_result['max_score']
            
            # 生成总体反馈
            overall_feedback = self._generate_overall_feedback(grading_results)
            
            return {
                'success': True,
                'total_score': total_score,
                'max_total_score': max_total_score,
                'percentage': (total_score / max_total_score * 100) if max_total_score > 0 else 0,
                'question_scores': grading_results,
                'overall_feedback': overall_feedback,
                'grading_metadata': {
                    'grading_engine': 'adaptive',
                    'total_questions': len(questions),
                    'graded_questions': len(grading_results),
                    'average_confidence': np.mean([r['confidence'] for r in grading_results]) if grading_results else 0,
                    'grading_time': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'total_score': 0,
                'max_total_score': 0,
                'question_scores': []
            }
    
    def _generate_overall_feedback(self, grading_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """生成总体反馈"""
        if not grading_results:
            return {'summary': '无有效题目评分结果'}
        
        total_questions = len(grading_results)
        correct_questions = sum(1 for r in grading_results if r['score'] == r['max_score'])
        partial_questions = sum(1 for r in grading_results if 0 < r['score'] < r['max_score'])
        incorrect_questions = sum(1 for r in grading_results if r['score'] == 0)
        
        accuracy_rate = correct_questions / total_questions
        
        # 按题型统计
        type_stats = {}
        for result in grading_results:
            q_type = result['question_type']
            if q_type not in type_stats:
                type_stats[q_type] = {'total': 0, 'correct': 0, 'score_sum': 0, 'max_score_sum': 0}
            
            type_stats[q_type]['total'] += 1
            type_stats[q_type]['score_sum'] += result['score']
            type_stats[q_type]['max_score_sum'] += result['max_score']
            if result['score'] == result['max_score']:
                type_stats[q_type]['correct'] += 1
        
        # 生成建议
        suggestions = []
        if accuracy_rate < 0.6:
            suggestions.append('建议加强基础知识的学习和理解')
        if incorrect_questions > total_questions * 0.3:
            suggestions.append('需要重点复习错误较多的知识点')
        if partial_questions > 0:
            suggestions.append('部分题目答案不够完整，注意答题的全面性')
        
        return {
            'summary': f'共{total_questions}题，正确{correct_questions}题，部分正确{partial_questions}题，错误{incorrect_questions}题',
            'accuracy_rate': accuracy_rate,
            'statistics': {
                'total_questions': total_questions,
                'correct_questions': correct_questions,
                'partial_questions': partial_questions,
                'incorrect_questions': incorrect_questions
            },
            'type_statistics': type_stats,
            'suggestions': suggestions
        }
    
    async def process_batch(self, sheet_data_list: List[Dict[str, Any]], exam_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """批量评分"""
        tasks = [self.grade_answer_sheet(sheet_data, exam_config) for sheet_data in sheet_data_list]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    'success': False,
                    'error': str(result),
                    'sheet_index': i
                })
            else:
                result['sheet_index'] = i
                processed_results.append(result)
        
        return processed_results