import React, { useState, useEffect } from "react";
import { Card, Typography, Button } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { RegisterForm } from "../components/auth/RegisterForm";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { useAuth } from "../hooks/useAuth";
import { cn, cardStyles, buttonStyles, layout } from "../design-system";

const { Title, Text } = Typography;

type AuthMode = "login" | "register" | "forgot";

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // 如果用户已登录，重定向到dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // 根据URL参数设置模式
  useEffect(() => {
    const modeParam = searchParams.get("mode") as AuthMode;
    if (modeParam && ["login", "register", "forgot"].includes(modeParam)) {
      setMode(modeParam);
    }
  }, [searchParams]);

  const handleLoginSuccess = () => {
    console.log("登录成功，准备跳转到dashboard");
    // 不需要手动跳转，让AppRouter根据认证状态自动处理
    // 因为用户状态更新后，AppRouter会自动重新渲染并跳转
    console.log("等待认证状态更新后自动跳转...");
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    // 更新URL参数但不刷新页面
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("mode", newMode);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  const renderAuthForm = () => {
    switch (mode) {
      case "login":
        return (
          <LoginForm
            onSwitchToRegister={() => handleModeChange("register")}
            onSwitchToForgot={() => handleModeChange("forgot")}
            onSuccess={handleLoginSuccess}
          />
        );
      case "register":
        return (
          <RegisterForm onSwitchToLogin={() => handleModeChange("login")} />
        );
      case "forgot":
        return (
          <ForgotPasswordForm
            onSwitchToLogin={() => handleModeChange("login")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn(layout.flex.center(), "min-h-screen p-4 bg-blue-900")}>
      {/* 主要内容区域 */}
      <div className="w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className={cn(layout.flex.center(), "gap-3 mb-2")}>
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-education-600 rounded-xl shadow-lg">
              <svg
                className="w-6 h-6 text-neutral-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <Title
              level={1}
              className="!mb-0 !text-neutral-800 !text-3xl font-bold"
            >
              智阅AI
            </Title>
          </div>
        </div>

        {/* 认证表单卡片 */}
        <Card
          className={cn(
            cardStyles.base,
            cardStyles.variants.elevated,
            cardStyles.sizes.lg,
            "w-full border-0 backdrop-blur-sm",
            "bg-neutral-0/95 overflow-hidden"
          )}
          styles={{ body: { padding: "2rem" } }}
        >
          {renderAuthForm()}
        </Card>

        {/* 底部链接 - 仅在忘记密码模式显示 */}
        <div className="text-center mt-6">
          <Text type="secondary" className="text-sm">
            {mode === "forgot" && (
              <>
                想起密码了？{" "}
                <Button
                  type="link"
                  className={cn(
                    buttonStyles.variants.ghost,
                    "p-0 h-auto text-sm font-medium"
                  )}
                  onClick={() => handleModeChange("login")}
                >
                  返回登录
                </Button>
              </>
            )}
          </Text>
        </div>

        {/* 版权信息 */}
        <div className="text-center mt-8">
          <Text type="secondary" className="text-xs">
            © 2024 智阅AI. 保留所有权利.
          </Text>
        </div>
      </div>
    </div>
  );
};
