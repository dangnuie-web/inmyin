import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";
import { PRIVACY_POLICY } from "@/lib/policies";

export const metadata: Metadata = { title: "개인정보처리방침 · INMYIN" };

// 로그인 없이 열린다 (lib/supabase/proxy.ts) — 가입 화면(A-02)에서 읽는다
export default function PrivacyPage() {
  return <PolicyPage policy={PRIVACY_POLICY} />;
}
