import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { colors, spacing } from "../../lib/theme";
import { ntgmApi } from "../../lib/ntgm-api";
import type { ArchiveTimelineItem } from "@ntgm/sdk";

const TYPE_ICONS: Record<string, string> = {
  intake: "📋",
  profile_change: "🔄",
  advice: "📜",
  match: "👤",
  event: "⚡",
  questionnaire: "❓",
};

const TYPE_LABELS: Record<string, string> = {
  intake: "建档",
  profile_change: "画像演进",
  advice: "建议生成",
  match: "人物匹配",
  event: "人生事件",
  questionnaire: "问答",
};

const TYPE_COLORS: Record<string, string> = {
  intake: colors.gold,
  profile_change: colors.jadeLight,
  advice: "#a78bcf",
  match: colors.goldLight,
  event: colors.cinnabar,
  questionnaire: "#8b9dc3",
};

function TimelineItem({ item, isLast }: { item: ArchiveTimelineItem; isLast: boolean }) {
  const date = new Date(item.occurredAt);
  const icon = TYPE_ICONS[item.itemType] ?? "📌";
  const label = TYPE_LABELS[item.itemType] ?? item.itemType;
  const color = TYPE_COLORS[item.itemType] ?? colors.gold;

  return (
    <View style={{ flexDirection: "row", paddingRight: spacing.lg }}>
      {/* timeline line */}
      <View style={{ width: 40, alignItems: "center" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${color}22`,
            borderWidth: 2,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        {!isLast && (
          <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 }} />
        )}
      </View>

      {/* content */}
      <View style={{ flex: 1, paddingBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>{item.title}</Text>
          <View
            style={{
              marginLeft: spacing.sm,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 8,
              backgroundColor: `${color}22`,
              borderWidth: 1,
              borderColor: color,
            }}
          >
            <Text style={{ color, fontSize: 10, fontWeight: "600" }}>{label}</Text>
          </View>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>{item.summary}</Text>
        <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 4 }}>
          {date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          {item.profileVersion ? ` · 画像 V${item.profileVersion}` : ""}
        </Text>

        {/* metadata */}
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.xs }}>
            {Object.entries(item.metadata).slice(0, 3).map(([k, v]) => (
              <View
                key={k}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: colors.cardSolid,
                }}
              >
                <Text style={{ color: colors.textDim, fontSize: 10 }}>
                  {k}: {String(v)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default function ArchiveScreen() {
  const [timeline, setTimeline] = useState<ArchiveTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const items = await ntgmApi.fetchArchiveTimeline();
      setTimeline(items);
    } catch {
      Alert.alert("加载失败", "无法获取档案数据");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>加载档案中...</Text>
      </View>
    );
  }

  const filters = Array.from(new Set(timeline.map((i) => i.itemType)));
  const filtered = filter ? timeline.filter((i) => i.itemType === filter) : timeline;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <View style={{ padding: spacing.lg, paddingTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 20, color: colors.gold }}>☯</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginLeft: spacing.sm }}>
            成长档案
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {timeline.length} 条记录
          </Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          你的命运演进轨迹，全部留痕
        </Text>
      </View>

      {/* filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: spacing.md }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        <Pressable
          onPress={() => setFilter(null)}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: !filter ? colors.gold : colors.cardSolid,
            borderWidth: 1,
            borderColor: !filter ? colors.gold : colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: !filter ? colors.background : colors.textMuted, fontSize: 13, fontWeight: "500" }}>
            全部
          </Text>
        </Pressable>
        {filters.map((type) => (
          <Pressable
            key={type}
            onPress={() => setFilter(filter === type ? null : type)}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: filter === type ? (TYPE_COLORS[type] ?? colors.gold) : colors.cardSolid,
              borderWidth: 1,
              borderColor: filter === type ? (TYPE_COLORS[type] ?? colors.gold) : colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 12 }}>{TYPE_ICONS[type] ?? "📌"}</Text>
            <Text style={{ color: filter === type ? colors.background : colors.textMuted, fontSize: 13, fontWeight: "500" }}>
              {TYPE_LABELS[type] ?? type}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* timeline */}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingLeft: spacing.lg }}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: spacing.xl }}>
            <Text style={{ color: colors.textDim, fontSize: 14 }}>暂无记录</Text>
          </View>
        ) : (
          filtered.map((item, idx) => (
            <TimelineItem key={item.occurredAt + idx} item={item} isLast={idx === filtered.length - 1} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const center: any = { flex: 1, justifyContent: "center", alignItems: "center" };
