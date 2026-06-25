import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { useOnboarding } from "./context";
import { StepHeader } from "./components/StepHeader";
import {
  deleteAsset,
  listMyAssets,
  pickFromLibrary,
  takePhoto,
  uploadAsset,
} from "../../lib/photos";
import type { AssetType, UploadedAsset } from "@ntgm/sdk";

export default function PhotoStep() {
  const router = useRouter();
  const { draft, updateDraft, back, totalSteps } = useOnboarding();
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [uploading, setUploading] = useState<AssetType | null>(null);

  useEffect(() => {
    listMyAssets().then(setAssets).catch(() => undefined);
  }, []);

  const faceAssets = assets.filter((a) => a.assetType === "face");
  const palmAssets = assets.filter((a) => a.assetType === "palm");

  // 把当前 assets 的 id 同步进 draft
  useEffect(() => {
    updateDraft({
      faceAssetIds: faceAssets.map((a) => a.assetId),
      palmAssetIds: palmAssets.map((a) => a.assetId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceAssets.length, palmAssets.length]);

  async function handlePick(type: AssetType, source: "camera" | "library") {
    setUploading(type);
    try {
      const file =
        source === "camera" ? await takePhoto() : await pickFromLibrary();
      if (!file) {
        Alert.alert("未选择", "没有获取到图片，请检查权限或重试。");
        return;
      }
      const res = await uploadAsset(type, file);
      setAssets((prev) => [res.asset, ...prev]);
    } catch (err) {
      Alert.alert("上传失败", (err as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(assetId: string) {
    try {
      await deleteAsset(assetId);
      setAssets((prev) => prev.filter((a) => a.assetId !== assetId));
    } catch (err) {
      Alert.alert("删除失败", (err as Error).message);
    }
  }

  function showSheet(type: AssetType) {
    Alert.alert(
      type === "face" ? "添加面部照片" : "添加手掌照片",
      "选择图片来源",
      [
        { text: "拍照", onPress: () => handlePick(type, "camera") },
        { text: "从相册", onPress: () => handlePick(type, "library") },
        { text: "取消", style: "cancel" },
      ]
    );
  }

  const onBack = () => {
    back();
    router.back();
  };

  const onSkip = () => {
    router.push("/onboarding/review");
  };

  const onNext = () => {
    router.push("/onboarding/review");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <StepHeader
        current={3}
        total={totalSteps - 2}
        title="照片采集"
        subtitle="可选，但建议上传。面部用于特征识别，手掌用于掌纹初探。"
        onBack={onBack}
      />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <AssetCategory
          type="face"
          count={faceAssets.length}
          uploading={uploading === "face"}
          onPress={() => showSheet("face")}
        />
        <AssetCategory
          type="palm"
          count={palmAssets.length}
          uploading={uploading === "palm"}
          onPress={() => showSheet("palm")}
        />

        {(faceAssets.length > 0 || palmAssets.length > 0) && (
          <View>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                marginTop: spacing.sm,
                marginBottom: 8,
              }}
            >
              已上传 {assets.length} 张
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {assets.map((a) => (
                  <View
                    key={a.assetId}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      overflow: "hidden",
                      position: "relative",
                      backgroundColor: colors.cardSolid,
                    }}
                  >
                    <Image
                      source={{ uri: a.localUri }}
                      style={{ width: 80, height: 80 }}
                      resizeMode="cover"
                    />
                    <View
                      style={{
                        position: "absolute",
                        top: 2,
                        left: 2,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: "600",
                        }}
                      >
                        {a.assetType === "face" ? "面部" : "手掌"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(a.assetId)}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        backgroundColor: "rgba(201,64,64,0.85)",
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{ color: "#fff", fontSize: 12, lineHeight: 14 }}
                      >
                        ×
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <Text
          style={{
            color: colors.textSubtle,
            fontSize: 11,
            lineHeight: 18,
            marginTop: spacing.md,
            textAlign: "center",
          }}
        >
          演示项目：图片仅存储在本地，不上传到后端。
          {"\n"}
          正式版会调用 /assets/upload-token 走 MinIO/S3。
        </Text>
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
        {assets.length === 0 ? (
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => ({
              flex: 2,
              borderColor: colors.gold,
              borderWidth: 1,
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{ color: colors.gold, fontWeight: "500" }}
            >
              跳过，进入确认
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onNext}
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
              下一步：确认提交
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function AssetCategory({
  type,
  count,
  uploading,
  onPress,
}: {
  type: AssetType;
  count: number;
  uploading: boolean;
  onPress: () => void;
}) {
  const isFace = type === "face";
  return (
    <Pressable
      onPress={onPress}
      disabled={uploading}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        opacity: pressed || uploading ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "rgba(192,166,106,0.15)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
        }}
      >
        <Text style={{ fontSize: 28 }}>
          {isFace ? "◉" : "✋"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
        >
          {isFace ? "面部照片" : "手掌照片"}
        </Text>
        <Text
          style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}
        >
          {uploading
            ? "上传中..."
            : count > 0
            ? `已添加 ${count} 张`
            : "点击拍照或从相册选择"}
        </Text>
      </View>
      <Text style={{ color: colors.gold, fontSize: 20 }}>+</Text>
    </Pressable>
  );
}
