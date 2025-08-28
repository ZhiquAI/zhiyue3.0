"""文件上传安全验证模块"""

import io
import magic
import hashlib
from typing import Dict, List, Any
from pathlib import Path
from PIL import Image
import logging
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

# 安全的MIME类型映射
SECURE_MIME_TYPES = {
    # 图像文件
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.bmp': ['image/bmp'],
    '.tiff': ['image/tiff'],
    '.tif': ['image/tiff'],
    '.webp': ['image/webp'],
    
    # 文档文件
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': [
        'application/vnd.openxmlformats-officedocument.'
        'wordprocessingml.document'
    ],
    '.txt': ['text/plain'],
    '.rtf': ['application/rtf', 'text/rtf'],
    
    # 压缩文件
    '.zip': ['application/zip'],
    '.rar': [
        'application/x-rar-compressed'
    ],
    '.7z': ['application/x-7z-compressed'],
    '.tar': ['application/x-tar'],
    '.gz': ['application/gzip']
}

# 危险文件扩展名黑名单
DANGEROUS_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.iso', '.msi', '.run', '.sh', '.ps1',
    '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi'
}

# 文件头魔数验证
FILE_SIGNATURES = {
    'image/jpeg': [b'\xff\xd8\xff'],
    'image/png': [b'\x89\x50\x4e\x47\x0d\x0a\x1a\x0a'],
    'image/gif': [b'\x47\x49\x46\x38\x37\x61', b'\x47\x49\x46\x38\x39\x61'],
    'image/bmp': [b'\x42\x4d'],
    'image/tiff': [b'\x49\x49\x2a\x00', b'\x4d\x4d\x00\x2a'],
    'image/webp': [b'\x52\x49\x46\x46', b'\x57\x45\x42\x50'],
    'application/pdf': [b'\x25\x50\x44\x46'],
    'application/zip': [
        b'\x50\x4b\x03\x04', b'\x50\x4b\x05\x06', b'\x50\x4b\x07\x08'
    ]
}

# 最大文件大小限制（字节）
MAX_FILE_SIZES = {
    'image': 50 * 1024 * 1024,  # 50MB
    'document': 100 * 1024 * 1024,  # 100MB
    'archive': 200 * 1024 * 1024,  # 200MB
    'default': 50 * 1024 * 1024  # 50MB
}

# 图像安全配置
IMAGE_SECURITY_CONFIG = {
    'max_width': 10000,
    'max_height': 10000,
    'max_pixels': 100000000,  # 100M像素
    'allowed_formats': {'JPEG', 'PNG', 'GIF', 'BMP', 'TIFF', 'WEBP'}
}


