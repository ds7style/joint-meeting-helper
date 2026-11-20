// Design Ref: §3.1 — 회의·명단 입력 화면 (/setup)
// Plan SC: 작업 3(회의·명단 입력 화면)
import type { Metadata } from "next";
import Link from "next/link";
import { SetupForm } from "@/components/SetupForm";

export const metadata: Metadata = {
  title: "합동회의 지정 도우미 · 입력",
};

export default function SetupPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="border-l-4 border-navy pl-3 text-xl font-bold text-navy">입력</h1>
        <Link
          href="/"
          className="rounded-lg border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-sky"
        >
          현황 화면
        </Link>
      </header>
      <SetupForm />
    </main>
  );
}
