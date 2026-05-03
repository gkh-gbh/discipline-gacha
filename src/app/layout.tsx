import type { Metadata } from "next";

import "./globals.css";
import { AppStateProvider } from "@/components/app-state-provider";
import { SiteFrame } from "@/components/site-frame";

export const metadata: Metadata = {
  title: "discipline-gacha",
  description: "现实任务抽卡系统的个人版 MVP 骨架",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppStateProvider>
          <SiteFrame>{children}</SiteFrame>
        </AppStateProvider>
      </body>
    </html>
  );
}
