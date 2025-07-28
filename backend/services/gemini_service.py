"""Gemini AI 评分服务
基于 Gemini 2.5 Pro 的智能评分引擎
"""

import asyncio
import logging
import json
import urllib.request
import urllib.parse
import json as json_lib
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

from config.settings import settings
from models.grading_models import (
    GradingResult, ObjectiveQuestionResult, SubjectiveQuestionResult,
    QualityAssessment, QuestionType, QualityLevel, ExamGradingConfig
)

logger = logging.getLogger(__name__)

class GeminiService:
    """Gemini AI 智能评分服务"""
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.base_url = settings.GEMINI_BASE_URL
        self.max_tokens = settings.GEMINI_MAX_TOKENS
        self.temperature = 0.2  # 评分任务使用较低温度确保一致性
        
        if not self.api_key:
            raise ValueError("Gemini API key not configured")
    
    async def grade_answer_sheet(self, ocr_result: Dict[str, Any], exam_config: Dict[str, Any]) -> GradingResult:
        """对答题卡进行智能评分"""
        try:
            start_time = datetime.utcnow()
            
            # 转换配置格式
            grading_config = ExamGradingConfig.from_dict(exam_config) if exam_config else self._create_default_config()
            
            # 提取答题内容
            objective_answers = ocr_result.get('objective_answers', {})
            subjective_answers = ocr_result.get('subjective_answers', {})
            
            # 评分客观题
            objective_results = await self._grade_objective_questions_structured(
                objective_answers, grading_config
            )
            
            # 评分主观题
            subjective_results = await self._grade_subjective_questions_structured(
                subjective_answers, grading_config
            )
            
            # 计算分数
            objective_score = sum(result.earned_score for result in objective_results)
            subjective_total_score = sum(result.earned_score for result in subjective_results)
            total_score = objective_score + subjective_total_score
            max_possible_score = grading_config.total_score
            
            # 质量评估
            quality_assessment = self._assess_grading_quality_structured(
                ocr_result, objective_results, subjective_results
            )
            
            # 创建结果对象
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            grading_result = GradingResult(
                answer_sheet_id=ocr_result.get('answer_sheet_id', ''),
                exam_id=grading_config.exam_id,
                student_id=ocr_result.get('student_info', {}).get('student_id'),
                total_score=total_score,
                objective_score=objective_score,
                subjective_total_score=subjective_total_score,
                max_possible_score=max_possible_score,
                objective_results=objective_results,
                subjective_results=subjective_results,
                quality_assessment=quality_assessment,
                processing_time=processing_time
            )
            
            logger.info(f"Grading completed with total score: {total_score}/{max_possible_score}")
            return grading_result
            
        except Exception as e:
            logger.error(f"Grading failed: {str(e)}")
            raise
    
    def _create_default_config(self) -> ExamGradingConfig:
        """创建默认评分配置"""
        return ExamGradingConfig(
            exam_id="default",
            subject="通用",
            total_score=100.0,
            objective_answers={},
            objective_scores={},
            subjective_questions={}
        )
    
    async def _grade_objective_questions_structured(self, answers: Dict[str, str], config: ExamGradingConfig) -> List[ObjectiveQuestionResult]:
        """评分客观题（结构化返回）"""
        results = []
        
        for question_num, student_answer in answers.items():
            standard_answer = config.objective_answers.get(question_num)
            question_score = config.objective_scores.get(question_num, 2.0)
            
            # 标准化答案格式
            student_answer_clean = self._normalize_answer(student_answer) if student_answer else ""
            standard_answer_clean = self._normalize_answer(standard_answer) if standard_answer else ""
            
            # 判断正误
            is_correct = bool(standard_answer_clean and student_answer_clean == standard_answer_clean)
            earned_score = question_score if is_correct else 0.0
            
            # 确定题目类型
            question_type = QuestionType.CHOICE  # 默认为选择题，可根据答案格式判断
            if student_answer and len(student_answer) > 5:
                question_type = QuestionType.FILL_BLANK
            
            result = ObjectiveQuestionResult(
                question_number=question_num,
                question_type=question_type,
                student_answer=student_answer or "未作答",
                standard_answer=standard_answer or "无标准答案",
                is_correct=is_correct,
                earned_score=earned_score,
                max_score=question_score,
                confidence=1.0 if standard_answer else 0.5,
                note="未作答" if not student_answer else ("无标准答案" if not standard_answer else None)
            )
            
            results.append(result)
        
        return results
    
    async def _grade_subjective_questions_structured(self, answers: Dict[str, str], config: ExamGradingConfig) -> List[SubjectiveQuestionResult]:
        """评分主观题（结构化返回）"""
        results = []
        
        for question_num, student_answer in answers.items():
            question_config = config.subjective_questions.get(question_num)
            
            if not question_config:
                # 如果没有配置，创建默认配置
                question_config = {
                    "question_text": f"第{question_num}题",
                    "max_score": 10.0,
                    "key_points": [],
                    "sample_answer": ""
                }
            
            if not student_answer or student_answer.strip() == "":
                # 未作答
                result = SubjectiveQuestionResult(
                    question_number=question_num,
                    question_type=QuestionType.SHORT_ANSWER,
                    student_answer="未作答",
                    earned_score=0.0,
                    max_score=question_config.get('max_score', 10.0),
                    feedback="学生未作答此题",
                    key_points_covered=[],
                    missing_points=question_config.get('key_points', []),
                    confidence=1.0
                )
            else:
                # 使用 Gemini 进行主观题评分
                grading_result = await self._grade_single_subjective_question(
                    student_answer, question_config
                )
                
                # 确定题目类型
                question_type = QuestionType.SHORT_ANSWER
                if len(student_answer) > 200:
                    question_type = QuestionType.ESSAY
                
                result = SubjectiveQuestionResult(
                    question_number=question_num,
                    question_type=question_type,
                    student_answer=student_answer,
                    earned_score=grading_result['score'],
                    max_score=question_config.get('max_score', 10.0),
                    feedback=grading_result['feedback'],
                    key_points_covered=grading_result.get('key_points_covered', []),
                    missing_points=grading_result.get('missing_points', []),
                    confidence=grading_result.get('confidence', 0.7),
                    grading_criteria=question_config
                )
            
            results.append(result)
        
        return results
    
    def _assess_grading_quality_structured(self, ocr_result: Dict, objective_results: List[ObjectiveQuestionResult], subjective_results: List[SubjectiveQuestionResult]) -> QualityAssessment:
        """评估评分质量（结构化返回）"""
        issues = []
        recommendations = []
        
        # 检查 OCR 质量
        ocr_confidence = ocr_result.get('confidence', 0.8)
        if ocr_confidence < 0.8:
            issues.append('OCR识别置信度较低，可能影响评分准确性')
            recommendations.append('建议人工复核OCR识别结果')
        
        # 检查主观题评分置信度
        low_confidence_subjective = [r for r in subjective_results if r.confidence < 0.7]
        if low_confidence_subjective:
            issues.append(f'有{len(low_confidence_subjective)}道主观题评分置信度较低')
            recommendations.append('建议人工复核主观题评分')
        
        # 检查未作答题目
        unanswered_objective = [r for r in objective_results if r.note == '未作答']
        unanswered_subjective = [r for r in subjective_results if r.student_answer == '未作答']
        
        if unanswered_objective:
            issues.append(f'有{len(unanswered_objective)}道客观题未作答')
        
        if unanswered_subjective:
            issues.append(f'有{len(unanswered_subjective)}道主观题未作答')
        
        # 计算整体评分置信度
        objective_confidences = [r.confidence for r in objective_results]
        subjective_confidences = [r.confidence for r in subjective_results]
        
        all_confidences = objective_confidences + subjective_confidences
        grading_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.8
        
        # 确定质量等级
        if len(issues) == 0 and grading_confidence >= 0.9:
            quality_level = QualityLevel.EXCELLENT
        elif len(issues) <= 1 and grading_confidence >= 0.8:
            quality_level = QualityLevel.GOOD
        elif len(issues) <= 2 and grading_confidence >= 0.7:
            quality_level = QualityLevel.FAIR
        elif grading_confidence >= 0.6:
            quality_level = QualityLevel.POOR
        else:
            quality_level = QualityLevel.NEEDS_REVIEW
        
        # 是否需要人工复核
        needs_human_review = (
            quality_level in [QualityLevel.POOR, QualityLevel.NEEDS_REVIEW] or
            len(low_confidence_subjective) > 2 or
            ocr_confidence < 0.7
        )
        
        if needs_human_review:
            recommendations.append('强烈建议进行人工复核')
        
        return QualityAssessment(
            overall_quality=quality_level,
            ocr_confidence=ocr_confidence,
            grading_confidence=grading_confidence,
            issues=issues,
            recommendations=recommendations,
            needs_human_review=needs_human_review
        )
    
    def _normalize_answer(self, answer: str) -> str:
        """标准化答案格式"""
        if not answer:
            return ""
        
        # 转换为大写，去除空格和标点
        normalized = answer.upper().strip()
        # 移除常见的标点符号
        import re
        normalized = re.sub(r'[\s\.,;:!?()\[\]{}"\'。，；：！？（）【】《》“”‘’]', '', normalized)
        
        return normalized
    
    async def _grade_single_subjective_question(self, student_answer: str, question_config: Dict[str, Any]) -> Dict[str, Any]:
        """使用 Gemini 评分单个主观题"""
        try:
            # 构建评分提示词
            prompt = self._build_subjective_grading_prompt(student_answer, question_config)
            
            # 构建请求
            request_data = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": self.temperature,
                    "topK": 40,
                    "topP": 0.8,
                    "maxOutputTokens": 1000
                }
            }
            
            # 使用 asyncio.to_thread 包装同步的 urllib 请求
            def make_request():
                url = f"{self.base_url}/models/{self.model}:generateContent"
                
                # 准备请求数据
                data = json_lib.dumps(request_data).encode('utf-8')
                
                # 创建请求
                req = urllib.request.Request(
                    url,
                    data=data,
                    headers={
                        'Content-Type': 'application/json',
                        'x-goog-api-key': self.api_key
                    }
                )
                
                # 发送请求
                with urllib.request.urlopen(req) as response:
                    if response.status != 200:
                        raise Exception(f"Gemini API error: {response.status}")
                    
                    result_data = response.read().decode('utf-8')
                    return json_lib.loads(result_data)
            
            # 异步执行请求
            result = await asyncio.to_thread(make_request)
            
            if not result.get('candidates'):
                raise Exception("No response from Gemini")
            
            content = result['candidates'][0]['content']['parts'][0]['text']
            
            try:
                # 解析 JSON 响应
                grading_result = json.loads(content)
                
                # 确保分数不超过满分
                max_score = question_config.get('max_score', 10)
                if grading_result['score'] > max_score:
                    grading_result['score'] = max_score
                
                return grading_result
            except json.JSONDecodeError:
                # 如果不是 JSON，尝试解析文本响应
                return self._parse_text_grading_result(content, question_config)
            
        except Exception as e:
            logger.error(f"主观题评分失败: {str(e)}")
            # 返回默认结果
            return {
                "score": 0.0,
                "feedback": f"评分过程中出现错误: {str(e)}",
                "key_points_covered": [],
                "missing_points": question_config.get('key_points', []),
                "confidence": 0.0
            }
    
    async def _grade_objective_questions(self, answers: Dict[str, str], exam_config: Dict[str, Any]) -> Dict[str, Any]:
        """评分客观题（选择题、填空题）"""
        try:
            # 获取标准答案
            standard_answers = exam_config.get('objective_answers', {})
            question_scores = exam_config.get('objective_scores', {})
            
            total_score = 0
            details = []
            
            for question_num, student_answer in answers.items():
                standard_answer = standard_answers.get(question_num)
                question_score = question_scores.get(question_num, 2)  # 默认2分
                
                if standard_answer and student_answer:
                    # 标准化答案格式
                    student_answer_clean = self._normalize_answer(student_answer)
                    standard_answer_clean = self._normalize_answer(standard_answer)
                    
                    # 判断正误
                    is_correct = student_answer_clean == standard_answer_clean
                    earned_score = question_score if is_correct else 0
                    
                    total_score += earned_score
                    
                    details.append({
                        'question': question_num,
                        'student_answer': student_answer,
                        'standard_answer': standard_answer,
                        'is_correct': is_correct,
                        'earned_score': earned_score,
                        'max_score': question_score
                    })
                else:
                    # 未作答或无标准答案
                    details.append({
                        'question': question_num,
                        'student_answer': student_answer or 'N/A',
                        'standard_answer': standard_answer or 'N/A',
                        'is_correct': False,
                        'earned_score': 0,
                        'max_score': question_score,
                        'note': '未作答或缺少标准答案'
                    })
            
            return {
                'total_score': total_score,
                'details': details
            }
            
        except Exception as e:
            logger.error(f"Objective grading failed: {str(e)}")
            raise
    
    async def _grade_subjective_questions(self, answers: Dict[str, str], exam_config: Dict[str, Any]) -> Dict[str, Any]:
        """评分主观题（简答题、论述题）"""
        try:
            subjective_config = exam_config.get('subjective_questions', {})
            total_score = 0
            question_scores = {}
            details = []
            
            for question_num, student_answer in answers.items():
                question_config = subjective_config.get(question_num, {})
                
                if not question_config:
                    continue
                
                # 使用 Gemini 进行主观题评分
                grading_result = await self._grade_single_subjective_question(
                    student_answer, question_config
                )
                
                earned_score = grading_result['score']
                total_score += earned_score
                question_scores[question_num] = earned_score
                
                details.append({
                    'question': question_num,
                    'student_answer': student_answer,
                    'earned_score': earned_score,
                    'max_score': question_config.get('max_score', 10),
                    'feedback': grading_result['feedback'],
                    'key_points_covered': grading_result['key_points_covered'],
                    'confidence': grading_result['confidence']
                })
            
            return {
                'total_score': total_score,
                'question_scores': question_scores,
                'details': details
            }
            
        except Exception as e:
            logger.error(f"Subjective grading failed: {str(e)}")
            raise
    

    
    def _build_subjective_grading_prompt(self, student_answer: str, question_config: Dict[str, Any]) -> str:
        """构建主观题评分提示词"""
        question_text = question_config.get('question_text', '')
        max_score = question_config.get('max_score', 10)
        key_points = question_config.get('key_points', [])
        sample_answer = question_config.get('sample_answer', '')
        
        prompt = f"""
你是一位专业的历史学科阅卷老师。请对以下学生答案进行评分：

题目：{question_text}
满分：{max_score}分

评分要点：
{chr(10).join([f"- {point}" for point in key_points])}

参考答案：
{sample_answer}

学生答案：
{student_answer}

请按照以下标准进行评分：
1. 准确性：答案是否符合历史事实
2. 完整性：是否涵盖了主要知识点
3. 逻辑性：论述是否条理清晰
4. 深度：分析是否深入透彻

请以JSON格式返回评分结果：
{{
  "score": 实际得分（数字），
  "feedback": "详细的评分说明和建议",
  "key_points_covered": ["已覆盖的要点列表"],
  "missing_points": ["遗漏的要点列表"],
  "confidence": 评分置信度（0-1之间的小数）
}}

注意：
- 评分要公正客观，严格按照评分标准
- 给出具体的改进建议
- 如果学生答案为空或无关，给0分
- 部分正确的答案给予相应的部分分数
"""
        return prompt
    
    def _parse_text_grading_result(self, content: str, question_config: Dict[str, Any]) -> Dict[str, Any]:
        """解析文本格式的评分结果"""
        import re
        
        # 尝试从文本中提取分数
        score_match = re.search(r'得?分[：:]?\s*(\d+(?:\.\d+)?)', content)
        score = float(score_match.group(1)) if score_match else 0
        
        # 确保分数不超过满分
        max_score = question_config.get('max_score', 10)
        score = min(score, max_score)
        
        return {
            'score': score,
            'feedback': content,
            'key_points_covered': [],
            'missing_points': [],
            'confidence': 0.7  # 文本解析的置信度较低
        }
    
    def _normalize_answer(self, answer: str) -> str:
        """标准化答案格式"""
        if not answer:
            return ''
        
        # 转换为大写，去除空格和标点
        normalized = answer.upper().strip()
        normalized = ''.join(c for c in normalized if c.isalnum())
        
        return normalized
    
    def _assess_grading_quality(self, ocr_result: Dict, objective_result: Dict, subjective_result: Dict) -> Dict[str, Any]:
        """评估评分质量"""
        issues = []
        
        # 检查 OCR 质量
        ocr_confidence = ocr_result.get('confidence', 0)
        if ocr_confidence < 0.8:
            issues.append('OCR识别置信度较低，可能影响评分准确性')
        
        # 检查主观题评分置信度
        subjective_details = subjective_result.get('details', [])
        low_confidence_count = sum(1 for detail in subjective_details if detail.get('confidence', 1) < 0.7)
        
        if low_confidence_count > 0:
            issues.append(f'有{low_confidence_count}道主观题评分置信度较低')
        
        # 检查是否有未作答题目
        unanswered_count = sum(1 for detail in objective_result.get('details', []) if detail.get('note') == '未作答或缺少标准答案')
        if unanswered_count > 0:
            issues.append(f'有{unanswered_count}道客观题未作答')
        
        return {
            'overall_quality': 'good' if len(issues) == 0 else 'needs_review',
            'issues': issues,
            'recommendation': '建议人工复核' if len(issues) > 2 else '评分质量良好'
        }
    
    def _calculate_overall_confidence(self, objective_result: Dict, subjective_result: Dict) -> float:
        """计算整体评分置信度"""
        # 客观题置信度（基于标准答案匹配，通常较高）
        objective_confidence = 0.95
        
        # 主观题置信度（基于AI评分结果）
        subjective_details = subjective_result.get('details', [])
        if subjective_details:
            subjective_confidence = sum(detail.get('confidence', 0.7) for detail in subjective_details) / len(subjective_details)
        else:
            subjective_confidence = 1.0  # 没有主观题时置信度为1
        
        # 加权平均
        objective_weight = 0.6
        subjective_weight = 0.4
        
        overall_confidence = (objective_confidence * objective_weight + 
                            subjective_confidence * subjective_weight)
        
        return round(overall_confidence, 3)