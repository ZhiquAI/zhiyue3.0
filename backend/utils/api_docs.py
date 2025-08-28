"""
API文档生成和增强工具
"""

from typing import Dict, Any, List, Optional, Type, Union
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from schemas.response import BaseResponse, SuccessResponse, ErrorResponse


class APIDocumentationEnhancer:
    """API文档增强器"""
    
    def __init__(self, app: FastAPI):
        self.app = app
    
    def enhance_openapi_schema(self) -> Dict[str, Any]:
        """增强OpenAPI文档模式"""
        if self.app.openapi_schema:
            return self.app.openapi_schema
        
        # 生成基础OpenAPI模式
        openapi_schema = get_openapi(
            title="智阅AI阅卷系统API",
            version="3.0.0",
            description=self._get_api_description(),
            routes=self.app.routes,
            tags=self._get_api_tags()
        )
        
        # 添加自定义组件
        self._add_custom_components(openapi_schema)
        
        # 添加安全模式
        self._add_security_schemes(openapi_schema)
        
        # 添加服务器信息
        self._add_servers(openapi_schema)
        
        # 保存并返回
        self.app.openapi_schema = openapi_schema
        return openapi_schema
    
    def _get_api_description(self) -> str:
        """获取API描述"""
        return """
        # 智阅AI阅卷系统API文档
        
        智阅3.0是一个基于人工智能的智能阅卷系统，提供完整的考试管理、答题卡处理、AI阅卷等功能。
        
        ## 主要功能
        
        ### 📝 考试管理
        - 考试创建和配置
        - 答题卡模板管理
        - 学生信息管理
        - 评分标准设置
        
        ### 🤖 AI阅卷
        - 智能OCR识别
        - 主观题AI评分
        - 客观题自动批改
        - 质量检测和复核
        
        ### 📊 数据分析
        - 成绩统计分析
        - 学习情况报告
        - 班级对比分析
        - 试题质量分析
        
        ### 🔧 系统管理
        - 用户权限管理
        - 系统监控
        - 数据备份
        - 性能优化
        
        ## API特性
        
        - ✅ **统一响应格式**: 所有API都遵循标准响应格式
        - ✅ **完整的数据验证**: 使用Pydantic进行严格的数据验证
        - ✅ **错误处理**: 统一的错误处理和错误码
        - ✅ **分页支持**: 标准化的分页查询
        - ✅ **请求追踪**: 每个请求都有唯一ID用于追踪
        - ✅ **安全认证**: JWT令牌认证和权限控制
        - ✅ **速率限制**: 防止API滥用
        - ✅ **版本控制**: 支持API版本管理
        
        ## 响应格式
        
        ### 成功响应
        ```json
        {
            "success": true,
            "message": "操作成功",
            "data": {...},
            "timestamp": "2025-08-21T01:00:00Z",
            "request_id": "uuid-string"
        }
        ```
        
        ### 错误响应
        ```json
        {
            "success": false,
            "message": "错误信息",
            "error_code": "ERROR_CODE",
            "details": {...},
            "timestamp": "2025-08-21T01:00:00Z",
            "request_id": "uuid-string"
        }
        ```
        
        ### 分页响应
        ```json
        {
            "success": true,
            "message": "获取数据成功",
            "data": {
                "items": [...],
                "pagination": {
                    "page": 1,
                    "limit": 20,
                    "total": 100,
                    "total_pages": 5,
                    "has_next": true,
                    "has_prev": false
                }
            },
            "timestamp": "2025-08-21T01:00:00Z",
            "request_id": "uuid-string"
        }
        ```
        
        ## 认证方式
        
        使用JWT Bearer Token认证：
        ```
        Authorization: Bearer <your-jwt-token>
        ```
        
        ## 错误码说明
        
        | 错误码 | 说明 | HTTP状态码 |
        |--------|------|-----------|
        | VALIDATION_ERROR | 数据验证失败 | 422 |
        | AUTHENTICATION_ERROR | 认证失败 | 401 |
        | AUTHORIZATION_ERROR | 权限不足 | 403 |
        | RESOURCE_NOT_FOUND | 资源不存在 | 404 |
        | BUSINESS_ERROR | 业务逻辑错误 | 400 |
        | RATE_LIMIT_EXCEEDED | 请求频率超限 | 429 |
        | INTERNAL_SERVER_ERROR | 服务器内部错误 | 500 |
        
        ## 联系方式
        
        - 技术支持: support@zhiyue.ai
        - 开发文档: https://docs.zhiyue.ai
        - GitHub: https://github.com/zhiyue-ai/zhiyue3.0
        """
    
    def _get_api_tags(self) -> List[Dict[str, str]]:
        """获取API标签"""
        return [
            {"name": "认证", "description": "用户认证和授权相关接口"},
            {"name": "考试管理", "description": "考试创建、配置和管理"},
            {"name": "学生管理", "description": "学生信息管理"},
            {"name": "模板管理", "description": "答题卡模板管理"},
            {"name": "文件上传", "description": "文件上传和处理"},
            {"name": "OCR处理", "description": "光学字符识别"},
            {"name": "AI阅卷", "description": "人工智能阅卷"},
            {"name": "评分管理", "description": "评分标准和质量控制"},
            {"name": "数据分析", "description": "成绩分析和统计"},
            {"name": "系统管理", "description": "系统监控和管理"},
            {"name": "系统", "description": "系统健康检查等基础接口"},
        ]
    
    def _add_custom_components(self, openapi_schema: Dict[str, Any]):
        """添加自定义组件"""
        if "components" not in openapi_schema:
            openapi_schema["components"] = {}
        
        if "schemas" not in openapi_schema["components"]:
            openapi_schema["components"]["schemas"] = {}
        
        # 添加标准响应模型
        schemas = openapi_schema["components"]["schemas"]
        
        # 基础响应
        schemas["BaseResponse"] = {
            "type": "object",
            "properties": {
                "success": {"type": "boolean", "description": "请求是否成功"},
                "message": {"type": "string", "description": "响应消息"},
                "timestamp": {"type": "string", "format": "date-time", "description": "响应时间戳"},
                "request_id": {"type": "string", "description": "请求ID"}
            },
            "required": ["success", "message", "timestamp"]
        }
        
        # 成功响应
        schemas["SuccessResponse"] = {
            "type": "object",
            "allOf": [{"$ref": "#/components/schemas/BaseResponse"}],
            "properties": {
                "data": {"description": "响应数据"},
                "success": {"type": "boolean", "default": True}
            }
        }
        
        # 错误响应
        schemas["ErrorResponse"] = {
            "type": "object",
            "allOf": [{"$ref": "#/components/schemas/BaseResponse"}],
            "properties": {
                "error_code": {"type": "string", "description": "错误代码"},
                "details": {"type": "object", "description": "错误详情"},
                "success": {"type": "boolean", "default": False}
            }
        }
        
        # 分页元数据
        schemas["PaginationMeta"] = {
            "type": "object",
            "properties": {
                "page": {"type": "integer", "description": "当前页码"},
                "limit": {"type": "integer", "description": "每页数量"},
                "total": {"type": "integer", "description": "总记录数"},
                "total_pages": {"type": "integer", "description": "总页数"},
                "has_next": {"type": "boolean", "description": "是否有下一页"},
                "has_prev": {"type": "boolean", "description": "是否有上一页"}
            },
            "required": ["page", "limit", "total", "total_pages", "has_next", "has_prev"]
        }
        
        # 分页数据
        schemas["PaginatedData"] = {
            "type": "object",
            "properties": {
                "items": {"type": "array", "items": {}, "description": "数据列表"},
                "pagination": {"$ref": "#/components/schemas/PaginationMeta"}
            },
            "required": ["items", "pagination"]
        }
        
        # 分页响应
        schemas["PaginatedResponse"] = {
            "type": "object",
            "allOf": [{"$ref": "#/components/schemas/SuccessResponse"}],
            "properties": {
                "data": {"$ref": "#/components/schemas/PaginatedData"}
            }
        }
    
    def _add_security_schemes(self, openapi_schema: Dict[str, Any]):
        """添加安全模式"""
        if "components" not in openapi_schema:
            openapi_schema["components"] = {}
        
        openapi_schema["components"]["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT令牌认证，格式：Bearer <token>"
            }
        }
        
        # 全局安全要求（可选）
        # openapi_schema["security"] = [{"BearerAuth": []}]
    
    def _add_servers(self, openapi_schema: Dict[str, Any]):
        """添加服务器信息"""
        openapi_schema["servers"] = [
            {
                "url": "http://localhost:8000",
                "description": "开发服务器"
            },
            {
                "url": "https://api.zhiyue.ai",
                "description": "生产服务器"
            }
        ]
    
    def setup_docs_routes(self):
        """设置文档路由"""
        @self.app.get("/docs", include_in_schema=False)
        async def custom_swagger_ui_html():
            return get_swagger_ui_html(
                openapi_url=self.app.openapi_url,
                title=f"{self.app.title} - Swagger UI",
                oauth2_redirect_url=self.app.swagger_ui_oauth2_redirect_url,
                swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
                swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
                swagger_ui_parameters={
                    "displayOperationId": True,
                    "displayRequestDuration": True,
                    "deepLinking": True,
                    "defaultModelsExpandDepth": 2,
                    "defaultModelExpandDepth": 2,
                    "docExpansion": "list"
                }
            )
        
        @self.app.get("/redoc", include_in_schema=False)
        async def redoc_html():
            return get_redoc_html(
                openapi_url=self.app.openapi_url,
                title=f"{self.app.title} - ReDoc",
                redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
            )


