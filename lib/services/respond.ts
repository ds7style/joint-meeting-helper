// Design Ref: §4.4 변경 제한, §4.5 submitReply — 심판관 회신 처리
// Plan SC: 작업 6(회신 페이지), FR-06(개인용 링크로 회신), FR-07(불참 뒤 참석 변경 막기), FR-11(자동 기록)
// Plan SC: 작업 10(담당자가 미회신자·참석자를 불참으로 처리), FR-10, FR-13
import { processDispatch } from "@/lib/services/dispatch";
import { addLog, findMemberByToken, getStore } from "@/lib/store";

export type Answer = "attend" | "decline";

export interface ReplyResult {
  ok: boolean;
  message: string;
}

/**
 * 심판관이 개인용 링크에서 참석·불참을 눌렀을 때의 처리.
 * - 없는 번호이거나 아직 발송 전(대기·예약)이면 유효하지 않은 링크다.
 * - 회신은 한 번만 할 수 있다. 불참 뒤에 참석으로 바꿀 수 없고,
 *   참석 뒤에 앱에서 불참으로 바꿀 수도 없다. (참석 → 불참은 담당자가 처리한다.)
 */
export function submitReply(token: string, answer: Answer, now: Date = new Date()): ReplyResult {
  const member = findMemberByToken(token);
  if (!member || member.status === "waiting" || member.status === "scheduled") {
    return { ok: false, message: "유효하지 않은 링크입니다." };
  }
  if (member.status === "attend" || member.status === "decline") {
    return { ok: false, message: "이미 회신하셨습니다." };
  }

  // 회신 대기(sent) 상태일 때만 기록한다.
  member.status = answer;
  member.answeredAt = now.toISOString();
  member.answeredBy = "member";
  addLog(member.id, answer === "attend" ? "참석 회신" : "불참 회신", now);

  processDispatch(now); // 처리 실행: 불참이면 모자란 만큼 다음 사람에게 자동 발송된다.
  return { ok: true, message: "회신이 접수되었습니다." };
}

/**
 * 담당자가 현황 화면에서 불참으로 처리한 경우. (Design Ref: §4.5 markDecline)
 * - 회신 대기(미회신 포함) 중인 사람: 담당자가 다음 사람에게 넘기기로 한 경우다.
 * - 참석한 사람: 심판관이 담당자에게 직접 연락해 불참을 알려 온 경우다. (앱에서는 참석 → 불참을 바꿀 수 없다.)
 * 처리하면 정원이 모자라므로 대기자에게 다음 발송이 이어진다. 정원이 찬 뒤에 고쳐도 마찬가지다.
 */
export function markDecline(memberId: string, now: Date = new Date()): ReplyResult {
  const member = getStore().members.find((candidate) => candidate.id === memberId);
  if (!member || (member.status !== "sent" && member.status !== "attend")) {
    return { ok: false, message: "불참 처리할 수 없는 상태입니다." };
  }

  member.status = "decline";
  member.answeredAt = now.toISOString();
  member.answeredBy = "manager";
  addLog(member.id, "담당자가 불참으로 처리", now);

  processDispatch(now);
  return { ok: true, message: "불참으로 처리했습니다." };
}
