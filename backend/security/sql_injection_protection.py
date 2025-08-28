"""
SQL注入防护模块
实现参数化查询和输入验证
"""

import re
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
import bleach

logger = logging.getLogger(__name__)

class SQLInjectionProtector:
    """SQL注入防护器"""
    
    # 危险SQL关键词模式
    DANGEROUS_PATTERNS = [
        r'\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b',
        r'[\'\"]\s*;\s*\w+',
        r'--',
        r'/\*.*?\*/',
        r'\bxp_\w+',
        r'\bsp_\w+',
        r'@@\w+',
    ]
    
    # 允许的字符模式
    SAFE_PATTERNS = {
        'id': r'^\d+$',
        'username': r'^[a-zA-Z0-9_-]+$',
        'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        'filename': r'^[a-zA-Z0-9._-]+$',
        'session_id': r'^[a-zA-Z0-9-]+$',
        'exam_code': r'^[A-Z0-9_-]+$',
    }
    
    def __init__(self):
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.DANGEROUS_PATTERNS]
    
    def validate_input(self, input_value: str, field_type: str = 'general') -> bool:
        """
        验证输入是否安全
        
        Args:
            input_value: 待验证的输入值
            field_type: 字段类型，用于特定验证规则
            
        Returns:
            bool: 是否安全
        """
        if not isinstance(input_value, str):
            return True
        
        # 检查危险模式
        for pattern in self.compiled_patterns:
            if pattern.search(input_value):
                logger.warning(f"检测到SQL注入尝试: {input_value[:100]}")
                return False
        
        # 特定字段类型验证
        if field_type in self.SAFE_PATTERNS:
            if not re.match(self.SAFE_PATTERNS[field_type], input_value):
                logger.warning(f"字段格式不符合规范: {field_type} = {input_value[:50]}")
                return False
        
        return True
    
    def sanitize_input(self, input_value: str) -> str:
        """
        清理输入，移除危险字符
        
        Args:
            input_value: 待清理的输入
            
        Returns:
            str: 清理后的安全输入
        """
        if not isinstance(input_value, str):
            return input_value
        
        # 移除SQL注释
        sanitized = re.sub(r'--.*$', '', input_value, flags=re.MULTILINE)
        sanitized = re.sub(r'/\*.*?\*/', '', sanitized, flags=re.DOTALL)
        
        # 转义单引号和双引号
        sanitized = sanitized.replace("'", "''")
        sanitized = sanitized.replace('"', '""')
        
        return sanitized.strip()
    
    def create_safe_query(self, query_template: str, params: Dict[str, Any]) -> text:
        """
        创建安全的参数化查询
        
        Args:
            query_template: SQL查询模板
            params: 查询参数
            
        Returns:
            text: 安全的SQL查询对象
        """
        # 验证所有参数
        for key, value in params.items():
            if isinstance(value, str) and not self.validate_input(value):
                raise ValueError(f"参数 {key} 包含不安全内容: {value[:50]}")
        
        return text(query_template)

class XSSProtector:
    """XSS攻击防护器"""
    
    # 允许的HTML标签
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    
    # 允许的HTML属性
    ALLOWED_ATTRIBUTES = {
        '*': ['class', 'id'],
        'a': ['href', 'title'],
        'img': ['src', 'alt', 'width', 'height'],
    }
    
    def __init__(self):
        self.bleach_cleaner = bleach.Cleaner(
            tags=self.ALLOWED_TAGS,
            attributes=self.ALLOWED_ATTRIBUTES,
            strip=True
        )
    
    def sanitize_html(self, html_content: str) -> str:
        """
        清理HTML内容，防止XSS攻击
        
        Args:
            html_content: 待清理的HTML内容
            
        Returns:
            str: 清理后的安全HTML
        """
        if not isinstance(html_content, str):
            return html_content
        
        # 使用bleach清理HTML
        cleaned = self.bleach_cleaner.clean(html_content)
        
        # 额外的XSS防护
        cleaned = self._remove_javascript(cleaned)
        cleaned = self._encode_special_chars(cleaned)
        
        return cleaned
    
    def _remove_javascript(self, content: str) -> str:
        """移除JavaScript代码"""
        # 移除script标签
        content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.IGNORECASE | re.DOTALL)
        
        # 移除事件处理器
        content = re.sub(r'\bon\w+\s*=\s*["\'][^"\']*["\']', '', content, flags=re.IGNORECASE)
        
        # 移除javascript: URL
        content = re.sub(r'javascript:', '', content, flags=re.IGNORECASE)
        
        return content
    
    def _encode_special_chars(self, content: str) -> str:
        """编码特殊字符"""
        replacements = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
        }
        
        for char, encoded in replacements.items():
            content = content.replace(char, encoded)
        
        return content
    
    def validate_input(self, input_value: str) -> bool:
        """
        验证输入是否包含XSS攻击向量
        
        Args:
            input_value: 待验证的输入
            
        Returns:
            bool: 是否安全
        """
        if not isinstance(input_value, str):
            return True
        
        # XSS攻击模式
        xss_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*=',
            r'onclick\s*=',
            r'onmouseover\s*=',
            r'eval\s*\(',
            r'expression\s*\(',
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, input_value, re.IGNORECASE):
                logger.warning(f"检测到XSS攻击尝试: {input_value[:100]}")
                return False
        
        return True

class SecurityValidator:
    """综合安全验证器"""
    
    def __init__(self):
        self.sql_protector = SQLInjectionProtector()
        self.xss_protector = XSSProtector()
    
    def validate_request_data(self, data: Dict[str, Any], field_types: Dict[str, str] = None) -> Dict[str, Any]:
        """
        验证和清理请求数据
        
        Args:
            data: 请求数据
            field_types: 字段类型映射
            
        Returns:
            Dict[str, Any]: 验证后的安全数据
        """
        if field_types is None:
            field_types = {}
        
        cleaned_data = {}
        
        for key, value in data.items():
            if isinstance(value, str):
                field_type = field_types.get(key, 'general')
                
                # SQL注入检查
                if not self.sql_protector.validate_input(value, field_type):
                    raise ValueError(f"字段 {key} 包含不安全的SQL内容")
                
                # XSS检查
                if not self.xss_protector.validate_input(value):
                    raise ValueError(f"字段 {key} 包含XSS攻击向量")
                
                # 清理内容
                cleaned_value = self.xss_protector.sanitize_html(value)
                cleaned_data[key] = cleaned_value
            else:
                cleaned_data[key] = value
        
        return cleaned_data

# 全局安全验证器实例
security_validator = SecurityValidator()