class APIExampleGenerator:
    """API示例生成器"""
    
    @staticmethod
    def generate_curl_example(
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        body: Dict[str, Any] = None
    ) -> str:
        """生成curl示例"""
        curl_cmd = f"curl -X {method.upper()} \\\n"
        curl_cmd += f'  "{url}" \\\n'
        
        # 添加头部
        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)
        
        for key, value in default_headers.items():
            curl_cmd += f'  -H "{key}: {value}" \\\n'
        
        # 添加请求体
        if body:
            import json
            curl_cmd += f"  -d '{json.dumps(body, ensure_ascii=False, indent=2)}'"
        else:
            curl_cmd = curl_cmd.rstrip(" \\\n")
        
        return curl_cmd
    
    @staticmethod
    def generate_python_example(
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        body: Dict[str, Any] = None
    ) -> str:
        """生成Python示例"""
        code = "import requests\nimport json\n\n"
        code += f'url = "{url}"\n'
        
        if headers:
            code += f"headers = {headers}\n"
        
        if body:
            code += f"data = {body}\n\n"
            if headers:
                code += f'response = requests.{method.lower()}(url, headers=headers, json=data)\n'
            else:
                code += f'response = requests.{method.lower()}(url, json=data)\n'
        else:
            if headers:
                code += f'response = requests.{method.lower()}(url, headers=headers)\n'
            else:
                code += f'response = requests.{method.lower()}(url)\n'
        
        code += "\nprint(response.status_code)\nprint(response.json())"
        
        return code
    
    @staticmethod
    def generate_javascript_example(
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        body: Dict[str, Any] = None
    ) -> str:
        """生成JavaScript示例"""
        code = "// 使用fetch API\n"
        
        options = {
            "method": method.upper(),
            "headers": headers or {"Content-Type": "application/json"}
        }
        
        if body:
            options["body"] = "JSON.stringify(data)"
            code += f"const data = {body};\n\n"
        
        code += f'fetch("{url}", {{\n'
        for key, value in options.items():
            if key == "body":
                code += f"  {key}: {value},\n"
            else:
                code += f"  {key}: {repr(value)},\n"
        code += "})\n"
        code += ".then(response => response.json())\n"
        code += ".then(data => console.log(data))\n"
        code += ".catch(error => console.error('Error:', error));"
        
        return code


def setup_api_documentation(app: FastAPI) -> APIDocumentationEnhancer:
    """设置API文档"""
    enhancer = APIDocumentationEnhancer(app)
    
    # 设置自定义OpenAPI生成函数
    app.openapi = enhancer.enhance_openapi_schema
    
    # 设置文档路由
    enhancer.setup_docs_routes()
    
    return enhancer