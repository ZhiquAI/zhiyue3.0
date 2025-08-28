"""
安全代码审计工具
自动检测和报告代码中的安全漏洞和风险
"""

import os
import re
import ast
import logging
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)

class VulnerabilityType(Enum):
    """漏洞类型"""
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    COMMAND_INJECTION = "command_injection"
    PATH_TRAVERSAL = "path_traversal"
    HARDCODED_SECRET = "hardcoded_secret"
    WEAK_CRYPTO = "weak_crypto"
    INSECURE_RANDOM = "insecure_random"
    UNSAFE_DESERIALIZATION = "unsafe_deserialization"
    IMPROPER_VALIDATION = "improper_validation"
    INFORMATION_DISCLOSURE = "information_disclosure"

class SeverityLevel(Enum):
    """严重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class SecurityFinding:
    """安全发现"""
    finding_id: str
    vulnerability_type: VulnerabilityType
    severity: SeverityLevel
    title: str
    description: str
    file_path: str
    line_number: int
    code_snippet: str
    recommendation: str
    cwe_id: Optional[str] = None
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

class SecurityAuditor:
    """安全审计器"""
    
    def __init__(self):
        self.findings: List[SecurityFinding] = []
        self.scanned_files: List[str] = []
        self.patterns = self._load_security_patterns()
    
    def _load_security_patterns(self) -> Dict[VulnerabilityType, List[Dict]]:
        """加载安全模式"""
        return {
            VulnerabilityType.SQL_INJECTION: [
                {
                    "pattern": r"\.execute\s*\(\s*['\"].*%.*['\"]",
                    "description": "可能的SQL注入 - 字符串格式化",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-89"
                },
                {
                    "pattern": r"\.execute\s*\(\s*f['\"].*\{.*\}.*['\"]",
                    "description": "可能的SQL注入 - f-string格式化",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-89"
                },
                {
                    "pattern": r"query\s*\+\s*",
                    "description": "可能的SQL注入 - 字符串拼接",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-89"
                }
            ],
            VulnerabilityType.XSS: [
                {
                    "pattern": r"\.innerHTML\s*=\s*.*user",
                    "description": "可能的XSS - innerHTML赋值",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-79"
                },
                {
                    "pattern": r"render_template_string\s*\(",
                    "description": "可能的XSS - 模板字符串渲染",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-79"
                }
            ],
            VulnerabilityType.COMMAND_INJECTION: [
                {
                    "pattern": r"os\.system\s*\(",
                    "description": "命令注入风险 - os.system",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-78"
                },
                {
                    "pattern": r"subprocess\.call\s*\([^,]*\+",
                    "description": "命令注入风险 - subprocess.call字符串拼接",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-78"
                },
                {
                    "pattern": r"eval\s*\(",
                    "description": "代码注入风险 - eval函数",
                    "severity": SeverityLevel.CRITICAL,
                    "cwe": "CWE-95"
                }
            ],
            VulnerabilityType.PATH_TRAVERSAL: [
                {
                    "pattern": r"open\s*\([^,]*\+.*user",
                    "description": "路径遍历风险 - 文件路径拼接",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-22"
                },
                {
                    "pattern": r"\.\.\/",
                    "description": "可能的路径遍历 - 相对路径",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-22"
                }
            ],
            VulnerabilityType.HARDCODED_SECRET: [
                {
                    "pattern": r"password\s*=\s*['\"][^'\"]{8,}['\"]",
                    "description": "硬编码密码",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-798"
                },
                {
                    "pattern": r"api_key\s*=\s*['\"][A-Za-z0-9]{20,}['\"]",
                    "description": "硬编码API密钥",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-798"
                },
                {
                    "pattern": r"secret_key\s*=\s*['\"][^'\"]{10,}['\"]",
                    "description": "硬编码密钥",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-798"
                }
            ],
            VulnerabilityType.WEAK_CRYPTO: [
                {
                    "pattern": r"hashlib\.md5\s*\(",
                    "description": "弱加密算法 - MD5",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-327"
                },
                {
                    "pattern": r"hashlib\.sha1\s*\(",
                    "description": "弱加密算法 - SHA1",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-327"
                },
                {
                    "pattern": r"DES\s*\(",
                    "description": "弱加密算法 - DES",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-327"
                }
            ],
            VulnerabilityType.INSECURE_RANDOM: [
                {
                    "pattern": r"random\.random\s*\(",
                    "description": "不安全的随机数生成",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-338"
                },
                {
                    "pattern": r"random\.choice\s*\(",
                    "description": "不安全的随机选择",
                    "severity": SeverityLevel.LOW,
                    "cwe": "CWE-338"
                }
            ],
            VulnerabilityType.UNSAFE_DESERIALIZATION: [
                {
                    "pattern": r"pickle\.loads\s*\(",
                    "description": "不安全的反序列化 - pickle",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-502"
                },
                {
                    "pattern": r"yaml\.load\s*\(",
                    "description": "不安全的YAML加载",
                    "severity": SeverityLevel.HIGH,
                    "cwe": "CWE-502"
                }
            ],
            VulnerabilityType.INFORMATION_DISCLOSURE: [
                {
                    "pattern": r"print\s*\([^)]*password",
                    "description": "信息泄露 - 密码打印",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-200"
                },
                {
                    "pattern": r"logger\.\w+\([^)]*password",
                    "description": "信息泄露 - 密码记录",
                    "severity": SeverityLevel.MEDIUM,
                    "cwe": "CWE-200"
                }
            ]
        }
    
    def scan_directory(self, directory_path: str, exclude_patterns: List[str] = None) -> Dict[str, Any]:
        """扫描目录"""
        if exclude_patterns is None:
            exclude_patterns = [
                r"__pycache__",
                r"\.git",
                r"\.pytest_cache",
                r"node_modules",
                r"\.venv",
                r"venv"
            ]
        
        self.findings = []
        self.scanned_files = []
        
        logger.info(f"开始安全扫描目录: {directory_path}")
        
        for root, dirs, files in os.walk(directory_path):
            # 过滤排除的目录
            dirs[:] = [d for d in dirs if not any(re.search(pattern, d) for pattern in exclude_patterns)]
            
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.jsx', '.tsx', '.sql')):
                    file_path = os.path.join(root, file)
                    try:
                        self._scan_file(file_path)
                        self.scanned_files.append(file_path)
                    except Exception as e:
                        logger.error(f"扫描文件 {file_path} 失败: {e}")
        
        # 生成报告
        report = self._generate_report()
        logger.info(f"扫描完成，发现 {len(self.findings)} 个安全问题")
        
        return report
    
    def _scan_file(self, file_path: str):
        """扫描单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
            
            # 逐行扫描
            for line_num, line in enumerate(lines, 1):
                for vuln_type, patterns in self.patterns.items():
                    for pattern_info in patterns:
                        if re.search(pattern_info["pattern"], line, re.IGNORECASE):
                            self._add_finding(
                                vuln_type=vuln_type,
                                severity=pattern_info["severity"],
                                description=pattern_info["description"],
                                file_path=file_path,
                                line_number=line_num,
                                code_snippet=line.strip(),
                                cwe_id=pattern_info.get("cwe"),
                                confidence=0.8  # 基于模式匹配的置信度
                            )
            
            # 对Python文件进行AST分析
            if file_path.endswith('.py'):
                self._ast_analysis(file_path, content)
                
        except Exception as e:
            logger.error(f"文件扫描错误 {file_path}: {e}")
    
    def _ast_analysis(self, file_path: str, content: str):
        """AST语法分析"""
        try:
            tree = ast.parse(content)
            visitor = SecurityASTVisitor(file_path, content.split('\n'))
            visitor.visit(tree)
            
            for finding in visitor.findings:
                self.findings.append(finding)
                
        except SyntaxError:
            # 忽略语法错误的文件
            pass
        except Exception as e:
            logger.error(f"AST分析错误 {file_path}: {e}")
    
    def _add_finding(
        self,
        vuln_type: VulnerabilityType,
        severity: SeverityLevel,
        description: str,
        file_path: str,
        line_number: int,
        code_snippet: str,
        cwe_id: str = None,
        confidence: float = 1.0
    ):
        """添加安全发现"""
        finding_id = hashlib.md5(
            f"{file_path}:{line_number}:{description}".encode()
        ).hexdigest()[:8]
        
        finding = SecurityFinding(
            finding_id=finding_id,
            vulnerability_type=vuln_type,
            severity=severity,
            title=f"{vuln_type.value.replace('_', ' ').title()}",
            description=description,
            file_path=file_path,
            line_number=line_number,
            code_snippet=code_snippet,
            recommendation=self._get_recommendation(vuln_type),
            cwe_id=cwe_id,
            confidence=confidence
        )
        
        self.findings.append(finding)
    
    def _get_recommendation(self, vuln_type: VulnerabilityType) -> str:
        """获取修复建议"""
        recommendations = {
            VulnerabilityType.SQL_INJECTION: "使用参数化查询或ORM，避免字符串拼接构建SQL",
            VulnerabilityType.XSS: "对所有用户输入进行HTML编码，使用安全的模板引擎",
            VulnerabilityType.COMMAND_INJECTION: "避免使用os.system，使用subprocess并验证输入",
            VulnerabilityType.PATH_TRAVERSAL: "验证和规范化文件路径，使用白名单限制访问",
            VulnerabilityType.HARDCODED_SECRET: "使用环境变量或安全的配置管理系统存储敏感信息",
            VulnerabilityType.WEAK_CRYPTO: "使用强加密算法如SHA-256或更高版本",
            VulnerabilityType.INSECURE_RANDOM: "使用cryptographically secure的随机数生成器",
            VulnerabilityType.UNSAFE_DESERIALIZATION: "避免反序列化不可信数据，使用安全的序列化格式",
            VulnerabilityType.IMPROPER_VALIDATION: "实施严格的输入验证和边界检查",
            VulnerabilityType.INFORMATION_DISCLOSURE: "避免在日志或输出中暴露敏感信息"
        }
        
        return recommendations.get(vuln_type, "请咨询安全专家获取具体修复建议")
    
    def _generate_report(self) -> Dict[str, Any]:
        """生成安全报告"""
        # 统计分析
        severity_counts = {}
        type_counts = {}
        
        for finding in self.findings:
            severity = finding.severity.value
            vuln_type = finding.vulnerability_type.value
            
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            type_counts[vuln_type] = type_counts.get(vuln_type, 0) + 1
        
        # 计算风险分数
        risk_score = self._calculate_risk_score()
        
        return {
            "scan_info": {
                "scan_time": datetime.now().isoformat(),
                "scanned_files": len(self.scanned_files),
                "total_findings": len(self.findings)
            },
            "risk_assessment": {
                "risk_score": risk_score,
                "risk_level": self._get_risk_level(risk_score)
            },
            "statistics": {
                "by_severity": severity_counts,
                "by_type": type_counts
            },
            "findings": [
                {
                    "finding_id": f.finding_id,
                    "vulnerability_type": f.vulnerability_type.value,
                    "severity": f.severity.value,
                    "title": f.title,
                    "description": f.description,
                    "file_path": f.file_path,
                    "line_number": f.line_number,
                    "code_snippet": f.code_snippet,
                    "recommendation": f.recommendation,
                    "cwe_id": f.cwe_id,
                    "confidence": f.confidence
                }
                for f in sorted(self.findings, key=lambda x: (x.severity.value, x.file_path))
            ],
            "recommendations": self._generate_priority_recommendations()
        }
    
    def _calculate_risk_score(self) -> float:
        """计算风险分数"""
        severity_weights = {
            SeverityLevel.LOW: 1,
            SeverityLevel.MEDIUM: 3,
            SeverityLevel.HIGH: 7,
            SeverityLevel.CRITICAL: 10
        }
        
        total_score = 0
        for finding in self.findings:
            weight = severity_weights.get(finding.severity, 1)
            total_score += weight * finding.confidence
        
        # 归一化到0-100分
        max_possible = len(self.findings) * 10  # 假设所有都是CRITICAL
        if max_possible == 0:
            return 0
        
        return min(100, (total_score / max_possible) * 100)
    
    def _get_risk_level(self, score: float) -> str:
        """获取风险等级"""
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 40:
            return "MEDIUM"
        elif score >= 20:
            return "LOW"
        else:
            return "MINIMAL"
    
    def _generate_priority_recommendations(self) -> List[str]:
        """生成优先修复建议"""
        recommendations = []
        
        # 按严重程度分组
        critical_findings = [f for f in self.findings if f.severity == SeverityLevel.CRITICAL]
        high_findings = [f for f in self.findings if f.severity == SeverityLevel.HIGH]
        
        if critical_findings:
            recommendations.append(f"立即修复 {len(critical_findings)} 个关键安全漏洞")
        
        if high_findings:
            recommendations.append(f"优先修复 {len(high_findings)} 个高危安全漏洞")
        
        # 统计最常见的漏洞类型
        type_counts = {}
        for finding in self.findings:
            vuln_type = finding.vulnerability_type.value
            type_counts[vuln_type] = type_counts.get(vuln_type, 0) + 1
        
        if type_counts:
            most_common = max(type_counts.items(), key=lambda x: x[1])
            recommendations.append(f"重点关注 {most_common[0]} 类型漏洞，共发现 {most_common[1]} 处")
        
        recommendations.extend([
            "建立定期安全代码审查制度",
            "集成自动化安全测试到CI/CD流程",
            "为开发团队提供安全编程培训",
            "建立安全编码规范和检查清单"
        ])
        
        return recommendations

