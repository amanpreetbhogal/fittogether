# FitTogether

FitTogether is a premium fitness accountability web app for couples. It lets two partners log workouts, track nutrition, create goals, compare progress, and send motivational nudges.

This project is built with:

- Next.js 16
- React 19
- TypeScript
- Supabase Auth + Postgres
- USDA FoodData Central for food search
- ExerciseDB via RapidAPI for exercise search
- Recharts for dashboard and partner charts

## Features

- Email/password auth with Supabase
- Workout logging and routine building
- Food logging with macro tracking
- Goal creation, editing, and progress tracking
- Partner invites and one-partner-only connections
- Head-to-head partner comparisons
- Dashboard charts for workouts and calories
- Nudges between partners

## Requirements

Install these before running the app:

- Node.js 20 or newer
- npm
- A Supabase project
- An ExerciseDB RapidAPI key

Optional but recommended:

- A USDA FoodData Central API key

## 1. Clone and install

```bash
git clone https://github.com/amanpreetbhogal/fittogether.git
cd fittogether
npm install
```

## 2. Create environment variables

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in these values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
USDA_API_KEY=your_usda_api_key
EXERCISEDB_RAPIDAPI_KEY=your_rapidapi_key
EXERCISEDB_RAPIDAPI_HOST=edb-with-videos-and-images-by-ascendapi.p.rapidapi.com
```

### Where to get each value

#### Supabase

In your Supabase project:

1. Go to `Project Settings`
2. Open `API`
3. Copy:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### USDA FoodData Central

FitTogether uses USDA for food search through `app/api/foods/search/route.ts`.

- Get a key from [data.gov / USDA FoodData Central](https://fdc.nal.usda.gov/api-guide)
- Put it in `USDA_API_KEY`

Good to know:

- If you do not set `USDA_API_KEY`, the code falls back to `DEMO_KEY`
- The demo key is fine for light testing but should not be relied on for a full project demo

#### ExerciseDB / RapidAPI

FitTogether uses ExerciseDB for exercise search through `app/api/exercises/search/route.ts`.

You need:

- `EXERCISEDB_RAPIDAPI_KEY`
- `EXERCISEDB_RAPIDAPI_HOST`

Host value:

```env
EXERCISEDB_RAPIDAPI_HOST=edb-with-videos-and-images-by-ascendapi.p.rapidapi.com
```

## 3. Set up Supabase database

This app requires the database schema in:

- `supabase/schema.sql`

To apply it:

1. Open your Supabase project dashboard
2. Go to `SQL Editor`
3. Create a new query
4. Paste the contents of `supabase/schema.sql`
5. Run it

This creates:

- `profiles`
- `partnerships`
- `partnership_invites`
- `workouts`
- `workout_exercises`
- `exercise_sets`
- `food_entries`
- `goals`
- `nudges`

It also creates:

- the auth trigger that makes a `profiles` row after signup
- partnership constraints
- update triggers
- row level security policies

## 4. Configure Supabase Auth URLs

If email signup/login redirects do not work correctly, check your Supabase auth URL settings.

In Supabase:

1. Go to `Authentication`
2. Open `URL Configuration`
3. Set:

For local development:

- `Site URL`: `http://localhost:3000`

Add this as a redirect URL:

- `http://localhost:3000`

For production, also add your deployed domain, for example:

- `https://your-vercel-app.vercel.app`

## 5. Run the app

Start the development server:

```bash
npm run dev
```

Note:

- In this repo, `npm run dev` runs `next dev --webpack`

Then open:

```txt
http://localhost:3000
```

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## How to test the core flows

After setup, you should be able to:

1. Open `/auth`
2. Sign up with email/password
3. Confirm the account if your Supabase auth flow requires email confirmation
4. Land on the dashboard
5. See your profile row created automatically in Supabase
6. Go to `/food` and search foods
7. Go to `/workout` and search exercises
8. Go to `/goals` and create a goal
9. Go to `/partner` and invite a partner

## Troubleshooting

### `Missing Supabase environment variables.`

Your `.env.local` file is missing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### `ExerciseDB API key is missing on this deployment.`

Your local or deployed environment is missing:

- `EXERCISEDB_RAPIDAPI_KEY`

If this happens on Vercel:

1. Go to your Vercel project
2. Open `Settings`
3. Open `Environment Variables`
4. Add `EXERCISEDB_RAPIDAPI_KEY`
5. Redeploy

### `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`

This usually means the browser is holding an old Supabase session.

Fix:

1. Clear site storage for `localhost:3000` or your deployed domain
2. Refresh
3. Log in again

### Food search returns poor or no results

Make sure `USDA_API_KEY` is set. The app can use `DEMO_KEY`, but that is only intended for basic testing.

### Exercise search does not work in production

Make sure Vercel has:

- `EXERCISEDB_RAPIDAPI_KEY`

The app can default the RapidAPI host internally, but the key is required.

## Project structure

Important files and folders:

- `app/(app)` - authenticated app routes
- `app/auth` - sign in / sign up
- `app/api/foods/search/route.ts` - USDA food search proxy
- `app/api/exercises/search/route.ts` - ExerciseDB search proxy
- `components/auth/AuthProvider.tsx` - shared auth/session state
- `lib/supabase.ts` - Supabase client
- `supabase/schema.sql` - database schema and policies

## Notes for graders / reviewers

Someone should be able to run this project from the README alone by doing the following:

1. Install Node and npm
2. Run `npm install`
3. Create `.env.local`
4. Create/configure Supabase
5. Run `supabase/schema.sql`
6. Start the app with `npm run dev`

If you want to test the partner functionality fully, create two accounts and connect them through the `/partner` page.
