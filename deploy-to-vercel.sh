#!/bin/bash
# SecureShare - Vercel Deployment Script

echo "🚀 Deploying SecureShare to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "📦 Building the project..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "Your SecureShare app is now live on Vercel!"
echo "Features available:"
echo "✓ Professional landing page with Google AdSense-ready content"
echo "✓ Multiple file upload and download"
echo "✓ Automatic ZIP packaging for multiple files"
echo "✓ 6-digit code sharing system"
echo "✓ All legal pages: Privacy Policy, Terms, Disclaimer"
echo "✓ Mobile-responsive design"
echo "✓ Fast global CDN delivery"
echo "✓ Automatic HTTPS"
echo ""
echo "Test your deployment:"
echo "1. Visit your Vercel URL"
echo "2. Try uploading files and sharing codes"
echo "3. Check all navigation pages work correctly"