# Vercel deployment guide

Squad Planner deploys as one Next.js application on Vercel and connects directly to hosted Supabase. No separate backend service or repository is required.

## 1. Pre-deployment gate

From the project root run:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Review `git status`, confirm `.env.local` is not tracked, then commit and push the existing GitHub repository. Suggested commit message: `Prepare Squad Planner for Vercel deployment`.

## 2. Import the existing repository

1. Open Vercel and choose **Add New > Project**.
2. Import the existing `squad-planner` GitHub repository. Do not create another repository.
3. Confirm that Vercel detects **Next.js**.
4. Leave the default install and build commands unless Vercel reports a genuine problem.
5. Add these Production environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
6. Deploy and copy the generated stable Production URL.
7. If `NEXT_PUBLIC_SITE_URL` was not known before the first deployment, set it to the stable `https://` production origin and redeploy.

Changes to `NEXT_PUBLIC_` variables are compiled into a deployment and require a new deployment before they take effect. Never add service-role, database, SMTP, or Resend credentials to these variables.

## 3. Production and Preview deployments

Pushes to the configured production branch create Production deployments. Other branches and pull requests can create Preview deployments. For initial launch, test authentication on the stable Production URL. Do not broadly allow every arbitrary preview hostname in Supabase. Add a specific preview redirect only when deliberately testing it.

## 4. Supabase Auth URLs

After the stable URL is known, open **Supabase Dashboard > Authentication > URL Configuration**:

- Set **Site URL** to `https://YOUR-PRODUCTION-URL`.
- Keep `http://localhost:3000/**` in Redirect URLs for continued local development.
- Add `https://YOUR-PRODUCTION-URL/**` to Redirect URLs.
- Do not replace the Production Site URL with a Preview URL.

Test signup confirmation, login, logout, forgot password, reset password, session refresh, and protected-route redirects in Production.

## 5. Production verification

### Realtime

1. Sign in in a normal browser window.
2. Sign in to the same team from another authorised account or isolated browser session.
3. Open Live Auction in both sessions.
4. Change a player status and confirm the other browser updates without refreshing.
5. Repeat with a volunteer-duty assignment.

### Private Storage

Upload and reload a team logo, team banner, and profile image. Confirm signed/private images render for authorised users. Do not make either Storage bucket public as a workaround.

### Excel and CSV imports

Using a small non-sensitive test file, verify:

- General `.xlsx` import
- General `.csv` import
- Bucket `.xlsx` import
- Bucket `.csv` import

Spreadsheet files are parsed in the browser and are not stored on Vercel's filesystem.

### SMTP

Supabase Auth remains responsible for confirmation and reset emails through custom SMTP. Deployment can proceed while SMTP verification is being completed, but public account testing is not complete until both email flows deliver successfully.

## 6. Custom domain

After the initial deployment works, add `squadplanner.matchtoday.co.uk` under the Vercel project's Domains settings. Add the exact DNS record Vercel provides in GoDaddy. Then update `NEXT_PUBLIC_SITE_URL` and the Supabase Site/Redirect URLs to the custom production origin and redeploy.
