export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "96px 24px"
      }}
    >
      <p style={{ color: "#c0a66a", letterSpacing: "0.12em", marginBottom: 12 }}>
        NTGM / Phase 0
      </p>
      <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", margin: "0 0 16px" }}>
        逆天改命算命软件
      </h1>
      <p style={{ maxWidth: 700, fontSize: 18, lineHeight: 1.8, color: "#d6d3cc" }}>
        当前仓库已进入工程初始化阶段。后续实现将围绕建档、持续问答、画像演进、
        历史人物匹配和改命建议闭环展开。
      </p>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 40
        }}
      >
        {[
          "Web 前端骨架",
          "移动端骨架",
          "FastAPI API",
          "Celery Worker"
        ].map((item) => (
          <div
            key={item}
            style={{
              border: "1px solid rgba(192, 166, 106, 0.25)",
              borderRadius: 16,
              padding: 20,
              background: "rgba(18, 24, 37, 0.6)"
            }}
          >
            {item}
          </div>
        ))}
      </section>
    </main>
  );
}

