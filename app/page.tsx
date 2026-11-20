// Design Ref: §3.2 — 담당자 현황 화면 (/)
// Plan SC: 작업 8(담당자 현황 화면)
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBoard } from "@/components/StatusBoard";

export const metadata: Metadata = {
  title: "합동회의 지정 도우미 · 현황",
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="border-l-4 border-navy pl-3 text-xl font-bold text-navy">현황</h1>
        <Link
          href="/setup"
          className="rounded-lg border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-sky"
        >
          입력 화면
        </Link>
      </header>
      {/* 요청 시점에 읽는 데이터(저장소, 현재 시각)는 Suspense 안에서 그린다. */}
      <Suspense fallback={<p className="text-muted">불러오는 중...</p>}>
        <StatusBoard />
      </Suspense>
    </main>
  );
}
