"""安全审计和监控模块"""

import redis
import json
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from config.settings import settings
from models.production_models import User
import logging
import ipaddress
from collections import defaultdict

logger = logging.getLogger(__name__)

class SecurityAuditor:
    """安全审计器"""
    
    def __init__(self):
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL)
            # 测试Redis连接
            self.redis_client.ping()
            self.redis_available = True
        except Exception as e:
            print(f"Redis连接失败，使用内存模式: {e}")
            self.redis_client = None
            self.redis_available = False
        
        self.suspicious_ips = set()
        self.memory_cache = {}  # 内存缓存用于Redis不可用时
        self.rate_limits = {
            'login': {'max_attempts': 5, 'window': 300},  # 5次/5分钟
            'api': {'max_attempts': 100, 'window': 60},   # 100次/分钟
            'password_reset': {'max_attempts': 3, 'window': 3600}  # 3次/小时
        }
    
    def log_security_event(self, event_type: str, user_id: str = None, 
                          ip_address: str = None, details: Dict[str, Any] = None):
        """记录安全事件"""
        event = {
            'event_type': event_type,
            'user_id': user_id,
            'ip_address': ip_address,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        
        if self.redis_available and self.redis_client:
            try:
                # 存储到Redis
                key = f"security_event:{datetime.utcnow().strftime('%Y%m%d')}"
                self.redis_client.lpush(key, json.dumps(event))
                self.redis_client.expire(key, 86400 * 30)  # 保留30天
            except Exception as e:
                print(f"Redis连接失败，无法存储安全事件: {e}")
                self.redis_available = False
        else:
            # Redis不可用时，只记录到日志
            pass
        
        # 检查是否需要触发警报
        self._check_security_alerts(event)
        
        logger.info(f"安全事件: {event_type} - {user_id} - {ip_address}")
    
    def check_rate_limit(self, identifier: str, limit_type: str) -> bool:
        """检查速率限制"""
        if limit_type not in self.rate_limits:
            return True
        
        config = self.rate_limits[limit_type]
        key = f"rate_limit:{limit_type}:{identifier}"
        
        if self.redis_available and self.redis_client:
            try:
                current_count = self.redis_client.get(key)
                if current_count is None:
                    # 首次请求
                    self.redis_client.setex(key, config['window'], 1)
                    return True
                
                current_count = int(current_count)
                if current_count >= config['max_attempts']:
                    self.log_security_event(
                        'rate_limit_exceeded',
                        details={'limit_type': limit_type, 'identifier': identifier}
                    )
                    return False
                
                # 增加计数
                self.redis_client.incr(key)
                return True
            except Exception as e:
                # Redis连接失败时，切换到内存模式
                print(f"Redis连接失败，切换到内存模式: {e}")
                self.redis_available = False
        
        # 使用内存缓存
        now = datetime.utcnow()
        if key not in self.memory_cache:
            self.memory_cache[key] = {'count': 1, 'expires': now + timedelta(seconds=config['window'])}
            return True
        
        cache_entry = self.memory_cache[key]
        if now > cache_entry['expires']:
            # 过期，重置
            self.memory_cache[key] = {'count': 1, 'expires': now + timedelta(seconds=config['window'])}
            return True
        
        if cache_entry['count'] >= config['max_attempts']:
            self.log_security_event(
                'rate_limit_exceeded',
                details={'limit_type': limit_type, 'identifier': identifier}
            )
            return False
        
        cache_entry['count'] += 1
        return True
    
    def is_suspicious_ip(self, ip_address: str) -> bool:
        """检查IP是否可疑"""
        # 检查内存黑名单
        if ip_address in self.suspicious_ips:
            return True
        
        if self.redis_available and self.redis_client:
            try:
                # 检查Redis中的可疑IP
                key = f"suspicious_ip:{ip_address}"
                return self.redis_client.exists(key)
            except Exception as e:
                # Redis连接失败时，只检查内存黑名单
                print(f"Redis连接失败，跳过可疑IP检查: {e}")
                self.redis_available = False
        
        return False
    
    def mark_suspicious_ip(self, ip_address: str, reason: str, duration: int = 3600):
        """标记可疑IP"""
        if self.redis_available and self.redis_client:
            try:
                key = f"suspicious_ip:{ip_address}"
                data = {
                    'reason': reason,
                    'marked_at': datetime.utcnow().isoformat()
                }
                self.redis_client.setex(key, duration, json.dumps(data))
            except Exception as e:
                print(f"Redis连接失败，无法标记可疑IP: {e}")
                self.redis_available = False
        
        # 无论Redis是否可用，都添加到内存黑名单
        self.suspicious_ips.add(ip_address)
        
        self.log_security_event(
            'ip_marked_suspicious',
            ip_address=ip_address,
            details={'reason': reason, 'duration': duration}
        )
    
    def check_login_anomaly(self, user_id: str, ip_address: str, user_agent: str) -> Dict[str, Any]:
        """检查登录异常"""
        anomalies = []
        
        try:
            # 检查新IP登录
            if self._is_new_ip_for_user(user_id, ip_address):
                anomalies.append('new_ip_login')
            
            # 检查新设备登录
            if self._is_new_device_for_user(user_id, user_agent):
                anomalies.append('new_device_login')
        except Exception as e:
            print(f"Redis连接错误，跳过IP和设备检查: {e}")
        
        # 检查异常时间登录
        if self._is_unusual_time_login(user_id):
            anomalies.append('unusual_time_login')
        
        # 检查地理位置异常（简化实现）
        if self._is_unusual_location_login(user_id, ip_address):
            anomalies.append('unusual_location_login')
        
        if anomalies:
            self.log_security_event(
                'login_anomaly_detected',
                user_id=user_id,
                ip_address=ip_address,
                details={'anomalies': anomalies, 'user_agent': user_agent}
            )
        
        return {
            'has_anomalies': bool(anomalies),
            'anomalies': anomalies,
            'risk_score': len(anomalies) * 25  # 简单的风险评分
        }
    
    def get_security_summary(self, days: int = 7) -> Dict[str, Any]:
        """获取安全摘要"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        summary = {
            'total_events': 0,
            'event_types': defaultdict(int),
            'suspicious_ips': [],
            'failed_logins': 0,
            'anomaly_detections': 0,
            'rate_limit_violations': 0
        }
        
        if self.redis_available:
            try:
                # 遍历指定天数的安全事件
                current_date = start_date
                while current_date <= end_date:
                    key = f"security_event:{current_date.strftime('%Y%m%d')}"
                    events = self.redis_client.lrange(key, 0, -1)
                    
                    for event_data in events:
                        try:
                            event = json.loads(event_data)
                            event_time = datetime.fromisoformat(event['timestamp'])
                            
                            if start_date <= event_time <= end_date:
                                summary['total_events'] += 1
                                summary['event_types'][event['event_type']] += 1
                                
                                if event['event_type'] == 'login_failed':
                                    summary['failed_logins'] += 1
                                elif event['event_type'] == 'login_anomaly_detected':
                                    summary['anomaly_detections'] += 1
                                elif event['event_type'] == 'rate_limit_exceeded':
                                    summary['rate_limit_violations'] += 1
                        except:
                            continue
                    
                    current_date += timedelta(days=1)
                
                # 获取当前可疑IP列表
                suspicious_ip_keys = self.redis_client.keys("suspicious_ip:*")
                for key in suspicious_ip_keys:
                    ip = key.decode().split(':')[1]
                    data = self.redis_client.get(key)
                    if data:
                        summary['suspicious_ips'].append({
                            'ip': ip,
                            'info': json.loads(data)
                        })
            except Exception as e:
                print(f"Redis操作失败: {e}")
                self.redis_available = False
        
        # 如果Redis不可用，返回基本摘要
        if not self.redis_available:
            summary['suspicious_ips'] = [{'ip': ip, 'info': {'reason': 'memory_cache'}} for ip in self.suspicious_ips]
        
        return dict(summary)
    
    def _check_security_alerts(self, event: Dict[str, Any]):
        """检查是否需要触发安全警报"""
        event_type = event['event_type']
        
        # 检查登录失败次数
        if event_type == 'login_failed':
            ip_address = event.get('ip_address')
            if ip_address:
                if self.redis_available:
                    # 检查该IP在过去10分钟内的失败次数
                    key = f"login_failures:{ip_address}"
                    try:
                        failures = self.redis_client.incr(key)
                        self.redis_client.expire(key, 600)  # 10分钟过期
                        
                        if failures >= 10:  # 10次失败登录
                            self.mark_suspicious_ip(ip_address, 'multiple_login_failures', 3600)
                    except Exception as e:
                        print(f"Redis操作失败: {e}")
                        self.redis_available = False
                else:
                    # 使用内存缓存进行简单的失败次数检查
                    current_time = time.time()
                    key = f"login_failures:{ip_address}"
                    
                    # 清理过期的记录
                    if key in self.memory_cache:
                        self.memory_cache[key] = [t for t in self.memory_cache[key] if current_time - t < 600]
                    else:
                        self.memory_cache[key] = []
                    
                    # 添加当前失败记录
                    self.memory_cache[key].append(current_time)
                    
                    if len(self.memory_cache[key]) >= 10:  # 10次失败登录
                        self.mark_suspicious_ip(ip_address, 'multiple_login_failures', 3600)
        
        # 检查异常登录
        elif event_type == 'login_anomaly_detected':
            anomalies = event.get('details', {}).get('anomalies', [])
            if len(anomalies) >= 3:  # 多个异常指标
                user_id = event.get('user_id')
                if user_id:
                    self.log_security_event(
                        'high_risk_login_detected',
                        user_id=user_id,
                        ip_address=event.get('ip_address'),
                        details={'anomaly_count': len(anomalies)}
                    )
    
    def _is_new_ip_for_user(self, user_id: str, ip_address: str) -> bool:
        """检查是否为用户的新IP"""
        try:
            key = f"user_ips:{user_id}"
            known_ips = self.redis_client.smembers(key)
            
            if ip_address.encode() not in known_ips:
                # 添加新IP
                self.redis_client.sadd(key, ip_address)
                self.redis_client.expire(key, 86400 * 90)  # 90天过期
                return True
            
            return False
        except Exception as e:
            print(f"Redis连接错误，无法检查用户IP历史: {e}")
            return False  # Redis不可用时，假设不是新IP
    
    def _is_new_device_for_user(self, user_id: str, user_agent: str) -> bool:
        """检查是否为用户的新设备"""
        try:
            # 简化的设备指纹
            device_hash = hashlib.md5(user_agent.encode()).hexdigest()[:16]
            key = f"user_devices:{user_id}"
            
            known_devices = self.redis_client.smembers(key)
            if device_hash.encode() not in known_devices:
                self.redis_client.sadd(key, device_hash)
                self.redis_client.expire(key, 86400 * 90)  # 90天过期
                return True
            
            return False
        except Exception as e:
            print(f"Redis连接错误，无法检查用户设备历史: {e}")
            return False  # Redis不可用时，假设不是新设备
    
    def _is_unusual_time_login(self, user_id: str) -> bool:
        """检查是否为异常时间登录"""
        current_hour = datetime.utcnow().hour
        # 简单规则：凌晨2-6点为异常时间
        return 2 <= current_hour <= 6
    
    def _is_unusual_location_login(self, user_id: str, ip_address: str) -> bool:
        """检查是否为异常地理位置登录（简化实现）"""
        # 这里可以集成IP地理位置服务
        # 简化实现：检查是否为内网IP
        try:
            ip = ipaddress.ip_address(ip_address)
            return not ip.is_private
        except:
            return False

class SecurityMiddleware:
    """安全中间件"""
    
    def __init__(self):
        self.auditor = SecurityAuditor()
    
    async def security_check(self, request: Request) -> bool:
        """安全检查"""
        client_ip = self._get_client_ip(request)
        
        # 检查可疑IP
        if self.auditor.is_suspicious_ip(client_ip):
            self.auditor.log_security_event(
                'suspicious_ip_access_blocked',
                ip_address=client_ip,
                details={'path': str(request.url.path)}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="访问被拒绝"
            )
        
        # 检查API速率限制
        if not self.auditor.check_rate_limit(client_ip, 'api'):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="请求过于频繁"
            )
        
        return True
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端IP"""
        # 检查代理头
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else '127.0.0.1'

# 全局实例
security_auditor = SecurityAuditor()
security_middleware = SecurityMiddleware()