"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "./components/Navigation";
import { useAuth } from "../lib/auth";
import styles from "./page.module.css";

const valueProps = [
  {
    icon: "☯",
    title: "持续演进的画像",
    desc: "不是一次性算命报告。系统会随着你提交的经历、问答、事件，不断修正你的命运画像。",
  },
  {
    icon: "⚔",
    title: "匹配历史人物原型",
    desc: "把你放到 5000 年历史坐标系里：你更像曾国藩的稳健、还是李白的浪漫，一目了然。",
  },
  {
    icon: "✦",
    title: "可执行的改命建议",
    desc: "结合画像给具体可操作的下一步，并通过你的反馈持续校准，而不是泛泛而谈的鸡汤。",
  },
];

const flowSteps = [
  { num: 1, title: "了解", desc: "免费看产品，浏览真实命例与画像样例" },
  { num: 2, title: "注册 & 登录", desc: "邮箱即注册，30 秒完成" },
  { num: 3, title: "选择套餐", desc: "免费起步，Pro / Master 解锁完整能力" },
  { num: 4, title: "建档 & 创作", desc: "持续画像 + 发布你的解读文章" },
];

const onboardingDetails = [
  {
    step: "01",
    title: "基础资料",
    points: [
      "出生年月日时（不确定可勾选）",
      "出生地点（用于真太阳时修正）",
      "性别、昵称",
    ],
    icon: "✎",
  },
  {
    step: "02",
    title: "照片采集",
    points: [
      "正面免冠照（用于面部特征分析）",
      "手掌照片（可选，用于掌纹初探）",
      "支持手机直接拍照上传",
    ],
    icon: "◉",
  },
  {
    step: "03",
    title: "初始分析",
    points: [
      "八字排盘（含真太阳时）",
      "五行旺衰 + 喜忌神",
      "性格倾向 + 风险偏好",
    ],
    icon: "✦",
  },
  {
    step: "04",
    title: "校准问答",
    points: [
      "10-20 道选择题（动态出题）",
      "每答 5 题触发一次画像重算",
      "支持跳过和重置",
    ],
    icon: "?",
  },
  {
    step: "05",
    title: "历史人物匹配",
    points: ["Top 3 人物原型", "相似点 + 差异点解释", "人物生平事件对你的启示"],
    icon: "⚔",
  },
  {
    step: "06",
    title: "改命建议",
    points: [
      "短期 / 中期 / 长期 三档",
      "具体可执行的下一步",
      "支持反馈 → 持续校准",
    ],
    icon: "↑",
  },
];

const testimonials = [
  {
    quote:
      "以前测过不下 10 款算命 App，没有一个会回头问我『你这周过得怎么样』。这个会。",
    author: "互联网产品经理 · 32 岁",
    initial: "产",
  },
  {
    quote:
      "画像变化那一条 timeline 让我挺意外的，原来我半年前和现在的『我』是两个人。",
    author: "创业者 · 28 岁",
    initial: "创",
  },
  {
    quote: "我老公的 master 套餐里那个 1V1 解读，对我们做家庭决策真的有用。",
    author: "心理咨询师 · 35 岁",
    initial: "心",
  },
];

const stats = [
  { num: "12,480+", label: "已生成画像" },
  { num: "5,000+", label: "历史人物原型" },
  { num: "98.6%", label: "用户满意度" },
  { num: "30s", label: "平均注册时间" },
];

