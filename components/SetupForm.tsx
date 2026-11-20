"use client";
// Design Ref: §3.1 — 회의·명단 입력 폼. 샘플은 모두 가상 데이터이다.
// Plan SC: 작업 3(회의·명단 입력 화면)
import { useActionState, useState } from "react";
import { saveSetup, type SetupResult } from "@/app/actions";

interface Row {
  key: number;
  name: string;
  phone: string;
  rank: number;
}

// 가상 샘플: 1순위 10명, 2순위 3명, 3순위 2명
function makeSample(): Row[] {
  const ranks = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3];
  return ranks.map((rank, index) => {
    const n = String(index + 1).padStart(2, "0");
    return { key: index, name: `가상위원${n}`, phone: `010-0000-00${n}`, rank };
  });
}

export function SetupForm() {
  const [result, formAction, pending] = useActionState<SetupResult, FormData>(saveSetup, null);
  // 저장한 뒤에도 입력값이 사라지지 않도록 모두 직접 관리한다.
  const [date, setDate] = useState("");
  const [quota, setQuota] = useState("10");
  const [rows, setRows] = useState<Row[]>(makeSample);
  const [nextKey, setNextKey] = useState(100);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  // 디자인: 입력 칸·버튼 공통 모양
  const inputClass =
    "rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30";
  const subButtonClass =
    "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-navy hover:bg-sky";

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-lg border border-line bg-white shadow-sm"
    >
      <p className="bg-teal px-5 py-2.5 font-semibold text-white">회의 정보</p>
      <div className="flex flex-wrap gap-4 p-5">
        <label className="flex flex-col gap-1 text-sm font-medium">
          회의 날짜
          <input
            type="date"
            name="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          정원
          <input
            type="number"
            name="quota"
            min={1}
            max={36}
            required
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
            className={`w-24 ${inputClass}`}
          />
        </label>
      </div>

      <div className="space-y-2 border-t border-line bg-sky/40 p-5">
        <p className="text-sm font-semibold text-navy">비상임심판관 명단 (가상 데이터만 입력)</p>
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-2">
            <input
              name="name"
              value={row.name}
              onChange={(e) => updateRow(row.key, { name: e.target.value })}
              placeholder="이름"
              aria-label="이름"
              className={`w-36 ${inputClass}`}
            />
            <input
              name="phone"
              value={row.phone}
              onChange={(e) => updateRow(row.key, { phone: e.target.value })}
              placeholder="010-0000-0000"
              aria-label="번호"
              className={`w-40 ${inputClass}`}
            />
            <select
              name="rank"
              value={row.rank}
              onChange={(e) => updateRow(row.key, { rank: Number(e.target.value) })}
              aria-label="순위"
              className={inputClass}
            >
              <option value={1}>1순위</option>
              <option value={2}>2순위</option>
              <option value={3}>3순위</option>
            </select>
            <button
              type="button"
              onClick={() => setRows((previous) => previous.filter((r) => r.key !== row.key))}
              className={subButtonClass}
            >
              삭제
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setRows((previous) => [...previous, { key: nextKey, name: "", phone: "", rank: 2 }]);
              setNextKey((key) => key + 1);
            }}
            className={subButtonClass}
          >
            + 추가
          </button>
          <button type="button" onClick={() => setRows(makeSample())} className={subButtonClass}>
            가상 샘플로 되돌리기
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-line p-5">
        {result?.error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
          >
            {result.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-navy px-6 py-3 font-semibold text-white shadow-sm hover:bg-navy-deep disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장하고 1순위에게 모의 발송"}
        </button>
        <p className="text-xs text-muted">
          저장하면 기존 기록이 지워집니다. 1순위 인원은 정원과 같아야 합니다.
        </p>
      </div>
    </form>
  );
}
