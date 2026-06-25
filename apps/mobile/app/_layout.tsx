"use client";

import { Stack, Redirect, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import { pushClient } from "../lib/push-client";
import { onboardingClient } from "../lib/onboarding-client";
import { ntgmApi } from "../lib/ntgm-api";
import { colors } from "../lib/theme";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();

  // 启动时检测 API base url → 决定 push / onboarding 走 mock 还是 http
  useEffect(() => {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (baseUrl) {
      // 演示项目 mobile 端没真实 JWT（本地 mock 账户），所以 token 传 null。
      // 真实场景下 auth.tsx 应暴露 token 给 client。
      pushClient.enable(baseUrl, null);
      onboardingClient.enable(baseUrl, null);
      ntgmApi.enable(baseUrl, null);
    }
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  // expo-router 路由不带括号分组，pathname 形如 /login /signup /forgot /home 等
  const AUTH_ROUTES = new Set(["/login", "/signup", "/forgot"]);
  const inAuth = AUTH_ROUTES.has(pathname);

  if (!isAuthenticated && !inAuth) {
    return <Redirect href="/login" />;
  }
  if (isAuthenticated && inAuth) {
    return <Redirect href="/home" />;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </AuthGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
