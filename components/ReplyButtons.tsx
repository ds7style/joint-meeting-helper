// Design Ref: §3.3 — 참석·불참 버튼. 누르면 바로 확정된다. (확인 단계 없음)
// Plan SC: 작업 6(회신 페이지)
import { submitReply } from "@/app/actions";

export function ReplyButtons({ token }: { token: string }) {
  return (
    <form action={submitReply} className="flex gap-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        name="answer"
        value="attend"
        className="flex-1 rounded-lg bg-navy px-6 py-4 text-lg font-bold text-white shadow-sm hover:bg-navy-deep"
      >
        참석
      </button>
      <button
        type="submit"
        name="answer"
        value="decline"
        className="flex-1 rounded-lg border-2 border-navy bg-white px-6 py-4 text-lg font-bold text-navy hover:bg-sky"
      >
        불참
      </button>
    </form>
  );
}
