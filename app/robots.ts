// CHECK.md 1순위: 검색엔진 색인 차단 (보안 점검 "중간")
// 담당자 화면과 회신 페이지가 검색에 잡히지 않도록 모든 경로를 막는다.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
