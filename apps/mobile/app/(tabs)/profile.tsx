import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../lib/auth";
import { colors, spacing } from "../../lib/theme";
import { pushClient } from "../../lib/push-client";
import { ensureNotificationPermission, ensureSeedReminders } from "../../lib/notifications";
import type {
  NotificationPref,
  PushTokenRecord,
  ReminderItem,
} from "@ntgm/sdk";

export default function ProfileScreen() {
  const { user, plan, hasPaid, logout } = useAuth();
  const [pref, setPrefState] = useState<NotificationPref | null>(null);
  const [tokens, setTokens] = useState<PushTokenRecord[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    refreshAll();
  }, [user]);

  async function refreshAll() {
    const [p, t, r] = await Promise.all([
      pushClient.getPref(),
      pushClient.listMyTokens(),
      pushClient.listReminders(),
    ]);
    setPrefState(p);
    setTokens(t);
    setReminders(r);
    if (user) await ensureSeedReminders();
  }

  async function onRegister() {
    setRegistering(true);
    try {
      const perm = await ensureNotificationPermission();
      if (perm.status === "denied") {
        Alert.alert(
          "权限被拒绝",
          "请到系统设置 → 通知 → 逆天改命 中开启通知权限。"
        );
        return;
      }
      const record = await pushClient.registerToken();
      if (record) {
        await pushClient.setPref({ pushEnabled: true });
        await refreshAll();
        Alert.alert(
          "注册成功",
          `设备 ${record.deviceName} 已订阅推送（${pushClient.getMode()} 模式）。${
            record.token.startsWith("ExponentPushToken[mock_")
              ? "（演示模式使用 mock token）"
              : ""
          }`
        );
      } else {
        Alert.alert("注册失败", "未能获取推送 token");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function onUnregister() {
    Alert.alert("取消订阅", "确定要关闭本设备的推送吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "关闭",
        style: "destructive",
        onPress: async () => {
          await pushClient.unregisterToken();
          await pushClient.setPref({ pushEnabled: false });
          await refreshAll();
        },
      },
    ]);
  }

  async function onTogglePref(key: keyof NotificationPref, val: boolean) {
    const next = await pushClient.setPref({ [key]: val });
    setPrefState(next);
  }

  async function onAddReminder() {
    const triggerAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const item = await pushClient.scheduleReminder({
      title: "⏰ 提醒：5 分钟后",
      body: "去 app 看看你的画像有没有新变化。",
      triggerAt,
    });
    void item;
    await refreshAll();
  }

  function onLogout() {
    Alert.alert("退出登录", "确定要退出吗？", [
      { text: "取消", style: "cancel" },
      { text: "退出", style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text
        style={{
          fontSize: 22,
          color: colors.text,
          fontWeight: "700",
          marginTop: spacing.md,
        }}
      >
        我的
      </Text>

      {/* 用户卡片 */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: spacing.lg,
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.gold,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.background,
              fontSize: 28,
              fontWeight: "700",
            }}
          >
            {user?.displayName?.charAt(0) ?? "?"}
          </Text>
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 2,
          }}
        >
          {user?.displayName}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {user?.email}
        </Text>

        <View
          style={{
            marginTop: spacing.md,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: hasPaid
              ? "rgba(192,166,106,0.18)"
              : "rgba(107,93,82,0.3)",
            borderWidth: 1,
            borderColor: hasPaid ? colors.gold : colors.textSubtle,
          }}
        >
          <Text
            style={{
              color: hasPaid ? colors.gold : colors.textDim,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          >
            {plan.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* 推送订阅 */}
      <Section title="推送通知" icon="📡">
        <View style={{ gap: spacing.sm }}>
          {tokens.length > 0 ? (
            tokens.map((t) => (
              <View
                key={t.token}
                style={{
                  backgroundColor: colors.cardSolid,
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 2,
                  }}
                >
                  <Text
                    style={{
                      color: colors.jadeLight,
                      fontSize: 12,
                      fontWeight: "600",
                      flex: 1,
                    }}
                  >
                    ✓ 已订阅 · {t.platform}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 999,
                      backgroundColor:
                        pushClient.getMode() === "http"
                          ? "rgba(90,158,143,0.25)"
                          : "rgba(107,93,82,0.3)",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          pushClient.getMode() === "http"
                            ? colors.jadeLight
                            : colors.textDim,
                        fontSize: 9,
                        fontWeight: "700",
                      }}
                    >
                      {pushClient.getMode() === "http" ? "后端" : "MOCK"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                  numberOfLines={1}
                >
                  {t.token}
                </Text>
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {t.deviceName} ·{" "}
                  {new Date(t.registeredAt).toLocaleString("zh-CN")}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              尚未订阅推送
            </Text>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={onRegister}
              disabled={registering}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.gold,
                padding: 10,
                borderRadius: 6,
                alignItems: "center",
                opacity: pressed || registering ? 0.6 : 1,
              })}
            >
              {registering ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text
                  style={{ color: colors.background, fontWeight: "600", fontSize: 13 }}
                >
                  {tokens.length > 0 ? "重新订阅" : "订阅推送"}
                </Text>
              )}
            </Pressable>
            {tokens.length > 0 && (
              <Pressable
                onPress={onUnregister}
                style={({ pressed }) => ({
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.cinnabar,
                  padding: 10,
                  borderRadius: 6,
                  alignItems: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{ color: colors.cinnabar, fontWeight: "600", fontSize: 13 }}
                >
                  取消订阅
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Section>

      {/* 偏好 */}
      {pref && (
        <Section title="通知偏好" icon="🔔">
          <PrefRow
            label="推送总开关"
            value={pref.pushEnabled}
            onChange={(v) => onTogglePref("pushEnabled", v)}
          />
          <PrefRow
            label="每日提醒"
            sub="每晚 9 点提醒你做校准"
            value={pref.dailyReminder}
            onChange={(v) => onTogglePref("dailyReminder", v)}
          />
          <PrefRow
            label="每周摘要"
            sub="周末推送本周画像变化"
            value={pref.weeklyDigest}
            onChange={(v) => onTogglePref("weeklyDigest", v)}
          />
          <PrefRow
            label="产品动态"
            sub="新功能与命理活动"
            value={pref.marketingNews}
            onChange={(v) => onTogglePref("marketingNews", v)}
          />
        </Section>
      )}

      {/* 提醒列表 */}
      <Section
        title="本地提醒"
        icon="⏰"
        action={{ label: "+ 5min 后", onPress: onAddReminder }}
      >
        {reminders.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            暂无提醒
          </Text>
        ) : (
          reminders.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => pushClient.markReminderRead(r.id).then(refreshAll)}
              style={({ pressed }) => ({
                backgroundColor: colors.cardSolid,
                borderRadius: 8,
                padding: 10,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: r.read ? 0.5 : 1,
                marginBottom: 6,
              })}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: r.read ? "400" : "600",
                }}
              >
                {r.read ? "✓ " : ""}
                {r.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {r.body}
              </Text>
              <Text
                style={{
                  color: colors.textSubtle,
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                {new Date(r.triggerAt).toLocaleString("zh-CN")}
              </Text>
            </Pressable>
          ))
        )}
      </Section>

      <MenuItem label="账户设置" sub="昵称、密码、邮箱" />
      <MenuItem label="数据导出" sub="导出我的全部画像" />
      <MenuItem label="帮助中心" sub="FAQ、客服" />
      <MenuItem label="用户协议与隐私" sub="版本 1.0" />

      <Pressable
        onPress={onLogout}
        style={({ pressed }) => ({
          marginTop: spacing.lg,
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.cinnabar,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: colors.cinnabar, fontWeight: "600" }}>
          退出登录
        </Text>
      </Pressable>

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 11,
          textAlign: "center",
          marginTop: spacing.md,
        }}
      >
        逆天改命 v0.1.0 · 移动端
      </Text>
    </ScrollView>
  );
}

function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.sm,
        }}
      >
        <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text>
        <Text
          style={{ color: colors.gold, fontWeight: "600", flex: 1, fontSize: 14 }}
        >
          {title}
        </Text>
        {action && (
          <Pressable
            onPress={action.onPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              style={{ color: colors.gold, fontSize: 12, fontWeight: "500" }}
            >
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function PrefRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 13 }}>{label}</Text>
        {sub && (
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
            {sub}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.gold, false: colors.textSubtle }}
        thumbColor={value ? colors.goldLight : colors.textDim}
      />
    </View>
  );
}

function MenuItem({ label, sub }: { label: string; sub: string }) {
  return (
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
        {sub}
      </Text>
    </Pressable>
  );
}
