import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { useOnboarding } from "./context";
import { StepHeader } from "./components/StepHeader";
import { onboardingClient } from "../../lib/onboarding-client";
import { clearDraft } from "../../lib/onboarding-draft";
import { toErrorMessage } from "../../lib/auth";

type Phase = "submitting" | "bazi" | "profile" | "done" | "failed";

export default function SubmittingStep() {
  const router = useRouter();
  const { toIntake, totalSteps, reset } = useOnboarding();
  const [phase, setPhase] = useState<Phase>("submitting");
  const [error, setError] = useState<string | null>(null);
  const [profileVersion, setProfileVersion] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const req = toIntake();
        // 1) 提交
        if (!cancelled) setPhase("submitting");
        const res = await onboardingClient.submit(req);
        if (cancelled) return;

        // 2) bazi（mock 直接跳）
        await sleep(500);
        if (cancelled) return;
        setPhase("bazi");
        await sleep(700);
        if (cancelled) return;
        setPhase("profile");
        setProfileVersion(res.profileVersion);
        await sleep(700);
        if (cancelled) return;
        setPhase("done");
        // 清除草稿
        await clearDraft();
        await reset();
        // 1.2s 后跳 done step
        setTimeout(() => {
          if (!cancelled) router.replace("/onboarding/done");
        }, 1200);
      } catch (err) {
        if (cancelled) return;
        setError(toErrorMessage(err));
        setPhase("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.lg }}
    >
      <StepHeader
        current={5}
        total={totalSteps - 2}
        title="生成中…"
        subtitle="系统正在建档，请稍候。"
        canBack={false}
      />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <PhaseItem
          done={["bazi", "profile", "done"].includes(phase)}
          active={phase === "submitting"}
          failed={phase === "failed"}
          label="提交基础资料"
          detail="正在调 /users/intake/basic"
        />
        <PhaseItem
          done={["profile", "done"].includes(phase)}
          active={phase === "bazi"}
          failed={false}
          label="八字排盘"
          detail="用真太阳时计算命盘"
        />
        <PhaseItem
          done={["done"].includes(phase)}
          active={phase === "profile"}
          failed={false}
          label="生成画像 V1"
          detail="综合八字 + 照片，输出初始画像"
        />

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

        {phase === "done" && profileVersion !== null && (
          <View
            style={{
              backgroundColor: "rgba(90, 158, 143, 0.12)",
              borderColor: colors.jadeLight,
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
            }}
          >
            <Text
              style={{ color: colors.jadeLight, fontSize: 13, fontWeight: "600" }}
            >
              ✓ 画像 V{profileVersion} 已生成
            </Text>
          </View>
        )}

        {phase === "failed" && (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            可以返回上一步修改，或重试。
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function PhaseItem({
  done,
  active,
  failed,
  label,
  detail,
}: {
  done: boolean;
  active: boolean;
  failed: boolean;
  label: string;
  detail: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: failed
          ? colors.cinnabar
          : done
          ? colors.jadeLight
          : active
          ? colors.gold
          : colors.border,
        opacity: !active && !done ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: done
            ? "rgba(90, 158, 143, 0.2)"
            : active
            ? "rgba(192, 166, 106, 0.2)"
            : "rgba(107, 93, 82, 0.3)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
        }}
      >
        {active ? (
          <ActivityIndicator size="small" color={colors.gold} />
        ) : done ? (
          <Text style={{ color: colors.jadeLight, fontSize: 16 }}>✓</Text>
        ) : failed ? (
          <Text style={{ color: colors.cinnabar, fontSize: 16 }}>✕</Text>
        ) : (
          <Text style={{ color: colors.textSubtle, fontSize: 14 }}>·</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: failed
              ? colors.cinnabar
              : done || active
              ? colors.text
              : colors.textMuted,
            fontSize: 14,
            fontWeight: active || done ? "600" : "400",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
