#!/usr/bin/env python3
"""
开发日志同步服务器
接收前端日志并写入文件，供Cursor实时查看
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 日志文件配置
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

FRONTEND_LOG_FILE = LOG_DIR / "frontend.log"
API_LOG_FILE = LOG_DIR / "api_calls.log"
ERROR_LOG_FILE = LOG_DIR / "errors.log"

def write_log_entry(file_path: Path, entry: str):
    """写入日志条目到文件"""
    try:
        with open(file_path, 'a', encoding='utf-8') as f:
            f.write(entry + '\n')
            f.flush()  # 立即刷新到磁盘
    except Exception as e:
        print(f"写入日志失败: {e}")

def format_log_entry(log_data: dict) -> str:
    """格式化日志条目"""
    timestamp = datetime.fromisoformat(log_data['timestamp'].replace('Z', '+00:00'))
    local_time = timestamp.strftime('%Y-%m-%d %H:%M:%S')
    
    level = log_data['level'].upper()
    category = log_data['category']
    message = log_data['message']
    
    entry = f"[{local_time}] {level:5} {category:10} {message}"
    
    if log_data.get('data'):
        try:
            data_str = json.dumps(log_data['data'], ensure_ascii=False, indent=2)
            entry += f"\n  数据: {data_str}"
        except:
            entry += f"\n  数据: {str(log_data['data'])}"
    
    if log_data.get('stack'):
        entry += f"\n  堆栈: {log_data['stack']}"
    
    return entry

@app.route('/api/dev/sync-logs', methods=['POST'])
def sync_logs():
    """接收前端日志并写入文件"""
    try:
        data = request.get_json()
        
        if not data or 'logs' not in data:
            return jsonify({'error': '无效的日志数据'}), 400
        
        sync_time = data.get('syncTime', datetime.now().isoformat())
        logs = data['logs']
        
        # 写入同步标记
        sync_marker = f"\n{'='*80}\n同步时间: {sync_time} | 日志数量: {len(logs)}\n{'='*80}\n"
        write_log_entry(FRONTEND_LOG_FILE, sync_marker)
        
        # 处理每条日志
        for log_entry in logs:
            formatted_entry = format_log_entry(log_entry)
            
            # 写入主日志文件
            write_log_entry(FRONTEND_LOG_FILE, formatted_entry)
            
            # 根据类型分类写入
            if log_entry['level'] == 'error':
                write_log_entry(ERROR_LOG_FILE, formatted_entry)
            
            if log_entry['category'] in ['api', 'network', 'fetch']:
                write_log_entry(API_LOG_FILE, formatted_entry)
        
        return jsonify({
            'status': 'success',
            'processed': len(logs),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        error_msg = f"日志同步失败: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500

@app.route('/api/dev/logs/status', methods=['GET'])
def log_status():
    """获取日志文件状态"""
    try:
        status = {}
        
        for name, file_path in [
            ('frontend', FRONTEND_LOG_FILE),
            ('api', API_LOG_FILE),
            ('errors', ERROR_LOG_FILE)
        ]:
            if file_path.exists():
                stat = file_path.stat()
                status[name] = {
                    'exists': True,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'path': str(file_path.absolute())
                }
            else:
                status[name] = {'exists': False}
        
        return jsonify(status)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dev/logs/clear', methods=['POST'])
def clear_logs():
    """清除所有日志文件"""
    try:
        cleared = []
        
        for name, file_path in [
            ('frontend', FRONTEND_LOG_FILE),
            ('api', API_LOG_FILE),
            ('errors', ERROR_LOG_FILE)
        ]:
            if file_path.exists():
                file_path.unlink()
                cleared.append(name)
        
        return jsonify({
            'status': 'success',
            'cleared': cleared,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dev/logs/tail/<log_type>')
def tail_logs(log_type):
    """获取日志文件的最后几行"""
    try:
        lines = int(request.args.get('lines', 50))
        
        file_map = {
            'frontend': FRONTEND_LOG_FILE,
            'api': API_LOG_FILE,
            'errors': ERROR_LOG_FILE
        }
        
        if log_type not in file_map:
            return jsonify({'error': '无效的日志类型'}), 400
        
        file_path = file_map[log_type]
        
        if not file_path.exists():
            return jsonify({'lines': [], 'total': 0})
        
        with open(file_path, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            tail_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
        
        return jsonify({
            'lines': [line.rstrip() for line in tail_lines],
            'total': len(all_lines),
            'showing': len(tail_lines)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 启动开发日志同步服务器...")
    print(f"📁 日志目录: {LOG_DIR.absolute()}")
    print(f"📄 前端日志: {FRONTEND_LOG_FILE}")
    print(f"📄 API日志: {API_LOG_FILE}")
    print(f"📄 错误日志: {ERROR_LOG_FILE}")
    print("🌐 服务地址: http://localhost:3001")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=3001, debug=True)
