# GitHub 트렌드 KR — 설치 가이드

## 1. 프로젝트 초기화

```bash
npm install
cp .env.local.example .env.local
```

---

## 2. Google AI API 키 발급 (무료)

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 접속
2. **Create API Key** 클릭
3. 발급된 키를 `.env.local`의 `GOOGLE_AI_API_KEY`에 입력

> 신용카드 불필요. 무료 한도: 하루 1,000회 (Supabase 캐시 적용 시 충분)

### 모델 선택 (`.env.local`에서 변경)
| 모델 | 무료 | 속도 | 품질 |
|---|---|---|---|
| `gemini-2.5-flash-lite` | ✅ 1,000 RPD | 빠름 | 좋음 |
| `gemini-2.5-flash` | ✅ 250 RPD | 보통 | 더 좋음 |
| `gemini-2.5-pro` | ✅ 100 RPD | 느림 | 최고 |
| `gemini-3.1-flash-lite` | ⚠️ preview | 빠름 | 좋음 |

---

## 3. Supabase 설정

### 3-1. 프로젝트 생성
1. [supabase.com](https://supabase.com) → New Project
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `.env.local`

### 3-2. DB 스키마
SQL Editor → `supabase/schema.sql` 붙여넣기 → Run

### 3-3. GitHub OAuth
**Supabase:** Authentication → Providers → GitHub → Enable
→ Callback URL 복사: `https://<id>.supabase.co/auth/v1/callback`

**GitHub:** Settings → Developer settings → OAuth Apps → New OAuth App
→ Authorization callback URL에 위 URL 입력
→ Client ID / Secret → Supabase GitHub provider에 입력

---

## 4. 실행

```bash
npm run dev   # http://localhost:3000
```

---

## 5. Vercel 배포

```bash
npx vercel

# 환경변수 추가
vercel env add GOOGLE_AI_API_KEY
vercel env add GEMINI_MODEL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

배포 후 GitHub OAuth App URL 업데이트 필요.
