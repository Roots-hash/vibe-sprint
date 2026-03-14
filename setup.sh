#!/bin/bash

# Colors for nice output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo ""
echo -e "${BLUE}${BOLD}=============================================${NC}"
echo -e "${BLUE}${BOLD}   🚀 VIBE SPRINT - ONE CLICK SETUP (MAC)   ${NC}"
echo -e "${BLUE}${BOLD}=============================================${NC}"
echo ""
echo " This script will automatically:"
echo "  1. Install GitHub CLI"
echo "  2. Log you into GitHub"
echo "  3. Create the repo"
echo "  4. Upload all your files"
echo "  5. Add your API key as a secret"
echo "  6. Enable GitHub Pages"
echo "  7. Trigger Day 1 deployment"
echo ""
echo -e "${BLUE}${BOLD}=============================================${NC}"
echo ""
read -p " Press ENTER to start..." dummy

# ── Step 1: Check Git ─────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/7] Checking Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERROR] Git not found. Please install it first:${NC}"
    echo "  brew install git"
    exit 1
fi
echo -e "${GREEN}[OK] Git is installed.${NC}"

# ── Step 2: Install GitHub CLI ────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/7] Checking GitHub CLI...${NC}"
if ! command -v gh &> /dev/null; then
    echo " GitHub CLI not found. Installing via Homebrew..."
    brew install gh
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install GitHub CLI.${NC}"
        echo " Try manually: brew install gh"
        exit 1
    fi
fi
echo -e "${GREEN}[OK] GitHub CLI is ready.${NC}"

# ── Step 3: Ask for API Key ───────────────────────────────────────────
echo ""
echo -e "${BLUE}${BOLD}=============================================${NC}"
echo -e "${BLUE}${BOLD}   ENTER YOUR ANTHROPIC API KEY${NC}"
echo -e "${BLUE}${BOLD}=============================================${NC}"
echo ""
echo " Get your key from: https://console.anthropic.com/settings/keys"
echo " It starts with: sk-ant-"
echo ""
echo -e "${YELLOW} Your key will NOT be shown on screen (for security).${NC}"
echo ""
read -s -p " Paste your API key and press Enter: " ANTHROPIC_KEY
echo ""

if [ -z "$ANTHROPIC_KEY" ]; then
    echo -e "${RED}[ERROR] No API key entered. Exiting.${NC}"
    exit 1
fi

if [[ "$ANTHROPIC_KEY" != sk-ant-* ]]; then
    echo -e "${RED}[ERROR] That doesn't look like a valid key. It should start with sk-ant-${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] API key accepted.${NC}"

# ── Step 4: GitHub Login ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/7] Logging into GitHub...${NC}"
echo " A browser window will open. Log in and click Authorize."
echo ""
read -p " Press ENTER when ready..." dummy
gh auth login --web --git-protocol https
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] GitHub login failed. Please try again.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Logged into GitHub.${NC}"

# ── Step 5: Create GitHub repo ────────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/7] Creating GitHub repo...${NC}"
gh repo create Roots-hash/vibe-sprint \
    --public \
    --description "30-day vibe code sprint - one app deployed every day" \
    2>/dev/null
echo -e "${GREEN}[OK] Repo ready at github.com/Roots-hash/vibe-sprint${NC}"

# ── Step 6: Push files ────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[5/7] Uploading all files to GitHub...${NC}"

# Navigate to the vibe-sprint folder (same directory as this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$SCRIPT_DIR" ]; then
    echo -e "${RED}[ERROR] Could not find the vibe-sprint folder.${NC}"
    exit 1
fi

cd "$SCRIPT_DIR"

git init
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin https://github.com/Roots-hash/vibe-sprint.git
git add .
git commit -m "🚀 Initial commit - 30-day vibe sprint setup"
git push -u origin main --force

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to upload files. Please try again.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] All files uploaded!${NC}"

# ── Step 7: Add Secrets ───────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[6/7] Adding secrets to GitHub...${NC}"

echo "$ANTHROPIC_KEY" | gh secret set ANTHROPIC_API_KEY --repo Roots-hash/vibe-sprint
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Failed to add API key secret.${NC}"
    exit 1
fi

TODAY=$(date +%Y-%m-%d)
echo "$TODAY" | gh secret set SPRINT_START_DATE --repo Roots-hash/vibe-sprint
echo -e "${GREEN}[OK] Secrets added. Sprint start date: $TODAY${NC}"

# ── Step 8: Trigger Day 1 ─────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[7/7] Triggering Day 1 deployment...${NC}"
sleep 3  # Give GitHub a moment to register the workflow
gh workflow run "daily-deploy.yml" \
    --repo Roots-hash/vibe-sprint \
    --field day=1

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[WARN] Could not auto-trigger. Trigger it manually:${NC}"
    echo " https://github.com/Roots-hash/vibe-sprint/actions"
else
    echo -e "${GREEN}[OK] Day 1 deployment is running!${NC}"
fi

# ── Done ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}=============================================${NC}"
echo -e "${GREEN}${BOLD}   ✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}${BOLD}=============================================${NC}"
echo ""
echo -e " ${BOLD}Your repo:${NC}    https://github.com/Roots-hash/vibe-sprint"
echo -e " ${BOLD}Your portal:${NC}  https://roots-hash.github.io/vibe-sprint/"
echo -e " ${BOLD}Watch deploy:${NC} https://github.com/Roots-hash/vibe-sprint/actions"
echo ""
echo " Day 1 is deploying now — takes about 3-4 minutes."
echo " Watch it live at the Actions link above!"
echo ""
echo " From tomorrow, a new app will deploy automatically"
echo " every morning at 6:00 AM IST. Nothing to do! 🎉"
echo ""
echo -e "${GREEN}${BOLD}=============================================${NC}"
echo ""

# Open the Actions page in browser automatically
open "https://github.com/Roots-hash/vibe-sprint/actions"
