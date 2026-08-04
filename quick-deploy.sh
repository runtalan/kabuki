#!/bin/bash

# Quick Kabuki Deployment Script
# Run this on your local machine after: npx firebase login

set -e

echo "🚀 Kabuki Quick Deploy"
echo "====================="
echo ""

# Set variables
DATABASE_URL="postgresql://postgres:br0wnC0wsql1!@34.72.170.1:5432/postgres"
PROJECT_ID="my-buttons-f6c4a"
BACKEND_ID="kabuki"

# Generate AUTH_SECRET
echo "Generating AUTH_SECRET..."
AUTH_SECRET=$(npx auth secret 2>/dev/null)
echo "✓ Generated: $AUTH_SECRET"
echo ""

# Set secrets
echo "Setting DATABASE_URL secret..."
echo -n "$DATABASE_URL" | npx firebase apphosting:secrets:set DATABASE_URL --silent 2>/dev/null || \
  (echo "$DATABASE_URL" | npx firebase apphosting:secrets:set DATABASE_URL)
echo "✓ DATABASE_URL set"
echo ""

echo "Setting AUTH_SECRET..."
echo -n "$AUTH_SECRET" | npx firebase apphosting:secrets:set AUTH_SECRET --silent 2>/dev/null || \
  (echo "$AUTH_SECRET" | npx firebase apphosting:secrets:set AUTH_SECRET)
echo "✓ AUTH_SECRET set"
echo ""

# Grant access
echo "Granting backend access to secrets..."
npx firebase apphosting:secrets:grantaccess DATABASE_URL --backend $BACKEND_ID
npx firebase apphosting:secrets:grantaccess AUTH_SECRET --backend $BACKEND_ID
echo "✓ Secrets granted"
echo ""

# Database
echo "Running database migrations..."
npm run db:push
echo "✓ Schema created"
echo ""

echo "Seeding database..."
npm run db:seed
echo "✓ Database seeded"
echo ""

# Deploy
echo "Creating App Hosting backend..."
echo "Note: You'll need to:"
echo "  1. Select 'kabuki' as backend ID"
echo "  2. Connect your GitHub repo (runtalan/kabuki)"
echo "  3. Select 'main' branch"
echo ""
read -p "Press Enter to continue..."
npx firebase apphosting:backends:create
echo ""

echo "Pushing to GitHub to trigger deploy..."
git push origin main
echo "✓ Pushed"
echo ""

echo "Checking build status..."
npx firebase apphosting:builds:list --backend $BACKEND_ID
echo ""

echo "✅ Deployment initiated!"
echo ""
echo "Your app will be live at: https://mybuttons.casa"
echo "Demo login:"
echo "  Email: user1@example.com"
echo "  Password: password"
echo ""
