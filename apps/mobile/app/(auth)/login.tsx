import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth, toErrorMessage } from "../../lib/auth";
import { colors, spacing } from "../../lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
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

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/home");
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setEmail("demo@ntgm.app");
    setPassword("demo123");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing.lg,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
          <Text style={{ fontSize: 48, color: colors.gold }}>☯</Text>
          <Text
            style={{
              fontSize: 28,
              color: colors.gold,
              fontWeight: "600",
              marginTop: spacing.sm,
            }}
          >
            逆天改命
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>
            你的命运画像，从这里开始
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              color: colors.gold,
              fontWeight: "600",
              marginBottom: spacing.md,
              textAlign: "center",
            }}
          >
            登录
          </Text>

          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>
            邮箱
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!submitting}
            style={inputStyle}
          />

          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              marginTop: spacing.md,
              marginBottom: 4,
            }}
          >
            密码
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            placeholderTextColor={colors.textSubtle}
            secureTextEntry
            editable={!submitting}
            style={inputStyle}
          />

          {error && (
            <Text
              style={{
                color: colors.cinnabar,
                fontSize: 13,
                marginTop: spacing.sm,
              }}
            >
              ⚠ {error}
            </Text>
          )}

          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={({ pressed }) => ({
              marginTop: spacing.lg,
              backgroundColor: colors.gold,
              padding: 14,
              borderRadius: 8,
              alignItems: "center",
              opacity: pressed || submitting ? 0.6 : 1,
            })}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text
                style={{
                  color: colors.background,
                  fontWeight: "600",
                  fontSize: 15,
                }}
              >
                登录
              </Text>
            )}
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: spacing.md,
            }}
          >
            <Link href="/signup" style={{ color: colors.gold, fontSize: 13 }}>
              没账号？去注册
            </Link>
            <Pressable onPress={fillDemo}>
              <Text style={{ color: colors.gold, fontSize: 13 }}>
                使用演示账户
              </Text>
            </Pressable>
          </View>
        </View>

        <Text
          style={{
            textAlign: "center",
            color: colors.textSubtle,
            fontSize: 11,
            marginTop: spacing.lg,
          }}
        >
          演示项目：邮箱密码仅保存在本机
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: 12,
  color: colors.text,
  fontSize: 15,
} as const;
