#!/bin/bash

# MEMBRA LLM Inference Layer - Vercel Deployment Script
# This script deploys the LLM inference layer to Vercel

set -e

echo "🚀 Deploying MEMBRA LLM Inference Layer to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check environment variables
if [ -z "$SOLANA_RPC_URL" ]; then
    echo "⚠️  SOLANA_RPC_URL not set. Using devnet default."
    export SOLANA_RPC_URL="https://api.devnet.solana.com"
fi

if [ -z "$TOKEN_MINT" ]; then
    echo "❌ TOKEN_MINT not set. Please set the token mint address."
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set up environment variables in Vercel dashboard:"
echo "   - SOLANA_RPC_URL"
echo "   - TOKEN_MINT"
echo "   - GITHUB_TOKEN (optional, for GitHub integration)"
echo ""
echo "2. Configure your GitHub repository for proof capsules:"
echo "   - Create a new repository or use existing"
echo "   - Set up GitHub personal access token"
echo "   - Add GITHUB_TOKEN to Vercel environment variables"
echo ""
echo "3. Test the deployment:"
echo "   - Visit the deployed URL"
echo "   - Connect your Solana wallet"
echo "   - Submit a test inference request"
