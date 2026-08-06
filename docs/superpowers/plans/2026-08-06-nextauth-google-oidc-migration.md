# NextAuth Google OIDC Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate authentication from NextAuth CredentialsProvider (username/password) to Google OIDC while preserving existing production users and demo mode.

**Architecture:** Database-first approach — add email column and make password optional, then update seed/injection to map prod users to known emails. Auth provider swap (CredentialsProvider → GoogleProvider) happens after DB is safe. Frontend login form simplified to Google + demo options. Env secrets staged last so deployment verification works correctly.

**Tech Stack:** Next.js + NextAuth v5, Drizzle ORM, Google OAuth 2.0, Cloud SQL (prod) + local `kabuki_sandbox` (dev)

## Global Constraints

- **Must preserve:** Production user records (`renato`, `claudia`) and their associated data (households, transactions, Plaid links).
- **Must maintain:** Demo mode (`isDemo` flag, `handleDemoLogin` flow).
- **Email mapping (exact):** `renato` → `renatountalan@gmail.com`, `claudia` → `claudiapuente00@outlook.com`.
- **Allowlist (exact):** Only these two emails may sign in via Google.
- **No data deletion:** All migration scripts are upsert/update, never drop or delete.
- **Both environments:** Migrate local `kabuki_sandbox` and production Cloud SQL `kabuki`.
- **Verification:** Run `npm run verify:prod-secrets` before and after pushing to main.

---

## Task 1: Create Drizzle Migration — Add Email Column

**Files:**
- Create: `drizzle/migrations/[timestamp]_add_email_column.sql`
- Modify: `app/lib/db/schema.ts`
- Test: Manual verification on local `kabuki_sandbox` and staging

**Interfaces:**
- Consumes: Current schema (user table with username, passwordHash, etc.)
- Produces: Updated schema with `email VARCHAR(255) UNIQUE NOT NULL`, `passwordHash` made optional

**Steps:**

- [ ] **Step 1: Update schema.ts to reflect new structure**

Open `app/lib/db/schema.ts` and modify the `users` table:

```typescript
import { sql } from 'drizzle-orm';
import { pgTable, serial, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),  // NEW
  passwordHash: text('password_hash'),  // Remove .notNull() — now optional
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // ... other columns
});
```

- [ ] **Step 2: Generate Drizzle migration**

Run:
```bash
npm run drizzle:generate -- --name add_email_column
```

Verify that `drizzle/migrations/` contains a new `[timestamp]_add_email_column.sql` file with:
```sql
ALTER TABLE "users" ADD COLUMN "email" varchar(255) NOT NULL UNIQUE;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
```

- [ ] **Step 3: Apply migration to local sandbox**

```bash
npm run drizzle:push -- --database-url="postgresql://postgres:postgres@localhost:5432/kabuki_sandbox"
```

Verify output shows migration applied successfully (no SQL errors).

- [ ] **Step 4: Verify schema in local database**

```bash
psql postgresql://postgres:postgres@localhost:5432/kabuki_sandbox -c "\d users"
```

Expected output: `email` column exists, `password_hash` allows NULL.

- [ ] **Step 5: Commit**

```bash
git add app/lib/db/schema.ts drizzle/migrations/
git commit -m "chore: add email column to users table, make passwordHash optional"
```

---

## Task 2: Update Seed & Injection Scripts — Map Users to Emails

**Files:**
- Modify: `app/lib/db/inject-user.ts` (or equivalent seed file)
- Test: Run locally, verify no data loss

**Interfaces:**
- Consumes: Schema from Task 1 (email column exists, passwordHash optional)
- Produces: Injected/seeded users with email addresses, no deletion of existing records

**Steps:**

- [ ] **Step 1: Locate current injection/seed script**

Find the file responsible for seeding users (likely `app/lib/db/inject-user.ts`). Read it to understand current logic.

- [ ] **Step 2: Implement email-mapping upsert logic**

Update the injection script to use an upsert pattern (do not delete existing users):

