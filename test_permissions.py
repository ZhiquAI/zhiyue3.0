#!/usr/bin/env python3

import sys
sys.path.append('./backend')

try:
    from backend.middleware.permissions import get_user_permissions
except ImportError:
    from middleware.permissions import get_user_permissions

print("测试get_user_permissions函数")

# 测试不同角色的权限
roles = ['admin', 'teacher', 'assistant', 'student', 'guest']

for role in roles:
    permissions = get_user_permissions(role)
    print(f"角色 {role}: {permissions} (类型: {type(permissions)})")

# 测试不存在的角色
invalid_permissions = get_user_permissions('invalid_role')
print(f"无效角色: {invalid_permissions} (类型: {type(invalid_permissions)})")