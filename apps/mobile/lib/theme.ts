// 移动端主题（与 web design-tokens 对齐）
export const colors = {
  background: "#0d1016",
  surface: "#121825",
  card: "rgba(30, 35, 45, 0.9)",
  cardSolid: "#1e232d",
  gold: "#c0a66a",
  goldLight: "#d4a856",
  goldDark: "#8a6629",
  jade: "#3d7a6e",
  jadeLight: "#5a9e8f",
  cinnabar: "#c94040",
  text: "#f3ead7",
  textMuted: "#d6d3cc",
  textDim: "#a8998a",
  textSubtle: "#6b5d52",
  border: "rgba(192, 166, 106, 0.25)",
  borderStrong: "rgba(192, 166, 106, 0.5)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
