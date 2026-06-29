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
    title: "画像常照常新",
    desc: "非一卦可定终身。随你所历、所答、所感，命格随之流转，画像日日精进。",
  },
  {
    icon: "古",
    title: "千古人物同炉",
    desc: "以五千年为坐标，观你更似曾国藩之稳健，抑或李白之潇洒。",
  },
  {
    icon: "行",
    title: "可履之修身",
    desc: "依画像呈具体可行之下手处，借你之反馈常校常准，不落玄谈。",
  },
];

const daoSteps = [
  { num: "一", title: "格物", desc: "先观免费命例与画像样例，不入而先观其妙" },
  { num: "二", title: "诚意", desc: "邮箱即名号，三十息立成" },
  { num: "三", title: "正心", desc: "初境起步，入境 · 大成 解全貌" },
  { num: "四", title: "修身", desc: "持续画像 + 自出解读篇章" },
];

const wuXingNames = ["木", "火", "土", "金", "水"];

const testimonials = [
  {
    quote:
      "昔曾试过不下十数算命之作，无一回头问过「此周过得如何」。此作会。",
    author: "互联网造物人 · 三十又二",
    initial: "造",
  },
  {
    quote:
      "画像流转之时间线，颇出我意料。原来半载前之我，与今时之我，竟似两人。",
    author: "始创者 · 二十又八",
    initial: "创",
  },
  {
    quote:
      "内子所订之大成套餐中一对一之解读，于吾家议决，确有裨益。",
    author: "心海引渡人 · 三十又五",
    initial: "心",
  },
];

const stats = [
  { num: "一二四八零", label: "已成之画像" },
  { num: "五千余", label: "古来人物原型" },
  { num: "九八·六%", label: "用户称许度" },
  { num: "三十息", label: "平均入门耗时" },
];

const faq = [
  {
    q: "不解命理，亦可观乎？",
    a: "可。所言皆以常语写就，不堆术语；要义首现处附短释。",
  },
  {
    q: "吾之数据，可供训练否？",
    a: "默认不供。生产环境下数据全程加密，不与第三方相见。若启 AI 训练，另开专窗征你允诺。",
  },
  {
    q: "入境与大成之别？",
    a: "入境开持续画像演进、PDF 导出、自出篇章。大成增一对一解读、API 接入、优先引渡。详见「进阶套餐」。",
  },
  {
    q: "退订之制？",
    a: "首次订阅七日之内未惬，全数奉还，不问所以。寻客官即可。",
  },
  {
    q: "支付之法？",
    a: "今仅 Mock 支付。生产则承微信、支付宝、Stripe（信用卡）。",
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
      ? "进阶套餐"
      : "归静观"
    : "结缘入道";

  return (
    <AppShell>
      <div className={styles.page}>
        {/* HERO · 太极主图 */}
        <section className={styles.daoHero}>
          <div className={styles.daoHeroSymbol}>
            <Taiji size={160} />
          </div>
          <h1 className={styles.daoHeroTitle}>
            <span className={styles.daoHeroTitleKicker}>知命 · 顺命 · 立命</span>
            <span className={styles.daoHeroTitleMain}>逆天·改命</span>
          </h1>
          <p className={styles.daoHeroSubtitle}>
            自降生之时、容貌之相、人生之变至性情之常，
            <br />
            渐次凝成汝专属之命理画像。
          </p>
          <p className={styles.daoHeroQuote}>
            「{classicQuotes[3]}」
          </p>
          <div className={styles.daoHeroCta}>
            <Link href={ctaHref} className="btn btn-primary btnLarge">
              {ctaLabel}
            </Link>
            <Link href="/pricing" className="btn btn-secondary btnLarge">
              进阶套餐
            </Link>
          </div>
          <div className={styles.daoHeroTrust}>
            <span>✓ 三十息立成</span>
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
              每步皆可随时驻足。下次归来，自会接续。
            </p>
          </div>
          <div className={styles.onboardingGrid}>
            <OnboardingStep
              step="一"
              title="本初资料"
              points={[
                "降生年月日时（不知者可勾选）",
                "降生之方（用于真太阳时校准）",
                "性别、字号",
              ]}
              icon="✎"
            />
            <OnboardingStep
              step="二"
              title="容颜采集"
              points={[
                "正面免冠相（用于面相初探）",
                "掌心之相（可选，用于掌纹初探）",
                "可手机直拍上传",
              ]}
              icon="◉"
            />
            <OnboardingStep
              step="三"
              title="初命解析"
              points={[
                "八字排盘（含真太阳时）",
                "五行旺衰与喜忌神",
                "性情倾向 · 风险偏好",
              ]}
              icon="✦"
            />
            <OnboardingStep
              step="四"
              title="校心问答"
              points={[
                "十至二十道抉择题（动态而出）",
                "每答五题触发一次画像重算",
                "可跳可回",
              ]}
              icon="？"
            />
            <OnboardingStep
              step="五"
              title="古贤同炉"
              points={[
                "前三名古来人物原型",
                "相似与差异之释",
                "古人平生对你之启",
              ]}
              icon="古"
            />
            <OnboardingStep
              step="六"
              title="立命之议"
              points={[
                "短 · 中 · 长三程",
                "具体可履之下手",
                "凭反馈而常校",
              ]}
              icon="上"
            />
          </div>
        </section>

        {/* VALUE · 道之三要 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>何以为异</span>
            <h2 className={styles.sectionTitle}>非一卦可尽</h2>
            <p className={styles.sectionSubtitle}>
              命理之病，多在「算毕再无归期」。吾重设全回环——
              令汝乐得周周归返，画像方能日日精进。
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
            <h2 className={styles.sectionTitle}>由识至行，全回环</h2>
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
            <h2 className={styles.sectionTitle}>真客云何</h2>
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
            <span className={styles.sectionEyebrow}>常问</span>
            <h2 className={styles.sectionTitle}>常见之惑</h2>
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
              三十息立成，邮箱即名号。初境亦能走通全主回环。
            </p>
            <div className={styles.daoHeroCta}>
              <Link href={ctaHref} className="btn btn-primary btnLarge">
                {ctaLabel}
              </Link>
              {!isAuthenticated && (
                <Link href="/login" className="btn btn-ghost btnLarge">
                  已有账号 · 归位
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
