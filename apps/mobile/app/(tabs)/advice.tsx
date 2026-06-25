import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { ntgmApi } from "../../lib/ntgm-api";
import type { AdviceCurrentResponse } from "@ntgm/sdk";

type AdviceItem = {
  dimension: string;
  text: string;
};

type AdviceSection = {
  title: string;
  items: AdviceItem[];
};

function AdviceSectionCard({ section }: { section: AdviceSection }) {
  const dimColors: Record<string, string> = {
    健康: colors.jadeLight,
    人际: "#a78bcf",
    事业: colors.gold,
    财富: colors.cinnabar,
    人生: colors.goldLight,
    修行: "#8b9dc3",
    婚恋: "#e891b0",
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.gold, fontSize: 15, fontWeight: "700", marginBottom: spacing.md }}>
        {section.title}
      </Text>
      {section.items.map((item, i) => {
        const color = dimColors[item.dimension] ?? colors.textMuted;
        return (
          <View key={i} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 8 }} />
              <Text style={{ color: color, fontSize: 13, fontWeight: "600" }}>{item.dimension}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22, paddingLeft: 14 }}>
              {item.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function FeedbackButton({ type, label, onPress }: { type: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.cardSolid,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export default function AdviceScreen() {
  const router = useRouter();
  const [advice, setAdvice] = useState<AdviceCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [activeTab, setActiveTab] = useState<"shortTerm" | "mediumTerm" | "longTerm">("shortTerm");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await ntgmApi.fetchCurrentAdvice();
      setAdvice(data);
    } catch {
      Alert.alert("加载失败", "无法获取建议数据");
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback(type: string) {
    const result = await ntgmApi.submitAdviceFeedback(type);
    if (result.success) {
      setFeedbackSent(true);
      Alert.alert("反馈已收到", result.message);
    }
  }

  if (loading) {
    return (
      <View style={[center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>生成建议中...</Text>
      </View>
    );
  }

  if (!advice) return null;

  const summary = (advice.summary as any) ?? {};
  const shortTerm: AdviceSection = summary.shortTerm ?? { title: "短期建议", items: [] };
  const mediumTerm: AdviceSection = summary.mediumTerm ?? { title: "中期建议", items: [] };
  const longTerm: AdviceSection = summary.longTerm ?? { title: "长期建议", items: [] };

  const tabMap = {
    shortTerm: shortTerm,
    mediumTerm: mediumTerm,
    longTerm: longTerm,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <View style={{ padding: spacing.lg, paddingTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 20, color: colors.gold }}>☯</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginLeft: spacing.sm }}>
            改命建议
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            V{advice.profileVersion}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          基于你的画像生成的个性化建议，持续更新
        </Text>
      </View>

      {/* time horizon tabs */}
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["shortTerm", "mediumTerm", "longTerm"] as const).map((key) => {
            const labels = { shortTerm: "短期", mediumTerm: "中期", longTerm: "长期" };
            const isActive = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: isActive ? colors.gold : colors.cardSolid,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: isActive ? colors.background : colors.textMuted, fontWeight: "600", fontSize: 14 }}>
                  {labels[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }} style={{ flex: 1 }}>
        <AdviceSectionCard section={tabMap[activeTab]} />

        {/* feedback */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
            marginTop: spacing.sm,
          }}
        >
          <Text style={{ color: colors.gold, fontWeight: "600", marginBottom: spacing.md, fontSize: 14 }}>
            建议评价
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.md, lineHeight: 20 }}>
            这些建议对你的帮助程度如何？
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <FeedbackButton type="very_helpful" label="很有帮助 ✓" onPress={() => submitFeedback("very_helpful")} />
            <FeedbackButton type="somewhat_helpful" label="有些帮助" onPress={() => submitFeedback("somewhat_helpful")} />
            <FeedbackButton type="not_helpful" label="不太有用" onPress={() => submitFeedback("not_helpful")} />
          </View>
          {feedbackSent && (
            <Text style={{ color: colors.jadeLight, fontSize: 12, marginTop: spacing.sm }}>
              ✓ 感谢你的反馈，建议已优化
            </Text>
          )}
        </View>

        {/* navigation */}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            onPress={() => router.push("/match")}
            style={({ pressed }) => ({
              flex: 1,
              padding: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.textMuted, fontWeight: "500" }}>历史人物</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/archive")}
            style={({ pressed }) => ({
              flex: 1,
              padding: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.textMuted, fontWeight: "500" }}>成长档案</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const center: any = { flex: 1, justifyContent: "center", alignItems: "center" };