class FileSecurityValidator:
    """文件安全验证器"""
    
    def __init__(self):
        self.magic_mime = magic.Magic(mime=True)
        self.magic_type = magic.Magic()
    
    def validate_file(self, file: UploadFile,
                      allowed_types: List[str] = None,
                      max_size: int = None) -> Dict[str, Any]:
        """完整的文件安全验证
        
        Args:
            file: 上传的文件对象
            allowed_types: 允许的文件类型列表
            max_size: 最大文件大小
            
        Returns:
            验证结果字典
            
        Raises:
            HTTPException: 验证失败时抛出异常
        """
        try:
            # 基础验证
            self._validate_filename(file.filename)
            
            # 读取文件内容
            content = file.file.read()
            file.file.seek(0)  # 重置文件指针
            
            # 文件大小验证
            file_size = len(content)
            self._validate_file_size(file_size, max_size)
            
            # 文件扩展名验证
            file_extension = self._get_file_extension(file.filename)
            self._validate_extension(file_extension, allowed_types)
            
            # MIME类型验证
            detected_mime = self._detect_mime_type(content)
            self._validate_mime_type(file_extension, detected_mime)
            
            # 文件头验证
            self._validate_file_signature(content, detected_mime)
            
            # 特定类型验证
            if detected_mime.startswith('image/'):
                self._validate_image_file(content)
            elif detected_mime == 'application/pdf':
                self._validate_pdf_file(content)
            
            # 恶意内容检测
            self._scan_malicious_content(content, file_extension)
            
            return {
                'valid': True,
                'file_size': file_size,
                'extension': file_extension,
                'mime_type': detected_mime,
                'file_hash': self._calculate_hash(content)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"File validation error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"文件验证失败: {str(e)}"
            )
    
    def _validate_filename(self, filename: str) -> None:
        """验证文件名安全性"""
        if not filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        # 检查文件名长度
        if len(filename) > 255:
            raise HTTPException(status_code=400, detail="文件名过长")
        
        # 检查危险字符
        dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in dangerous_chars:
            if char in filename:
                raise HTTPException(
                    status_code=400,
                    detail=f"文件名包含非法字符: {char}"
                )
        
        # 检查隐藏文件
        if filename.startswith('.'):
            raise HTTPException(status_code=400, detail="不允许上传隐藏文件")
    
    def _get_file_extension(self, filename: str) -> str:
        """获取文件扩展名"""
        return Path(filename).suffix.lower()
    
    def _validate_extension(self, extension: str, allowed_types: List[str] = None) -> None:
        """验证文件扩展名"""
        if extension in DANGEROUS_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"危险的文件类型: {extension}"
            )
        
        if allowed_types and extension not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型: {extension}"
            )
    
    def _validate_file_size(self, file_size: int, max_size: int = None) -> None:
        """验证文件大小"""
        if file_size == 0:
            raise HTTPException(status_code=400, detail="文件为空")
        
        # 使用传入的最大大小或默认值
        limit = max_size or MAX_FILE_SIZES['default']
        
        if file_size > limit:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制: {file_size} > {limit}"
            )
    
    def _detect_mime_type(self, content: bytes) -> str:
        """检测文件MIME类型"""
        try:
            return self.magic_mime.from_buffer(content)
        except Exception as e:
            logger.warning(f"MIME detection failed: {str(e)}")
            return 'application/octet-stream'
    
    def _validate_mime_type(self, extension: str, detected_mime: str) -> None:
        """验证MIME类型与扩展名匹配"""
        if extension not in SECURE_MIME_TYPES:
            return  # 扩展名不在安全列表中，由其他验证处理
        
        allowed_mimes = SECURE_MIME_TYPES[extension]
        if detected_mime not in allowed_mimes:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"文件类型不匹配: 扩展名 {extension} "
                    f"与检测到的类型 {detected_mime} 不符"
                )
            )
    
    def _validate_file_signature(self, content: bytes, mime_type: str) -> None:
        """验证文件头魔数"""
        if mime_type not in FILE_SIGNATURES:
            return  # 没有定义的签名，跳过验证
        
        signatures = FILE_SIGNATURES[mime_type]
        file_header = content[:32]  # 读取前32字节
        
        for signature in signatures:
            if file_header.startswith(signature):
                return  # 找到匹配的签名
        
        raise HTTPException(
            status_code=400,
            detail=f"文件头验证失败: {mime_type}"
        )
    
    def _validate_image_file(self, content: bytes) -> None:
        """验证图像文件安全性"""
        try:
            with Image.open(io.BytesIO(content)) as img:
                # 检查图像格式
                allowed_formats = IMAGE_SECURITY_CONFIG['allowed_formats']
                if img.format not in allowed_formats:
                    raise HTTPException(
                        status_code=400,
                        detail=f"不支持的图像格式: {img.format}"
                    )
                
                # 检查图像尺寸
                width, height = img.size
                if width > IMAGE_SECURITY_CONFIG['max_width']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"图像宽度超过限制: {width}"
                    )
                
                if height > IMAGE_SECURITY_CONFIG['max_height']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"图像高度超过限制: {height}"
                    )
                
                # 检查像素总数
                total_pixels = width * height
                max_pixels = IMAGE_SECURITY_CONFIG['max_pixels']
                if total_pixels > max_pixels:
                    raise HTTPException(
                        status_code=400,
                        detail=f"图像像素数超过限制: {total_pixels}"
                    )
                
                # 验证图像完整性
                img.verify()
                
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"图像文件验证失败: {str(e)}"
            )
    
    def _validate_pdf_file(self, content: bytes) -> None:
        """验证PDF文件安全性"""
        try:
            # 检查PDF基本结构
            content_str = content.decode('latin-1', errors='ignore')
            
            # 检查是否包含JavaScript
            dangerous_keywords = [
                '/JavaScript', '/JS', '/OpenAction', '/Launch'
            ]
            for keyword in dangerous_keywords:
                if keyword in content_str:
                    raise HTTPException(
                        status_code=400,
                        detail="PDF文件包含潜在危险内容"
                    )
                    
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"PDF validation warning: {str(e)}")
    
    def _scan_malicious_content(self, content: bytes, extension: str) -> None:
        """扫描恶意内容"""
        try:
            # 检查文件中是否包含可执行代码特征
            content_lower = content.lower()
            
            # 检查脚本标签
            script_patterns = [
                b'<script', b'javascript:', b'vbscript:', b'onload=', b'onerror='
            ]
            for pattern in script_patterns:
                if pattern in content_lower:
                    raise HTTPException(
                        status_code=400,
                        detail="文件包含潜在的脚本代码"
                    )
            
            # 检查可执行文件头
            executable_headers = [
                b'MZ', b'\x7fELF', b'\xca\xfe\xba\xbe'
            ]
            for header in executable_headers:
                if content.startswith(header):
                    raise HTTPException(
                        status_code=400,
                        detail="检测到可执行文件"
                    )
                    
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Malicious content scan warning: {str(e)}")
    
    def _calculate_hash(self, content: bytes) -> str:
        """计算文件哈希值"""
        return hashlib.sha256(content).hexdigest()


def validate_upload_file(file: UploadFile,
                         allowed_extensions: List[str] = None,
                         max_size: int = None) -> Dict[str, Any]:
    """验证上传文件的便捷函数"""
    validator = FileSecurityValidator()
    return validator.validate_file(file, allowed_extensions, max_size)


def get_file_category(extension: str) -> str:
    """根据扩展名获取文件类别"""
    image_exts = {
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'
    }
    document_exts = {'.pdf', '.doc', '.docx', '.txt', '.rtf'}
    archive_exts = {'.zip', '.rar', '.7z', '.tar', '.gz'}
    
    if extension in image_exts:
        return 'image'
    elif extension in document_exts:
        return 'document'
    elif extension in archive_exts:
        return 'archive'
    else:
        return 'other'


def get_max_file_size(file_category: str) -> int:
    """根据文件类别获取最大文件大小"""
    return MAX_FILE_SIZES.get(file_category, MAX_FILE_SIZES['default'])