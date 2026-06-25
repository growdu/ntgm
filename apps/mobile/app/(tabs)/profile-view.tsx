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
import type { ProfileSummaryResponse, ProfileVersionItem } from "@ntgm/sdk";

const TRAIT_LABELS: Record<string, string> = {
  openness: "开放性",
  conscientiousness: "尽责性",
  extraversion: "外向性",
  agreeableness: "宜人性",
  neuroticism: "神经质",
  logic: "逻辑力",
  creativity: "创造力",
  leadership: "领导力",
  empathy: "共情力",
  family: "家庭",
  friendship: "友谊",
  romantic: "感情",
  professional: "事业",
  career: "事业运",
  wealth: "财富运",
  health: "健康运",
  study: "学业运",
};

const DIMENSION_COLORS: Record<string, string> = {
  personality: colors.gold,
  ability: colors.jadeLight,
  relationship: "#a78bcf",
  fortune: colors.cinnabar,
};

function TraitBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: colors.text, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "600" }}>
          {(value * 100).toFixed(0)}%
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.cardSolid, borderRadius: 3 }}>
        <View
          style={{
            height: 6,
            width: `${value * 100}%`,
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

function VersionCard({ version, onPress }: { version: ProfileVersionItem; onPress: () => void }) {
  const date = new Date(version.createdAt);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.cardSolid,
        borderRadius: 10,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>
          V{version.profileVersion}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {date.toLocaleDateString("zh-CN")}
        </Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
        {(version.summary as any)?.headline ?? `画像 V${version.profileVersion}`}
      </Text>
    </Pressable>
  );
}

export default function ProfileViewScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileSummaryResponse | null>(null);
  const [versions, setVersions] = useState<ProfileVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personality" | "ability" | "relationship" | "fortune">("personality");
  const [selectedVersion, setSelectedVersion] = useState<ProfileSummaryResponse | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, v] = await Promise.all([
        ntgmApi.fetchCurrentProfile(),
        ntgmApi.fetchProfileVersions(),
      ]);
      setProfile(p);
      setVersions(v);
    } catch {
      Alert.alert("加载失败", "无法获取画像数据");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>加载画像中...</Text>
      </View>
    );
  }

  const display = selectedVersion ?? profile;
  if (!display) return null;

  const traits = display.personalityTraits ?? {};
  const abilities = display.abilityTraits ?? {};
  const relationships = display.relationshipTraits ?? {};
  const fortunes = display.fortuneTraits ?? {};
  const confidences = display.confidenceMap ?? {};

  const tabs = [
    { key: "personality", label: "人格", color: DIMENSION_COLORS.personality },
    { key: "ability", label: "能力", color: DIMENSION_COLORS.ability },
    { key: "relationship", label: "关系", color: DIMENSION_COLORS.relationship },
    { key: "fortune", label: "运势", color: DIMENSION_COLORS.fortune },
  ] as const;

  const currentTraits =
    activeTab === "personality" ? traits
    : activeTab === "ability" ? abilities
    : activeTab === "relationship" ? relationships
    : fortunes;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <View style={{ padding: spacing.lg, paddingTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 20, color: colors.gold }}>☯</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginLeft: spacing.sm }}>
            动态画像
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: colors.gold, fontSize: 13 }}>
            V{display.profileVersion}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>
          {(display.summary as any)?.headline ?? "画像已生成"}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* version history */}
        <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm }}>画像版本</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {versions.map((v) => (
                <Pressable
                  key={v.profileId}
                  onPress={() => setSelectedVersion(null)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: v.profileVersion === display.profileVersion
                      ? colors.gold
                      : colors.cardSolid,
                    borderWidth: 1,
                    borderColor: v.profileVersion === display.profileVersion
                      ? colors.gold
                      : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: v.profileVersion === display.profileVersion
                        ? colors.background
                        : colors.textMuted,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    V{v.profileVersion}
                  </Text>
                </Pressable>
              ))}
              {selectedVersion && (
                <Pressable
                  onPress={() => setSelectedVersion(null)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: colors.cardSolid,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>返回当前</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>

        {/* dimension tabs */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: activeTab === tab.key ? tab.color : colors.cardSolid,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: activeTab === tab.key ? colors.background : colors.textMuted,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* traits */}
        <View style={{ padding: spacing.lg, paddingTop: 0 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {Object.entries(currentTraits).map(([key, value]) => {
              const label = TRAIT_LABELS[key] ?? key;
              const confKey = activeTab === "personality" ? "personality"
                : activeTab === "ability" ? "ability"
                : activeTab === "relationship" ? "relationship"
                : "fortune";
              const conf = (confidences as any)?.[confKey] ?? 0.7;
              const color = DIMENSION_COLORS[confKey as string] ?? colors.gold;
              return (
                <View key={key}>
                  <TraitBar label={label} value={value as number} color={color} />
                </View>
              );
            })}
          </View>

          {/* confidence indicator */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: spacing.md,
              marginTop: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>画像置信度</Text>
              <Text style={{ color: colors.gold, fontWeight: "600" }}>
                {(Object.values(confidences).reduce((a, b) => a + (b as number), 0) / Object.keys(confidences).length * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: colors.cardSolid, borderRadius: 2, marginTop: spacing.sm }}>
              <View
                style={{
                  height: 4,
                  width: `${(Object.values(confidences).reduce((a, b) => a + (b as number), 0) / Object.keys(confidences).length) * 100}%`,
                  backgroundColor: colors.jadeLight,
                  borderRadius: 2,
                }}
              />
            </View>
            <Text style={{ color: colors.textDim, fontSize: 11, marginTop: spacing.xs }}>
              引擎版本：{display.engineVersion}
            </Text>
          </View>

          {/* actions */}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Pressable
              onPress={() => router.push("/questionnaire")}
              style={({ pressed }) => ({
                flex: 1,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.gold,
                alignItems: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.gold, fontWeight: "500", fontSize: 13 }}>校准画像</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/match")}
              style={({ pressed }) => ({
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: colors.gold,
                alignItems: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.background, fontWeight: "500", fontSize: 13 }}>查看匹配</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const center: any = { flex: 1, justifyContent: "center", alignItems: "center" };
