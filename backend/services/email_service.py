"""
邮件服务
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
import logging
import asyncio
from datetime import datetime, timedelta
import uuid
import os
from pathlib import Path

try:
    from backend.config.settings import settings
except ImportError:
    from config.settings import settings

logger = logging.getLogger(__name__)

class EmailService:
    """邮件服务类"""
    
    def __init__(self):
        # 邮件服务器配置
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "智阅AI")
        
        # 邮件模板配置
        self.template_dir = Path(__file__).parent.parent / "templates" / "email"
        
        # 验证配置
        self.is_configured = bool(self.smtp_username and self.smtp_password)
        
        if not self.is_configured:
            logger.warning("邮件服务未配置，将使用模拟模式")
    
    async def send_email(
        self, 
        to_emails: List[str], 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """发送邮件"""
        try:
            if not self.is_configured:
                logger.info(f"模拟发送邮件到 {to_emails}: {subject}")
                return True
            
            # 创建邮件消息
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = ", ".join(to_emails)
            
            # 添加文本内容
            if text_content:
                text_part = MIMEText(text_content, "plain", "utf-8")
                message.attach(text_part)
            
            # 添加HTML内容
            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)
            
            # 添加附件
            if attachments:
                for attachment in attachments:
                    self._add_attachment(message, attachment)
            
            # 发送邮件
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.sendmail(self.from_email, to_emails, message.as_string())
            
            logger.info(f"邮件发送成功到 {to_emails}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"邮件发送失败: {str(e)}")
            return False
    
    def _add_attachment(self, message: MIMEMultipart, attachment: Dict[str, Any]):
        """添加附件"""
        try:
            filename = attachment.get("filename")
            content = attachment.get("content")
            content_type = attachment.get("content_type", "application/octet-stream")
            
            part = MIMEBase(*content_type.split("/"))
            part.set_payload(content)
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {filename}",
            )
            message.attach(part)
            
        except Exception as e:
            logger.error(f"添加附件失败: {str(e)}")
    
    def _load_template(self, template_name: str, variables: Dict[str, Any]) -> str:
        """加载邮件模板"""
        template_path = self.template_dir / f"{template_name}.html"
        
        if template_path.exists():
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            # 简单的模板变量替换
            for key, value in variables.items():
                template_content = template_content.replace(f"{{{{{key}}}}}", str(value))
            
            return template_content
        else:
            # 返回默认模板
            return self._get_default_template(template_name, variables)
    
    def _get_default_template(self, template_name: str, variables: Dict[str, Any]) -> str:
        """获取默认邮件模板"""
        base_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{{title}}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>智阅AI</h1>
                </div>
                <div class="content">
                    {{content}}
                </div>
                <div class="footer">
                    <p>此邮件由智阅AI系统自动发送，请勿回复。</p>
                    <p>如有问题，请联系系统管理员。</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        if template_name == "password_reset":
            content = f"""
            <h2>密码重置请求</h2>
            <p>您好，{variables.get('username', '')}！</p>
            <p>我们收到了您的密码重置请求。请点击下面的链接重置您的密码：</p>
            <p><a href="{variables.get('reset_link', '')}" class="button">重置密码</a></p>
            <p>此链接将在24小时后失效。</p>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
            """
        elif template_name == "welcome":
            content = f"""
            <h2>欢迎使用智阅AI</h2>
            <p>您好，{variables.get('username', '')}！</p>
            <p>欢迎加入智阅AI智能阅卷系统。您的账户已成功创建。</p>
            <p>您可以使用以下信息登录系统：</p>
            <ul>
                <li>用户名: {variables.get('username', '')}</li>
                <li>邮箱: {variables.get('email', '')}</li>
            </ul>
            <p><a href="{variables.get('login_link', '')}" class="button">立即登录</a></p>
            """
        elif template_name == "exam_notification":
            content = f"""
            <h2>考试通知</h2>
            <p>您好，{variables.get('username', '')}！</p>
            <p>您有一个新的考试任务：</p>
            <ul>
                <li>考试名称: {variables.get('exam_name', '')}</li>
                <li>科目: {variables.get('subject', '')}</li>
                <li>创建时间: {variables.get('created_at', '')}</li>
            </ul>
            <p><a href="{variables.get('exam_link', '')}" class="button">查看考试</a></p>
            """
        else:
            content = variables.get('content', '邮件内容')
        
        return base_template.replace('{{title}}', variables.get('title', '智阅AI通知')).replace('{{content}}', content)
    
    async def send_password_reset_email(self, email: str, username: str, reset_token: str) -> bool:
        """发送密码重置邮件"""
        reset_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
        
        variables = {
            'username': username,
            'reset_link': reset_link,
            'title': '密码重置 - 智阅AI'
        }
        
        html_content = self._load_template('password_reset', variables)
        
        return await self.send_email(
            to_emails=[email],
            subject="智阅AI - 密码重置请求",
            html_content=html_content
        )
    
    async def send_welcome_email(self, email: str, username: str) -> bool:
        """发送欢迎邮件"""
        login_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login"
        
        variables = {
            'username': username,
            'email': email,
            'login_link': login_link,
            'title': '欢迎使用智阅AI'
        }
        
        html_content = self._load_template('welcome', variables)
        
        return await self.send_email(
            to_emails=[email],
            subject="欢迎使用智阅AI智能阅卷系统",
            html_content=html_content
        )
    
    async def send_exam_notification(self, email: str, username: str, exam_data: Dict[str, Any]) -> bool:
        """发送考试通知邮件"""
        exam_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/exams/{exam_data.get('id', '')}"
        
        variables = {
            'username': username,
            'exam_name': exam_data.get('name', ''),
            'subject': exam_data.get('subject', ''),
            'created_at': exam_data.get('created_at', ''),
            'exam_link': exam_link,
            'title': '新考试通知 - 智阅AI'
        }
        
        html_content = self._load_template('exam_notification', variables)
        
        return await self.send_email(
            to_emails=[email],
            subject=f"智阅AI - 新考试通知: {exam_data.get('name', '')}",
            html_content=html_content
        )

# 全局邮件服务实例
email_service = EmailService()

# 密码重置令牌管理
class PasswordResetTokenManager:
    """密码重置令牌管理器"""
    
    def __init__(self):
        self.tokens = {}  # 在生产环境中应该使用Redis或数据库
    
    def generate_token(self, user_id: str) -> str:
        """生成重置令牌"""
        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        self.tokens[token] = {
            'user_id': user_id,
            'expires_at': expires_at,
            'used': False
        }
        
        return token
    
    def validate_token(self, token: str) -> Optional[str]:
        """验证令牌并返回用户ID"""
        token_data = self.tokens.get(token)
        
        if not token_data:
            return None
        
        if token_data['used']:
            return None
        
        if datetime.utcnow() > token_data['expires_at']:
            return None
        
        return token_data['user_id']
    
    def use_token(self, token: str) -> bool:
        """使用令牌（标记为已使用）"""
        if token in self.tokens:
            self.tokens[token]['used'] = True
            return True
        return False
    
    def cleanup_expired_tokens(self):
        """清理过期令牌"""
        current_time = datetime.utcnow()
        expired_tokens = [
            token for token, data in self.tokens.items()
            if current_time > data['expires_at']
        ]
        
        for token in expired_tokens:
            del self.tokens[token]

# 全局令牌管理器实例
reset_token_manager = PasswordResetTokenManager()
