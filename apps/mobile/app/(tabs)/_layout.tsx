import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../lib/theme";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 22,
        color: focused ? colors.gold : colors.textDim,
      }}
    >
      {icon}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "工作台",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="☯" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pricing"
        options={{
          title: "套餐",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="◇" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "创作",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="✎" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "我的",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="☉" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
