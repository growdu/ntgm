import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, toErrorMessage } from "../../lib/auth";
import { PRICING_PLANS, mockCheckout, type Plan } from "../../lib/api";
import { colors, spacing } from "../../lib/theme";

export default function PricingScreen() {
  const router = useRouter();
  const { user, plan, setPlan, refresh } = useAuth();
  const [submitting, setSubmitting] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChoose(p: Plan) {
    if (!user) return;
    if (p === "free") {
      router.push("/home");
      return;
    }
    setSubmitting(p);
    setError(null);
    try {
      await mockCheckout(p);
      await setPlan(p);
      await refresh();
      router.push("/home");
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text
        style={{
          fontSize: 22,
          color: colors.text,
          fontWeight: "700",
          textAlign: "center",
          marginTop: spacing.md,
        }}
      >
        选择你的套餐
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          textAlign: "center",
          marginBottom: spacing.md,
          fontSize: 13,
        }}
      >
        免费版可体验，Pro / Master 解锁完整能力
      </Text>

      {error && (
        <View
          style={{
            backgroundColor: "rgba(201,64,64,0.12)",
            borderColor: colors.cinnabar,
            borderWidth: 1,
            borderRadius: 8,
            padding: 10,
          }}
        >
          <Text style={{ color: colors.cinnabar, fontSize: 13 }}>
            ⚠ {error}
          </Text>
        </View>
      )}

      {PRICING_PLANS.map((p) => {
        const isCurrent = plan === p.id;
        const highlight = !!p.highlight;
        return (
          <View
            key={p.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: highlight ? colors.gold : colors.border,
            }}
          >
            {p.badge && (
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: colors.gold,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.background,
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1,
                  }}
                >
                  {p.badge}
                </Text>
              </View>
            )}
            <Text style={{ color: colors.gold, fontSize: 16, fontWeight: "600" }}>
              {p.name}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                marginTop: 2,
                marginBottom: 12,
              }}
            >
              {p.description}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={{ color: colors.text, fontSize: 32, fontWeight: "700" }}>
                ¥{p.priceCents === 0 ? 0 : (p.priceCents / 100).toFixed(0)}
              </Text>
              <Text
                style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}
              >
                {p.priceCents === 0 ? "永久免费" : "/ 月"}
              </Text>
            </View>

            {p.features.map((f) => (
              <Text
                key={f}
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  marginTop: 6,
                }}
              >
                ✓ {f}
              </Text>
            ))}

            <Pressable
              onPress={() => handleChoose(p.id)}
              disabled={submitting !== null || isCurrent}
              style={({ pressed }) => ({
                marginTop: spacing.md,
                backgroundColor: isCurrent
                  ? colors.textSubtle
                  : highlight
                  ? colors.gold
                  : "transparent",
                borderWidth: highlight ? 0 : 1,
                borderColor: colors.gold,
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
                opacity: pressed || submitting !== null ? 0.6 : 1,
              })}
            >
              {submitting === p.id ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={{
                    color: highlight ? colors.background : colors.gold,
                    fontWeight: "600",
                  }}
                >
                  {isCurrent ? "当前套餐" : p.id === "free" ? "开始免费" : "升级"}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}
