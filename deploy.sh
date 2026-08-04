#!/bin/bash

# Kabuki Deployment Script for Firebase App Hosting
# This script automates the entire deployment process

set -e  # Exit on error

echo "🚀 Kabuki Firebase Deployment Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Firebase Login
echo -e "${BLUE}Step 1: Firebase Login${NC}"
echo "This will open your browser to log in..."
npx firebase login
echo -e "${GREEN}✓ Firebase login complete${NC}"
echo ""

# Step 2: Set DATABASE_URL Secret
echo -e "${BLUE}Step 2: Setting DATABASE_URL Secret${NC}"
echo "Connection string:"
echo "postgresql://postgres:br0wnC0wsql1!@34.72.170.1:5432/postgres"
echo ""
npx firebase apphosting:secrets:set DATABASE_URL
echo -e "${GREEN}✓ DATABASE_URL secret created${NC}"
echo ""

# Step 3: Generate and Set AUTH_SECRET
echo -e "${BLUE}Step 3: Setting AUTH_SECRET${NC}"
AUTH_SECRET=$(npx auth secret 2>/dev/null)
echo "Generated AUTH_SECRET: $AUTH_SECRET"
echo ""
echo "Setting AUTH_SECRET in Firebase..."
echo "$AUTH_SECRET" | npx firebase apphosting:secrets:set AUTH_SECRET
echo -e "${GREEN}✓ AUTH_SECRET secret created${NC}"
echo ""

# Step 4: Grant Access to Secrets
echo -e "${BLUE}Step 4: Granting Backend Access to Secrets${NC}"
npx firebase apphosting:secrets:grantaccess DATABASE_URL --backend kabuki
npx firebase apphosting:secrets:grantaccess AUTH_SECRET --backend kabuki
echo -e "${GREEN}✓ Secrets granted to backend${NC}"
echo ""

# Step 5: Initialize Database
echo -e "${BLUE}Step 5: Running Database Migrations${NC}"
npm run db:push
echo -e "${GREEN}✓ Database schema created${NC}"
echo ""

# Step 6: Seed Database
echo -e "${BLUE}Step 6: Seeding Database${NC}"
npm run db:seed
echo -e "${GREEN}✓ Database seeded with demo data${NC}"
echo ""

# Step 7: Create App Hosting Backend
echo -e "${BLUE}Step 7: Creating App Hosting Backend${NC}"
echo "Follow the prompts to:"
echo "  1. Use 'kabuki' as backend ID"
echo "  2. Connect your GitHub repository"
echo "  3. Select 'main' branch"
echo ""
npx firebase apphosting:backends:create
echo -e "${GREEN}✓ Backend created${NC}"
echo ""

# Step 8: Commit and Push to GitHub
echo -e "${BLUE}Step 8: Pushing to GitHub${NC}"
git add -A
git commit -m "Firebase deployment configuration" 2>/dev/null || echo "No new changes to commit"
git push origin main
echo -e "${GREEN}✓ Pushed to GitHub (deployment triggered)${NC}"
echo ""

# Step 9: Monitor Deployment
echo -e "${BLUE}Step 9: Monitoring Deployment${NC}"
echo "Checking build status..."
npx firebase apphosting:builds:list --backend kabuki
echo ""

echo -e "${GREEN}===================================="
echo "✅ Deployment Complete!"
echo "===================================${NC}"
echo ""
echo "Your app is deploying to: https://mybuttons.casa"
echo ""
echo "Demo credentials:"
echo "  Email: user1@example.com"
echo "  Password: password"
echo ""
echo "Monitor deployment: npx firebase apphosting:builds:list --backend kabuki"
echo ""
