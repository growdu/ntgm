"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "./components/Navigation";
import { useAuth } from "../lib/auth";
import { Taiji, Bagua, WuXing } from "./components/DaoElements";
import styles from "./page.module.css";

// ============================================
// 道 · 核心概念
// ============================================
const valueProps = [
  {
    icon: "☯",
    title: "画像持续演进",
    desc: "非一卦定终身。随你提交的经历、问答、事件，命格随之推移，画像逐日精进。",
  },
  {
    icon: "人",
    title: "古今人物共鸣",
    desc: "以 5000 年历史为坐标系，看你更像曾国藩的稳健，还是李白的洒脱。",
  },
  {
    icon: "行",
    title: "可执行的修身",
    desc: "结合画像给具体可操作的下一步，并通过你的反馈持续校准，不流于空言。",
  },
];

const daoSteps = [
  { num: "01", title: "格物", desc: "免费浏览真实命例与画像样例，先观后入" },
  { num: "02", title: "诚意", desc: "邮箱即注册，三十息完成" },
  { num: "03", title: "正心", desc: "免费起步，Pro / Master 解锁完整能力" },
  { num: "04", title: "修身", desc: "持续画像 + 发布你的解读文章" },
];

const wuXingNames = ["木", "火", "土", "金", "水"];

const testimonials = [
  {
    quote:
      "以前测过不下十款算命应用，没有一款会回头问我『这周过得如何』。这一款，会。",
    author: "互联网产品人 · 三十二岁",
    initial: "产",
  },
  {
    quote:
      "画像变化那条时间线让我意外。原来半年前的我，与今日的我，竟是两个人。",
    author: "创业者 · 二十八岁",
    initial: "创",
  },
  {
    quote:
      "内子的 Master 套餐里那一对一的解读，对我们做家庭决定，真的有用。",
    author: "心理咨询师 · 三十五岁",
    initial: "心",
  },
];

const stats = [
  { num: "一二四八零", label: "已生成画像" },
  { num: "五千余", label: "历史人物原型" },
  { num: "九八·六%", label: "用户满意度" },
  { num: "三十息", label: "平均注册耗时" },
];

const faq = [
  {
    q: "我不懂命理，能看懂么？",
    a: "能。所有输出皆以白话写就，不堆术语，关键概念首次出现处附简释。",
  },
  {
    q: "我的数据会被用来训练么？",
    a: "默认不会。生产环境下数据全程加密、不可见第三方。如启用 AI 训练，会单开窗口征你同意。",
  },
  {
    q: "Pro 与 Master 的差别？",
    a: "Pro 解锁持续画像演进、PDF 导出、创作。Master 增一对一解读、API 接入、优先客服。详见「查看套餐」。",
  },
  {
    q: "退款之制？",
    a: "首次订阅七日内不满意，全额退，不问缘由。联系客官即可。",
  },
  {
    q: "支付之方？",
    a: "演示仅 Mock 支付。生产支持微信、支付宝、Stripe（信用卡）。",
  },
];

const classicQuotes = [
  "穷则变，变则通，通则久。",
  "一阴一阳之谓道。继之者善也，成之者性也。",
  "天行健，君子以自强不息。地势坤，君子以厚德载物。",
  "以道御术，以术证道。",
];

