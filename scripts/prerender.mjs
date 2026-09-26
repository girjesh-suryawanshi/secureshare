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

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch({ headless: 'new' });
  
  // 3. Visit each route and capture HTML
  for (const route of routes) {
    console.log(`Pre-rendering ${route} ...`);
    const page = await browser.newPage();
    
    // Intercept API calls if necessary, or just block images to speed it up
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.resourceType() === 'image' || req.resourceType() === 'media') {
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
      : path.join(distPath, route, 'index.html');
      
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, `<!DOCTYPE html>\n<html lang="en">\n${html}\n</html>`);
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
