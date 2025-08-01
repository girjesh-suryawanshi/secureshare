# SecureShare - Hostinger Deployment Guide

## Step-by-Step Deployment Instructions

### 1. Prepare Your Hostinger Account

1. **Log into Hostinger** and access your hosting control panel (hPanel)
2. **Ensure Node.js Support**: Your hosting plan must support Node.js applications
   - Premium and Business plans support Node.js
   - Shared hosting may not support Node.js - you'll need a VPS or Cloud hosting

### 2. Upload Your Application Files

1. **Extract the deployment ZIP** file you downloaded
2. **Connect via File Manager** or FTP client
3. **Navigate to public_html** (or your domain's root directory)
4. **Upload all files** from the extracted folder:
   - `index.js` (your server file)
   - `public/` folder (contains your website files)
   - `package.json` (dependencies list)

### 3. Set Up Node.js Application

1. **In Hostinger hPanel**, go to **Advanced → Node.js**
2. **Create New Application**:
   - **Node.js Version**: Select 18.x or higher
   - **Application Root**: `/public_html` (or your domain folder)
   - **Application URL**: Your domain name
   - **Application Startup File**: `index.js`

### 4. Install Dependencies

1. **Open Terminal** in your Hostinger control panel
2. **Navigate to your app directory**:
   ```bash
   cd public_html
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

### 5. Configure Environment (if needed)

If you plan to use a database later:
1. **Create a database** in Hostinger control panel
2. **Set environment variables** in Node.js app settings:
   - `DATABASE_URL` (if using external database)
   - `NODE_ENV=production`

### 6. Start Your Application

1. **In Node.js section**, click **Start Application**
2. **Your app should now be live** at your domain!

## Alternative: Manual VPS Setup (If Node.js Not Available)

If your hosting doesn't support Node.js applications:

### Option 1: Static Files Only (Limited Functionality)
1. **Upload only the `public/` folder contents** to your `public_html`
2. **This will work as a static website** but file transfers won't work
3. **WebSocket functionality will be disabled**

### Option 2: Upgrade to VPS/Cloud Hosting
1. **Consider upgrading** to Hostinger VPS or Cloud hosting
2. **Full Node.js support** with complete application functionality
3. **Better performance** and more control

## Troubleshooting

### Common Issues:

1. **"Application Failed to Start"**
   - Check Node.js version (needs 18+)
   - Verify all files uploaded correctly
   - Check error logs in control panel

2. **"Dependencies Missing"**
   - Run `npm install` in terminal
   - Check internet connection during installation

3. **"Port Already in Use"**
   - Hostinger automatically assigns ports
   - Don't modify port settings in the code

4. **WebSocket Connection Issues**
   - Ensure your hosting plan supports WebSocket
   - Check firewall settings

### Testing Your Deployment:

1. **Visit your domain** - you should see the SecureShare homepage
2. **Test navigation** - click through all pages (About, Contact, etc.)
3. **Test file sharing**:
   - Click "Send Files" and select a test file
   - Note the 6-digit code
   - Click "Receive Files" and enter the code
   - File should download successfully

## Technical Notes

- **Server Port**: Application automatically uses Hostinger's assigned port
- **File Size Limits**: Depend on your hosting plan and browser memory
- **Transfer Codes**: Expire after 1 hour for security
- **No Database Required**: App works with memory storage
- **SSL Certificate**: Automatically provided by Hostinger

## Support

If you encounter issues:
1. **Check Hostinger documentation** for Node.js apps
2. **Contact Hostinger support** for hosting-specific issues
3. **Check browser console** for client-side errors

## Performance Tips

1. **Enable Gzip compression** in Hostinger control panel
2. **Use CDN** if available in your plan
3. **Monitor resource usage** in control panel
4. **Regular backups** of your application files

Your SecureShare application should now be live and fully functional on Hostinger!