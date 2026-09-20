// 가입·로그인 폼이 공통으로 쓰는 규칙. 서버와 브라우저 양쪽에서 부른다.

// 서버 함수가 폼에 돌려주는 결과
export type FormState = { error?: string };

// DB의 users_handle_format 제약과 같아야 한다
export const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;
export const NICKNAME_MAX = 20;
export const PASSWORD_MIN = 8;

// 인증번호 입력 제한 시간(초). Supabase 대시보드의 Email OTP Expiration 과 맞춘다
export const OTP_SECONDS = 180;
// Supabase가 같은 주소로 다시 보내주는 최소 간격(초)
export const OTP_RESEND_SECONDS = 60;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6,10}$/;

export function isEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export function isOtp(value: string) {
  return OTP_PATTERN.test(value);
}

// Supabase가 영어로 주는 오류를 화면에 보여줄 말로 바꾼다
export function authErrorMessage(code: string | undefined) {
  switch (code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "email_not_confirmed":
      return "이메일 인증이 끝나지 않은 계정입니다. 가입 화면에서 인증번호를 다시 받아주세요.";
    case "otp_expired":
      return "인증번호가 올바르지 않거나 시간이 지났습니다.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.";
    case "email_address_invalid":
      return "사용할 수 없는 이메일 주소입니다.";
    case "weak_password":
      return `비밀번호가 너무 단순합니다. ${PASSWORD_MIN}자 이상으로 바꿔주세요.`;
    default:
      return "문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
  }
}
