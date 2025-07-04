#!/usr/bin/env python3
"""
实时日志监控脚本
监控前端日志文件变化并在终端显示
"""

import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    print("请安装watchdog库: pip install watchdog")
    sys.exit(1)

class LogFileHandler(FileSystemEventHandler):
    def __init__(self, log_file: Path, show_all: bool = False):
        self.log_file = log_file
        self.show_all = show_all
        self.last_position = 0
        
        # 如果文件存在，设置初始位置
        if self.log_file.exists():
            if not show_all:
                # 只显示新内容，跳到文件末尾
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    f.seek(0, 2)  # 跳到文件末尾
                    self.last_position = f.tell()
            else:
                # 显示所有内容
                self.last_position = 0
                self.print_existing_content()

    def print_existing_content(self):
        """打印现有文件内容"""
        if self.log_file.exists():
            print(f"\n{'='*80}")
            print(f"📄 现有日志内容: {self.log_file.name}")
            print(f"{'='*80}")
            
            try:
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if content.strip():
                        print(content)
                    else:
                        print("(文件为空)")
            except Exception as e:
                print(f"读取文件失败: {e}")
            
            print(f"{'='*80}")
            print("🔍 等待新日志...")

    def on_modified(self, event):
        if event.is_directory:
            return
        
        if Path(event.src_path) == self.log_file:
            self.print_new_content()

    def print_new_content(self):
        """打印新增的文件内容"""
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                f.seek(self.last_position)
                new_content = f.read()
                
                if new_content.strip():
                    # 添加时间戳和分隔符
                    timestamp = datetime.now().strftime('%H:%M:%S')
                    print(f"\n[{timestamp}] 📝 新日志:")
                    print("-" * 60)
                    print(new_content.rstrip())
                    print("-" * 60)
                
                self.last_position = f.tell()
                
        except Exception as e:
            print(f"读取日志文件失败: {e}")

def main():
    parser = argparse.ArgumentParser(description='实时监控前端日志')
    parser.add_argument('--type', '-t', 
                       choices=['frontend', 'api', 'errors', 'all'], 
                       default='frontend',
                       help='日志类型 (默认: frontend)')
    parser.add_argument('--show-all', '-a', 
                       action='store_true',
                       help='显示现有的所有日志内容')
    parser.add_argument('--log-dir', '-d',
                       default='logs',
                       help='日志目录 (默认: logs)')
    
    args = parser.parse_args()
    
    log_dir = Path(args.log_dir)
    
    if not log_dir.exists():
        print(f"❌ 日志目录不存在: {log_dir}")
        print("请先启动前端应用和日志同步服务")
        sys.exit(1)
    
    # 日志文件映射
    log_files = {
        'frontend': log_dir / 'frontend.log',
        'api': log_dir / 'api_calls.log',
        'errors': log_dir / 'errors.log'
    }
    
    print("🚀 启动日志监控...")
    print(f"📁 监控目录: {log_dir.absolute()}")
    
    if args.type == 'all':
        # 监控所有日志文件
        observers = []
        handlers = []
        
        for log_type, log_file in log_files.items():
            print(f"📄 监控 {log_type} 日志: {log_file}")
            
            handler = LogFileHandler(log_file, args.show_all)
            handlers.append(handler)
            
            observer = Observer()
            observer.schedule(handler, str(log_dir), recursive=False)
            observers.append(observer)
        
        # 启动所有观察者
        for observer in observers:
            observer.start()
        
        try:
            print("\n✅ 日志监控已启动，按 Ctrl+C 停止")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 停止日志监控...")
            for observer in observers:
                observer.stop()
            for observer in observers:
                observer.join()
    
    else:
        # 监控单个日志文件
        log_file = log_files[args.type]
        print(f"📄 监控 {args.type} 日志: {log_file}")
        
        handler = LogFileHandler(log_file, args.show_all)
        observer = Observer()
        observer.schedule(handler, str(log_dir), recursive=False)
        observer.start()
        
        try:
            print(f"\n✅ {args.type} 日志监控已启动，按 Ctrl+C 停止")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 停止日志监控...")
            observer.stop()
            observer.join()

if __name__ == '__main__':
    main()
