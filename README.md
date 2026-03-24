# Cursus — AI Academic Workspace

> Built for Nigerian university students. Smart notes, lecture recording, exam prep, and more — all in one AI-powered workspace.

---

## Setup (do these in order)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from your Supabase project dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API (keep secret)
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `TERMII_API_KEY` — from termii.com (for SMS OTP — optional in dev)

### 3. Set up Supabase

1. Create a new project at supabase.com
2. Go to SQL Editor → paste the contents of `supabase/schema.sql` → Run
3. Go to Storage → create four buckets: `recordings`, `documents`, `exam-materials`, `snaps`
4. For each bucket, set to Private and add this RLS policy:

```sql
-- Allow users to manage their own files
create policy "users_own_files" on storage.objects
  for all using (auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. Add custom fonts (optional but recommended)

Install Cabinet Grotesk for the display font:

```bash
npm install @fontsource/cabinet-grotesk
```

Then in `src/app/layout.tsx`, add:
```ts
import '@fontsource/cabinet-grotesk/700.css'
```

Or just use Google Fonts — it's already set up via the `<link>` tags in layout.tsx.

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Project structure

```
src/
├── app/
│   ├── (marketing)/       Landing page
│   ├── (auth)/            Signup, login, verify, onboarding
│   ├── (dashboard)/       All dashboard pages
│   └── api/               API routes (auth + AI)
├── lib/
│   ├── supabase/          Client and server Supabase helpers
│   ├── anthropic.ts       Claude API client + system prompts
│   └── utils.ts           Helper functions
└── types/                 TypeScript types
```

---

## Adding the remaining pages

These pages are scaffolded but need to be built out. Ask your VSCode AI agent:

- `src/app/(dashboard)/recorder/page.tsx` — Lecture recorder
- `src/app/(dashboard)/library/page.tsx` — PDF uploads
- `src/app/(dashboard)/library/[id]/page.tsx` — PDF viewer + chat
- `src/app/(dashboard)/exam-prep/page.tsx` — Exam prep sessions
- `src/app/(dashboard)/research/page.tsx` — Essay/research studio
- `src/app/(dashboard)/settings/page.tsx` — Account settings

---

## Making a user Pro (for testing)

In Supabase SQL editor:
```sql
update profiles set is_pro = true where user_id = 'paste-user-id-here';
```

---

## Deploy to Vercel

```bash
npx vercel
```

Add all environment variables in Vercel dashboard → Project → Settings → Environment Variables.

---

## SMS provider

For phone OTP in production, sign up at [termii.com](https://termii.com) — Nigerian provider, fast delivery, cheaper than Twilio for local numbers. Add your API key to `.env.local`.

---

## AI model

All AI features use `claude-sonnet-4-20250514`. System prompts are in `src/lib/anthropic.ts` — tune them freely.
