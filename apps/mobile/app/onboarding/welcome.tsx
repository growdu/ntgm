import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { useOnboarding } from "./context";
import { StepHeader } from "./components/StepHeader";

export default function WelcomeStep() {
  const router = useRouter();
  const { totalSteps, hasSavedDraft, draft, reset } = useOnboarding();

  const handleStart = () => {
    router.push("/onboarding/basic");
  };

  const handleResume = () => {
    if (hasSavedDraft) {
      router.push("/onboarding/basic");
    } else {
      handleStart();
    }
  };

  const handleDiscard = async () => {
    await reset();
  };

  const overviewItems = [
    { icon: "✎", title: "基础资料", desc: "出生信息 + 地点" },
    { icon: "◉", title: "照片采集", desc: "面部 + 手掌（可选）" },
    { icon: "✦", title: "确认提交", desc: "系统生成画像 V1" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <StepHeader
        current={1}
        total={totalSteps - 2 /* hide submitting/done */}
        title="开始建档"
        subtitle="30 秒完成，邮箱即账号。建档后系统会生成你的画像 V1。"
        canBack={false}
      />

      <View style={{ padding: spacing.lg }}>
        {hasSavedDraft && (
          <View
            style={{
              backgroundColor: "rgba(192, 166, 106, 0.12)",
              borderColor: colors.gold,
              borderWidth: 1,
              borderRadius: 12,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                color: colors.gold,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              ✨ 发现未完成的草稿
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {draft.name ? `上次填写到「${draft.name}」` : "上次未完成"}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={handleResume}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.gold,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: colors.background,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  继续填写
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDiscard}
                style={({ pressed }) => ({
                  flex: 1,
                  borderColor: colors.gold,
                  borderWidth: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: colors.gold,
                    fontWeight: "500",
                    fontSize: 13,
                  }}
                >
                  重新开始
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View
          style={{
            alignItems: "center",
            padding: spacing.xl,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ fontSize: 64, color: colors.gold }}>☯</Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.gold,
              marginTop: spacing.sm,
            }}
          >
            逆天改命
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 13,
              marginTop: spacing.xs,
            }}
          >
            你的命，不止能算，还能被持续校正
          </Text>
        </View>

        <Text
          style={{
            color: colors.gold,
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 2,
            marginBottom: spacing.md,
          }}
        >
          建档流程
        </Text>
        {overviewItems.map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: spacing.md,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(192, 166, 106, 0.15)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: spacing.md,
              }}
            >
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {item.desc}
              </Text>
            </View>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>
              {i + 1}
            </Text>
          </View>
        ))}

        <Text
          style={{
            color: colors.textSubtle,
            fontSize: 11,
            textAlign: "center",
            marginTop: spacing.md,
            lineHeight: 18,
          }}
        >
          草稿自动保存于本机，重启 app 后可继续。
          {"\n"}
          数据仅存储在本地演示 / 上传后存储于后端。
        </Text>
      </View>

      <View
        style={{
          padding: spacing.lg,
          paddingTop: 0,
        }}
      >
        <Pressable
          onPress={handleStart}
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
            {hasSavedDraft ? "重新开始" : "开始建档"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
