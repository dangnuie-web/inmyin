# INMYIN

내가 가진 것을 사진으로 찍어 가상의 창고에 넣어두고, 한눈에 보고 남에게 보여주는 앱.

- 앱: https://inmyin.vercel.app
- 무엇을 왜 만드는지: `docs/PRD.md` · 화면: `docs/screens.md` · 작업 순서: `docs/roadmap.md`
- 개발 규칙: `CLAUDE.md`

## 실행

```bash
cp .env.example .env.local   # Supabase 주소와 키를 채운다
npm install
npm run dev                   # http://localhost:3000
```

## 라이선스

이 저장소의 소스코드는 **AGPL-3.0** 으로 공개합니다 (`LICENSE`).

배경제거에 쓰는 [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) 이 AGPL-3.0 이라, 이 앱을 남에게 서비스로 제공하려면 앱의 소스코드도 같은 조건으로 공개해야 합니다. 그래서 공개합니다. 배경제거를 다른 방식으로 갈아타기 전까지는 이 조건이 유지됩니다.

이 저장소에 들어 있는 INMYIN 의 이름 · 로고 · 아이콘 · 디자인은 코드와 별개이며, 소스코드 라이선스가 그 사용을 허락하는 것은 아닙니다.
