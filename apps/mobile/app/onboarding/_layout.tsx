import { Stack } from "expo-router";
import { OnboardingProvider } from "./context";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#0d1016" },
        }}
      />
    </OnboardingProvider>
  );
}