export default function HomePage() {
  const { isAuthenticated, plan } = useAuth();
  const ctaHref = isAuthenticated
    ? plan === "free"
      ? "/pricing"
      : "/home"
    : "/signup";
  const ctaLabel = isAuthenticated
    ? plan === "free"
      ? "升级套餐"
      : "进入工作台"
    : "免费注册";

  return (
    <AppShell>
      <div className={styles.page}>
        {/* HERO · 太极主图 */}
        <section className={styles.daoHero}>
          <div className={styles.daoHeroSymbol}>
            <Taiji size={160} />
          </div>
          <h1 className={styles.daoHeroTitle}>
            <span className={styles.daoHeroTitleKicker}>知命 · 顺命 · 改命</span>
            <span className={styles.daoHeroTitleMain}>逆天·改命</span>
          </h1>
          <p className={styles.daoHeroSubtitle}>
            自出生信息、照片、人生事件至性格模式，
            <br />
            渐次形成你专属的命理画像。
          </p>
          <p className={styles.daoHeroQuote}>
            「{classicQuotes[3]}」
          </p>
          <div className={styles.daoHeroCta}>
            <Link href={ctaHref} className="btn btn-primary btnLarge">
              {ctaLabel}
            </Link>
            <Link href="/pricing" className="btn btn-secondary btnLarge">
              查看套餐
            </Link>
          </div>
          <div className={styles.daoHeroTrust}>
            <span>✓ 三十息注册</span>
            <span>✓ 七日可退</span>
            <span>✓ 数据全程加密</span>
          </div>
        </section>

        {/* WU XING · 五行 */}
        <section className={styles.daoWuXing}>
          <div className={styles.daoWuXingInner}>
            <WuXing size={36} />
            <p className={styles.daoWuXingText}>
              木火土金水 · 五行流转 · 相生相克 · 周而复始
            </p>
          </div>
        </section>

        {/* STATS · 数据用古汉字 */}
        <section className={styles.statsSection}>
          <div className={styles.statsGrid}>
            {stats.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <div className={styles.statNumber}>{s.num}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ONBOARDING · 修身六步 */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>修身起手</span>
            <h2 className={styles.sectionTitle}>六步入命，首份画像</h2>
            <p className={styles.sectionSubtitle}>
              每一步皆可随时暂停。下次归时，自会接着走。
            </p>
          </div>
          <div className={styles.onboardingGrid}>
            <OnboardingStep
              step="01"
              title="基础资料"
              points={[
                "出生年月日时（不确定可勾选）",
                "出生地点（用于真太阳时修正）",
                "性别、昵称",
              ]}
              icon="✎"
            />
            <OnboardingStep
              step="02"
              title="照片采集"
              points={[
                "正面免冠照（用于面部特征分析）",
                "手掌照片（可选，用于掌纹初探）",
                "支持手机直接拍照上传",
              ]}
              icon="◉"
            />
            <OnboardingStep
              step="03"
              title="初始分析"
              points={[
                "八字排盘（含真太阳时）",
                "五行旺衰与喜忌神",
                "性格倾向 · 风险偏好",
              ]}
              icon="✦"
            />
            <OnboardingStep
              step="04"
              title="校准问答"
              points={[
                "十至二十道选择题（动态出题）",
                "每答五题触发一次画像重算",
                "支持跳过与重置",
              ]}
              icon="？"
            />
            <OnboardingStep
              step="05"
              title="人物共鸣"
              points={[
                "前三名历史人物原型",
                "相似点与差异点解释",
                "人物生平对你的启示",
              ]}
              icon="人"
            />
            <OnboardingStep
              step="06"
              title="改命建议"
              points={[
                "短期 · 中期 · 长期三档",
                "具体可执行的下一步",
                "支持反馈 → 持续校准",
              ]}
              icon="上"
            />
          </div>
        </section>

        {/* VALUE · 道之三要 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>为何不同</span>
            <h2 className={styles.sectionTitle}>非一卦即可</h2>
            <p className={styles.sectionSubtitle}>
              命理之病，多在「算完再无归期」。我们重设全回路——
              让你愿意每周归来，画像方能日日精进。
            </p>
          </div>
          <div className={styles.valueGrid}>
            {valueProps.map((v) => (
              <div key={v.title} className={styles.valueCard}>
                <div className={styles.valueIcon}>{v.icon}</div>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueDesc}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* DAOSI · 入门四步 */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>入门四步</span>
            <h2 className={styles.sectionTitle}>从识到行，全闭环</h2>
            <p className={styles.sectionSubtitle}>
              行完下述四步，便是从容熟客了。
            </p>
          </div>
          <div className={styles.flowSteps}>
            {daoSteps.map((s) => (
              <div key={s.num} className={styles.flowStep}>
                <div className={styles.flowStepNumber}>{s.num}</div>
                <div className={styles.flowStepTitle}>{s.title}</div>
                <div className={styles.flowStepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CLASSIC · 名句 */}
        <section className={styles.section}>
          <div className={styles.daoClassic}>
            {classicQuotes.slice(0, 3).map((q, i) => (
              <blockquote key={i} className={styles.daoClassicQuote}>
                <p>「{q}」</p>
                <cite>
                  — {["《周易》", "《周易》", "《周易》"][i]}
                </cite>
              </blockquote>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS · 众人之言 */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>众人之评</span>
            <h2 className={styles.sectionTitle}>真客如何说</h2>
          </div>
          <div className={styles.testimonialGrid}>
            {testimonials.map((t, i) => (
              <div key={i} className={styles.testimonial}>
                <p className={styles.testimonialQuote}>「{t.quote}」</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{t.initial}</div>
                  <span>{t.author}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>FAQ</span>
            <h2 className={styles.sectionTitle}>常见之疑</h2>
          </div>
          <div className={styles.faqList}>
            {faq.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </section>

        {/* FINAL CTA · 收尾 */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.finalCta}>
            <div className={styles.finalCtaSymbol}>
              <Taiji size={80} />
            </div>
            <h2 className={styles.sectionTitle}>命格至此，由此而始</h2>
            <p className={styles.sectionSubtitle} style={{ marginBottom: 24 }}>
              三十息注册，邮箱即账号。免费版亦能走通完整主流程。
            </p>
            <div className={styles.daoHeroCta}>
              <Link href={ctaHref} className="btn btn-primary btnLarge">
                {ctaLabel}
              </Link>
              {!isAuthenticated && (
                <Link href="/login" className="btn btn-ghost btnLarge">
                  已有账号 · 登录
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function OnboardingStep({
  step,
  title,
  points,
  icon,
}: {
  step: string;
  title: string;
  points: string[];
  icon: string;
}) {
  return (
    <div className={styles.onboardingCard}>
      <div className={styles.onboardingStep}>
        <span className={styles.onboardingStepNum}>{step}</span>
        <span className={styles.onboardingStepIcon}>{icon}</span>
      </div>
      <h3 className={styles.onboardingTitle}>{title}</h3>
      <ul className={styles.onboardingPoints}>
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button
        className={styles.faqQuestion}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.faqQ}>{q}</span>
        <span className={styles.faqToggle}>{open ? "−" : "+"}</span>
      </button>
      {open && <p className={styles.faqAnswer}>{a}</p>}
    </div>
  );
}
