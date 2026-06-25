import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { colors, spacing } from "../../lib/theme";
import {
  takePhoto,
  pickFromLibrary,
  uploadAsset,
  listMyAssets,
  deleteAsset,
} from "../../lib/photos";
import type { AssetType, UploadedAsset } from "@ntgm/sdk";

export default function CreateScreen() {
  const router = useRouter();
  const { hasPaid, plan, user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postedTitle, setPostedTitle] = useState<string | null>(null);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [uploadingType, setUploadingType] = useState<AssetType | null>(null);

  useEffect(() => {
    if (hasPaid) {
      listMyAssets().then(setAssets).catch(() => undefined);
    }
  }, [hasPaid, user]);

  if (!hasPaid) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: spacing.xl,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.gold,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🔒</Text>
          <Text
            style={{
              fontSize: 20,
              color: colors.gold,
              fontWeight: "600",
              marginBottom: spacing.sm,
            }}
          >
            创作是 Pro 专享
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              textAlign: "center",
              fontSize: 13,
              lineHeight: 20,
              marginBottom: spacing.lg,
            }}
          >
            你当前是 {plan.toUpperCase()}。{"\n"}
            升级后可发布解读文章、参与互动。
          </Text>
          <Pressable
            onPress={() => router.push("/pricing")}
            style={({ pressed }) => ({
              backgroundColor: colors.gold,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.background, fontWeight: "600" }}>
              查看套餐
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  async function handlePick(assetType: AssetType, source: "camera" | "library") {
    setUploadingType(assetType);
    try {
      const file =
        source === "camera" ? await takePhoto() : await pickFromLibrary();
      if (!file) {
        Alert.alert("未选择图片", "没有获取到图片，请检查权限或重试。");
        return;
      }
      const res = await uploadAsset(assetType, file);
      setAssets((prev) => [res.asset, ...prev]);
      Alert.alert(
        "上传成功",
        `${assetType === "face" ? "面部" : "手掌"}照片已添加。${
          file.mock ? "（演示版使用占位图）" : ""
        }`
      );
    } catch (err) {
      Alert.alert("上传失败", (err as Error).message);
    } finally {
      setUploadingType(null);
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

  function showAssetSheet(assetType: AssetType) {
    Alert.alert(
      assetType === "face" ? "添加面部照片" : "添加手掌照片",
      "选择图片来源",
      [
        { text: "拍照", onPress: () => handlePick(assetType, "camera") },
        { text: "从相册", onPress: () => handlePick(assetType, "library") },
        { text: "取消", style: "cancel" },
      ]
    );
  }

  async function onSubmit() {
    if (title.trim().length < 4) {
      Alert.alert("提示", "标题至少 4 个字");
      return;
    }
    if (body.trim().length < 20) {
      Alert.alert("提示", "正文至少 20 字");
      return;
    }
    setSubmitting(true);
    try {
      // 演示版：只展示成功
      await new Promise<void>((r) => setTimeout(() => r(), 600));
      setPostedTitle(title);
      setTitle("");
      setBody("");
    } finally {
      setSubmitting(false);
    }
  }

  const faceAssets = assets.filter((a) => a.assetType === "face");
  const palmAssets = assets.filter((a) => a.assetType === "palm");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <Text
          style={{
            fontSize: 22,
            color: colors.text,
            fontWeight: "700",
            marginBottom: spacing.sm,
          }}
        >
          创作
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          分享你的解读。@{user?.displayName}
        </Text>

        {postedTitle && (
          <View
            style={{
              backgroundColor: "rgba(90,158,143,0.12)",
              borderColor: colors.jadeLight,
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
            }}
          >
            <Text style={{ color: colors.jadeLight, fontSize: 13 }}>
              ✓ 《{postedTitle}》已发布（演示版仅展示成功）
            </Text>
          </View>
        )}

        {/* 照片附件区 */}
        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            照片附件（可选）
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <AssetCategoryCard
              type="face"
              count={faceAssets.length}
              uploading={uploadingType === "face"}
              onPress={() => showAssetSheet("face")}
            />
            <AssetCategoryCard
              type="palm"
              count={palmAssets.length}
              uploading={uploadingType === "palm"}
              onPress={() => showAssetSheet("palm")}
            />
          </View>

          {assets.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.md }}
            >
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
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
          )}
        </View>

        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            标题
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
            placeholder="给你的解读起个标题"
            placeholderTextColor={colors.textSubtle}
            style={{
              backgroundColor: colors.cardSolid,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              fontSize: 15,
            }}
          />
        </View>

        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            正文（移动端暂不支持 Markdown）
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            editable={!submitting}
            placeholder="写点什么… 至少 20 字"
            placeholderTextColor={colors.textSubtle}
            multiline
            numberOfLines={8}
            style={{
              backgroundColor: colors.cardSolid,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              fontSize: 15,
              minHeight: 200,
              textAlignVertical: "top",
            }}
          />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 11,
              textAlign: "right",
              marginTop: 2,
            }}
          >
            {body.length} / 5000
          </Text>
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => ({
            backgroundColor: colors.gold,
            padding: 14,
            borderRadius: 8,
            alignItems: "center",
            opacity: pressed || submitting ? 0.6 : 1,
          })}
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text
              style={{ color: colors.background, fontWeight: "600", fontSize: 15 }}
            >
              发布
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AssetCategoryCard({
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
        flex: 1,
        backgroundColor: colors.cardSolid,
        borderRadius: 10,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        opacity: pressed || uploading ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 28, marginBottom: 4 }}>
        {isFace ? "◉" : "✋"}
      </Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>
        {isFace ? "面部照片" : "手掌照片"}
      </Text>
      {uploading ? (
        <ActivityIndicator
          size="small"
          color={colors.gold}
          style={{ marginTop: 4 }}
        />
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
          {count > 0 ? `${count} 张` : "点击添加"}
        </Text>
      )}
    </Pressable>
  );
}
