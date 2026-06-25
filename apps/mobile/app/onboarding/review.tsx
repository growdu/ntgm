import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { useOnboarding } from "./context";
import { StepHeader } from "./components/StepHeader";
import { listMyAssets } from "../../lib/photos";
import { useEffect, useState } from "react";
import { Image } from "react-native";
import type { UploadedAsset } from "@ntgm/sdk";

export default function ReviewStep() {
  const router = useRouter();
  const { draft, back, totalSteps, toIntake } = useOnboarding();
  const [assets, setAssets] = useState<UploadedAsset[]>([]);

  useEffect(() => {
    listMyAssets().then(setAssets).catch(() => undefined);
  }, []);

  const req = toIntake();
  const faceCount = assets.filter((a) => a.assetType === "face").length;
  const palmCount = assets.filter((a) => a.assetType === "palm").length;

  const onBack = () => {
    back();
    router.back();
  };

  const onConfirm = () => {
    router.push("/onboarding/submitting");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <StepHeader
        current={4}
        total={totalSteps - 2}
        title="确认提交"
        subtitle="检查信息无误后，点击提交。系统会生成你的画像 V1。"
        onBack={onBack}
      />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Card title="基础资料">
          <Row label="昵称" value={req.name} />
          <Row label="性别" value={req.gender} />
          <Row label="出生" value={req.birthDatetime} />
          <Row label="地点" value={req.birthPlace} />
          {draft.birthTimeUncertain && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              * 时间不详，出生时间按 12:00 估算
            </Text>
          )}
        </Card>

        <Card title={`照片 (${faceCount + palmCount})`}>
          {faceCount + palmCount === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              未上传照片（可选）
            </Text>
          ) : (
            <View>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                面部 {faceCount} 张 · 手掌 {palmCount} 张
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
              >
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {assets.map((a) => (
                    <Image
                      key={a.assetId}
                      source={{ uri: a.localUri }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 6,
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </Card>

        <Card title="提交后会发生什么">
          <Step
            num="1"
            text="系统用出生信息排八字，生成命盘 V0"
          />
          <Step num="2" text="基于八字 + 照片，生成初始画像 V1" />
          <Step
            num="3"
            text="跳到校准问答，10 道题把画像调更准"
          />
        </Card>

        <View
          style={{
            backgroundColor: "rgba(90, 158, 143, 0.12)",
            borderColor: colors.jadeLight,
            borderWidth: 1,
            borderRadius: 10,
            padding: 12,
            flexDirection: "row",
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>🛡</Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 }}
          >
            数据仅存储在你的设备和演示后端，不会用于任何模型训练。
            你可以随时在「我的 → 账户设置」中删除所有数据。
          </Text>
        </View>
      </View>

      <View
        style={{
          padding: spacing.lg,
          paddingTop: 0,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <Pressable
          onPress={onBack}
          style={({ pressed }) => ({
            flex: 1,
            borderColor: colors.gold,
            borderWidth: 1,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.gold, fontWeight: "500" }}>上一步</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          style={({ pressed }) => ({
            flex: 2,
            backgroundColor: colors.gold,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{ color: colors.background, fontWeight: "600" }}
          >
            确认提交
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
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
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 13,
          width: 56,
        }}
      >
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
        {value || "—"}
      </Text>
    </View>
  );
}

function Step({ num, text }: { num: string; text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: "rgba(192, 166, 106, 0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
        }}
      >
        <Text
          style={{
            color: colors.gold,
            fontSize: 11,
            fontWeight: "700",
          }}
        >
          {num}
        </Text>
      </View>
      <Text
        style={{ color: colors.textMuted, fontSize: 13, flex: 1 }}
      >
        {text}
      </Text>
    </View>
  );
}
