# Firebase + Cloud SQL Setup for Kabuki

## Your Configuration
- **Project ID:** `my-buttons-f6c4a`
- **Domain:** `mybuttons.casa`
- **Database:** Cloud SQL PostgreSQL
- **Region:** `us-central1` (default)

## Step 1: Firebase Login

```bash
npx firebase login
```

This opens your browser. Log in with your Google account (the one with Firebase project access).

## Step 2: Create Cloud SQL Instance

1. Open Google Cloud Console: https://console.cloud.google.com
2. Make sure **my-buttons-f6c4a** is selected (top left)
3. Search for **"Cloud SQL"** and click the service
4. Click **"Create Instance"**

### Choose PostgreSQL

Click **PostgreSQL** (blue box)

### Configure Instance

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Instance ID** | `kabuki-db` |
| **Password** | *(generate strong password)* |
| **Database version** | PostgreSQL 15 |
| **Region** | `us-central1` |
| **Zonal availability** | Single zone (default) |
| **Machine type** | `db-f1-micro` (free tier) |
| **Storage type** | SSD |
| **Storage capacity** | 10 GB |
| **Public IP** | *(leave default)* |
| **SSL connections** | *(optional for dev)* |

**Advanced options:**
- Backup location: `us` (auto)
- Maintenance window: Default
- Flags: *(none needed)*

Click **Create Instance** (takes 5-10 minutes)

## Step 3: Configure Network Access

Once created, in the Cloud SQL instance page:

1. Click **"Connections"** tab (left sidebar)
2. Under "Public IP", click **"Add a network"**
3. Click the name field → enter `0.0.0.0/0` (allow all IP addresses)
4. Click **Save**

⚠️ *This allows any IP to connect. In production, restrict to App Hosting's IPs.*

## Step 4: Create Database & User (Optional)

By default, PostgreSQL has a `postgres` user and `postgres` database.

If you want to create a separate DB/user:

1. In Cloud SQL instance, click **"Databases"** tab
2. Click **"Create database"** → name it `kabuki`
3. Click **"Users"** tab → **"Create user"** → add `kabuki` user

For simplicity, we'll use the default `postgres` user and `postgres` database.

## Step 5: Get Connection String

In the Cloud SQL instance page:

1. Find **"Connect using Cloud Shell"** → copy the connection string
2. Or manually build it:
   ```
   postgresql://postgres:PASSWORD@PUBLIC_IP:5432/postgres
   ```

   Where:
   - `PASSWORD` = password you set earlier
   - `PUBLIC_IP` = shown under "Public IP address" (e.g., `35.123.45.67`)

Example:
```
postgresql://postgres:MySecurePassword123@35.123.45.67:5432/postgres
```

## Step 6: Set Secrets in Firebase

```bash
# Set DATABASE_URL
npx firebase apphosting:secrets:set DATABASE_URL

# Paste your connection string (from Step 5), then press Enter
# It will show: ✓ Created secret DATABASE_URL

# Generate AUTH_SECRET (only if you don't have one)
npx auth secret
# This outputs a random string

# Set AUTH_SECRET
npx firebase apphosting:secrets:set AUTH_SECRET
# Paste the secret, press Enter

# Grant backend access to secrets
npx firebase apphosting:secrets:grantaccess DATABASE_URL --backend kabuki
npx firebase apphosting:secrets:grantaccess AUTH_SECRET --backend kabuki
```

## Step 7: Initialize Database

```bash
# Create all tables
npm run db:push

# Seed demo users & categories
npm run db:seed
```

You should see:
```
🌱 Seeding database...
✓ Users created
✓ Categories created
✅ Seed complete!
```

## Step 8: Create App Hosting Backend

```bash
npx firebase apphosting:backends:create
```

This opens a wizard:
1. Select backend ID: keep default or enter `kabuki`
2. Connect repository: select your GitHub repo
3. Select branch: `main`
4. Confirm deployment configuration

## Step 9: Deploy

Push to GitHub (this auto-triggers deploy if connected):

```bash
git push origin main
```

Or manually deploy:

```bash
npx firebase apphosting:backends:deploy kabuki
```

Monitor the build:
```bash
npx firebase apphosting:builds:list --backend kabuki
```

## Step 10: Verify

1. Go to https://mybuttons.casa
2. Log in with:
   - Email: `user1@example.com`
   - Password: `password`
3. You should see the dashboard with the mock data (real data fills in once you link a Plaid account)

## Troubleshooting

**"Connection refused" on db:push:**
- Verify Cloud SQL instance is running
- Check if Public IP is added to network access (Step 4)
- Test connection: `psql "postgresql://postgres:PASSWORD@PUBLIC_IP:5432/postgres"`

**"Secrets not found" error:**
- Run grantaccess commands (Step 6, last 2 commands)
- Wait 30 seconds after setting secrets

**App shows "No accounts linked":**
- This is normal! Users haven't linked Plaid yet
- Go to Settings → Link Bank Account to add real data

**Custom domain not working:**
- DNS changes can take 15-60 minutes to propagate
- Check Firebase Console → App Hosting → Custom domains for status

## Next Steps

1. Link real bank accounts (Settings → Link Bank Account)
2. Invite the second user (add to database manually or via UI)
3. Scale Cloud SQL if needed (Dashboard in Cloud Console)
4. Enable SSL for public access (Security best practice)
5. Set up automated backups (Cloud SQL → Backups)

---

**Costs:** Cloud SQL `db-f1-micro` is free tier eligible (~$0/month for light usage). Charges apply for storage and data transfer beyond free limits.
