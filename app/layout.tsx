import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "합동회의 지정 도우미",
  description: "합동회의 비상임심판관 지정을 순위대로 연락하고 회신을 모아 주는 도우미",
  // CHECK.md 1순위: 검색엔진이 이 사이트를 색인하거나 링크를 따라가지 않게 한다.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 디자인: 맨 위 안내 줄 + 남색 머리글. 모든 화면(담당자·심판관)에 공통으로 보인다. */}
        <div className="bg-sky text-navy-deep">
          <p className="mx-auto w-full max-w-5xl px-4 py-1.5 sm:px-6 text-xs">
            모의 발송 시험 화면입니다. 실제 알림톡은 가지 않습니다.
          </p>
        </div>
        <header className="bg-gradient-to-b from-navy-deep via-navy to-steel text-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6">
            <p className="text-sm text-sky/80">비상임심판관 지정</p>
            <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">합동회의 지정 도우미</p>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
