from typing import Dict, List, Any, Tuple, Optional
import cv2
import numpy as np
from pathlib import Path
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class BubbleDetection:
    """涂卡检测结果"""
    question_number: str
    option: str
    is_filled: bool
    fill_percentage: float
    confidence: float
    coordinates: Tuple[int, int, int, int]  # x, y, width, height
    quality_issues: List[str]

@dataclass
class BubbleSheetAnalysis:
    """涂卡分析结果"""
    total_bubbles_detected: int
    filled_bubbles: int
    unclear_bubbles: int
    quality_issues: List[str]
    detection_results: List[BubbleDetection]
    overall_quality_score: float

class BubbleSheetService:
    """涂卡识别服务"""
    
    def __init__(self):
        self.fill_threshold = 0.5  # 涂黑阈值
        self.confidence_threshold = 0.7  # 置信度阈值
        
    def analyze_bubble_sheet(self, image_path: str, ocr_result: Dict[str, Any]) -> BubbleSheetAnalysis:
        """分析涂卡答题卡"""
        try:
            # 加载图像
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"无法加载图像: {image_path}")
            
            # 预处理图像
            processed_image = self._preprocess_image(image)
            
            # 检测涂卡区域
            bubble_detections = self._detect_bubbles(processed_image, ocr_result)
            
            # 分析涂卡质量
            quality_analysis = self._analyze_quality(bubble_detections)
            
            # 生成分析结果
            analysis = BubbleSheetAnalysis(
                total_bubbles_detected=len(bubble_detections),
                filled_bubbles=len([b for b in bubble_detections if b.is_filled]),
                unclear_bubbles=len([b for b in bubble_detections if b.confidence < self.confidence_threshold]),
                quality_issues=quality_analysis,
                detection_results=bubble_detections,
                overall_quality_score=self._calculate_quality_score(bubble_detections)
            )
            
            logger.info(f"涂卡分析完成: {image_path}, 检测到 {len(bubble_detections)} 个涂卡")
            return analysis
            
        except Exception as e:
            logger.error(f"涂卡分析失败: {str(e)}")
            return self._create_fallback_analysis()
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """预处理图像"""
        # 转换为灰度图
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 高斯模糊去噪
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # 自适应阈值处理
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        return thresh
    
    def _detect_bubbles(self, image: np.ndarray, ocr_result: Dict[str, Any]) -> List[BubbleDetection]:
        """检测涂卡区域"""
        detections = []
        
        # 使用HoughCircles检测圆形涂卡
        circles = cv2.HoughCircles(
            image,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=30,
            param1=50,
            param2=30,
            minRadius=10,
            maxRadius=50
        )
        
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            
            for i, (x, y, r) in enumerate(circles):
                # 提取涂卡区域
                bubble_roi = image[y-r:y+r, x-r:x+r]
                
                if bubble_roi.size > 0:
                    # 分析涂黑程度
                    fill_percentage = self._calculate_fill_percentage(bubble_roi)
                    is_filled = fill_percentage > self.fill_threshold
                    
                    # 计算置信度
                    confidence = self._calculate_confidence(bubble_roi, fill_percentage)
                    
                    # 检测质量问题
                    quality_issues = self._detect_quality_issues(bubble_roi, fill_percentage)
                    
                    detection = BubbleDetection(
                        question_number=f"q{i+1}",  # 简化的题号，实际应该根据位置推断
                        option="A",  # 简化的选项，实际应该根据位置推断
                        is_filled=is_filled,
                        fill_percentage=fill_percentage,
                        confidence=confidence,
                        coordinates=(x-r, y-r, 2*r, 2*r),
                        quality_issues=quality_issues
                    )
                    
                    detections.append(detection)
        
        return detections
    
    def _calculate_fill_percentage(self, bubble_roi: np.ndarray) -> float:
        """计算涂黑百分比"""
        if bubble_roi.size == 0:
            return 0.0
        
        # 计算黑色像素比例
        total_pixels = bubble_roi.size
        black_pixels = np.sum(bubble_roi < 128)  # 阈值128
        
        return black_pixels / total_pixels
    
    def _calculate_confidence(self, bubble_roi: np.ndarray, fill_percentage: float) -> float:
        """计算识别置信度"""
        if bubble_roi.size == 0:
            return 0.0
        
        # 基于填充程度和图像质量计算置信度
        base_confidence = 0.5
        
        # 填充程度影响
        if fill_percentage > 0.8 or fill_percentage < 0.2:
            base_confidence += 0.3  # 明确的填充或未填充
        elif 0.4 < fill_percentage < 0.6:
            base_confidence -= 0.2  # 模糊的填充状态
        
        # 图像清晰度影响
        blur_score = cv2.Laplacian(bubble_roi, cv2.CV_64F).var()
        if blur_score > 100:
            base_confidence += 0.2
        elif blur_score < 50:
            base_confidence -= 0.1
        
        return max(0.0, min(1.0, base_confidence))
    
    def _detect_quality_issues(self, bubble_roi: np.ndarray, fill_percentage: float) -> List[str]:
        """检测质量问题"""
        issues = []
        
        # 检测模糊涂卡
        if 0.3 < fill_percentage < 0.7:
            issues.append("涂卡不清晰")
        
        # 检测图像模糊
        blur_score = cv2.Laplacian(bubble_roi, cv2.CV_64F).var()
        if blur_score < 50:
            issues.append("图像模糊")
        
        # 检测可能的擦除痕迹
        if fill_percentage > 0.2 and fill_percentage < 0.5:
            issues.append("可能有擦除痕迹")
        
        return issues
    
    def _analyze_quality(self, detections: List[BubbleDetection]) -> List[str]:
        """分析整体质量"""
        quality_issues = []
        
        if not detections:
            quality_issues.append("未检测到涂卡区域")
            return quality_issues
        
        # 统计低置信度检测
        low_confidence_count = len([d for d in detections if d.confidence < self.confidence_threshold])
        if low_confidence_count > len(detections) * 0.3:
            quality_issues.append(f"有{low_confidence_count}个涂卡识别置信度较低")
        
        # 统计质量问题
        total_issues = sum(len(d.quality_issues) for d in detections)
        if total_issues > len(detections) * 0.5:
            quality_issues.append("涂卡质量普遍较差")
        
        return quality_issues
    
    def _calculate_quality_score(self, detections: List[BubbleDetection]) -> float:
        """计算整体质量评分"""
        if not detections:
            return 0.0
        
        # 基于置信度和质量问题计算评分
        avg_confidence = sum(d.confidence for d in detections) / len(detections)
        
        # 质量问题扣分
        total_issues = sum(len(d.quality_issues) for d in detections)
        issue_penalty = min(0.5, total_issues / len(detections) * 0.1)
        
        quality_score = avg_confidence - issue_penalty
        return max(0.0, min(1.0, quality_score))
    
    def _create_fallback_analysis(self) -> BubbleSheetAnalysis:
        """创建备用分析结果"""
        return BubbleSheetAnalysis(
            total_bubbles_detected=0,
            filled_bubbles=0,
            unclear_bubbles=0,
            quality_issues=["涂卡分析失败，建议人工复核"],
            detection_results=[],
            overall_quality_score=0.0
        )
    
    def enhance_ocr_with_bubble_analysis(self, ocr_result: Dict[str, Any], bubble_analysis: BubbleSheetAnalysis) -> Dict[str, Any]:
        """使用涂卡分析增强OCR结果"""
        enhanced_result = ocr_result.copy()
        
        # 添加涂卡分析数据
        enhanced_result['bubble_sheet_analysis'] = {
            'total_bubbles_detected': bubble_analysis.total_bubbles_detected,
            'filled_bubbles': bubble_analysis.filled_bubbles,
            'unclear_bubbles': bubble_analysis.unclear_bubbles,
            'quality_issues': bubble_analysis.quality_issues
        }
        
        # 更新质量评估
        if 'quality_assessment' not in enhanced_result:
            enhanced_result['quality_assessment'] = {}
        
        enhanced_result['quality_assessment']['bubble_quality_score'] = bubble_analysis.overall_quality_score
        
        # 根据涂卡分析调整置信度
        if bubble_analysis.overall_quality_score < 0.5:
            enhanced_result['confidence'] = min(enhanced_result.get('confidence', 0.8), 0.6)
        
        return enhanced_result
    
    def validate_bubble_answers(self, objective_answers: Dict[str, str], bubble_analysis: BubbleSheetAnalysis) -> Dict[str, Any]:
        """验证涂卡答案的一致性"""
        validation_result = {
            'is_consistent': True,
            'inconsistencies': [],
            'recommendations': []
        }
        
        # 检查是否有多选但标记为单选的情况
        for detection in bubble_analysis.detection_results:
            if detection.quality_issues:
                validation_result['inconsistencies'].append(
                    f"题目{detection.question_number}选项{detection.option}: {', '.join(detection.quality_issues)}"
                )
        
        # 检查未填充的题目
        filled_questions = set(d.question_number for d in bubble_analysis.detection_results if d.is_filled)
        answered_questions = set(objective_answers.keys())
        
        missing_answers = answered_questions - filled_questions
        if missing_answers:
            validation_result['inconsistencies'].append(f"以下题目可能未正确涂卡: {', '.join(missing_answers)}")
        
        # 生成建议
        if bubble_analysis.unclear_bubbles > 0:
            validation_result['recommendations'].append("建议人工复核涂卡不清晰的题目")
        
        if bubble_analysis.overall_quality_score < 0.7:
            validation_result['recommendations'].append("建议重新扫描或拍摄答题卡")
        
        validation_result['is_consistent'] = len(validation_result['inconsistencies']) == 0
        
        return validation_result