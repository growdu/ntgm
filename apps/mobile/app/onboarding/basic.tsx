import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { useOnboarding } from "./context";
import { StepHeader } from "./components/StepHeader";
import type { Gender } from "@ntgm/sdk";

const GENDERS: { value: Gender; label: string; icon: string }[] = [
  { value: "male", label: "男", icon: "♂" },
  { value: "female", label: "女", icon: "♀" },
  { value: "other", label: "其他", icon: "⚧" },
  { value: "prefer_not_to_say", label: "不填", icon: "—" },
];

export default function BasicStep() {
  const router = useRouter();
  const { draft, updateDraft, next, back, totalSteps } = useOnboarding();
  const [error, setError] = useState<string | null>(null);

  const onNext = () => {
    const res = next();
    if (!res.ok) {
      setError(res.reason || "请补全资料");
      return;
    }
    setError(null);
    router.push("/onboarding/photo");
  };

  const onBack = () => {
    back();
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      <StepHeader
        current={2}
        total={totalSteps - 2}
        title="基础资料"
        subtitle="用于八字排盘与画像 V1。出生时间不确定可勾选。"
        onBack={onBack}
      />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Field label="昵称" hint="之后可改">
          <TextInput
            value={draft.name}
            onChangeText={(t) => updateDraft({ name: t })}
            placeholder="比如 小明"
            placeholderTextColor={colors.textSubtle}
            style={inputStyle}
            maxLength={32}
          />
        </Field>

        <Field label="性别">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {GENDERS.map((g) => {
              const selected = draft.gender === g.value;
              return (
                <Pressable
                  key={g.value}
                  onPress={() => updateDraft({ gender: g.value })}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: selected
                      ? colors.gold
                      : colors.cardSolid,
                    borderWidth: 1,
                    borderColor: selected ? colors.gold : colors.border,
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      color: selected
                        ? colors.background
                        : colors.gold,
                    }}
                  >
                    {g.icon}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      marginTop: 2,
                      color: selected
                        ? colors.background
                        : colors.textMuted,
                      fontWeight: selected ? "600" : "400",
                    }}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field
          label="出生日期"
          hint="格式：YYYY-MM-DD"
        >
          <TextInput
            value={draft.birthDate}
            onChangeText={(t) =>
              updateDraft({
                birthDate: t.replace(/[^0-9-]/g, "").slice(0, 10),
              })
            }
            placeholder="1990-05-15"
            placeholderTextColor={colors.textSubtle}
            style={inputStyle}
            keyboardType="numeric"
            maxLength={10}
          />
        </Field>

        <Field label="出生时间">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TextInput
              value={draft.birthTime}
              onChangeText={(t) =>
                updateDraft({
                  birthTime: t.replace(/[^0-9:]/g, "").slice(0, 5),
                })
              }
              placeholder="10:30"
              placeholderTextColor={colors.textSubtle}
              style={[inputStyle, { flex: 1 }]}
              keyboardType="numeric"
              maxLength={5}
              editable={!draft.birthTimeUncertain}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardSolid,
              }}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  marginRight: 4,
                }}
              >
                不详
              </Text>
              <Switch
                value={draft.birthTimeUncertain}
                onValueChange={(v) =>
                  updateDraft({
                    birthTimeUncertain: v,
                    birthTime: v ? "" : draft.birthTime,
                  })
                }
                trackColor={{ true: colors.gold, false: colors.textSubtle }}
                thumbColor={
                  draft.birthTimeUncertain ? colors.goldLight : colors.textDim
                }
              />
            </View>
          </View>
        </Field>

        <Field label="出生地点" hint="用于真太阳时修正">
          <TextInput
            value={draft.birthPlace}
            onChangeText={(t) => updateDraft({ birthPlace: t })}
            placeholder="比如 北京"
            placeholderTextColor={colors.textSubtle}
            style={inputStyle}
            maxLength={64}
          />
        </Field>

        {error && (
          <View
            style={{
              backgroundColor: "rgba(201, 64, 64, 0.12)",
              borderColor: colors.cinnabar,
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
            }}
          >
            <Text style={{ color: colors.cinnabar, fontSize: 13 }}>
              ⚠ {error}
            </Text>
          </View>
        )}
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
            下一步：照片采集
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: "500",
          }}
        >
          {label}
        </Text>
        {hint && (
          <Text
            style={{
              color: colors.textSubtle,
              fontSize: 10,
              marginLeft: 8,
            }}
          >
            {hint}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: "#1e232d",
  borderWidth: 1,
  borderColor: "rgba(192,166,106,0.25)",
  borderRadius: 8,
  padding: 12,
  color: "#f3ead7",
  fontSize: 15,
} as const;
