# SecureShare - Vercel Deployment Guide

## Quick Deployment Steps

### 1. Prepare Your Files
Your SecureShare app is now ready for Vercel deployment with these files:
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/index.js` - Serverless function for the backend
- ✅ All React frontend files in `client/src/`

### 2. Deploy to Vercel

**Option A: Deploy via Vercel CLI**
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy your app
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name: secureshare (or your preferred name)
# - In which directory is your code located? ./
```

**Option B: Deploy via GitHub + Vercel Dashboard**
1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New" → "Project" 
4. Import your GitHub repository
5. Vercel will automatically detect the settings

### 3. Environment Variables (if needed)
If you want to use a database, add these in Vercel dashboard:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NODE_ENV` - Set to "production"

### 4. Custom Domain (Optional)
In Vercel dashboard:
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain

## What's Configured

### Frontend (React + Vite)
- ✅ Builds to `dist/public/`
- ✅ All your pages: Home, About, Contact, Privacy, Terms, Disclaimer
- ✅ Professional navigation and footer
- ✅ File upload/download functionality

### Backend (Express Serverless)
- ✅ File upload API at `/api/upload`
- ✅ File download API at `/api/download/:code`
- ✅ Health check at `/api/health`
- ✅ 6-digit code generation
- ✅ Automatic file cleanup after 1 hour

### Features Working on Vercel
- ✅ Multiple file uploads
- ✅ Automatic ZIP packaging
- ✅ 6-digit code sharing
- ✅ All legal pages for AdSense compliance
- ✅ Mobile responsive design
- ✅ Professional branding

## Important Notes

1. **Serverless Limitations**: WebSocket real-time features are simplified for Vercel's serverless environment
2. **File Storage**: Files are stored in memory temporarily (perfect for your use case)
3. **Auto-scaling**: Vercel automatically scales based on traffic
4. **HTTPS**: Vercel provides free SSL certificates
5. **CDN**: Global content delivery network included

## Testing Your Deployment

After deployment, test these URLs:
- `https://your-app.vercel.app/` - Main app
- `https://your-app.vercel.app/about` - About page
- `https://your-app.vercel.app/api/health` - API health check

## Troubleshooting

If you encounter issues:
1. **Runtime Error**: Make sure `vercel.json` uses the correct runtime version
2. **Build Errors**: Check that `vite build` works locally first
3. **Function Errors**: Check Vercel's function logs in the dashboard
4. **Dependencies**: Ensure all required packages are in dependencies (not devDependencies)

## Fixed Issues
- ✅ Fixed function runtime configuration error
- ✅ Removed problematic runtime specification
- ✅ Simplified vercel.json for automatic detection
- ✅ Added api/package.json for ES modules support

Your SecureShare app will be live on Vercel with:
- Professional Google AdSense-ready website
- Fast global CDN delivery
- Automatic HTTPS
- Serverless auto-scaling
- Zero server maintenance required!