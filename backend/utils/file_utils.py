"""文件工具模块"""

import os
import mimetypes
from typing import List, Optional

# 支持的文件类型
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt', '.rtf'}
ALLOWED_ARCHIVE_EXTENSIONS = {'.zip', '.rar', '.7z', '.tar', '.gz'}

ALL_ALLOWED_EXTENSIONS = (
    ALLOWED_IMAGE_EXTENSIONS | 
    ALLOWED_DOCUMENT_EXTENSIONS | 
    ALLOWED_ARCHIVE_EXTENSIONS
)

# 最大文件大小 (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return os.path.splitext(filename)[1].lower()


def validate_file_type(
    filename: str, 
    allowed_extensions: Optional[List[str]] = None
) -> bool:
    """验证文件类型"""
    if allowed_extensions is None:
        allowed_extensions = list(ALL_ALLOWED_EXTENSIONS)
    
    extension = get_file_extension(filename)
    return extension in allowed_extensions


def validate_file_size(file_size: int, max_size: int = MAX_FILE_SIZE) -> bool:
    """验证文件大小"""
    return file_size <= max_size


def get_mime_type(filename: str) -> str:
    """获取文件MIME类型"""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'application/octet-stream'


def is_image_file(filename: str) -> bool:
    """判断是否为图片文件"""
    extension = get_file_extension(filename)
    return extension in ALLOWED_IMAGE_EXTENSIONS


def is_document_file(filename: str) -> bool:
    """判断是否为文档文件"""
    extension = get_file_extension(filename)
    return extension in ALLOWED_DOCUMENT_EXTENSIONS


def is_archive_file(filename: str) -> bool:
    """判断是否为压缩文件"""
    extension = get_file_extension(filename)
    return extension in ALLOWED_ARCHIVE_EXTENSIONS


def sanitize_filename(filename: str) -> str:
    """清理文件名，移除不安全字符"""
    # 移除路径分隔符和其他不安全字符
    unsafe_chars = ['/', '\\', '..', '<', '>', ':', '"', '|', '?', '*']
    sanitized = filename
    for char in unsafe_chars:
        sanitized = sanitized.replace(char, '_')
    return sanitized


def ensure_directory_exists(directory_path: str) -> None:
    """确保目录存在，如果不存在则创建"""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path, exist_ok=True)