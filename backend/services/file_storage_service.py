"""
文件存储服务 - 处理文件上传、存储和管理
"""

import hashlib
import uuid
import shutil
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path
import mimetypes
from PIL import Image
import logging

from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
try:
    from models.file_storage import FileStorage, ProcessingQueue
    from models.production_models import Student, AnswerSheet
    from services.barcode_service import BarcodeService
    from config.settings import settings
    from utils.file_security import (
        FileSecurityValidator, get_max_file_size
    )
except ImportError:
    from models.file_storage import FileStorage, ProcessingQueue
    from models.production_models import Student, AnswerSheet
    from services.barcode_service import BarcodeService
    from config.settings import settings
    from utils.file_security import (
        FileSecurityValidator, get_max_file_size
    )

logger = logging.getLogger(__name__)


class FileStorageService:
    """文件存储服务类"""
    
    def __init__(self, db: Session):
        self.db = db
        self.base_storage_path = Path(settings.STORAGE_BASE_PATH)
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_extensions = settings.ALLOWED_FILE_EXTENSIONS
        self.barcode_service = BarcodeService()
        self.security_validator = FileSecurityValidator()
        
        # 确保存储目录存在
        self._ensure_storage_directories()
    
    def _ensure_storage_directories(self):
        """确保存储目录结构存在"""
        directories = [
            'papers/original',
            'papers/processed',
            'papers/thumbnails',
            'answer_sheets/original',
            'answer_sheets/processed',
            'answer_sheets/thumbnails',
            'temp',
            'archive'
        ]
        
        for directory in directories:
            dir_path = self.base_storage_path / directory
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """计算文件SHA256哈希值"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def _get_mime_type(self, file_path: Path) -> str:
        """获取文件MIME类型"""
        try:
            # 使用标准库mimetypes替代python-magic
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if mime_type:
                return mime_type
        except:
            pass
        
        # 备用方案：根据扩展名判断
        extension = file_path.suffix.lower()
        mime_map = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff'
        }
        return mime_map.get(extension, 'application/octet-stream')
    
    def _validate_file(self, file: UploadFile,
                       file_category: str = None) -> Dict[str, Any]:
        """验证上传文件（使用增强的安全验证）"""
        try:
            # 使用安全验证器进行全面验证
            max_size = None
            if file_category:
                max_size = get_max_file_size(file_category)
            else:
                max_size = self.max_file_size
            
            validation_result = self.security_validator.validate_file(
                file=file,
                allowed_types=self.allowed_extensions,
                max_size=max_size
            )
            
            logger.info(
                f"File validation passed: {file.filename}, "
                f"size: {validation_result['file_size']}, "
                f"type: {validation_result['mime_type']}"
            )
            
            return validation_result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"File validation error: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"文件验证失败: {str(e)}"
            )
    
    def _generate_storage_path(self, file_category: str, file_purpose: str, 
                             file_extension: str) -> Path:
        """生成存储路径"""
        # 按日期分目录存储
        date_path = datetime.now().strftime("%Y/%m/%d")
        
        # 生成唯一文件名
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # 构建完整路径
        storage_path = self.base_storage_path / file_category / file_purpose / date_path
        storage_path.mkdir(parents=True, exist_ok=True)
        
        return storage_path / unique_filename
    
    async def upload_file(self, file: UploadFile, exam_id: str, 
                         file_category: str, uploaded_by: str) -> FileStorage:
        """上传文件到存储系统"""
        try:
            # 验证文件
            validation_result = self._validate_file(file)
            
            # 生成存储路径
            storage_path = self._generate_storage_path(
                file_category, 'original', validation_result['extension']
            )
            
            # 保存文件到临时位置
            temp_path = self.base_storage_path / 'temp' / f"{uuid.uuid4()}{validation_result['extension']}"
            
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # 计算文件哈希
            file_hash = self._calculate_file_hash(temp_path)
            
            # 检查是否已存在相同文件
            existing_file = self.db.query(FileStorage).filter(
                FileStorage.file_hash == file_hash,
                FileStorage.exam_id == exam_id,
                FileStorage.file_category == file_category
            ).first()
            
            if existing_file:
                # 删除临时文件
                temp_path.unlink()
                logger.info(f"File already exists: {file_hash}")
                return existing_file
            
            # 移动文件到最终位置
            shutil.move(str(temp_path), str(storage_path))
            
            # 获取文件信息
            file_size = storage_path.stat().st_size
            mime_type = self._get_mime_type(storage_path)
            
            # 创建文件记录
            file_record = FileStorage(
                original_filename=validation_result['original_filename'],
                stored_filename=storage_path.name,
                file_path=str(storage_path.relative_to(self.base_storage_path)),
                file_size=file_size,
                file_hash=file_hash,
                mime_type=mime_type,
                file_extension=validation_result['extension'],
                file_category=file_category,
                file_purpose='original',
                exam_id=exam_id,
                uploaded_by=uploaded_by,
                storage_provider='local'
            )
            
            self.db.add(file_record)
            self.db.commit()
            self.db.refresh(file_record)
            
            # 添加到处理队列
            await self._add_to_processing_queue(file_record)
            
            logger.info(f"File uploaded successfully: {file_record.id}")
            return file_record
            
        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            # 清理临时文件
            if 'temp_path' in locals() and temp_path.exists():
                temp_path.unlink()
            raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")
    
    async def _add_to_processing_queue(self, file_record: FileStorage):
        """添加文件到处理队列"""
        # 根据文件类型确定处理任务
        task_types = []
        
        if file_record.file_category == 'paper':
            task_types = ['ocr', 'question_parsing']
        elif file_record.file_category == 'answer_sheet':
            task_types = ['ocr', 'answer_recognition']
        
        # 为每个任务类型创建队列项
        for task_type in task_types:
            queue_item = ProcessingQueue(
                file_id=file_record.id,
                task_type=task_type,
                priority=self._get_task_priority(task_type)
            )
            self.db.add(queue_item)
        
        self.db.commit()
    
    def _get_task_priority(self, task_type: str) -> int:
        """获取任务优先级"""
        priority_map = {
            'ocr': 8,  # 高优先级
            'question_parsing': 6,
            'answer_recognition': 7,
            'grading': 5
        }
        return priority_map.get(task_type, 5)
    
    async def batch_upload_answer_sheets(self, files: List[UploadFile], 
                                 exam_id: str, uploaded_by: str, 
                                 processing_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """批量上传答题卡"""
        results = {
            'success': [],
            'failed': [],
            'total': len(files),
            'success_count': 0,
            'failed_count': 0,
            'student_matches': [],
            'unmatched_files': []
        }
        
        for file in files:
            try:
                file_record = await self.upload_file(file, exam_id, 'answer_sheet', uploaded_by)
                
                # 尝试识别条形码并匹配学生信息
                student_info = await self._process_answer_sheet_barcode(file_record, exam_id)
                
                result_item = {
                    'filename': file.filename,
                    'file_id': file_record.id
                }
                
                if student_info:
                    result_item['student_info'] = student_info
                    results['student_matches'].append(result_item)
                else:
                    results['unmatched_files'].append(result_item)
                
                results['success'].append(result_item)
                results['success_count'] += 1
                
            except Exception as e:
                results['failed'].append({
                    'filename': file.filename,
                    'error': str(e)
                })
                results['failed_count'] += 1
        
        return results
    
    def get_file_by_id(self, file_id: str) -> Optional[FileStorage]:
        """根据ID获取文件记录"""
        return self.db.query(FileStorage).filter(FileStorage.id == file_id).first()
    
    def get_files_by_exam(self, exam_id: str, file_category: str = None) -> List[FileStorage]:
        """获取考试相关的文件"""
        query = self.db.query(FileStorage).filter(FileStorage.exam_id == exam_id)
        
        if file_category:
            query = query.filter(FileStorage.file_category == file_category)
        
        return query.order_by(FileStorage.created_at.desc()).all()
    
    def delete_file(self, file_id: str) -> bool:
        """删除文件"""
        try:
            file_record = self.get_file_by_id(file_id)
            if not file_record:
                return False
            
            # 删除物理文件
            file_path = self.base_storage_path / file_record.file_path
            if file_path.exists():
                file_path.unlink()
            
            # 删除数据库记录
            self.db.delete(file_record)
            self.db.commit()
            
            logger.info(f"File deleted: {file_id}")
            return True
            
        except Exception as e:
            logger.error(f"File deletion failed: {str(e)}")
            return False
    
    def generate_thumbnail(self, file_record: FileStorage) -> Optional[str]:
        """生成文件缩略图"""
        try:
            if not file_record.mime_type.startswith('image/'):
                return None
            
            # 原文件路径
            original_path = self.base_storage_path / file_record.file_path
            
            # 缩略图路径
            thumbnail_path = self._generate_storage_path(
                file_record.file_category, 'thumbnails', '.jpg'
            )
            
            # 生成缩略图
            with Image.open(original_path) as img:
                img.thumbnail((300, 300), Image.Resampling.LANCZOS)
                img.convert('RGB').save(thumbnail_path, 'JPEG', quality=85)
            
            # 创建缩略图文件记录
            thumbnail_record = FileStorage(
                original_filename=f"thumb_{file_record.original_filename}",
                stored_filename=thumbnail_path.name,
                file_path=str(thumbnail_path.relative_to(self.base_storage_path)),
                file_size=thumbnail_path.stat().st_size,
                file_hash=self._calculate_file_hash(thumbnail_path),
                mime_type='image/jpeg',
                file_extension='.jpg',
                file_category=file_record.file_category,
                file_purpose='thumbnail',
                exam_id=file_record.exam_id,
                uploaded_by=file_record.uploaded_by,
                storage_provider='local'
            )
            
            self.db.add(thumbnail_record)
            self.db.commit()
            
            return thumbnail_record.id
            
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {str(e)}")
            return None
    
    def cleanup_temp_files(self, older_than_hours: int = 24):
        """清理临时文件"""
        temp_dir = self.base_storage_path / 'temp'
        cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
        
        for file_path in temp_dir.iterdir():
            if file_path.is_file():
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_time < cutoff_time:
                    try:
                        file_path.unlink()
                        logger.info(f"Cleaned up temp file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to cleanup temp file {file_path}: {str(e)}")
    
    async def _process_answer_sheet_barcode(self, file_record: FileStorage, exam_id: str) -> Optional[Dict[str, Any]]:
        """处理答题卡条形码识别和学生信息匹配"""
        try:
            # 获取文件路径
            file_path = self.base_storage_path / file_record.file_path
            
            # 识别条形码
            barcode_result = self.barcode_service.recognize_barcode(str(file_path))
            
            if not barcode_result or not barcode_result.get('success'):
                logger.warning(f"No barcode found in file: {file_record.id}")
                return None
            
            # 从数据库匹配学生信息
            student_info = self.barcode_service.match_student_from_database(
                barcode_result['data'], exam_id, self.db
            )
            
            if student_info:
                # 创建或更新答题卡记录
                await self._create_answer_sheet_record(file_record, student_info, barcode_result)
                
                return {
                    'student_id': student_info.student_id,
                    'student_name': student_info.student_name,
                    'class_name': student_info.class_name,
                    'barcode_data': barcode_result['data']
                }
            else:
                logger.warning(f"No student match found for barcode in file: {file_record.id}")
                return None
                
        except Exception as e:
            logger.error(f"Barcode processing failed for file {file_record.id}: {str(e)}")
            return None
    
    async def _create_answer_sheet_record(self, file_record: FileStorage, 
                                        student_info: Student, barcode_result: Dict[str, Any]):
        """创建答题卡记录"""
        try:
            # 检查是否已存在答题卡记录
            existing_sheet = self.db.query(AnswerSheet).filter(
                AnswerSheet.exam_id == file_record.exam_id,
                AnswerSheet.student_uuid == student_info.id
            ).first()
            
            if existing_sheet:
                # 更新现有记录
                existing_sheet.original_file_path = file_record.file_path
                existing_sheet.barcode_data = barcode_result.get('data')
                existing_sheet.updated_at = datetime.now()
            else:
                # 创建新记录
                answer_sheet = AnswerSheet(
                    exam_id=file_record.exam_id,
                    student_uuid=student_info.id,
                    student_id=student_info.student_id,
                    student_name=student_info.student_name,
                    class_name=student_info.class_name,
                    original_file_path=file_record.file_path,
                    grading_status='pending'
                )
                self.db.add(answer_sheet)
            
            self.db.commit()
            logger.info(f"Answer sheet record created/updated for student: {student_info.student_id}")
            
        except Exception as e:
            logger.error(f"Failed to create answer sheet record: {str(e)}")
            self.db.rollback()
            raise