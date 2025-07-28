"""
Gemini 2.5 Pro OCR识别服务 - 替代传统OCR引擎
利用Gemini的多模态能力进行图像识别和文本提取
"""

import asyncio
import logging
import base64
import json
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from PIL import Image
import io

from config.settings import settings

logger = logging.getLogger(__name__)

class GeminiOCRService:
    """基于Gemini 2.5 Pro的OCR识别服务"""
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.base_url = settings.GEMINI_BASE_URL
        self.max_tokens = settings.GEMINI_MAX_TOKENS
        self.temperature = 0.1  # OCR任务使用较低温度确保准确性
        
        if not self.api_key:
            raise ValueError("Gemini API key not configured")
    
    async def process_answer_sheet(self, image_path: str) -> Dict[str, Any]:
        """处理答题卡图像，提取学生信息和答案内容"""
        try:
            # 预处理图像
            processed_image = await self._preprocess_image(image_path)
            
            # 使用Gemini进行多模态识别
            recognition_result = await self._recognize_with_gemini(
                processed_image, 
                task_type="answer_sheet"
            )
            
            # 后处理和验证
            validated_result = self._validate_and_enhance_result(recognition_result)
            
            logger.info(f"Answer sheet OCR completed: {image_path}")
            return validated_result
            
        except Exception as e:
            logger.error(f"Answer sheet OCR failed: {str(e)}")
            raise
    
    async def process_paper_document(self, image_path: str) -> Dict[str, Any]:
        """处理试卷文档，识别题目结构和内容"""
        try:
            # 预处理图像
            processed_image = await self._preprocess_image(image_path)
            
            # 使用Gemini进行试卷分析
            recognition_result = await self._recognize_with_gemini(
                processed_image, 
                task_type="paper_document"
            )
            
            # 解析题目结构
            structured_result = self._parse_question_structure(recognition_result)
            
            logger.info(f"Paper document OCR completed: {image_path}")
            return structured_result
            
        except Exception as e:
            logger.error(f"Paper document OCR failed: {str(e)}")
            raise
    
    async def _preprocess_image(self, image_path: str) -> str:
        """图像预处理并转换为base64"""
        try:
            # 打开图像
            with Image.open(image_path) as img:
                # 转换为RGB模式
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 调整图像大小（Gemini有尺寸限制）
                max_size = 2048
                if max(img.size) > max_size:
                    ratio = max_size / max(img.size)
                    new_size = tuple(int(dim * ratio) for dim in img.size)
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                
                # 增强图像质量
                img = self._enhance_image_quality(img)
                
                # 转换为base64
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=95)
                image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
                return image_data
                
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise
    
    def _enhance_image_quality(self, img: Image.Image) -> Image.Image:
        """增强图像质量以提高识别准确率"""
        from PIL import ImageEnhance, ImageFilter
        
        # 锐化
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.2)
        
        # 对比度增强
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)
        
        # 去噪
        img = img.filter(ImageFilter.MedianFilter(size=3))
        
        return img
    
    async def _recognize_with_gemini(self, image_base64: str, task_type: str) -> Dict[str, Any]:
        """使用Gemini进行图像识别"""
        import aiohttp
        
        # 根据任务类型选择提示词
        prompt = self._get_task_prompt(task_type)
        
        # 构建请求
        request_data = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": self.temperature,
                "topK": 40,
                "topP": 0.8,
                "maxOutputTokens": self.max_tokens
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH", 
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_HIGH_ONLY"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        }
        
        # 发送请求
        url = f"{self.base_url}/models/{self.model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=request_data, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Gemini API error: {response.status} - {error_text}")
                
                result = await response.json()
                
                if not result.get('candidates'):
                    raise Exception("No response from Gemini")
                
                content = result['candidates'][0]['content']['parts'][0]['text']
                
                try:
                    # 尝试解析JSON响应
                    return json.loads(content)
                except json.JSONDecodeError:
                    # 如果不是JSON，包装为文本响应
                    return {"text": content, "raw_response": True}
    
    def _get_task_prompt(self, task_type: str) -> str:
        """根据任务类型获取专用提示词"""
        
        if task_type == "answer_sheet":
            return """
你是一个专业的答题卡识别专家，特别擅长识别涂卡形式的选择题。请仔细分析这张答题卡图像，提取以下信息：

1. 学生基本信息：
   - 学号/考号（可能是数字涂卡或手写）
   - 姓名（通常是手写）
   - 班级/年级

2. 答题内容识别（重点关注涂卡识别）：
   - **选择题涂卡识别**：
     * 仔细观察每道题的选项区域（通常是A、B、C、D圆圈或方框）
     * 识别被完全涂黑或涂满的选项
     * 注意区分完全涂黑、部分涂黑和未涂黑的状态
     * 对于模糊涂卡，根据涂黑程度判断学生意图
   - **多选题涂卡**：识别可能涂黑多个选项的情况
   - **判断题涂卡**：识别√、×或对应的涂卡区域
   - **填空题**：识别手写的文字或数字答案
   - **主观题**：识别手写内容

3. 涂卡质量评估：
   - 涂卡是否规范（完全涂黑、无超出边界）
   - 是否有擦除痕迹或重复涂卡
   - 涂卡清晰度和识别置信度

4. 图像质量评估：
   - 清晰度评分（1-10）
   - 是否有污损、折痕等问题
   - 涂卡区域是否清晰可读

请以JSON格式返回结果：
{
  "student_info": {
    "student_id": "学号",
    "name": "姓名", 
    "class": "班级"
  },
  "objective_answers": {
    "1": "A",
    "2": "B",
    "3": "C,D",  // 多选题用逗号分隔
    "4": "√",    // 判断题
    ...
  },
  "subjective_answers": {
    "13": "主观题答案文本...",
    "14": "主观题答案文本...",
    ...
  },
  "bubble_sheet_analysis": {
    "total_bubbles_detected": 40,
    "filled_bubbles": 15,
    "unclear_bubbles": 2,
    "quality_issues": ["第3题涂卡不规范", "第7题有擦除痕迹"]
  },
  "quality_assessment": {
    "clarity_score": 8,
    "bubble_quality_score": 9,
    "issues": ["轻微污损"],
    "confidence": 0.95
  },
  "text_regions": [
    {
      "type": "student_info",
      "content": "识别的文本",
      "confidence": 0.98
    },
    {
      "type": "bubble_sheet",
      "content": "涂卡区域",
      "confidence": 0.92
    }
  ]
}

**涂卡识别重要提示**：
- 优先识别完全涂黑的圆圈或方框作为学生选择
- 对于部分涂黑的选项，根据涂黑程度（>50%视为选择）
- 如果同一题有多个涂黑选项，在多选题中用逗号分隔，在单选题中选择涂黑程度最高的
- 对于擦除后重新涂卡的情况，识别最终的涂卡结果
- 如果涂卡不清晰或无法确定，在confidence中标注较低值
- 保持对传统手写答案和现代涂卡形式的兼容性
"""

        elif task_type == "paper_document":
            return """
你是一个专业的试卷分析专家。请仔细分析这张试卷图像，识别题目结构和内容：

1. 试卷基本信息：
   - 科目名称
   - 考试名称
   - 总分
   - 考试时间

2. 题目结构分析：
   - 题目编号和类型（选择题、填空题、简答题、论述题等）
   - 每题分值
   - 题目内容完整文本
   - 题目在图像中的位置坐标

3. 知识点识别：
   - 每道题涉及的历史知识点
   - 难度等级评估

请以JSON格式返回结果：
{
  "paper_info": {
    "subject": "历史",
    "exam_name": "考试名称",
    "total_score": 100,
    "duration": "90分钟"
  },
  "questions": [
    {
      "number": "1",
      "type": "choice",
      "content": "题目完整内容...",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "points": 2,
      "knowledge_points": ["古代政治制度"],
      "difficulty": "medium",
      "region": {
        "x": 100,
        "y": 200,
        "width": 400,
        "height": 80
      }
    }
  ],
  "sections": [
    {
      "name": "第一部分 选择题",
      "question_range": "1-10",
      "total_points": 20
    }
  ],
  "quality_assessment": {
    "clarity_score": 9,
    "completeness": 1.0,
    "confidence": 0.96
  }
}

注意：
- 准确识别每道题的完整内容，包括题干和选项
- 坐标使用相对百分比表示（0-100）
- 根据题目内容判断知识点和难度
- 保持题目原有格式和编号
"""
        
        else:
            return "请识别图像中的文字内容，并以结构化格式返回。"
    
    def _validate_and_enhance_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """验证和增强识别结果"""
        if result.get("raw_response"):
            # 处理非JSON响应
            return self._parse_raw_text_response(result["text"])
        
        # 验证必要字段
        validated_result = {
            "status": "completed",
            "confidence": result.get("quality_assessment", {}).get("confidence", 0.8),
            "student_info": result.get("student_info", {}),
            "objective_answers": result.get("objective_answers", {}),
            "subjective_answers": result.get("subjective_answers", {}),
            "quality_assessment": result.get("quality_assessment", {}),
            "text_regions": result.get("text_regions", []),
            "processing_time": 0,  # 将在调用处设置
            "ocr_engine": "gemini-2.5-pro"
        }
        
        # 数据清洗和验证
        validated_result = self._clean_and_validate_data(validated_result)
        
        return validated_result
    
    def _parse_question_structure(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """解析试卷题目结构"""
        if result.get("raw_response"):
            return self._parse_raw_paper_response(result["text"])
        
        structured_result = {
            "status": "completed",
            "paper_info": result.get("paper_info", {}),
            "questions": result.get("questions", []),
            "sections": result.get("sections", []),
            "quality_assessment": result.get("quality_assessment", {}),
            "total_questions": len(result.get("questions", [])),
            "total_points": sum(q.get("points", 0) for q in result.get("questions", [])),
            "ocr_engine": "gemini-2.5-pro"
        }
        
        # 增强题目信息
        structured_result["questions"] = self._enhance_question_data(
            structured_result["questions"]
        )
        
        return structured_result
    
    def _clean_and_validate_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """清洗和验证数据"""
        # 清理学生信息
        student_info = data.get("student_info", {})
        if student_info.get("student_id"):
            # 清理学号格式
            student_info["student_id"] = str(student_info["student_id"]).strip()
        
        if student_info.get("name"):
            # 清理姓名格式
            student_info["name"] = student_info["name"].strip()
        
        # 验证答案格式
        objective_answers = data.get("objective_answers", {})
        cleaned_objective = {}
        for q_num, answer in objective_answers.items():
            if answer and str(answer).strip():
                cleaned_objective[str(q_num)] = str(answer).strip().upper()
        data["objective_answers"] = cleaned_objective
        
        # 清理主观题答案
        subjective_answers = data.get("subjective_answers", {})
        cleaned_subjective = {}
        for q_num, answer in subjective_answers.items():
            if answer and str(answer).strip():
                cleaned_subjective[str(q_num)] = str(answer).strip()
        data["subjective_answers"] = cleaned_subjective
        
        return data
    
    def _enhance_question_data(self, questions: List[Dict]) -> List[Dict]:
        """增强题目数据"""
        enhanced_questions = []
        
        for question in questions:
            enhanced_question = question.copy()
            
            # 标准化题目类型
            q_type = question.get("type", "").lower()
            type_mapping = {
                "choice": "choice",
                "选择题": "choice", 
                "单选题": "choice",
                "多选题": "multiple_choice",
                "fill": "fill",
                "填空题": "fill",
                "short_answer": "short_answer",
                "简答题": "short_answer",
                "essay": "essay", 
                "论述题": "essay",
                "analysis": "analysis",
                "材料分析题": "analysis"
            }
            enhanced_question["type"] = type_mapping.get(q_type, "unknown")
            
            # 标准化难度等级
            difficulty = question.get("difficulty", "").lower()
            difficulty_mapping = {
                "easy": "easy",
                "简单": "easy",
                "medium": "medium", 
                "中等": "medium",
                "hard": "hard",
                "困难": "hard"
            }
            enhanced_question["difficulty"] = difficulty_mapping.get(difficulty, "medium")
            
            # 确保分值为数字
            try:
                enhanced_question["points"] = int(question.get("points", 0))
            except (ValueError, TypeError):
                enhanced_question["points"] = 0
            
            enhanced_questions.append(enhanced_question)
        
        return enhanced_questions
    
    def _parse_raw_text_response(self, text: str) -> Dict[str, Any]:
        """解析原始文本响应（备用方案）"""
        # 简单的文本解析逻辑
        lines = text.split('\n')
        
        result = {
            "status": "completed",
            "confidence": 0.7,  # 较低置信度
            "student_info": {},
            "objective_answers": {},
            "subjective_answers": {},
            "quality_assessment": {"clarity_score": 7, "issues": ["需要人工复核"]},
            "text_regions": [{"type": "raw_text", "content": text, "confidence": 0.7}],
            "ocr_engine": "gemini-2.5-pro-fallback"
        }
        
        # 尝试提取学生信息
        import re
        for line in lines:
            # 学号
            student_id_match = re.search(r'学号[：:]\s*(\d+)', line)
            if student_id_match:
                result["student_info"]["student_id"] = student_id_match.group(1)
            
            # 姓名
            name_match = re.search(r'姓名[：:]\s*([^\s\d]+)', line)
            if name_match:
                result["student_info"]["name"] = name_match.group(1)
        
        return result
    
    def _parse_raw_paper_response(self, text: str) -> Dict[str, Any]:
        """解析原始试卷文本响应（备用方案）"""
        return {
            "status": "completed",
            "paper_info": {"subject": "历史"},
            "questions": [],
            "sections": [],
            "quality_assessment": {"clarity_score": 7, "confidence": 0.7},
            "total_questions": 0,
            "total_points": 0,
            "ocr_engine": "gemini-2.5-pro-fallback",
            "raw_text": text
        }

    async def batch_process_images(self, image_paths: List[str], task_type: str) -> List[Dict[str, Any]]:
        """批量处理图像"""
        results = []
        
        # 控制并发数量避免API限流
        semaphore = asyncio.Semaphore(3)
        
        async def process_single(image_path: str):
            async with semaphore:
                try:
                    if task_type == "answer_sheet":
                        result = await self.process_answer_sheet(image_path)
                    else:
                        result = await self.process_paper_document(image_path)
                    
                    result["file_path"] = image_path
                    return result
                except Exception as e:
                    logger.error(f"Failed to process {image_path}: {str(e)}")
                    return {
                        "file_path": image_path,
                        "status": "error",
                        "error": str(e),
                        "ocr_engine": "gemini-2.5-pro"
                    }
        
        # 并发处理
        tasks = [process_single(path) for path in image_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理异常结果
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                processed_results.append({
                    "status": "error",
                    "error": str(result),
                    "ocr_engine": "gemini-2.5-pro"
                })
            else:
                processed_results.append(result)
        
        return processed_results

    def get_health_status(self) -> Dict[str, Any]:
        """获取服务健康状态"""
        return {
            "service": "gemini-ocr",
            "status": "healthy" if self.api_key else "unhealthy",
            "model": self.model,
            "api_configured": bool(self.api_key),
            "capabilities": [
                "answer_sheet_recognition",
                "paper_document_analysis", 
                "student_info_extraction",
                "handwriting_recognition",
                "question_structure_parsing"
            ]
        }