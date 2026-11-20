"use client";
// UX 개선: 되돌릴 수 없는 버튼(불참 처리)을 누르기 전에 한 번 더 확인한다.
// 확인 창에서 "취소"를 누르면 폼이 제출되지 않아 아무 일도 일어나지 않는다.
import type { ReactNode } from "react";

export function ConfirmSubmitButton({
  message,
  className,
  children,
}: {
  /** 확인 창에 보여 줄 문구 */
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
