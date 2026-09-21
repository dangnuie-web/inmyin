-- 가입 화면(A-02)의 "인증번호 전송"이 부른다.
-- 이미 가입을 마친 이메일인지 예/아니오만 알려준다. 이메일 목록 자체는 밖으로 나가지 않는다.
--
-- 가입을 마쳤다 = 비밀번호가 있거나 구글·카카오 계정이 연결돼 있다.
-- 인증번호만 받고 그만둔 사람은 false 라서, 다시 와서 가입을 이어갈 수 있다.
create function public.is_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.email = lower(trim(p_email))
      and (
        coalesce(u.encrypted_password, '') <> ''
        or exists (
          select 1
          from auth.identities i
          where i.user_id = u.id
            and i.provider <> 'email'
        )
      )
  );
$$;

-- 로그인하지 않은 사람(anon)이 가입 화면에서 부르므로 둘 다 허용한다
revoke all on function public.is_email_registered(text) from public;
grant execute on function public.is_email_registered(text) to anon, authenticated;