```typescript
// app/lib/db/inject-user.ts
import { db } from './index';
import { users } from './schema';
import { sql } from 'drizzle-orm';

const emailMap = {
  renato: 'renatountalan@gmail.com',
  claudia: 'claudiapuente00@outlook.com',
};

export async function injectSeedUsers() {
  for (const [username, email] of Object.entries(emailMap)) {
    // Upsert: update if exists (add email), insert if missing
    await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash: null, // Now optional
        isDemo: false,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          email: sql`excluded.email`,
          updatedAt: new Date(),
        },
      });
  }
}
```

- [ ] **Step 3: Run injection locally**

```bash
npm run dev
# In another terminal:
node -e "import('./app/lib/db/inject-user.ts').then(m => m.injectSeedUsers()).catch(console.error)"
```

Or trigger via your existing seed command (e.g., `npm run seed` or via the app's initialization flow).

- [ ] **Step 4: Verify in local database**

```bash
psql postgresql://postgres:postgres@localhost:5432/kabuki_sandbox -c "SELECT username, email, password_hash FROM users WHERE username IN ('renato', 'claudia');"
```

Expected output:
```
 username |         email          | password_hash
----------+------------------------+---------------
 renato   | renatountalan@gmail.com | (null)
 claudia  | claudiapuente00@outlook.com | (null)
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/db/inject-user.ts
git commit -m "refactor: map existing users to email addresses in seed script"
```

---

## Task 3: Replace NextAuth Provider — Credentials to Google OIDC

**Files:**
- Modify: `app/auth.ts` (or your NextAuth config)
- Test: Local sign-in flow with Google OAuth (dev credentials)

**Interfaces:**
- Consumes: Schema with email column (Task 1), injected users (Task 2)
- Produces: NextAuth config with GoogleProvider, allowlist check, email→user lookup

**Steps:**

- [ ] **Step 1: Set up Google OAuth credentials locally**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project.
3. Enable Google+ API.
4. Create OAuth 2.0 credentials (Web application):
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Client Secret.
5. Add to `.env.local`:
   ```
   AUTH_GOOGLE_ID=your-client-id
   AUTH_GOOGLE_SECRET=your-client-secret
   AUTH_URL=http://localhost:3000
   AUTH_TRUST_HOST=true
   ```

- [ ] **Step 2: Update auth.ts — Replace CredentialsProvider with GoogleProvider**

```typescript
// app/auth.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './lib/db';
import { users } from './lib/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    signIn: async ({ user }) => {
      // Allowlist check
      const allowedEmails = [
        'renatountalan@gmail.com',
        'claudiapuente00@outlook.com',
      ];
      if (!user.email || !allowedEmails.includes(user.email)) {
        return false; // Reject sign-in
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user?.email) {
        // Lookup database user by email
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (dbUser.length > 0) {
          const u = dbUser[0];
          token.uid = u.id;
          token.username = u.username;
          token.isDemo = u.isDemo;
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.uid as number;
        session.user.username = token.username as string;
        session.user.isDemo = token.isDemo as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

// Keep demo login handler
export async function handleDemoLogin() {
  const demoUser = await db
    .select()
    .from(users)
    .where(eq(users.isDemo, true))
    .limit(1);

  if (demoUser.length === 0) {
    throw new Error('Demo user not found');
  }

  return demoUser[0];
}
```

- [ ] **Step 3: Verify CredentialsProvider is removed**

Search `app/auth.ts` for `CredentialsProvider`. If found, delete the entire provider block:

```typescript
// DELETE THIS ENTIRE BLOCK
CredentialsProvider({
  async authorize(credentials) {
    // ... old logic
  },
})
```

- [ ] **Step 4: Test locally with Google OAuth**

1. `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Click "Sign in with Google"
4. Authenticate with one of the allowlist emails (`renatountalan@gmail.com` or test account)
5. Verify you are redirected to dashboard and session contains `username`, `isDemo`
6. Test rejection: sign out, try a non-allowlist email — should see "Access Denied"

- [ ] **Step 5: Commit**

```bash
git add app/auth.ts
git commit -m "feat: replace CredentialsProvider with GoogleProvider, add allowlist verification"
```

---

## Task 4: Update Login Form UI — Remove Credentials, Add Google Button

**Files:**
- Modify: `app/(auth)/login/login-form.tsx`
- Test: Visual check, click flow

**Interfaces:**
- Consumes: NextAuth `signIn('google')` from updated auth config (Task 3)
- Produces: Login form with "Sign in with Google" button and "Try Demo" button, no username/password fields

**Steps:**

- [ ] **Step 1: Read current login-form.tsx**

Understand current structure (form fields, handlers, styling).

- [ ] **Step 2: Replace credentials inputs with Google button**

```typescript
// app/(auth)/login/login-form.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setError(null);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
      setIsLoadingGoogle(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoadingDemo(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/demo', { method: 'POST' });
      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError('Demo login failed.');
      }
    } catch (err) {
      setError('Demo login error.');
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoadingGoogle || isLoadingDemo}
        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
      >
        {isLoadingGoogle ? 'Signing in...' : 'Sign in with Google'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <button
        onClick={handleDemoLogin}
        disabled={isLoadingGoogle || isLoadingDemo}
        className="w-full px-4 py-2 bg-blue-600 rounded-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoadingDemo ? 'Loading...' : 'Try the Demo'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Remove username/password input fields**

Delete any `<input type="text" placeholder="Username" />` and `<input type="password" placeholder="Password" />` fields and their associated state variables (`username`, `password`, `handleSubmit`).

- [ ] **Step 4: Verify no other components reference login credentials**

Search the file for `useState` related to credentials:
```bash
grep -n "useState.*username\|useState.*password" app/\(auth\)/login/login-form.tsx
```

Should return no results.

- [ ] **Step 5: Test in browser**

1. `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Verify "Sign in with Google" button is present and clickable
4. Verify "Try the Demo" button is present and clickable
5. No username/password fields visible

- [ ] **Step 6: Commit**

```bash
git add app/\(auth\)/login/login-form.tsx
git commit -m "refactor: replace credentials input with Google OIDC and demo buttons"
```

---

## Task 5: Remove Password Change UI & Modal

**Files:**
- Modify: `app/(auth)/login/page.tsx` or settings page
- Modify: Any component containing `ChangePasswordModal`
- Test: Settings page loads without password change section

**Interfaces:**
- Consumes: Updated login flow (Task 4)
- Produces: Settings/profile page without password change UI

**Steps:**

- [ ] **Step 1: Locate password change UI**

Find the file containing "Change password" section (likely in settings or profile page). Search:
```bash
grep -r "Change password\|ChangePasswordModal" app/
```

- [ ] **Step 2: Remove password change section**

Delete the entire section (button, modal trigger, or form) that allows users to change their password. For example, if it's in a settings component:

```typescript
// REMOVE THIS SECTION
{/* <button onClick={() => setShowPasswordModal(true)}>
  Change Password
</button>
<ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} /> */}
```

- [ ] **Step 3: Remove ChangePasswordModal component**

If `ChangePasswordModal` is defined in the same file, delete it entirely. If in a separate file (e.g., `components/ChangePasswordModal.tsx`), verify no other components use it:

```bash
grep -r "ChangePasswordModal" app/ --include="*.tsx" --include="*.ts"
```

Should return only the deleted definition.

- [ ] **Step 4: Remove state/handlers**

Delete any state variables and handlers related to password:
```typescript
// DELETE THESE
const [showPasswordModal, setShowPasswordModal] = useState(false);
const handleChangePassword = async (newPassword) => { ... };
```

- [ ] **Step 5: Test settings page**

1. `npm run dev`
2. Sign in with Google or demo
3. Navigate to settings/profile
4. Verify no "Change password" button or form appears
5. Verify page loads without errors

- [ ] **Step 6: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "chore: remove password change UI from settings"
```

---

## Task 6: Deprecate Password Reset API

**Files:**
- Modify or Delete: `app/api/user/password/route.ts`
- Test: API returns 410 Gone or deprecation notice

**Interfaces:**
- Consumes: Nothing
- Produces: 410 Gone response or deprecation warning (no functional password reset)

**Steps:**

- [ ] **Step 1: Locate password endpoint**

```bash
find app/api -name "route.ts" | xargs grep -l "password\|Password"
```

- [ ] **Step 2: Replace with deprecation response**

Update `app/api/user/password/route.ts`:

```typescript
// app/api/user/password/route.ts
export async function PUT(request: Request) {
  return new Response(
    JSON.stringify({
      error: 'Password reset is no longer supported. Please sign in with Google.',
    }),
    {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function POST(request: Request) {
  return new Response(
    JSON.stringify({
      error: 'Password reset is no longer supported. Please sign in with Google.',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

- [ ] **Step 3: Test endpoint**

```bash
curl -X POST http://localhost:3000/api/user/password \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "test"}'
```

Expected response: 410 status code with deprecation message.

- [ ] **Step 4: Verify no frontend calls this endpoint**

```bash
grep -r "/api/user/password" app/ --include="*.tsx" --include="*.ts"
```

Should return no results (or only in the route file itself).

- [ ] **Step 5: Commit**

```bash
git add app/api/user/password/route.ts
git commit -m "chore: deprecate password reset API, return 410 Gone"
```

---

## Task 7: Configure Environment Secrets (Dev & Prod)

**Files:**
- Modify: `.env.local` (dev), `.env.production` (version control), Firebase Secrets Manager (production runtime)
- Test: Secrets match, verification script passes

**Interfaces:**
- Consumes: Google OAuth credentials from Task 3
- Produces: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` in both dev and prod environments

**Steps:**

- [ ] **Step 1: Update .env.local for development**

Add or update:
```
AUTH_GOOGLE_ID=your-dev-client-id
AUTH_GOOGLE_SECRET=your-dev-client-secret
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
```

- [ ] **Step 2: Update .env.production for version control**

In `.env.production` (or your version-controlled production env template), add:
```
AUTH_GOOGLE_ID=your-prod-client-id
AUTH_GOOGLE_SECRET=your-prod-client-secret
AUTH_URL=https://<your-production-domain>
AUTH_TRUST_HOST=true
```

(Use placeholder values; actual secrets are in Firebase.)

- [ ] **Step 3: Add secrets to Firebase Secrets Manager**

```bash
# Login if needed
gcloud auth login

# Set production secrets
gcloud secrets create AUTH_GOOGLE_ID --replication-policy="automatic" --data-file=- <<< "your-prod-client-id"
gcloud secrets create AUTH_GOOGLE_SECRET --replication-policy="automatic" --data-file=- <<< "your-prod-client-secret"
gcloud secrets create AUTH_URL --replication-policy="automatic" --data-file=- <<< "https://<your-production-domain>"

# Or update if they exist
echo "your-prod-client-id" | gcloud secrets versions add AUTH_GOOGLE_ID --data-file=-
```

- [ ] **Step 4: Grant Cloud Run service account access**

```bash
gcloud secrets add-iam-policy-binding AUTH_GOOGLE_ID \
  --member=serviceAccount:<your-service-account>@iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Repeat for AUTH_GOOGLE_SECRET and AUTH_URL
```

- [ ] **Step 5: Update Cloud Run service to use secrets**

Ensure your `cloud-run-service.yaml` or deployment config includes:
```yaml
secretEnvVars:
  - key: AUTH_GOOGLE_ID
    secret: AUTH_GOOGLE_ID
    version: latest
  - key: AUTH_GOOGLE_SECRET
    secret: AUTH_GOOGLE_SECRET
    version: latest
  - key: AUTH_URL
    secret: AUTH_URL
    version: latest
```

- [ ] **Step 6: Run verification script**

```bash
npm run verify:prod-secrets
```

Expected output: All secrets match between `.env.production` and Firebase Secrets Manager. No errors.

- [ ] **Step 7: Commit env file**

```bash
git add .env.production
git commit -m "chore: add Google OAuth env vars to production config"
```

(Do not commit `.env.local` — it's in `.gitignore`)

---

## Task 8: Test Complete Flow & Deploy

**Files:**
- Test: Local dev flow, staging preview, production
- Verify: Database migration applied to both `kabuki_sandbox` and production `kabuki`

**Interfaces:**
- Consumes: All previous tasks (schema, auth, UI, secrets)
- Produces: Working authentication flow with Google OIDC in all environments

**Steps:**

- [ ] **Step 1: Test local dev flow end-to-end**

1. `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. **Google sign-in:**
   - Click "Sign in with Google"
   - Authenticate with `renatountalan@gmail.com`
   - Verify redirect to dashboard
   - Verify session shows `username: 'renato'`, `isDemo: false`
4. **Demo sign-in:**
   - Sign out
   - Click "Try the Demo"
   - Verify redirect to dashboard with demo data
   - Verify session shows `isDemo: true`
5. **Allowlist rejection:**
   - Sign out
   - Try to sign in with a non-allowlist email
   - Verify "Access Denied" or similar error

- [ ] **Step 2: Verify database state**

```bash
# Local sandbox
psql postgresql://postgres:postgres@localhost:5432/kabuki_sandbox -c "SELECT username, email, password_hash FROM users;"
```

Expected: `renato` and `claudia` have emails, NULL `password_hash`.

- [ ] **Step 3: Apply migration to production database**

*(This requires production access and is typically done during deployment.)*

Verify with your production-ops team or via Cloud SQL console:
```bash
# Example command (adjust to your setup)
gcloud sql connect kabuki --user=postgres --project=<your-project> << 'EOF'
\d users
SELECT username, email FROM users WHERE username IN ('renato', 'claudia');
EOF
```

Expected: Emails populated, migration applied.

- [ ] **Step 4: Deploy to staging/preview**

```bash
# If using Vercel or similar
git push origin main
# Or manual deploy
gcloud run deploy <your-service> --source .
```

Wait for build and deployment to complete.

- [ ] **Step 5: Test production sign-in**

1. Navigate to `https://<your-production-domain>/login`
2. Click "Sign in with Google"
3. Sign in with production-allowed email
4. Verify dashboard loads with correct session
5. Test demo mode on production

- [ ] **Step 6: Monitor logs**

```bash
gcloud run logs read <your-service> --tail=100
```

Look for any auth errors, DB connection issues, or secret-loading warnings.

- [ ] **Step 7: Verify production secrets one more time**

```bash
npm run verify:prod-secrets
```

Expected: All secrets match, no mismatches or warnings.

- [ ] **Step 8: Commit & document completion**

If all tests pass:
```bash
git add .
git commit -m "feat: complete NextAuth Google OIDC migration, preserve prod users and demo mode"
```

Document in your team wiki / runbook:
- Old auth method: NextAuth CredentialsProvider (username/password)
- New auth method: Google OIDC
- Demo account: Still functional via `handleDemoLogin`
- Allowlist: `renatountalan@gmail.com`, `claudiapuente00@outlook.com`

---

## Spec Coverage Checklist

- ✅ **DB Migration:** Email column added, passwordHash optional, migration applied to both environments
- ✅ **Seed/Injection:** Users mapped to emails, upsert pattern (no deletion)
- ✅ **Auth Provider:** GoogleProvider replaces CredentialsProvider, allowlist enforced, JWT/session lookup by email
- ✅ **Frontend:** Login form removes credentials inputs, adds Google button, keeps demo
- ✅ **Settings:** Password change UI removed
- ✅ **API:** Password reset endpoint deprecated (410 Gone)
- ✅ **Env/Secrets:** Google OAuth vars in `.env.production`, Firebase Secrets Manager, verification script
- ✅ **Testing:** End-to-end flow tested locally and in production

---

## Plan complete and saved to `docs/superpowers/plans/2026-08-06-nextauth-google-oidc-migration.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