class SecurityASTVisitor(ast.NodeVisitor):
    """安全AST访问器"""
    
    def __init__(self, file_path: str, lines: List[str]):
        self.file_path = file_path
        self.lines = lines
        self.findings: List[SecurityFinding] = []
    
    def visit_Call(self, node):
        """访问函数调用"""
        if isinstance(node.func, ast.Attribute):
            # 检查危险的函数调用
            if (isinstance(node.func.value, ast.Name) and 
                node.func.value.id == 'os' and 
                node.func.attr == 'system'):
                
                self._add_finding(
                    VulnerabilityType.COMMAND_INJECTION,
                    SeverityLevel.HIGH,
                    "使用os.system可能导致命令注入",
                    node.lineno,
                    confidence=0.9
                )
        
        elif isinstance(node.func, ast.Name):
            # 检查eval函数
            if node.func.id == 'eval':
                self._add_finding(
                    VulnerabilityType.COMMAND_INJECTION,
                    SeverityLevel.CRITICAL,
                    "eval函数可能导致代码注入",
                    node.lineno,
                    confidence=1.0
                )
        
        self.generic_visit(node)
    
    def visit_Assign(self, node):
        """访问赋值语句"""
        # 检查硬编码密码
        if (isinstance(node.value, ast.Str) and 
            len(node.value.s) > 8 and
            any(isinstance(target, ast.Name) and 
                'password' in target.id.lower() 
                for target in node.targets if isinstance(target, ast.Name))):
            
            self._add_finding(
                VulnerabilityType.HARDCODED_SECRET,
                SeverityLevel.HIGH,
                "检测到硬编码密码",
                node.lineno,
                confidence=0.8
            )
        
        self.generic_visit(node)
    
    def _add_finding(
        self,
        vuln_type: VulnerabilityType,
        severity: SeverityLevel,
        description: str,
        line_number: int,
        confidence: float = 1.0
    ):
        """添加AST发现"""
        code_snippet = ""
        if 1 <= line_number <= len(self.lines):
            code_snippet = self.lines[line_number - 1].strip()
        
        finding_id = hashlib.md5(
            f"{self.file_path}:{line_number}:{description}".encode()
        ).hexdigest()[:8]
        
        finding = SecurityFinding(
            finding_id=finding_id,
            vulnerability_type=vuln_type,
            severity=severity,
            title=f"{vuln_type.value.replace('_', ' ').title()}",
            description=description,
            file_path=self.file_path,
            line_number=line_number,
            code_snippet=code_snippet,
            recommendation="请参考安全编码指南进行修复",
            confidence=confidence
        )
        
        self.findings.append(finding)

def run_security_audit(directory_path: str = "/Users/hero/zhiyue3.0/backend") -> Dict[str, Any]:
    """运行安全审计"""
    auditor = SecurityAuditor()
    
    exclude_patterns = [
        r"__pycache__",
        r"\.git",
        r"\.pytest_cache",
        r"node_modules",
        r"\.venv",
        r"venv",
        r"migrations",
        r"test_.*\.py$",
        r".*_test\.py$"
    ]
    
    return auditor.scan_directory(directory_path, exclude_patterns)

if __name__ == "__main__":
    # 运行安全审计
    report = run_security_audit()
    
    # 保存报告
    report_path = "/Users/hero/zhiyue3.0/backend/security_audit_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"安全审计报告已保存到: {report_path}")
    print(f"风险评级: {report['risk_assessment']['risk_level']}")
    print(f"发现问题: {report['scan_info']['total_findings']} 个")