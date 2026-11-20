// Design Ref: §4.4 — 시간 규칙: 한국 시간, 야간 미루기, 영업일 24시간
// Plan SC: 작업 2(규칙 모으기), FR-04(야간 미루기), FR-09(영업일 24시간 미회신)
// 서버가 어느 나라 시간대로 돌든 한국 시간(UTC+9, 서머타임 없음)으로 계산한다.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const KST_OFFSET_MS = 9 * HOUR;

/** 밤 9시부터 아침 8시까지는 발송하지 않는다. */
export const NIGHT_START_HOUR = 21;
export const NIGHT_END_HOUR = 8;

/**
 * 영업일 계산에서 빼는 공휴일 (YYYY-MM-DD).
 * 예시일 뿐이므로 실제 일정에 맞게 담당자가 확인해 채운다.
 */
export const HOLIDAYS: ReadonlySet<string> = new Set(["2026-12-25", "2027-01-01"]);

// 이 값의 getUTC* 값이 곧 한국 시간의 연·월·일·시이다.
function toKst(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(kst: Date): string {
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}

function isBusinessDay(kst: Date): boolean {
  const dayOfWeek = kst.getUTCDay(); // 0=일, 6=토
  return dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.has(dateKey(kst));
}

/** 야간(밤 9시~아침 8시)이면 다음 아침 8시를, 아니면 지금 시각을 돌려준다. */
export function nextSendTime(now: Date): Date {
  const kst = toKst(now);
  const hour = kst.getUTCHours();
  if (hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR) {
    const addDay = hour >= NIGHT_START_HOUR ? 1 : 0;
    const morning = Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate() + addDay,
      NIGHT_END_HOUR,
    );
    return new Date(morning - KST_OFFSET_MS);
  }
  return now;
}

/** from~to 사이에서 토·일요일과 공휴일을 뺀 시간(밀리초). */
export function businessElapsedMs(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  const kstFrom = toKst(from);
  // 한국 시간 자정에 해당하는 실제 시각
  let dayStart =
    Date.UTC(kstFrom.getUTCFullYear(), kstFrom.getUTCMonth(), kstFrom.getUTCDate()) -
    KST_OFFSET_MS;
  let total = 0;
  for (let i = 0; i < 400 && dayStart < to.getTime(); i++, dayStart += DAY) {
    if (!isBusinessDay(new Date(dayStart + KST_OFFSET_MS))) continue;
    const start = Math.max(dayStart, from.getTime());
    const end = Math.min(dayStart + DAY, to.getTime());
    if (end > start) total += end - start;
  }
  return total;
}

/** 발송 후 영업일 기준 24시간이 넘었는지. 발송 시각은 예약 시각으로 기록한 값을 쓴다. */
export function isOverdue(sentAtIso: string, now: Date): boolean {
  return businessElapsedMs(new Date(sentAtIso), now) >= DAY;
}

/** 화면에 보여 줄 한국 시간 (예: 11-20 09:00). */
export function formatKst(iso: string | undefined): string {
  if (!iso) return "-";
  const kst = toKst(new Date(iso));
  return `${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}
