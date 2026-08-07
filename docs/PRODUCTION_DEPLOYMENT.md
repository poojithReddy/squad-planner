# Production deployment

1. Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`.
2. Confirm `git status` contains only intentional files and `.env.local` is not tracked.
3. Commit and push the existing `squad-planner` GitHub repository.
4. In Vercel choose Add New, then Project, and import that repository. Keep the detected Next.js settings.
5. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production.
6. Deploy and record the stable production URL.

After deployment, in Supabase Dashboard open Authentication URL Configuration. Set Site URL to the stable production URL, retain `http://localhost:3000/**` for development, and allow the production `/auth/callback` URL. Do not broadly trust all Vercel preview hostnames; add a specific preview only for deliberate authentication testing.

Before launch, apply Migration 006, configure SMTP, and test authentication, profile authorization/upload, team workflows, import, auction and Realtime, tournament, opportunities, duties, reports, and the main auction interaction at mobile width.
