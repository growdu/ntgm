/**
 * 通用道家符号与装饰元素
 * 处处体现太极、阴阳、五行
 */

export function Taiji({
  size = 64,
  className = "",
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <span className={`taiji-symbol ${className}`} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 阳鱼（黑）右半 */}
        <path
          d="M 100 10
             A 90 90 0 0 1 100 190
             A 45 45 0 0 1 100 100
             A 45 45 0 0 0 100 10
             Z"
          fill="#0d1016"
        />
        {/* 阴鱼（白）左半 */}
        <path
          d="M 100 10
             A 90 90 0 0 0 100 190
             A 45 45 0 0 0 100 100
             A 45 45 0 0 1 100 10
             Z"
          fill="#f3ead7"
        />
        {/* 阳极 */}
        <circle cx="100" cy="55" r="10" fill="#f3ead7" />
        {/* 阴极 */}
        <circle cx="100" cy="145" r="10" fill="#0d1016" />
      </svg>
    </span>
  );
}

export function YinYang({
  size = 24,
  className = "",
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 0 1 0-16 4 4 0 0 0 0 8 4 4 0 0 0 0 8z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Bagua({ className = "" }: { className?: string }) {
  // 简化的八卦外圈符号
  return (
    <span className={className} aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.35"
        >
          <circle cx="100" cy="100" r="92" />
          <circle cx="100" cy="100" r="72" />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * Math.PI) / 4;
            const x1 = 100 + 72 * Math.cos(angle);
            const y1 = 100 + 72 * Math.sin(angle);
            const x2 = 100 + 92 * Math.cos(angle);
            const y2 = 100 + 92 * Math.sin(angle);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
            );
          })}
        </g>
      </svg>
    </span>
  );
}

export function WuXing({
  size = 32,
  className = "",
}: {
  size?: number | string;
  className?: string;
}) {
  // 五行相生图示
  const wuxing = [
    { name: "木", color: "#4a7c74" },
    { name: "火", color: "#b73e3a" },
    { name: "土", color: "#b6883d" },
    { name: "金", color: "#c4a55a" },
    { name: "水", color: "#2c2826" },
  ];
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ display: "inline-flex", gap: 4 }}
    >
      {wuxing.map((wx) => (
        <span
          key={wx.name}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: wx.color,
            color: "#faf6ee",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Number(size) * 0.45,
            fontWeight: 500,
            fontFamily: "var(--font-kai)",
          }}
        >
          {wx.name}
        </span>
      ))}
    </span>
  );
}

export function VerticalTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`vertical-rl ${className}`}>{children}</span>
  );
}
