# Deployment Guide: Kabuki on Firebase App Hosting

## Prerequisites

- Firebase CLI: `npx firebase --version` ✓
- Git: `git --version` ✓
- Firebase project with App Hosting enabled
- PostgreSQL database (Neon, Supabase, etc.)
- GitHub repo connected to Firebase

## Step 1: Set Firebase Project ID

Replace `YOUR_PROJECT_ID` in `.firebaserc`:

```bash
npx firebase use --add
# Select your project ID when prompted
```

Or manually edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## Step 2: Create/Set Up Backend

If this is the first deployment, create the App Hosting backend:

```bash
npx firebase apphosting:backends:create
# Select "kabuki" as the backend ID (from firebase.json)
# Connect your GitHub repo when prompted
```

## Step 3: Set Secrets in Firebase

Firebase App Hosting uses Google Cloud Secret Manager. Set each required secret:

```bash
# Database connection (Neon, Supabase, etc.)
npx firebase apphosting:secrets:set DATABASE_URL
# Paste your PostgreSQL connection string, press Enter

# NextAuth session secret (generate if needed: npx auth secret)
npx firebase apphosting:secrets:set AUTH_SECRET
# Paste your AUTH_SECRET, press Enter

# Plaid credentials (when ready to add Plaid in production)
npx firebase apphosting:secrets:set PLAID_CLIENT_ID
npx firebase apphosting:secrets:set PLAID_SECRET
```

Grant the backend access to these secrets:

```bash
npx firebase apphosting:secrets:grantaccess DATABASE_URL --backend kabuki
npx firebase apphosting:secrets:grantaccess AUTH_SECRET --backend kabuki
npx firebase apphosting:secrets:grantaccess PLAID_CLIENT_ID --backend kabuki
npx firebase apphosting:secrets:grantaccess PLAID_SECRET --backend kabuki
```

## Step 4: Initialize Database

Once secrets are set, run migrations and seed the database:

**Option A: Local before deploy (recommended for first-time)**

```bash
# Ensure .env.local has DATABASE_URL from your PostgreSQL host
npm run db:push
npm run db:seed
```

**Option B: Via Firebase Cloud Functions (later)**

You can create a Cloud Function to run migrations on deploy.

## Step 5: Connect GitHub and Configure Auto-Deploy

In Firebase Console:
1. Go to App Hosting → Backends → kabuki
2. Click "Connect repository"
3. Select your GitHub repo and branch (e.g., `main`)
4. Enable auto-deploy on push to main

The `firebase.json` and `apphosting.yaml` are already configured.

## Step 6: Deploy

```bash
# Verify config
npx firebase apphosting:backends:describe kabuki

# Deploy to production (or use GitHub auto-deploy)
git push origin main
```

Monitor the deployment:
```bash
npx firebase apphosting:builds:list --backend kabuki
```

## Step 7: Verify Deployment

1. Open https://mybuttons.casa
2. You should see the login page
3. Log in with demo credentials:
   - Email: `user1@example.com`
   - Password: `password`

## Troubleshooting

**Build fails with "DATABASE_URL not found":**
- Verify secrets were granted to the backend: `npx firebase apphosting:secrets:describe DATABASE_URL --backend kabuki`
- Re-run: `npx firebase apphosting:secrets:grantaccess DATABASE_URL --backend kabuki`

**Database migrations haven't run:**
- Manually run: `npm run db:push` with DATABASE_URL set locally
- Or create a Firebase Cloud Function trigger on first deploy

**Auth redirects to /login infinitely:**
- Check that `AUTH_URL` in `apphosting.yaml` matches your domain (`https://mybuttons.casa`)
- Verify `AUTH_SECRET` is set and consistent

**Plaid sync isn't working:**
- Ensure `PLAID_CLIENT_ID` and `PLAID_SECRET` are set in Firebase secrets
- Verify `PLAID_ENV` is set to `sandbox` or `production` in `apphosting.yaml`

## Custom Domain Setup

Your domain `mybuttons.casa` is already configured in `apphosting.yaml` as `AUTH_URL`.

To set it as the App Hosting domain:
1. Firebase Console → App Hosting → Custom domain
2. Follow DNS setup instructions (usually CNAME to Firebase's domain)
3. DNS records might take 15-60 minutes to propagate

## Environment Variables

All production env vars are managed via Firebase secrets:
- `DATABASE_URL` → Secret Manager
- `AUTH_SECRET` → Secret Manager
- `PLAID_CLIENT_ID` → Secret Manager
- `PLAID_SECRET` → Secret Manager
- `PLAID_ENV` → `apphosting.yaml` env section
- `AUTH_URL` → `apphosting.yaml` env section

## Next Steps

- Monitor logs: `npx firebase functions:log --backend kabuki`
- Scale config: Edit `apphosting.yaml` (CPU, memory, instances)
- Add more users: Connect to your PostgreSQL and insert rows into `users` table
- Enable Plaid: Link real bank accounts via Settings → Link Bank Account

Enjoy your self-hosted personal finance app! 🎉
