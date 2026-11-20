// Design Ref: §3.2 — 담당자 현황 화면 본문 (집계, 정원 대비 확정 인원, 회신 링크)
// Plan SC: 작업 8(담당자 현황 화면), FR-08, 작업 9(미회신 표시), FR-09, 작업 10(불참 처리 버튼), FR-10, FR-13
import Link from "next/link";
import { connection } from "next/server";
import { markDecline } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { countMembers, isCandidatesExhausted, isQuotaFilled } from "@/lib/rules/quota";
import { formatKst, isOverdue } from "@/lib/rules/time";
import { buildMockMessage, processDispatch } from "@/lib/services/dispatch";
import { getStore, replyPath } from "@/lib/store";
import type { Member, MemberStatus } from "@/lib/types";

const STATUS_LABEL: Record<MemberStatus, string> = {
  waiting: "대기",
  scheduled: "발송 예약",
  sent: "회신 대기",
  attend: "참석",
  decline: "불참",
};

// 디자인: 상태별 알약(pill) 색. 글자 내용은 그대로이고 색만 다르다.
const STATUS_STYLE: Record<MemberStatus, string> = {
  waiting: "bg-zinc-100 text-zinc-600",
  scheduled: "bg-amber-100 text-amber-800",
  sent: "bg-sky text-navy",
  attend: "bg-navy text-white",
  decline: "bg-zinc-200 text-zinc-700",
};

export async function StatusBoard() {
  // 요청할 때마다 달라지는 값(현재 시각, 저장소)을 읽으므로 요청 시점으로 미룬다.
  await connection();
  // 화면을 열 때 "발송할 때가 된 예약"(밤에 미뤄진 발송)을 처리한다. (Design Ref: §4.3)
  const now = new Date();
  processDispatch(now);

  const { meeting, members } = getStore();
  if (!meeting) {
    return (
      <section className="space-y-4 rounded-lg border border-line bg-white p-6 shadow-sm">
        <p>등록된 회의가 없습니다. 먼저 회의와 명단을 입력해 주세요.</p>
        <Link
          href="/setup"
          className="inline-block rounded-lg bg-navy px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-navy-deep"
        >
          입력 화면으로 가기
        </Link>
      </section>
    );
  }

  const counts = countMembers(members);
  const sorted = [...members].sort((a, b) => a.rank - b.rank || a.order - b.order);
  const filled = isQuotaFilled(members, meeting.quota);
  // 무회신(회신 대기) 중 영업일 24시간을 넘긴 사람이 미회신이다. 저장하지 않고 화면을 그릴 때마다 계산한다.
  const overdueCount = members.filter((member) => isOverdueMember(member, now)).length;

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-line border-t-4 border-t-navy bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-steel">
          {meeting.title} {meeting.date} · 정원 {meeting.quota}명
        </p>
        <p className="mt-1 text-3xl font-bold text-navy">
          확정(참석) {counts.attend} / {meeting.quota}
        </p>
        <p className="mt-2 text-sm text-muted">
          발송 {counts.dispatched} · 참석 {counts.attend} · 불참 {counts.decline} · 무회신{" "}
          {counts.sent}
          {counts.scheduled > 0 && <span> · 발송 예약 {counts.scheduled}</span>}
          {overdueCount > 0 && (
            <span className="ml-2 font-semibold text-red-700">⚠ 미회신 {overdueCount}</span>
          )}
        </p>
        {filled && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-emerald-900">
            정원이 찼습니다. 남은 발송은 중단됩니다.
          </p>
        )}
        {counts.attend > meeting.quota && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900">
            정원 초과: 참석 인원이 정원을 넘었습니다. 담당자가 조정해 주세요.
          </p>
        )}
        {isCandidatesExhausted(members, meeting.quota) && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-red-800">
            후보 소진: 대기 중인 후보가 없는데 정원이 모자랍니다.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
        <table className="w-full whitespace-nowrap text-left text-[13px]">
          <thead className="bg-sky text-navy-deep">
            <tr>
              <th className="px-2 py-3 font-semibold">이름</th>
              <th className="px-2 py-3 font-semibold">순위</th>
              <th className="px-2 py-3 font-semibold">상태</th>
              <th className="px-2 py-3 font-semibold">발송 시각</th>
              <th className="px-2 py-3 font-semibold">회신 시각</th>
              <th className="px-2 py-3 font-semibold">회신 링크</th>
              <th className="px-2 py-3 font-semibold">조치</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                message={buildMockMessage(meeting, member.token)}
                quotaFilled={filled}
                overdue={isOverdueMember(member, now)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        실제 알림톡은 가지 않는 모의 발송입니다. 발송된 심판관은 회신 링크를 열어 회신을 시험할 수
        있습니다.
      </p>
    </section>
  );
}