const faq = [
  {
    q: "我不懂命理能看懂吗？",
    a: "能。所有输出都用人话写，不堆砌术语，关键概念第一次出现时会有简释。",
  },
  {
    q: "我的数据会被用来训练吗？",
    a: "默认不会。生产环境下数据全程加密、不可见第三方。如启用 AI 训练，会单独弹窗征求你的同意。",
  },
  {
    q: "Pro 和 Master 的差别是什么？",
    a: "Pro 解锁持续画像演进、PDF 导出、创作。Master 增加 1V1 解读、API 接入、优先客服。详见 /pricing。",
  },
  {
    q: "退款政策？",
    a: "首次订阅 7 天内不满意，全额退款，无任何理由。联系客服即可。",
  },
  {
    q: "支持哪些支付方式？",
    a: "演示项目仅 Mock 支付。生产支持微信、支付宝、Stripe（信用卡）。",
  },
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
        {/* HERO */}
        <section className={styles.marketingHero}>
          <h1 className={styles.marketingHeroTitle}>
            你的命，不止能算
            <br />
            还能被持续校正
          </h1>
          <p className={styles.marketingHeroSubtitle}>
            从出生信息、照片、人生事件到性格模式，逐步形成你专属的命运画像。
            我们用历史人物匹配 + 改命建议，让命理从一次性消费变成持续陪伴。
          </p>
          <div className={styles.marketingHeroCta}>
            <Link href={ctaHref} className="btn btn-primary btnLarge">
              {ctaLabel}
            </Link>
            <Link href="/pricing" className="btn btn-secondary btnLarge">
              查看套餐
            </Link>
          </div>
          <div className={styles.marketingTrust}>
            <span>✓ 30 秒注册</span>
            <span>✓ 不满意 7 天退款</span>
            <span>✓ 数据全程加密</span>
          </div>
        </section>

        {/* STATS */}
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

        {/* VIDEO DEMO */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>3 分钟看完</span>
            <h2 className={styles.sectionTitle}>看一遍，你就能上手</h2>
            <p className={styles.sectionSubtitle}>
              从建档到出报告，3 分钟看完完整主流程。
            </p>
          </div>
          <VideoDemo />
        </section>

        {/* ONBOARDING STEPS DETAIL */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>建档流程</span>
            <h2 className={styles.sectionTitle}>6 步走完你的第一份画像</h2>
            <p className={styles.sectionSubtitle}>
              每一步都可以随时暂停。下次回来时，自动接着走。
            </p>
          </div>
          <div className={styles.onboardingGrid}>
            {onboardingDetails.map((o) => (
              <div key={o.step} className={styles.onboardingCard}>
                <div className={styles.onboardingStep}>
                  <span className={styles.onboardingStepNum}>{o.step}</span>
                  <span className={styles.onboardingStepIcon}>{o.icon}</span>
                </div>
                <h3 className={styles.onboardingTitle}>{o.title}</h3>
                <ul className={styles.onboardingPoints}>
                  {o.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* VALUE */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>为什么不同</span>
            <h2 className={styles.sectionTitle}>不是算一卦就完事</h2>
            <p className={styles.sectionSubtitle}>
              命理产品最大的问题是「算完就再没回来」。我们重新设计了整个回路——
              让你愿意每周回来，画像才能越来越准。
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

        {/* FLOW */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>4 步开始</span>
            <h2 className={styles.sectionTitle}>从了解到创作，全闭环</h2>
            <p className={styles.sectionSubtitle}>
              走完下面四步，你就是资深用户了。
            </p>
          </div>
          <div className={styles.flowSteps}>
            {flowSteps.map((s) => (
              <div key={s.num} className={styles.flowStep}>
                <div className={styles.flowStepNumber}>{s.num}</div>
                <div className={styles.flowStepTitle}>{s.title}</div>
                <div className={styles.flowStepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>用户证言</span>
            <h2 className={styles.sectionTitle}>真实用户怎么说</h2>
          </div>
          <div className={styles.testimonialGrid}>
            {testimonials.map((t, i) => (
              <div key={i} className={styles.testimonial}>
                <p className={styles.testimonialQuote}>"{t.quote}"</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{t.initial}</div>
                  <span>{t.author}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>FAQ</span>
            <h2 className={styles.sectionTitle}>常见问题</h2>
          </div>
          <div className={styles.faqList}>
            {faq.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.section}>
          <div className={styles.finalCta}>
            <h2 className={styles.sectionTitle}>你的命运画像，从今天开始</h2>
            <p className={styles.sectionSubtitle} style={{ marginBottom: 24 }}>
              30 秒注册，邮箱即账号。免费版也能跑通完整主流程。
            </p>
            <div className={styles.marketingHeroCta}>
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

// ============================================
// 视频 demo mock 播放器
// ============================================
function VideoDemo() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // 模拟进度条
  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    setProgress(0);
    const start = Date.now();
    const dur = 180_000; // 3 分钟
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / dur) * 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };
    requestAnimationFrame(tick);
  }

  return (
    <div className={styles.videoWrap}>
      <div className={styles.videoFrame}>
        <div className={styles.videoInner}>
          {!playing ? (
            <button
              className={styles.playButton}
              onClick={togglePlay}
              aria-label="播放演示视频"
            >
              <span className={styles.playTriangle} />
              <span className={styles.playHint}>点击播放 · 3 分钟</span>
            </button>
          ) : (
            <div className={styles.videoPlaying}>
              <div className={styles.videoScene}>
                <SceneTrack progress={progress} />
              </div>
            </div>
          )}
        </div>
        <div className={styles.videoBar}>
          <div
            className={styles.videoProgress}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.videoMeta}>
          <span>{formatTime(progress * 180)} / 03:00</span>
          <span>逆天改命 · 产品演示</span>
        </div>
      </div>
    </div>
  );
}

function SceneTrack({ progress }: { progress: number }) {
  let scene = 0;
  if (progress < 16) scene = 0;
  else if (progress < 33) scene = 1;
  else if (progress < 50) scene = 2;
  else if (progress < 66) scene = 3;
  else if (progress < 83) scene = 4;
  else scene = 5;

  const scenes = [
    "▶ 场景 1：基础建档 — 输入出生信息",
    "▶ 场景 2：照片采集 — 拍照上传",
    "▶ 场景 3：八字分析 — 命盘生成",
    "▶ 场景 4：校准问答 — 10 道题出画像 V1",
    "▶ 场景 5：历史人物匹配 — 你的 5000 年坐标系",
    "▶ 场景 6：改命建议 — 短期 / 中期 / 长期",
  ];
  return (
    <div className={styles.sceneTrack}>
      {scenes.map((s, i) => (
        <div
          key={s}
          className={`${styles.sceneItem} ${i === scene ? styles.sceneActive : ""}`}
        >
          {s}
        </div>
      ))}
    </div>
  );
}

function formatTime(sec: number): string {
  const s = Math.floor(sec);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button
        className={styles.faqTrigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className={styles.faqIcon}>{open ? "−" : "+"}</span>
      </button>
      {open && <div className={styles.faqAnswer}>{a}</div>}
    </div>
  );
}
