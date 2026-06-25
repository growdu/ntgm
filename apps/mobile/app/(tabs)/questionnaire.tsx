import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import { ntgmApi } from "../../lib/ntgm-api";
import type { QuestionnaireQuestion } from "@ntgm/sdk";

export default function QuestionnaireScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [progress, setProgress] = useState({ total: 0, done: 0 });

  useEffect(() => {
    loadQuestions();
    loadProgress();
  }, []);

  async function loadQuestions() {
    setLoading(true);
    try {
      const qs = await ntgmApi.fetchNextQuestions();
      setQuestions(qs);
      const draft = await ntgmApi.loadQuestionnaireDraft();
      if (draft && draft.questions.length === qs.length) {
        setAnswers(draft.answers);
        setCurrentIndex(draft.currentIndex);
      }
    } catch (e) {
      Alert.alert("加载失败", "无法获取问答内容，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function loadProgress() {
    const p = await ntgmApi.fetchQuestionnaireProgress();
    const done = Object.keys(answers).length;
    setProgress({ total: p.totalQuestions, done });
  }

  async function saveDraft() {
    await ntgmApi.saveQuestionnaireDraft({ questions, answers, currentIndex });
  }

  function handleSelect(questionId: string, value: string) {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    saveDraft();
    // auto advance after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    }, 300);
  }

  async function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert("提示", `还有 ${questions.length - Object.keys(answers).length} 道题未回答`);
      return;
    }
    setSubmitting(true);
    try {
      const answerItems = questions.map((q) => ({
        questionId: q.questionId,
        value: answers[q.questionId] ?? "",
      }));
      const result = await ntgmApi.submitQuestionnaireAnswers(answerItems);
      setSubmitted(true);
      Alert.alert(
        "提交成功",
        `已收到你的回答，画像已更新到 V${result.profileVersion}`,
        [{ text: "查看画像", onPress: () => router.push("/profile-view") }]
      );
    } catch (e) {
      Alert.alert("提交失败", "请检查网络后重试");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>加载问答中...</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[center, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <Text style={{ fontSize: 48, marginBottom: spacing.md }}>✓</Text>
        <Text style={{ color: colors.gold, fontSize: 20, fontWeight: "700" }}>问答已完成</Text>
        <Text style={{ color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" }}>
          你的画像已更新，感谢你的参与
        </Text>
        <Pressable
          onPress={() => router.push("/profile-view")}
          style={[btnGold, { marginTop: spacing.xl }]}
        >
          <Text style={{ color: colors.background, fontWeight: "600" }}>查看新画像</Text>
        </Pressable>
      </View>
    );
  }

  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <View
        style={{
          padding: spacing.lg,
          paddingTop: spacing.xl,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 20, color: colors.gold }}>☯</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginLeft: spacing.sm }}>
            持续问答
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {answeredCount}/{questions.length}
          </Text>
        </View>
        {/* progress bar */}
        <View style={{ height: 4, backgroundColor: colors.cardSolid, borderRadius: 2 }}>
          <View
            style={{
              height: 4,
              width: `${progressPct}%`,
              backgroundColor: colors.gold,
              borderRadius: 2,
            }}
          />
        </View>
        {current && (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.xs }}>
            {current.traitTargets.join(", ")}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }} style={{ flex: 1 }}>
        {current && (
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600", marginBottom: spacing.lg, lineHeight: 26 }}>
              {current.questionText}
            </Text>

            {current.options.map((option, i) => {
              const selected = answers[current.questionId] === option;
              return (
                <Pressable
                  key={i}
                  onPress={() => handleSelect(current.questionId, option)}
                  style={({ pressed }) => ({
                    backgroundColor: selected ? "rgba(192,166,106,0.18)" : colors.cardSolid,
                    borderWidth: 1,
                    borderColor: selected ? colors.gold : colors.border,
                    borderRadius: 10,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? colors.gold : colors.textDim,
                        backgroundColor: selected ? colors.gold : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: spacing.sm,
                      }}
                    >
                      {selected && <Text style={{ color: colors.background, fontSize: 12 }}>✓</Text>}
                    </View>
                    <Text style={{ color: selected ? colors.gold : colors.text, fontSize: 15, flex: 1 }}>
                      {option}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* navigation */}
        <View style={{ flexDirection: "row", marginTop: spacing.xl, gap: spacing.sm }}>
          <Pressable
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            style={({ pressed }) => ({
              flex: 1,
              padding: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              opacity: pressed || currentIndex === 0 ? 0.5 : 1,
            })}
          >
            <Text style={{ color: colors.textMuted, fontWeight: "500" }}>上一题</Text>
          </Pressable>
          <Pressable
            onPress={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={currentIndex === questions.length - 1}
            style={({ pressed }) => ({
              flex: 1,
              padding: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              opacity: pressed || currentIndex === questions.length - 1 ? 0.5 : 1,
            })}
          >
            <Text style={{ color: colors.textMuted, fontWeight: "500" }}>下一题</Text>
          </Pressable>
        </View>

        {answeredCount === questions.length && (
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => ({
              backgroundColor: colors.gold,
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
              marginTop: spacing.md,
              opacity: pressed || submitting ? 0.6 : 1,
            })}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={{ color: colors.background, fontWeight: "700", fontSize: 16 }}>
                提交答案，生成新画像
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const center: any = { flex: 1, justifyContent: "center", alignItems: "center" };
const btnGold: any = {
  backgroundColor: colors.gold,
  paddingHorizontal: 32,
  paddingVertical: 14,
  borderRadius: 8,
};
