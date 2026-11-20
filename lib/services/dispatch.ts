// Design Ref: §4.3 — 모의 발송 처리. 실제 알림톡은 보내지 않고 "보냈다"는 기록만 남긴다.
// Plan SC: 작업 5(1순위 모의 발송), 작업 7(불참 시 다음 사람 자동 모의 발송)
//          FR-02(1순위 한꺼번에), FR-03(불참 1건마다 1명씩), FR-04(야간 미루기),
//          FR-05(정원 충족 시 중단, 중복 발송 없음), FR-11(자동 기록)
// 나중에 실제 알림톡으로 바꿀 때는 sendDueMessages() 안의 "모의 발송" 부분만 고친다.
import { isQuotaFilled, neededCount, pickNext } from "@/lib/rules/quota";
import { nextSendTime } from "@/lib/rules/time";
import { addLog, getStore, replyPath } from "@/lib/store";
import type { Meeting } from "@/lib/types";

/**
 * 심판관에게 "보냈다"고 치는 모의 알림톡 문구. (Design Ref: §4.6)
 * 본문에는 짧은 링크 하나만 넣는다. 공개되는 곳이므로 기관 명칭 대신 "합동회의"만 쓴다.
 * 문구 전체는 저장하지 않는다. 기록에는 "알림톡 모의 발송" 같은 짧은 이벤트 이름만 남기고,
 * 현황 화면에서 이 함수로 그때그때 만들어 보여 준다.
 */
export function buildMockMessage(meeting: Pick<Meeting, "date">, token: string): string {
  return `${meeting.date} 합동회의 참석 여부를 회신해 주세요: ${replyPath(token)}`;
}

export interface DispatchResult {
  /** 이번에 새로 발송 예약한 사람 수 */
  scheduled: number;
  /** 정원이 차서 예약을 취소하고 대기로 되돌린 사람 수 */
  cancelled: number;
  /** 이번에 모의 발송한 사람 수 */
  sent: number;
}

/**
 * 정원이 찼으면(참석 수 ≥ 정원) 아직 나가지 않은 예약을 대기로 되돌린다.
 * 대기자는 그대로 두어서, 나중에 참석자가 불참으로 바뀌어도 다음 사람에게 다시 보낼 수 있다.
 */
export function cancelScheduledIfQuotaFilled(now: Date = new Date()): number {
  const { meeting, members } = getStore();
  if (!meeting || !isQuotaFilled(members, meeting.quota)) return 0;

  let count = 0;
  for (const member of members) {
    if (member.status !== "scheduled") continue;
    member.status = "waiting";
    member.scheduledAt = undefined;
    addLog(member.id, "정원 충족으로 예약 취소", now);
    count += 1;
  }
  return count;
}

/**
 * 모자란 인원만큼 다음 사람을 발송 예약한다. (순위 → 입력 순서)
 * 필요 인원 = 정원 - 참석 - 진행 중(예약 + 회신 대기). 그래서
 * - 처음 저장했을 때: 1순위가 정원 수만큼 한꺼번에 예약된다. (저장할 때 1순위 인원 = 정원을 확인한다.)
 * - 불참이 1건 생길 때마다: 다음 사람이 1명씩 예약된다. 불참이 여러 건 쌓였으면 그만큼 동시에 예약된다.
 * 이미 받은 사람은 대기 상태가 아니므로 다시 뽑히지 않는다. (중복 발송 방지)
 * 예약 시각은 지금이 밤 9시~아침 8시면 다음 아침 8시, 아니면 지금이다.
 */
export function scheduleNext(now: Date = new Date()): number {
  const { meeting, members } = getStore();
  if (!meeting) return 0;

  const needed = neededCount(members, meeting.quota);
  if (needed <= 0) return 0;

  const sendAt = nextSendTime(now).toISOString();
  const picked = pickNext(members, needed);
  for (const member of picked) {
    member.status = "scheduled";
    member.scheduledAt = sendAt;
    addLog(member.id, `발송 예약 (${member.rank}순위)`, now);
  }
  return picked.length;
}

/**
 * 예약 시각이 지난 사람을 모의 발송한다.
 * 기록하는 발송 시각(sentAt)은 처리한 시각이 아니라 예약 시각이다. 영업일 24시간도 여기서부터 센다.
 */
export function sendDueMessages(now: Date = new Date()): number {
  const { members } = getStore();
  let count = 0;
  for (const member of members) {
    if (member.status !== "scheduled" || !member.scheduledAt) continue;
    if (new Date(member.scheduledAt).getTime() > now.getTime()) continue; // 아직 시각이 안 됨
    // --- 모의 발송: 실제로 보내지 않고 상태와 기록만 바꾼다. ---
    member.status = "sent";
    member.sentAt = member.scheduledAt;
    addLog(member.id, "알림톡 모의 발송", new Date(member.scheduledAt));
    count += 1;
  }
  return count;
}

/**
 * 입력 저장, 회신, 불참 처리, 현황 화면을 열 때 실행하는 처리.
 * 1) 정원이 찼으면 나가지 않은 예약을 취소하고, 2) 모자라면 다음 사람을 예약하고, 3) 시각이 된 예약을 발송한다.
 * 정해진 시각에 저절로 도는 작업은 쓰지 않으므로, 밤에 미뤄진 예약은
 * 아침 8시 이후 이 처리가 다시 실행될 때 발송된다.
 */
export function processDispatch(now: Date = new Date()): DispatchResult {
  const cancelled = cancelScheduledIfQuotaFilled(now);
  const scheduled = scheduleNext(now);
  const sent = sendDueMessages(now);
  return { scheduled, cancelled, sent };
}
