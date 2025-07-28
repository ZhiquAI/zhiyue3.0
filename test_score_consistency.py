#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试客观题评分结果和总分统计的一致性
"""

import json
import sys
import subprocess
import tempfile
import os

def test_score_consistency():
    """测试评分结果的一致性"""
    
    # 测试数据
    test_cases = [
        {
            "name": "测试案例1 - 部分正确",
            "student_answers": {"1": "A", "2": "B", "3": "C", "4": "A", "5": "B"},
            "reference_answers": {"1": "A", "2": "C", "3": "C", "4": "D", "5": "B"},
            "score_config": {"1": 2.0, "2": 2.0, "3": 2.0, "4": 2.0, "5": 2.0}
        },
        {
            "name": "测试案例2 - 全部正确",
            "student_answers": {"1": "A", "2": "B", "3": "C", "4": "D"},
            "reference_answers": {"1": "A", "2": "B", "3": "C", "4": "D"},
            "score_config": {"1": 5.0, "2": 5.0, "3": 5.0, "4": 5.0}
        },
        {
            "name": "测试案例3 - 全部错误",
            "student_answers": {"1": "B", "2": "C", "3": "D", "4": "A"},
            "reference_answers": {"1": "A", "2": "B", "3": "C", "4": "D"},
            "score_config": {"1": 3.0, "2": 3.0, "3": 3.0, "4": 3.0}
        },
        {
            "name": "测试案例4 - 不同分值",
            "student_answers": {"1": "A", "2": "B", "3": "C"},
            "reference_answers": {"1": "A", "2": "C", "3": "C"},
            "score_config": {"1": 10.0, "2": 5.0, "3": 2.0}
        }
    ]
    
    api_url = "http://localhost:8000/api/choice-grading/grade"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
    }
    
    all_passed = True
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*60}")
        print(f"执行 {test_case['name']}")
        print(f"{'='*60}")
        
        try:
            # 使用curl发送请求
            payload = {
                "student_answers": test_case["student_answers"],
                "reference_answers": test_case["reference_answers"],
                "score_config": test_case["score_config"]
            }
            
            # 创建临时文件保存JSON数据
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(payload, f)
                temp_file = f.name
            
            try:
                # 执行curl命令
                curl_cmd = [
                    'curl', '-s', '-X', 'POST', api_url,
                    '-H', 'Content-Type: application/json',
                    '-H', 'Authorization: Bearer test-token',
                    '-d', f'@{temp_file}'
                ]
                
                result = subprocess.run(curl_cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    print(f"❌ curl命令执行失败: {result.stderr}")
                    all_passed = False
                    continue
                
                # 解析响应
                try:
                    data = json.loads(result.stdout)
                except json.JSONDecodeError as e:
                    print(f"❌ 响应JSON解析失败: {e}")
                    print(f"响应内容: {result.stdout}")
                    all_passed = False
                    continue
                    
            finally:
                # 清理临时文件
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            
            if not data.get('success'):
                print(f"❌ 评分失败: {data.get('message')}")
                all_passed = False
                continue
            
            # 提取评分结果
            result = data['data']
            summary = result['summary']
            question_details = result['question_details']
            
            # 从后端返回的总分
            backend_total_score = summary['total_score']
            backend_correct_count = summary['correct_count']
            backend_total_questions = summary['total_questions']
            
            # 手动计算总分和统计
            manual_total_score = sum(q['score'] for q in question_details)
            manual_correct_count = sum(1 for q in question_details if q['is_correct'])
            manual_total_questions = len(question_details)
            
            print(f"学生答案: {test_case['student_answers']}")
            print(f"参考答案: {test_case['reference_answers']}")
            print(f"分值配置: {test_case['score_config']}")
            print()
            
            print("📊 评分结果详情:")
            for q in question_details:
                status = "✅" if q['is_correct'] else "❌"
                print(f"  题{q['question_number']}: {q['student_answer']} vs {q['correct_answer']} {status} {q['score']}分")
            print()
            
            print("📈 统计对比:")
            print(f"  后端返回总分: {backend_total_score}")
            print(f"  手动计算总分: {manual_total_score}")
            print(f"  后端正确题数: {backend_correct_count}")
            print(f"  手动计算正确题数: {manual_correct_count}")
            print(f"  后端总题数: {backend_total_questions}")
            print(f"  手动计算总题数: {manual_total_questions}")
            print()
            
            # 检查一致性
            score_consistent = abs(backend_total_score - manual_total_score) < 0.001
            correct_count_consistent = backend_correct_count == manual_correct_count
            total_questions_consistent = backend_total_questions == manual_total_questions
            
            if score_consistent and correct_count_consistent and total_questions_consistent:
                print("✅ 一致性检查通过")
            else:
                print("❌ 一致性检查失败:")
                if not score_consistent:
                    print(f"  - 总分不一致: {backend_total_score} != {manual_total_score}")
                if not correct_count_consistent:
                    print(f"  - 正确题数不一致: {backend_correct_count} != {manual_correct_count}")
                if not total_questions_consistent:
                    print(f"  - 总题数不一致: {backend_total_questions} != {manual_total_questions}")
                all_passed = False
            
        except Exception as e:
            print(f"❌ 测试执行失败: {str(e)}")
            all_passed = False
    
    print(f"\n{'='*60}")
    if all_passed:
        print("🎉 所有测试用例通过，评分结果一致性正常")
        return 0
    else:
        print("⚠️  存在不一致的测试用例，请检查评分逻辑")
        return 1

if __name__ == "__main__":
    exit_code = test_score_consistency()
    sys.exit(exit_code)