// Design Ref: §5.2 — 임시 저장소: 서버 메모리에 보관한다.
// 서버가 다시 시작되면 데이터가 사라진다. Vercel에서는 요청마다 다른 서버가 처리할 수 있어
// 데이터가 사라지거나 안 보일 수 있다. 나중에 저장 서비스로 바꿀 때는 이 파일만 고친다.
// Plan SC: 작업 1(데이터 틀 만들기) — 저장 위치
// Plan SC: 작업 4(개인용 링크 만들기) — 심판관마다 다른 개인용 번호와 회신 링크
import { randomBytes } from "node:crypto";
import type { Member, Store } from "@/lib/types";

// 개발 중 파일이 다시 읽혀도 데이터가 유지되도록 globalThis에 둔다.
const holder = globalThis as unknown as { __summonStore?: Store };

function emptyStore(): Store {
  return { meeting: null, members: [], log: [] };
}

/** 저장소를 돌려준다. 처음 부르면 빈 저장소를 만든다. */
export function getStore(): Store {
  holder.__summonStore ??= emptyStore();
  return holder.__summonStore;
}

/** 새 회의를 등록하기 전에 이전 회의·명단·기록을 모두 지운다. */
export function clearStore(): void {
  holder.__summonStore = emptyStore();
}

/** 발송·회신 기록을 한 줄 남긴다. (PRD: 모든 발송과 회신은 시각과 함께 자동 기록) */
export function addLog(memberId: string, event: string, at: Date = new Date()): void {
  getStore().log.push({ at: at.toISOString(), memberId, event });
}

/**
 * 심판관마다 다른 개인용 번호를 만든다. (Design Ref: §4.1 token, PRD 7번 회신 링크)
 * 운영체제의 안전한 난수 32바이트를 주소에 쓸 수 있는 글자(영문·숫자·-·_)로 바꾼 43글자라서
 * 추측하기 어렵고, 두 사람이 같은 번호를 받을 가능성은 사실상 없다.
 */
export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 개인용 번호에 해당하는 회신 링크 경로 (알림톡 본문의 짧은 링크). */
export function replyPath(token: string): string {
  return `/r/${token}`;
}

/** 개인용 번호로 심판관을 찾는다. 없는 번호면 undefined. */
export function findMemberByToken(token: string): Member | undefined {
  return getStore().members.find((member) => member.token === token);
}
