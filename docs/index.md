---
hide:
  - navigation
  - toc
---

<style>
.hero {
  text-align: center;
  padding: 72px 24px 40px;
  position: relative;
  overflow: hidden;
}

.hero-symbol {
  font-size: 56px;
  margin-bottom: 24px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
}

.hero h1 {
  font-size: 3.2rem;
  font-weight: 700;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #5e35b1 0%, #00897b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-tagline {
  font-size: 1.2rem;
  color: var(--md-default-fg-color--light);
  max-width: 640px;
  margin: 0 auto 40px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.hero-cta {
  padding: 12px 28px;
  border-radius: 999px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.hero-cta-primary {
  background: #5e35b1;
  color: white;
}

.hero-cta-primary:hover {
  background: #4527a0;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(94,53,177,0.3);
}

.hero-cta-secondary {
  background: transparent;
  color: #5e35b1;
  border: 1px solid #5e35b1;
}

.hero-cta-secondary:hover {
  background: rgba(94,53,177,0.08);
  transform: translateY(-2px);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  padding: 48px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  padding: 28px;
  border-radius: 16px;
  background: var(--md-default-bg-color);
  border: 1px solid var(--md-default-fg-color--lightest);
  text-decoration: none !important;
  color: inherit !important;
  transition: all 0.2s;
}

.card:hover {
  transform: translateY(-3px);
  border-color: #5e35b1;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.card-icon {
  font-size: 2.4rem;
  margin-bottom: 16px;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--md-default-fg-color);
}

.card-desc {
  font-size: 0.92rem;
  color: var(--md-default-fg-color--light);
  line-height: 1.55;
}

.principles {
  max-width: 960px;
  margin: 64px auto;
  padding: 40px 32px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(94,53,177,0.05) 0%, rgba(0,137,123,0.05) 100%);
  border: 1px solid rgba(94,53,177,0.15);
}

.principles-title {
  text-align: center;
  font-size: 1.6rem;
  margin-bottom: 32px;
  color: var(--md-default-fg-color);
}

.principles-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.principle-item {
  text-align: center;
}

.principle-yin {
  font-size: 1.8rem;
  color: #1a237e;
  font-weight: 600;
}

.principle-yang {
  font-size: 1.8rem;
  color: #b71c1c;
  font-weight: 600;
}

.principle-desc {
  font-size: 0.9rem;
  color: var(--md-default-fg-color--light);
  margin-top: 8px;
}

.flow {
  max-width: 960px;
  margin: 64px auto;
  padding: 0 24px;
}

.flow-title {
  text-align: center;
  font-size: 1.6rem;
  margin-bottom: 32px;
}

.flow-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.flow-step {
  padding: 12px 20px;
  border-radius: 12px;
  background: var(--md-default-bg-color);
  border: 1px solid var(--md-default-fg-color--lightest);
  font-size: 0.95rem;
}

.flow-step-num {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #5e35b1;
  color: white;
  font-size: 0.85rem;
  text-align: center;
  line-height: 22px;
  margin-right: 8px;
}

.flow-arrow {
  color: var(--md-default-fg-color--light);
}

footer {
  text-align: center;
  padding: 32px;
  color: var(--md-default-fg-color--light);
  font-size: 0.9rem;
}
</style>

<div class="hero">
  <div class="hero-symbol">☯</div>
  <h1>逆天改命</h1>
  <p class="hero-tagline">
    持续交互演进画像的命理产品<br>
    一命二运三风水，四积阴德五读书
  </p>
  <div class="hero-actions">
    <a href="user-guide/" class="hero-cta hero-cta-primary">快速上手</a>
    <a href="https://github.com/growdu/ntgm" class="hero-cta hero-cta-secondary" target="_blank">GitHub →</a>
  </div>
</div>

<div class="cards">

<a href="product/" class="card">
  <div class="card-icon">📜</div>
  <div class="card-title">产品需求</div>
  <div class="card-desc">产品定位、用户画像、核心闭环、Phase 划分</div>
</a>

<a href="overview-design/" class="card">
  <div class="card-icon">🜲</div>
  <div class="card-title">概要设计</div>
  <div class="card-desc">架构图、数据流、与外部系统的边界</div>
</a>

<a href="detailed-design/" class="card">
  <div class="card-icon">⚙</div>
  <div class="card-title">详细设计</div>
  <div class="card-desc">模块拆分、算法细节、接口契约</div>
</a>

<a href="api/" class="card">
  <div class="card-icon">⚡</div>
  <div class="card-title">API 参考</div>
  <div class="card-desc">REST 端点、OpenAPI 定义、SDK 用法</div>
</a>

<a href="deployment/" class="card">
  <div class="card-icon">🚀</div>
  <div class="card-title">部署指南</div>
  <div class="card-desc">Docker Compose、生产环境、CI/CD</div>
</a>

<a href="operations/" class="card">
  <div class="card-icon">🛡</div>
  <div class="card-title">运维手册</div>
  <div class="card-desc">监控、备份、应急响应、故障排查</div>
</a>

</div>

<div class="principles">
  <div class="principles-title">☯ 设计哲学：阴阳调和</div>
  <div class="principles-list">
    <div class="principle-item">
      <div class="principle-yin">一阴一阳</div>
      <div class="principle-desc">命理与数据并重，可信与玄学并存</div>
    </div>
    <div class="principle-item">
      <div class="principle-yang">易穷则变</div>
      <div class="principle-desc">画像随事件持续演进，不固化</div>
    </div>
    <div class="principle-item">
      <div class="principle-yin">极简返真</div>
      <div class="principle-desc">界面以少胜多，文言白话两相宜</div>
    </div>
    <div class="principle-item">
      <div class="principle-yang">和而不同</div>
      <div class="principle-desc">尊重多元命理流派，反对迷信执念</div>
    </div>
  </div>
</div>

<div class="flow">
  <div class="flow-title">⟳ 闭环流程：画像持续演进</div>
  <div class="flow-steps">
    <div class="flow-step"><span class="flow-step-num">1</span>基础资料</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step"><span class="flow-step-num">2</span>生成画像</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step"><span class="flow-step-num">3</span>匹配原形</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step"><span class="flow-step-num">4</span>输出建议</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step"><span class="flow-step-num">5</span>接收反馈</div>
    <span class="flow-arrow">→</span>
    <div class="flow-step"><span class="flow-step-num">6</span>沉淀档案</div>
  </div>
</div>

<footer>
  以道御术 · 以术证道 · 道术合一<br>
  Powered by MkDocs Material · 托管于 GitHub Pages
</footer>
