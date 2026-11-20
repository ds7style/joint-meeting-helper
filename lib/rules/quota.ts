// Design Ref: §4.3 — 정원 규칙: 필요 인원 계산, 다음 사람 고르기
// Plan SC: 작업 2(규칙 모으기), FR-03(불참 1건마다 1명씩), FR-05(정원 충족·중복 방지)
import type { Member, MemberStatus } from "@/lib/types";

export interface Counts extends Record<MemberStatus, number> {
  /** 한 번이라도 발송된 사람 (회신 대기·참석·불참) */
  dispatched: number;
}

/** 상태별 인원을 센다. */
export function countMembers(members: Member[]): Counts {
  const counts: Counts = {
    waiting: 0,
    scheduled: 0,
    sent: 0,
    attend: 0,
    decline: 0,
    dispatched: 0,
  };
  for (const member of members) {
    counts[member.status] += 1;
    if (member.sentAt) counts.dispatched += 1;
  }
  return counts;
}

/** 참석 수가 정원 이상인지. 이때는 더 보내지 않는다. */
export function isQuotaFilled(members: Member[], quota: number): boolean {
  return countMembers(members).attend >= quota;
}

/**
 * 필요 인원 = 정원 - 참석 - 진행 중(예약 + 회신 대기).
 * 0 이하이면 지금은 더 보낼 필요가 없다. 회신 대기 중인 사람이 불참하면 다시 1 이상이 된다.
 */
export function neededCount(members: Member[], quota: number): number {
  const counts = countMembers(members);
  return quota - counts.attend - counts.scheduled - counts.sent;
}

/**
 * 순위 → 입력 순서대로 대기(waiting) 중인 사람을 n명 고른다.
 * 이미 받은 사람은 대기 상태가 아니므로 자동으로 빠진다. (중복 발송 방지)
 */
export function pickNext(members: Member[], n: number): Member[] {
  return members
    .filter((member) => member.status === "waiting")
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, Math.max(0, n));
}

/** 후보(대기)가 더 없는데 필요 인원이 남았는지. "후보 소진, 정원 미달" 경고에 쓴다. */
export function isCandidatesExhausted(members: Member[], quota: number): boolean {
  return neededCount(members, quota) > 0 && countMembers(members).waiting === 0;
}
