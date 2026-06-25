import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";

export const metadata = {
  title: "逆天改命算命软件",
  description: "持续交互演进的命理画像系统 · 你的命，不止能算，还能被持续校正",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
