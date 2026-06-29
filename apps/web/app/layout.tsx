import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";

export const metadata = {
  title: "逆天改命 · 知命顺命",
  description:
    "以道御术，以术证道。一阴一阳之谓道，持续交互演进画像之产品。",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 中文古风字体（楷书 · 宋体 · 草书） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700;900&family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&family=ZCOOL+QingKe+HuangYou&family=Long+Cang&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
