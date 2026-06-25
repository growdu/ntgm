import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { checkOnboarded } from "../../lib/api";
import { colors, spacing } from "../../lib/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { user, plan, logout } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarded().then(setOnboarded).catch(() => setOnboarded(true));
  }, [user]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ fontSize: 28, color: colors.gold }}>☯</Text>
        <Text
          style={{
            fontSize: 18,
            color: colors.gold,
            fontWeight: "600",
            marginLeft: spacing.sm,
          }}
        >
          逆天改命
        </Text>
        <View style={{ flex: 1 }} />
        <PlanBadge plan={plan} />
      </View>

      <Text
        style={{
          fontSize: 24,
          color: colors.text,
          fontWeight: "700",
          marginBottom: 4,
        }}
      >
        你好，{user?.displayName ?? "你"}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>
        {user?.email}
      </Text>

      {/* 未建档引导 */}
      {onboarded === false && (
        <Pressable
          onPress={() => router.push("/onboarding")}
          style={({ pressed }) => ({
            backgroundColor: "rgba(192, 166, 106, 0.15)",
            borderColor: colors.gold,
            borderWidth: 1,
            borderRadius: 12,
            padding: spacing.md,
            marginBottom: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(192, 166, 106, 0.3)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: spacing.md,
            }}
          >
            <Text style={{ fontSize: 18 }}>☯</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.gold, fontSize: 14, fontWeight: "600" }}
            >
              开启你的命运画像
            </Text>
            <Text
              style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}
            >
              30 秒建档，生成初始画像 V1
            </Text>
          </View>
          <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
        </Pressable>
      )}

      {/* 快速操作 */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.gold,
            fontWeight: "600",
            marginBottom: spacing.sm,
          }}
        >
          快速开始
        </Text>
        {plan === "free" ? (
          <Pressable
            onPress={() => router.push("/pricing")}
            style={({ pressed }) => ({
              backgroundColor: colors.gold,
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.background, fontWeight: "600" }}>
              升级到 Pro 解锁完整能力
            </Text>
          </Pressable>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <QuickAction label="查看画像" sub="基础 + 进阶维度" onPress={() => router.push("/profile-view")} />
            <QuickAction label="历史人物匹配" sub="你的 5000 年坐标系" onPress={() => router.push("/match")} />
            <QuickAction label="改命建议" sub="短期 / 中期 / 长期" onPress={() => router.push("/advice")} />
            <QuickAction label="持续问答" sub="校准画像，提升置信度" onPress={() => router.push("/questionnaire")} />
            <QuickAction label="成长档案" sub="命运演进，全部留痕" onPress={() => router.push("/archive")} />
          </View>
        )}
      </View>

      {/* 套餐信息 */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.gold,
            fontWeight: "600",
            marginBottom: spacing.sm,
          }}
        >
          当前套餐
        </Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
          {plan.toUpperCase()}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: 4,
            marginBottom: spacing.sm,
          }}
        >
          {plan === "free"
            ? "免费版，可体验基础画像"
            : plan === "pro"
            ? "Pro：解锁持续画像演进、创作、PDF 导出"
            : "Master：含 1V1 解读、API 接入"}
        </Text>
        <Pressable
          onPress={() => router.push("/pricing")}
          style={({ pressed }) => ({
            padding: 10,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.gold,
            alignItems: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.gold, fontWeight: "500" }}>
            {plan === "master" ? "查看套餐" : "升级套餐"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={logout}
        style={({ pressed }) => ({
          marginTop: spacing.lg,
          padding: 12,
          alignItems: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>退出登录</Text>
      </Pressable>
    </ScrollView>
  );
}

function PlanBadge({ plan }: { plan: "free" | "pro" | "master" }) {
  const map = {
    free: { label: "免费", color: colors.textDim, bg: "rgba(107,93,82,0.3)" },
    pro: { label: "PRO", color: colors.gold, bg: "rgba(192,166,106,0.25)" },
    master: {
      label: "MASTER",
      color: colors.jadeLight,
      bg: "rgba(90,158,143,0.25)",
    },
  };
  const m = map[plan];
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: m.bg,
        borderWidth: 1,
        borderColor: m.color,
      }}
    >
      <Text style={{ color: m.color, fontSize: 10, fontWeight: "700" }}>
        {m.label}
      </Text>
    </View>
  );
}

function QuickAction({ label, sub, onPress }: { label: string; sub: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed || !onPress ? 0.5 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontWeight: "500" }}>{label}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
        {sub}
      </Text>
    </Pressable>
  );
}
