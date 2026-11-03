# Személyzeti

Hungarian staff meal diary built with Next.js, React and Supabase.

## Development

Requires Node.js 24 LTS (>=24.15.0, <25). Use npm and commit `package-lock.json` when changing dependencies. If you use nvm, run `nvm use` to select the version from `.nvmrc`.

```sh
npm ci
```

Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `NEXT_PUBLIC_MASTER_ADMIN_IDS` is optional. Keep environment files out of Git. Then start the app:

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

Keep `lib/supabase/database.types.ts` aligned with database changes. The completed Storage setup and one-time migration worker were removed from this repository and remain available in Git history. Local `supabase/` setup artifacts are ignored; the application uses the clients and types in `lib/supabase/`.

The existing Supabase project has the `meal_image_path` column, the private `meal-photos` bucket and owner/approved-user policies. New uploads store separate 1280px photos and 384px thumbnails; image URLs are signed for 20 minutes and the memory cache expires them after 15 minutes. Existing inline photos remain readable during rollout. Migrated rows retain their legacy payload until the new application is deployed, so the old deployment keeps working. Metadata-only edits preserve photos; replacements use new object paths and remove old objects after a successful save.

The proxy verifies signed JWT claims and reads fresh approval/admin status on each protected request. Its `Server-Timing` response header separates `auth` and `profile` latency, with profile preparation, HTTP, response processing, retry gaps and attempt counts. Optional `profile_upstream` is Envoy's upstream service/network time, not SQL execution time. Region, random module ID, request counters and module age help identify runtime reuse; they do not prove a platform cold start. No user identifiers or credentials are included, and authorization is never cached across users or requests. Server Actions still validate the current user with Auth.
