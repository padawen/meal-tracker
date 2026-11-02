# Személyzeti

Hungarian staff meal diary built with Next.js, React and Supabase.

## Development

Requires Node.js 24 LTS (>=24.15.0, <25). Use npm and commit `package-lock.json` when changing dependencies. If you use nvm, run `nvm use` to select the version from `.nvmrc`.

```sh
npm ci
cp .env.example .env.local
```

Fill in the Supabase project URL and publishable/anon key in `.env.local`. `NEXT_PUBLIC_MASTER_ADMIN_IDS` is optional. Keep real environment files out of Git. Then start the app:

```sh
npm run dev
```

## Checks and production build

```sh
npm test
npm run typecheck
npm run build
npm start
```

The focused Vitest suite covers auth/Realtime lifecycle, bounded image loading, metadata completeness and pagination, mutation races, and persistent photo-modal state. It uses mocked service boundaries and does not write to the live database.

## Database

The application connects to the existing Supabase project. Its schema and applied migration history live in Supabase; this repository does not provide a complete database bootstrap/migration chain. The old local SQL snapshots were removed during cleanup and remain available in Git history.

Keep `lib/supabase/database.types.ts` aligned with database changes. The daily reminder Edge Function remains in `supabase/functions/daily-reminder/`; its deployment settings and secrets are managed separately in Supabase.
