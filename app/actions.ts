"use server";
// Design Ref: §4.5 — 서버 동작: 입력 저장(saveSetup)
// Plan SC: 작업 3(회의·명단 입력 화면), FR-01(1순위 인원 = 정원일 때만 저장)
// 서버 동작은 화면 밖에서도 직접 호출될 수 있으므로 받은 값을 모두 서버에서 다시 확인한다.
// Plan SC: 작업 5(1순위 모의 발송) — 저장하면 1순위에게 모의 발송을 시작한다.
// Plan SC: 작업 8(담당자 현황 화면) — 저장하면 현황 화면(/)으로 이동한다.
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processDispatch } from "@/lib/services/dispatch";
import { markDecline as recordDecline, submitReply as recordReply } from "@/lib/services/respond";
import { clearStore, createToken, getStore } from "@/lib/store";
import type { Member, Rank } from "@/lib/types";

/** 저장에 성공하면 현황 화면으로 이동하므로, 화면에 돌려주는 결과는 오류뿐이다. */
export type SetupResult = { error: string } | null;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^01[016789]-?\d{3,4}-?\d{4}$/;
const MAX_MEMBERS = 36;

function text(value: FormDataEntryValue | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function fail(error: string): SetupResult {
  return { error };
}

/** 회의 일정·정원과 비상임심판관 명단을 확인하고 저장한다. 이전 회의 내용은 모두 지운다. */
export async function saveSetup(_previous: SetupResult, formData: FormData): Promise<SetupResult> {
  const date = text(formData.get("date"));
  const quota = Number(text(formData.get("quota")));
  const names = formData.getAll("name").map(text);
  const phones = formData.getAll("phone").map(text);
  const ranks = formData.getAll("rank").map(text);

  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) {
    return fail("회의 날짜를 입력해 주세요.");
  }
  if (!Number.isInteger(quota) || quota < 1 || quota > MAX_MEMBERS) {
    return fail(`정원은 1~${MAX_MEMBERS} 사이의 숫자로 입력해 주세요.`);
  }

  const entries: { name: string; phone: string; rank: Rank }[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i] ?? "";
    const phone = phones[i] ?? "";
    const rank = Number(ranks[i]);
    if (!name && !phone) continue; // 완전히 빈 줄은 건너뛴다.
    if (!name) return fail(`${i + 1}번째 줄의 이름을 입력해 주세요.`);
    if (!PHONE_PATTERN.test(phone)) return fail(`${i + 1}번째 줄의 번호 형식이 올바르지 않습니다.`);
    if (rank !== 1 && rank !== 2 && rank !== 3) return fail(`${i + 1}번째 줄의 순위를 골라 주세요.`);
    entries.push({ name, phone, rank });
  }

  if (entries.length > MAX_MEMBERS) return fail(`비상임심판관은 최대 ${MAX_MEMBERS}명입니다.`);
  if (entries.length < quota) return fail(`명단(${entries.length}명)이 정원(${quota}명)보다 적습니다.`);
  const firstRankCount = entries.filter((entry) => entry.rank === 1).length;
  if (firstRankCount !== quota) {
    return fail(`1순위는 정원(${quota}명)과 같은 수여야 합니다. 지금은 ${firstRankCount}명입니다.`);
  }

  // 이전 회의·명단·기록을 지우고 새로 저장한다. (한 번에 회의 하나만 다룬다.)
  clearStore();
  const store = getStore();
  store.meeting = { title: "합동회의", date, quota, createdAt: new Date().toISOString() };
  store.members = entries.map(
    (entry, index): Member => ({
      id: randomUUID(),
      name: entry.name,
      phone: entry.phone,
      rank: entry.rank,
      order: index, // 입력한 순서
      token: createToken(), // 심판관마다 다른 개인용 번호
      status: "waiting",
    }),
  );

  // 1순위에게 정원 수만큼 한꺼번에 모의 발송한다. (밤이면 아침 8시로 예약)
  processDispatch();

  // 현황 화면에서 결과(발송됨/발송 예약)를 확인한다. redirect는 항상 마지막에 부른다.
  revalidatePath("/");
  redirect("/");
}

/**
 * 심판관이 회신 페이지에서 참석·불참 버튼을 누른 경우. (Plan SC: 작업 6)
 * 로그인이 없으므로 개인용 번호와 답이 올바른 값인지 서버에서 다시 확인한다.
 */
export async function submitReply(formData: FormData): Promise<void> {
  const token = text(formData.get("token"));
  const answer = text(formData.get("answer"));
  if (token.length > 0 && token.length <= 100 && (answer === "attend" || answer === "decline")) {
    recordReply(token, answer);
  }
  // 회신 결과가 회신 페이지와 현황 화면에 바로 보이게 한다. (이미 회신했거나 잘못된 요청이어도 안내 문구가 새로 그려진다.)
  revalidatePath("/");
  if (token.length > 0 && token.length <= 100) revalidatePath(`/r/${token}`);
}

/**
 * 담당자가 현황 화면에서 "불참 처리" 버튼을 누른 경우. (Plan SC: 작업 10)
 * 회신 대기(미회신 포함) 또는 참석 상태인 사람만 처리되며, 처리하면 다음 사람에게 발송이 이어진다.
 */
export async function markDecline(formData: FormData): Promise<void> {
  const memberId = text(formData.get("memberId"));
  if (memberId.length > 0 && memberId.length <= 100) {
    recordDecline(memberId);
  }
  revalidatePath("/");
}
