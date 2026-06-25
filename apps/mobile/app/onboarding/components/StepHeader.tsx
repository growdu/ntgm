import { View, Text, Pressable } from "react-native";
import { colors, spacing } from "../../../lib/theme";

export type StepHeaderProps = {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  canBack?: boolean;
};

export function StepHeader({
  current,
  total,
  title,
  subtitle,
  onBack,
  canBack = true,
}: StepHeaderProps) {
  return (
    <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.md,
        }}
      >
        {canBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => ({
              paddingVertical: 4,
              paddingRight: 12,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ color: colors.gold, fontSize: 16 }}>‹ 返回</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            marginLeft: "auto",
          }}
        >
          第 {current} / {total} 步
        </Text>
      </View>
      <ProgressDots current={current} total={total} />
      <Text
        style={{
          color: colors.text,
          fontSize: 24,
          fontWeight: "700",
          marginTop: spacing.lg,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: spacing.sm }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i + 1 <= current;
        const active = i + 1 === current;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: done ? colors.gold : colors.border,
              opacity: active ? 1 : done ? 0.8 : 0.4,
            }}
          />
        );
      })}
    </View>
  );
}
