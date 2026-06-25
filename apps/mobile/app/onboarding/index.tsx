import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../lib/theme";
import { getStepIndex, loadDraft } from "../../lib/onboarding-draft";

export default function OnboardingIndex() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadDraft();
      if (cancelled) return;
      if (saved && getStepIndex(saved.step) >= 0) {
        router.replace(`/onboarding/${saved.step}`);
      } else {
        router.replace("/onboarding/welcome");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );
}
