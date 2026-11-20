// Design Ref: §4.1 — 회의, 비상임심판관, 발송·회신 기록의 데이터 형태
// Plan SC: 작업 1(데이터 틀 만들기)

/** 순위 (1·2·3순위) */
export type Rank = 1 | 2 | 3;

/**
 * 비상임심판관의 진행 상태
 * - waiting: 대기 (아직 차례가 아님)
 * - scheduled: 발송 예약됨 (밤이면 아침으로 미뤄진 상태)
 * - sent: 모의 발송됨, 회신을 기다리는 중
 * - attend: 참석
 * - decline: 불참
 *
 * 정원이 찬 뒤의 "발송 안 함"은 상태로 저장하지 않는다.
 * 대기(waiting)인 사람을 화면에서 그렇게 보여 주기만 한다. (Design Ref: §4.1)
 */
export type MemberStatus = "waiting" | "scheduled" | "sent" | "attend" | "decline";

/** 합동회의 정보. 한 번에 회의 하나만 다룬다. */
export interface Meeting {
  /** 화면에 보이는 이름. 공개되는 글이므로 "합동회의"를 쓴다. */
  title: string;
  /** 회의 날짜 (예: 2026-12-18) */
  date: string;
  /** 정원 (약 10명) */
  quota: number;
  /** 등록한 시각 (ISO 형식) */
  createdAt: string;
}

/** 비상임심판관 한 명 */
export interface Member {
  id: string;
  name: string;
  /** 가상 번호만 사용한다. */
  phone: string;
  rank: Rank;
  /** 입력한 순서. 같은 순위 안에서 이 순서대로 연락한다. */
  order: number;
  /** 추측하기 어려운 개인용 번호. 회신 링크에 쓴다. (생성은 PLAN 작업 4) */
  token: string;
  status: MemberStatus;
  /** 발송 예약 시각 (ISO 형식) */
  scheduledAt?: string;
  /** 기록하는 발송 시각 = 예약 시각. 영업일 24시간도 여기서부터 센다. */
  sentAt?: string;
  answeredAt?: string;
  /** 누가 회신·처리했는지 (심판관 본인 / 담당자) */
  answeredBy?: "member" | "manager";
}

/** 발송·회신 자동 기록 한 줄 (PRD: 모든 발송과 회신은 시각과 함께 자동 기록) */
export interface LogEntry {
  /** 기록한 시각 (ISO 형식) */
  at: string;
  memberId: string;
  /** 짧은 이벤트 이름 (예: "알림톡 모의 발송") */
  event: string;
}

/** 임시 저장소에 들어 있는 전체 데이터 */
export interface Store {
  meeting: Meeting | null;
  members: Member[];
  log: LogEntry[];
}
