import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist/public');

// We need to read the blog post slugs from the file system or import it.
// Since blog-posts-data.ts is TypeScript, let's just parse it using regex for simplicity in this script.
const blogDataRaw = fs.readFileSync(path.resolve(__dirname, '../client/src/data/blog-posts-data.ts'), 'utf-8');
const slugs = [...blogDataRaw.matchAll(/slug:\s*["']([^"']+)["']/g)].map(m => m[1]);

const routes = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/blog',
  ...slugs.map(slug => `/blog/${slug}`)
];

async function prerender() {
  console.log('Starting prerender process...');
  
  // 1. Spin up a temporary static server
  const app = express();
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  const server = app.listen(3456, () => {
    console.log('Static server listening on port 3456');
  });

  // 2. Launch Puppeteer - use system Chromium in Docker (Alpine), bundled Chrome locally
  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const browser = await puppeteer.launch(launchOptions);
  
  // 3. Visit each route and capture HTML
  for (const route of routes) {
    console.log(`Pre-rendering ${route} ...`);
    const page = await browser.newPage();
    
    // Block AdSense, GTM, analytics and images to keep prerendered HTML clean
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      const blocked = [
        'pagead2.googlesyndication.com',
        'googleads.g.doubleclick.net',
        'googletagmanager.com',
        'google-analytics.com',
        'adsbygoogle',
        'recaptcha',
        'fundingchoicesmessages.google.com',
      ];
      const type = req.resourceType();
      if (type === 'image' || type === 'media' || blocked.some(b => url.includes(b))) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(`http://localhost:3456${route}`, { waitUntil: 'networkidle0' });
    
    // Wait an extra second for React to fully mount and render data
    await new Promise(r => setTimeout(r, 1000));
    
    const html = await page.evaluate(() => {
      // Clean up dynamic scripts injected by Vite dev server if any, but we are running on dist
      return document.documentElement.outerHTML;
    });
    
    await page.close();
    
    // 4. Save the HTML file
    const isIndex = route === '/';
    const filePath = isIndex 
      ? path.join(distPath, 'index.html')
      : path.join(distPath, `${route}.html`);
      
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Post-process: strip all ad/tracking scripts from the saved HTML
    const cleanedHtml = html
      // Remove AdSense script tag
      .replace(/<script[^>]*pagead2\.googlesyndication\.com[^>]*><\/script>/gi, '')
      // Remove GTM script tags
      .replace(/<script[^>]*googletagmanager\.com[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove GA gtag script tags  
      .replace(/<script[^>]*gtag[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove any <ins class="adsbygoogle"> elements including their children
      .replace(/<ins[^>]*adsbygoogle[^>]*>[\s\S]*?<\/ins>/gi, '')
      // Remove GTM noscript iframe
      .replace(/<noscript>[\s\S]*?googletagmanager[\s\S]*?<\/noscript>/gi, '')
      // Remove google_esf iframe
      .replace(/<iframe[^>]*google_esf[^>]*>[\s\S]*?<\/iframe>/gi, '')
      // Remove recaptcha iframe
      .replace(/<iframe[^>]*recaptcha[^>]*>[\s\S]*?<\/iframe>/gi, '');

    fs.writeFileSync(filePath, `<!DOCTYPE html>\n${cleanedHtml}`);
    console.log(`Saved ${filePath}`);
  }

  await browser.close();
  server.close();
  console.log('Prerendering complete!');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
