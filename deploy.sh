#!/bin/bash
# Bash script for Railway deployment monitoring
# Usage: ./deploy.sh

echo "================================="
echo "  خوام - نشر على Railway"
echo "================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️ Railway CLI not found."
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Railway CLI"
        exit 1
    fi
    echo "✅ Railway CLI installed successfully"
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Uncommitted changes detected:"
    git status --short
    echo ""
    read -p "Do you want to commit and push? (y/n) " commit
    if [ "$commit" = "y" ] || [ "$commit" = "Y" ]; then
        read -p "Enter commit message (or press Enter for default): " commit_message
        if [ -z "$commit_message" ]; then
            commit_message="Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        echo "📤 Committing and pushing changes..."
        git add .
        git commit -m "$commit_message"
        git push
        if [ $? -ne 0 ]; then
            echo "❌ Failed to push to GitHub"
            exit 1
        fi
        echo "✅ Code pushed to GitHub"
    else
        echo "⚠️ Skipping commit. Make sure to commit and push manually."
    fi
else
    echo "✅ No uncommitted changes"
fi

echo ""
echo "🚀 Railway will automatically deploy from GitHub"
echo "📊 Monitor deployment at: https://railway.app"
echo ""

# Ask if user wants to monitor logs
read -p "Do you want to monitor deployment logs? (y/n) " monitor
if [ "$monitor" = "y" ] || [ "$monitor" = "Y" ]; then
    echo ""
    echo "📋 Opening Railway logs (Press Ctrl+C to stop)..."
    railway logs --follow
else
    echo ""
    echo "💡 To monitor logs later, run: railway logs --follow"
    echo "💡 Or check status: railway status"
fi

echo ""
echo "✅ Deployment process completed!"

