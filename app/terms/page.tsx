import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";
import { TERMS_OF_SERVICE } from "@/lib/policies";

export const metadata: Metadata = { title: "이용약관 · INMYIN" };

// 로그인 없이 열린다 (lib/supabase/proxy.ts) — 가입 화면(A-02)에서 읽는다
export default function TermsPage() {
  return <PolicyPage policy={TERMS_OF_SERVICE} />;
}
