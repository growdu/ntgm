import { SafeAreaView, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0d1016" }}>
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={{ color: "#c0a66a", letterSpacing: 2 }}>NTGM / Mobile</Text>
        <Text style={{ color: "#f3ead7", fontSize: 32, fontWeight: "700" }}>
          持续交互演进画像
        </Text>
        <Text style={{ color: "#d6d3cc", lineHeight: 24 }}>
          当前为移动端工程骨架，后续将接入建档、持续问答、拍照上传和提醒能力。
        </Text>
      </View>
    </SafeAreaView>
  );
}

