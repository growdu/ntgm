import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { StepHeader } from "./components/StepHeader";
import { useOnboarding } from "./context";

export default function DoneStep() {
  const router = useRouter();
  const { totalSteps } = useOnboarding();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StepHeader
        current={totalSteps - 1}
        total={totalSteps - 2}
        title="建档完成"
        subtitle="你的画像 V1 已生成。下面是推荐的下一步。"
        canBack={false}
      />

      <View style={{ padding: spacing.lg, gap: spacing.md, flex: 1 }}>
        <View
          style={{
            alignItems: "center",
            padding: spacing.xl,
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "rgba(90, 158, 143, 0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 48, color: colors.jadeLight }}>✓</Text>
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "700",
              marginTop: spacing.md,
            }}
          >
            完成建档
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 13,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            欢迎加入 · 你的命运画像之旅正式开启
          </Text>
        </View>

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
              fontSize: 13,
              fontWeight: "600",
              marginBottom: 10,
            }}
          >
            推荐下一步
          </Text>
          <NextStep
            icon="☯"
            title="查看画像"
            sub="基础命盘 + 性格倾向"
            onPress={() => router.replace("/home")}
          />
          <NextStep
            icon="⚔"
            title="历史人物匹配"
            sub="你更像哪位古人？"
            onPress={() => router.replace("/home")}
          />
          <NextStep
            icon="✎"
            title="校准问答"
            sub="10 道题让画像更准"
            onPress={() => router.replace("/home")}
          />
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={() => router.replace("/home")}
          style={({ pressed }) => ({
            backgroundColor: colors.gold,
            paddingVertical: 16,
            borderRadius: 10,
            alignItems: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: colors.background,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            进入工作台
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function NextStep({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(192, 166, 106, 0.15)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
          {sub}
        </Text>
      </View>
      <Text style={{ color: colors.gold, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}
