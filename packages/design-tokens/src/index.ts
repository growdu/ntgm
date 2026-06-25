// 逆天改命 设计 tokens
// 中央化所有颜色、间距、圆角、阴影、字体

export const colors = {
  // 背景层
  background: "#0d1016",
  surface: "#121825",
  surfaceHover: "#1a2235",
  card: "rgba(30, 35, 45, 0.8)",
  cardHover: "rgba(40, 48, 60, 0.9)",

  // 强调色（古金 + 古玉 + 朱砂）
  gold: "#c0a66a",
  goldLight: "#d4a856",
  goldDark: "#8a6629",
  jade: "#3d7a6e",
  jadeLight: "#5a9e8f",
  cinnabar: "#c94040",

  // 文字
  text: "#f3ead7",
  textMuted: "#d6d3cc",
  textDim: "#a8998a",
  textSubtle: "#6b5d52",

  // 边框
  border: "rgba(192, 166, 106, 0.15)",
  borderStrong: "rgba(192, 166, 106, 0.35)",

  // 状态
  success: "#5a9e8f",
  warning: "#d4a856",
  danger: "#c94040",

  // 透明遮罩
  overlay: "rgba(13, 16, 22, 0.85)",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
  xxxl: "64px",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "24px",
  pill: "999px",
} as const;

export const shadow = {
  sm: "0 2px 8px rgba(0, 0, 0, 0.3)",
  md: "0 8px 24px rgba(0, 0, 0, 0.4)",
  lg: "0 16px 48px rgba(0, 0, 0, 0.5)",
  glow: "0 0 24px rgba(192, 166, 106, 0.25)",
} as const;

export const font = {
  family: '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif',
  sizeXs: "12px",
  sizeSm: "14px",
  sizeMd: "16px",
  sizeLg: "20px",
  sizeXl: "28px",
  sizeXxl: "40px",
  sizeHero: "56px",
} as const;

// 营销页 plan 配色
export const planColors = {
  free: colors.textDim,
  pro: colors.gold,
  master: colors.jadeLight,
} as const;
