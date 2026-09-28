import fs from 'fs';
import path from 'path';
import https from 'https';

const batch = [
  { slug: 'share-large-files-secure-link', url: 'https://images.unsplash.com/photo-1614064641913-6b71f3bb9e32?q=80&w=800&auto=format&fit=crop' },
  { slug: 'free-file-transfer-without-registration', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop' },
  { slug: 'wetransfer-alternatives', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop' }
];

const PUBLIC_DIR = path.resolve('client/public/images/blog');
const POSTS_FILE = path.resolve('client/src/data/blog-posts-data.ts');

let tsContent = fs.readFileSync(POSTS_FILE, 'utf8');

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function finish() {
  for (const {slug, url} of batch) {
    const destPath = path.join(PUBLIC_DIR, `${slug}.jpg`);
    
    console.log(`Downloading premium stock for ${slug}...`);
    await downloadImage(url, destPath);
    
    const blockStart = tsContent.indexOf(`"${slug}": {`);
    if (blockStart !== -1) {
      const blockEnd = tsContent.indexOf('content: `', blockStart);
      const block = tsContent.substring(blockStart, blockEnd);
      let newBlock = block;
      
      if (newBlock.includes('featureImage:')) {
        newBlock = newBlock.replace(/featureImage:\s*"[^"]+",/, `featureImage: "/images/blog/${slug}.jpg",`);
      } else {
        newBlock = newBlock.replace(/iconName:\s*"([^"]+)",/, `iconName: "$1",\n    featureImage: "/images/blog/${slug}.jpg",`);
      }
      
      tsContent = tsContent.substring(0, blockStart) + newBlock + tsContent.substring(blockEnd);
    }
  }

  fs.writeFileSync(POSTS_FILE, tsContent, 'utf8');
  console.log("TS File successfully updated for the final 3 posts.");
}

finish();
