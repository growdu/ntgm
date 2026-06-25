import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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
  const [sharing, setSharing] = useState(false);

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

  async function handleShare() {
    if (!sharing) {
      setSharing(true);
      try {
        const items = filter ? timeline.filter((i) => i.itemType === filter) : timeline;
        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: serif; background: #0d1016; color: #f3ead7; padding: 40px; }
  h1 { color: #c0a66a; text-align: center; font-size: 28px; }
  .item { border-left: 3px solid #c0a66a; padding: 12px 16px; margin-bottom: 16px; background: #121825; }
  .title { color: #f3ead7; font-size: 16px; font-weight: bold; margin-bottom: 6px; }
  .meta { color: #a8998a; font-size: 12px; margin-bottom: 4px; }
  .summary { color: #d6d3cc; font-size: 14px; }
  .footer { text-align: center; color: #6b5d52; font-size: 11px; margin-top: 40px; }
</style>
</head>
<body>
<h1>☯ 逆天改命 · 成长档案</h1>
<p style="text-align:center;color:#a8998a;">共 ${items.length} 条记录</p>
${items.map((item) => `
<div class="item">
  <div class="title">${item.title}</div>
  <div class="meta">${new Date(item.occurredAt).toLocaleDateString("zh-CN")} · ${TYPE_LABELS[item.itemType] ?? item.itemType}${item.profileVersion ? ` · V${item.profileVersion}` : ""}</div>
  <div class="summary">${item.summary}</div>
</div>
`).join("")}
<div class="footer">逆天改命算命软件 · ${new Date().toLocaleString("zh-CN")}</div>
</body>
</html>`;
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert("分享不可用", "当前设备不支持分享功能");
        }
      } catch (e) {
        Alert.alert("分享失败", "请重试");
      } finally {
        setSharing(false);
      }
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
          <Pressable
            onPress={handleShare}
            disabled={sharing || timeline.length === 0}
            style={({ pressed }) => ({
              marginLeft: spacing.md,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.gold,
              opacity: pressed || sharing || timeline.length === 0 ? 0.4 : 1,
            })}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={colors.gold} />
            ) : (
              <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "600" }}>分享</Text>
            )}
          </Pressable>
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
