# FitTogether Backend Setup

This repo now has an initial backend foundation built around `Supabase + Next.js + TypeScript`.

## Added

- `supabase/schema.sql`
  - core tables
  - auth-to-profile trigger
  - row level security policies
- `lib/database.types.ts`
  - typed schema definitions for the current tables
- `components/auth/AuthProvider.tsx`
  - shared session/profile state
- `components/auth/ProtectedAppShell.tsx`
  - auth guard for routes under `app/(app)`

## Apply The Database Schema

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run [`supabase/schema.sql`](/Users/amanpreetbhogal/Documents/umich/classes/si511w2026/Final_Project/fittogether/supabase/schema.sql).

## Current Auth Behavior

- `Sign up` creates a Supabase auth user.
- A DB trigger creates the matching `profiles` row.
- `Sign in` uses Supabase email/password auth.
- Protected app routes redirect to `/auth` when there is no session.

## Recommended Next Steps

- Add SSR auth helpers for server-side route protection.
- Replace mock data page by page with live Supabase queries.
- Build partner invite and accept flows on top of `partnership_invites` and `partnerships`.
- Add FatSecret-backed food search through Next.js server routes.
