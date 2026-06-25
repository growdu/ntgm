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
import type { MatchCurrentResponse, MatchItem } from "@ntgm/sdk";

function MatchCard({ item, expanded, onToggle }: { item: MatchItem; expanded: boolean; onToggle: () => void }) {
  const rankEmoji = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉";
  const rankColor = item.rank === 1 ? colors.gold : item.rank === 2 ? "#d4d4d4" : "#cd7f32";

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: item.rank === 1 ? colors.gold : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 24, marginRight: spacing.sm }}>{rankEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
            {item.figureName}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            相似度 {(item.similarityScore * 100).toFixed(0)}%
          </Text>
        </View>
        {/* similarity bar */}
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: rankColor, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: rankColor, fontSize: 16, fontWeight: "700" }}>
              {(item.similarityScore * 100).toFixed(0)}
            </Text>
            <Text style={{ color: colors.textDim, fontSize: 9 }}>%</Text>
          </View>
        </View>
      </View>

      {/* highlights */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.sm }}>
        {item.highlights.slice(0, 3).map((h, i) => (
          <View
            key={i}
            style={{
              backgroundColor: "rgba(90,158,143,0.18)",
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: colors.jadeLight,
            }}
          >
            <Text style={{ color: colors.jadeLight, fontSize: 11 }}>{h}</Text>
          </View>
        ))}
      </View>

      {expanded && (
        <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
          <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "600", marginBottom: spacing.sm }}>
            相似之处
          </Text>
          {item.highlights.map((h, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
              <Text style={{ color: colors.jadeLight, marginRight: 6, fontSize: 13 }}>✓</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, flex: 1 }}>{h}</Text>
            </View>
          ))}

          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: spacing.md, marginBottom: spacing.sm }}>
            差异之处
          </Text>
          {item.differences.map((d, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
              <Text style={{ color: colors.cinnabar, marginRight: 6, fontSize: 13 }}>△</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, flex: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={{ color: colors.textDim, fontSize: 12, textAlign: "center", marginTop: spacing.sm }}>
        {expanded ? "点击收起" : "点击查看详情"}
      </Text>
    </Pressable>
  );
}

export default function MatchScreen() {
  const router = useRouter();
  const [match, setMatch] = useState<MatchCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRank, setExpandedRank] = useState<number | null>(1);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await ntgmApi.fetchCurrentMatch();
      setMatch(data);
    } catch {
      Alert.alert("加载失败", "无法获取匹配数据");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>分析历史坐标中...</Text>
      </View>
    );
  }

  if (!match) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <View style={{ padding: spacing.lg, paddingTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 20, color: colors.gold }}>☯</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginLeft: spacing.sm }}>
            历史人物匹配
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            V{match.profileVersion}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {(match.explanation as any)?.summary ?? "寻找与你特质最接近的历史人物..."}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }} style={{ flex: 1 }}>
        {match.topMatches.map((item) => (
          <MatchCard
            key={item.rank}
            item={item}
            expanded={expandedRank === item.rank}
            onToggle={() => setExpandedRank(expandedRank === item.rank ? null : item.rank)}
          />
        ))}

        {/* explanation */}
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
          <Text style={{ color: colors.gold, fontWeight: "600", marginBottom: spacing.sm, fontSize: 14 }}>
            匹配说明
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 22 }}>
            {(match.explanation as any)?.summary ?? "基于你的画像特质，从 5000 年历史人物库中寻找与你内核最接近的坐标系。相似度综合考虑人格、能力、关系、运势四大维度。"}
          </Text>
        </View>

        {/* actions */}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            onPress={() => router.push("/advice")}
            style={({ pressed }) => ({
              flex: 1,
              padding: 14,
              borderRadius: 8,
              backgroundColor: colors.gold,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.background, fontWeight: "600" }}>查看改命建议</Text>
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
