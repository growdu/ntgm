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

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!email.trim() || !displayName.trim()) {
      setError("请填写完整信息");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signup(email, password, displayName);
      router.replace("/home");
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
              fontSize: 20,
              color: colors.gold,
              fontWeight: "600",
              marginBottom: spacing.md,
              textAlign: "center",
            }}
          >
            创建账号
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              textAlign: "center",
              marginBottom: spacing.md,
              fontSize: 12,
            }}
          >
            30 秒注册，开启你的命运画像
          </Text>

          {field("昵称", displayName, setDisplayName, "default", submitting)}
          {field("邮箱", email, setEmail, "email-address", submitting)}
          {field("密码", password, setPassword, "default", submitting, true)}
          {field(
            "确认密码",
            confirm,
            setConfirm,
            "default",
            submitting,
            true
          )}

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
                注册
              </Text>
            )}
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: spacing.md,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              已有账号？{" "}
            </Text>
            <Link href="/login" style={{ color: colors.gold, fontSize: 13 }}>
              直接登录
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function field(
  label: string,
  value: string,
  onChange: (v: string) => void,
  keyboardType: "default" | "email-address",
  disabled: boolean,
  secureTextEntry = false
) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize={secureTextEntry ? "none" : "none"}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={!disabled}
        style={{
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: 12,
          color: colors.text,
          fontSize: 15,
        }}
      />
    </View>
  );
}
