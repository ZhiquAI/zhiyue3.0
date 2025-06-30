"""
OCR识别服务 - 处理试卷和答题卡的文字识别
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import pytesseract
import easyocr

from sqlalchemy.orm import Session
from models.file_storage import FileStorage, PaperDocument, AnswerSheet
from services.gemini_service import GeminiService
from config import settings

logger = logging.getLogger(__name__)

class OCRService:
    """OCR识别服务类"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gemini_service = GeminiService()
        
        # 初始化EasyOCR
        self.easyocr_reader = easyocr.Reader(['ch_sim', 'en'])
        
        # OCR配置
        self.tesseract_config = '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz一二三四五六七八九十'
    
    def preprocess_image(self, image_path: Path) -> np.ndarray:
        """图像预处理"""
        # 读取图像
        image = cv2.imread(str(image_path))
        
        # 转换为灰度图
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 去噪
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # 自适应阈值处理
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # 形态学操作
        kernel = np.ones((1, 1), np.uint8)
        processed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return processed
    
    async def process_paper_document(self, file_record: FileStorage) -> Dict[str, Any]:
        """处理试卷文档OCR"""
        try:
            # 图像预处理
            image_path = Path(settings.STORAGE_BASE_PATH) / file_record.file_path
            processed_image = self.preprocess_image(image_path)
            
            # 执行OCR识别
            ocr_results = await self._perform_ocr(processed_image)
            
            # 使用AI分析试卷内容
            ai_analysis = await self._analyze_paper_with_ai(ocr_results['text'])
            
            # 创建或更新试卷文档记录
            paper_doc = self.db.query(PaperDocument).filter(
                PaperDocument.file_id == file_record.id
            ).first()
            
            if not paper_doc:
                paper_doc = PaperDocument(
                    exam_id=file_record.exam_id,
                    file_id=file_record.id,
                    paper_type='original'
                )
                self.db.add(paper_doc)
            
            # 更新OCR结果
            paper_doc.ocr_status = 'completed'
            paper_doc.ocr_result = ocr_results
            paper_doc.ocr_confidence = ocr_results.get('confidence', 0)
            paper_doc.questions_parsed = ai_analysis.get('questions', [])
            paper_doc.total_questions = len(ai_analysis.get('questions', []))
            paper_doc.total_points = ai_analysis.get('total_points', 0)
            
            # 评估图像质量
            quality_score = self._assess_image_quality(processed_image)
            paper_doc.image_quality_score = quality_score
            
            self.db.commit()
            
            # 更新文件处理状态
            file_record.processing_status = 'completed'
            file_record.processing_result = {
                'ocr_confidence': ocr_results.get('confidence', 0),
                'questions_count': len(ai_analysis.get('questions', [])),
                'quality_score': quality_score
            }
            self.db.commit()
            
            logger.info(f"Paper OCR completed: {file_record.id}")
            return {
                'status': 'success',
                'ocr_result': ocr_results,
                'ai_analysis': ai_analysis,
                'quality_score': quality_score
            }
            
        except Exception as e:
            logger.error(f"Paper OCR failed: {str(e)}")
            
            # 更新错误状态
            file_record.processing_status = 'failed'
            file_record.error_message = str(e)
            self.db.commit()
            
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def process_answer_sheet(self, file_record: FileStorage) -> Dict[str, Any]:
        """处理答题卡OCR"""
        try:
            # 图像预处理
            image_path = Path(settings.STORAGE_BASE_PATH) / file_record.file_path
            processed_image = self.preprocess_image(image_path)
            
            # 执行OCR识别
            ocr_results = await self._perform_ocr(processed_image)
            
            # 提取学生信息和答案
            student_info = self._extract_student_info(ocr_results)
            answers = self._extract_answers(ocr_results, processed_image)
            
            # 创建或更新答题卡记录
            answer_sheet = self.db.query(AnswerSheet).filter(
                AnswerSheet.file_id == file_record.id
            ).first()
            
            if not answer_sheet:
                answer_sheet = AnswerSheet(
                    exam_id=file_record.exam_id,
                    file_id=file_record.id
                )
                self.db.add(answer_sheet)
            
            # 更新识别结果
            answer_sheet.recognition_status = 'completed'
            answer_sheet.recognition_result = ocr_results
            answer_sheet.recognition_confidence = ocr_results.get('confidence', 0)
            answer_sheet.student_id = student_info.get('student_id')
            answer_sheet.student_name = student_info.get('student_name')
            answer_sheet.class_name = student_info.get('class_name')
            answer_sheet.extracted_answers = answers
            
            # 质量检查
            quality_issues = self._check_answer_sheet_quality(ocr_results, answers)
            answer_sheet.quality_issues = quality_issues
            answer_sheet.needs_manual_review = len(quality_issues) > 0
            
            self.db.commit()
            
            # 更新文件处理状态
            file_record.processing_status = 'completed'
            file_record.processing_result = {
                'student_info': student_info,
                'answers_count': len(answers),
                'quality_issues': len(quality_issues)
            }
            self.db.commit()
            
            logger.info(f"Answer sheet OCR completed: {file_record.id}")
            return {
                'status': 'success',
                'student_info': student_info,
                'answers': answers,
                'quality_issues': quality_issues
            }
            
        except Exception as e:
            logger.error(f"Answer sheet OCR failed: {str(e)}")
            
            # 更新错误状态
            file_record.processing_status = 'failed'
            file_record.error_message = str(e)
            self.db.commit()
            
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _perform_ocr(self, image: np.ndarray) -> Dict[str, Any]:
        """执行OCR识别"""
        try:
            # 使用EasyOCR进行识别
            easyocr_results = self.easyocr_reader.readtext(image)
            
            # 使用Tesseract进行识别
            pil_image = Image.fromarray(image)
            tesseract_text = pytesseract.image_to_string(pil_image, config=self.tesseract_config)
            
            # 合并结果
            combined_text = self._combine_ocr_results(easyocr_results, tesseract_text)
            
            # 计算置信度
            confidence = self._calculate_ocr_confidence(easyocr_results)
            
            return {
                'text': combined_text,
                'easyocr_results': easyocr_results,
                'tesseract_text': tesseract_text,
                'confidence': confidence,
                'regions': self._extract_text_regions(easyocr_results)
            }
            
        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            raise
    
    def _combine_ocr_results(self, easyocr_results: List, tesseract_text: str) -> str:
        """合并OCR结果"""
        # 提取EasyOCR文本
        easyocr_text = ' '.join([result[1] for result in easyocr_results])
        
        # 简单的文本合并策略
        # 在实际应用中，可以使用更复杂的算法来选择最佳结果
        if len(easyocr_text) > len(tesseract_text):
            return easyocr_text
        else:
            return tesseract_text
    
    def _calculate_ocr_confidence(self, easyocr_results: List) -> int:
        """计算OCR置信度"""
        if not easyocr_results:
            return 0
        
        confidences = [result[2] for result in easyocr_results]
        average_confidence = sum(confidences) / len(confidences)
        return int(average_confidence * 100)
    
    def _extract_text_regions(self, easyocr_results: List) -> List[Dict]:
        """提取文本区域信息"""
        regions = []
        for result in easyocr_results:
            bbox, text, confidence = result
            regions.append({
                'text': text,
                'bbox': bbox,
                'confidence': confidence
            })
        return regions
    
    async def _analyze_paper_with_ai(self, text: str) -> Dict[str, Any]:
        """使用AI分析试卷内容"""
        try:
            # 调用Gemini API分析试卷
            analysis = await self.gemini_service.analyze_paper_content(text)
            return analysis
        except Exception as e:
            logger.error(f"AI paper analysis failed: {str(e)}")
            # 返回默认分析结果
            return {
                'questions': [],
                'total_points': 0,
                'question_types': [],
                'knowledge_areas': []
            }
    
    def _extract_student_info(self, ocr_results: Dict) -> Dict[str, str]:
        """从OCR结果中提取学生信息"""
        text = ocr_results.get('text', '')
        
        # 使用正则表达式提取学生信息
        import re
        
        student_info = {}
        
        # 提取学号
        student_id_pattern = r'学号[：:]\s*(\d+)'
        student_id_match = re.search(student_id_pattern, text)
        if student_id_match:
            student_info['student_id'] = student_id_match.group(1)
        
        # 提取姓名
        name_pattern = r'姓名[：:]\s*([^\s\d]+)'
        name_match = re.search(name_pattern, text)
        if name_match:
            student_info['student_name'] = name_match.group(1)
        
        # 提取班级
        class_pattern = r'班级[：:]\s*([^\s]+)'
        class_match = re.search(class_pattern, text)
        if class_match:
            student_info['class_name'] = class_match.group(1)
        
        return student_info
    
    def _extract_answers(self, ocr_results: Dict, image: np.ndarray) -> Dict[str, str]:
        """从OCR结果中提取答案"""
        # 这里需要根据具体的答题卡格式来实现
        # 可能需要使用模板匹配、区域检测等技术
        
        answers = {}
        regions = ocr_results.get('regions', [])
        
        # 简化的答案提取逻辑
        for i, region in enumerate(regions):
            if self._is_answer_region(region):
                question_num = self._extract_question_number(region)
                if question_num:
                    answers[question_num] = region['text']
        
        return answers
    
    def _is_answer_region(self, region: Dict) -> bool:
        """判断是否为答案区域"""
        # 简化的判断逻辑
        text = region.get('text', '')
        return len(text) > 5 and not any(keyword in text for keyword in ['姓名', '学号', '班级'])
    
    def _extract_question_number(self, region: Dict) -> Optional[str]:
        """从区域中提取题号"""
        # 简化的题号提取逻辑
        import re
        text = region.get('text', '')
        match = re.search(r'(\d+)[.、]', text)
        return match.group(1) if match else None
    
    def _check_answer_sheet_quality(self, ocr_results: Dict, answers: Dict) -> List[str]:
        """检查答题卡质量"""
        issues = []
        
        # 检查OCR置信度
        confidence = ocr_results.get('confidence', 0)
        if confidence < 70:
            issues.append('OCR识别置信度较低')
        
        # 检查答案完整性
        if len(answers) < 5:  # 假设至少应该有5道题
            issues.append('识别到的答案数量过少')
        
        # 检查学生信息完整性
        # 这里可以添加更多的质量检查逻辑
        
        return issues
    
    def _assess_image_quality(self, image: np.ndarray) -> int:
        """评估图像质量"""
        # 计算图像清晰度（拉普拉斯方差）
        laplacian_var = cv2.Laplacian(image, cv2.CV_64F).var()
        
        # 将方差映射到0-100的分数
        quality_score = min(100, int(laplacian_var / 10))
        
        return quality_score