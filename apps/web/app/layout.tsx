import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "逆天改命算命软件",
  description: "持续交互演进的命理画像系统"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

