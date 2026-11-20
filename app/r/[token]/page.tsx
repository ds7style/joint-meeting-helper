// Design Ref: §3.3 — 심판관 회신 페이지 (/r/개인번호). 다른 사람의 이름·회신은 보여 주지 않는다.
// Plan SC: 작업 6(회신 페이지), FR-06, FR-07
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReplyButtons } from "@/components/ReplyButtons";
import { findMemberByToken, getStore } from "@/lib/store";

export const metadata: Metadata = {
  title: "합동회의 참석 여부 회신",
};

export default function ReplyPage(props: PageProps<"/r/[token]">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-8 sm:px-6">
      <h1 className="border-l-4 border-navy pl-3 text-xl font-bold text-navy">
        합동회의 참석 여부 회신
      </h1>
      {/* 요청 시점에 읽는 데이터(저장소)는 Suspense 안에서 그린다. */}
      <Suspense fallback={<p className="text-muted">불러오는 중...</p>}>
        <ReplyContent params={props.params} />
      </Suspense>
    </main>
  );
}

async function ReplyContent({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const member = findMemberByToken(token);
  const meeting = getStore().meeting;

  // 없는 번호이거나 아직 발송 전(대기·예약)인 링크
  if (!member || !meeting || member.status === "waiting" || member.status === "scheduled") {
    return (
      <p className="rounded-lg border border-line bg-white p-5 text-foreground shadow-sm">
        유효하지 않은 링크입니다.
      </p>
    );
  }

  // 담당자가 불참으로 처리한 경우: 본인이 회신한 것이 아니므로 "접수되었습니다"라고 하지 않는다.
  if (member.status === "decline" && member.answeredBy === "manager") {
    return (
      <p className="rounded-lg border border-line bg-white p-5 text-foreground shadow-sm">
        {member.name} 님은 담당자가 불참으로 처리했습니다. 바꾸려면 담당자에게 연락해 주세요.
      </p>
    );
  }

  // 이미 회신한 뒤에는 버튼을 숨기고 접수 안내만 보여 준다. (변경 불가)
  if (member.status === "attend" || member.status === "decline") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
        {member.name} 님의 회신이 접수되었습니다. ({member.status === "attend" ? "참석" : "불참"})
      </p>
    );
  }

  return (
    <div className="space-y-5 rounded-lg border border-line bg-white p-6 shadow-sm">
      <p className="text-lg leading-relaxed">
        {member.name} 님, {meeting.date} {meeting.title}에 참석 가능하십니까?
      </p>
      <ReplyButtons token={token} />
    </div>
  );
}