/** 회신 대기 중이고, 발송 후 영업일 기준 24시간이 지났는지. */
function isOverdueMember(member: Member, now: Date): boolean {
  return member.status === "sent" && !!member.sentAt && isOverdue(member.sentAt, now);
}

function MemberRow({
  member,
  message,
  quotaFilled,
  overdue,
}: {
  member: Member;
  /** 이 심판관에게 간 것으로 치는 모의 알림톡 문구 (링크에 마우스를 올리면 보인다) */
  message: string;
  quotaFilled: boolean;
  overdue: boolean;
}) {
  // 발송 전(대기·예약)에는 회신 링크가 아직 유효하지 않다.
  const hasLink = member.status === "sent" || member.status === "attend" || member.status === "decline";
  // 회신 대기(미회신 포함)이거나 참석한 사람만 담당자가 불참으로 처리할 수 있다. (서버도 같은 조건)
  const canDecline = member.status === "sent" || member.status === "attend";
  // 정원이 찬 뒤의 "발송 안 함"은 저장하지 않고 화면에서만 그렇게 보여 준다. (Design Ref: §4.1)
  const label =
    member.status === "waiting" && quotaFilled ? "발송 안 함 (정원 충족)" : STATUS_LABEL[member.status];

  return (
    <tr className="border-t border-line/70 hover:bg-sky/40">
      <td className="px-2 py-2.5 font-medium">{member.name}</td>
      <td className="px-2 py-2.5">{member.rank}순위</td>
      <td className="px-2 py-2.5">
        {overdue ? (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            ⚠ 미회신
          </span>
        ) : (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[member.status]}`}
          >
            {label}
          </span>
        )}
        {member.status === "scheduled" && (
          <span className="ml-1 text-xs text-muted">({formatKst(member.scheduledAt)} 발송)</span>
        )}
        {member.answeredBy === "manager" && (
          <span className="ml-1 text-xs text-muted">(담당자 처리)</span>
        )}
      </td>
      <td className="px-2 py-2.5">{formatKst(member.sentAt)}</td>
      <td className="px-2 py-2.5">{formatKst(member.answeredAt)}</td>
      <td className="px-2 py-2.5">
        {hasLink ? (
          <a
            href={replyPath(member.token)}
            target="_blank"
            rel="noreferrer"
            title={`모의 알림톡 문구: ${message}`}
            className="font-medium text-navy underline underline-offset-2 hover:text-teal"
          >
            링크 열기
          </a>
        ) : (
          "-"
        )}
      </td>
      <td className="px-2 py-2.5">
        {canDecline && (
          <form action={markDecline}>
            <input type="hidden" name="memberId" value={member.id} />
            <ConfirmSubmitButton
              message={`${member.name} 님을 불참으로 처리할까요?\n되돌릴 수 없고, 정원이 모자라면 다음 사람에게 바로 발송됩니다.`}
              className="rounded-md border border-red-500 px-2.5 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              불참 처리
            </ConfirmSubmitButton>
          </form>
        )}
      </td>
    </tr>
  );
}
