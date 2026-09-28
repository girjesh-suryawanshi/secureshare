import fs from 'fs';
import path from 'path';

const batch = [
  { slug: 'browser-based-file-sharing-benefits-2026', img: 'browser_based_benefits_1790570892768.png' },
  { slug: 'anonymous-file-sharing-privacy-2026', img: 'anonymous_file_sharing_1790570916790.png' },
  { slug: 'future-of-digital-file-exchange-2026-beyond', img: 'future_digital_exchange_1790570932907.png' },
  { slug: 'secure-p2p-file-transfer-methods-2026', img: 'secure_p2p_methods_1790570949995.png' },
  { slug: 'how-to-bypass-email-attachment-limits', img: 'bypass_email_limits_1790570964619.png' },
  { slug: 'secure-tls-file-sharing-explained', img: 'tls_file_sharing_1790570976299.png' },
  { slug: 'send-large-files-online-free', img: 'send_large_files_online_free_1790571001205.png' },
  { slug: 'large-file-transfer', img: 'large_file_transfer_1790571013110.png' },
  { slug: 'secure-file-transfer', img: 'secure_file_transfer_1790571029097.png' },
  { slug: 'send-files-larger-than-25mb', img: 'send_files_larger_than_25mb_1790571042658.png' },
  { slug: 'send-large-videos-without-losing-quality', img: 'send_large_videos_1790571055236.png' },
  { slug: 'transfer-large-files-phone-pc', img: 'transfer_large_files_phone_pc_1790571078903.png' },
  { slug: 'send-large-files-by-email', img: 'send_large_files_email_1790571103465.png' }
];

const ARTIFACT_DIR = path.resolve('C:/Users/MPPKVVCL/.gemini/antigravity-ide/brain/8ed78bd8-0eeb-4634-bff7-08bce890f2b3');
const PUBLIC_DIR = path.resolve('client/public/images/blog');
const POSTS_FILE = path.resolve('client/src/data/blog-posts-data.ts');

let tsContent = fs.readFileSync(POSTS_FILE, 'utf8');

for (const {slug, img} of batch) {
  const artifactPath = path.join(ARTIFACT_DIR, img);
  const destPath = path.join(PUBLIC_DIR, `${slug}.png`);
  
  if (fs.existsSync(artifactPath)) {
    fs.copyFileSync(artifactPath, destPath);
    console.log(`Copied: ${slug}.png`);
    
    const blockStart = tsContent.indexOf(`"${slug}": {`);
    if (blockStart !== -1) {
      const blockEnd = tsContent.indexOf('content: `', blockStart);
      const block = tsContent.substring(blockStart, blockEnd);
      let newBlock = block;
      
      if (newBlock.includes('featureImage:')) {
        newBlock = newBlock.replace(/featureImage:\s*"[^"]+",/, `featureImage: "/images/blog/${slug}.png",`);
      } else {
        newBlock = newBlock.replace(/iconName:\s*"([^"]+)",/, `iconName: "$1",\n    featureImage: "/images/blog/${slug}.png",`);
      }
      
      tsContent = tsContent.substring(0, blockStart) + newBlock + tsContent.substring(blockEnd);
    }
  } else {
    console.log(`Missing: ${artifactPath}`);
  }
}

fs.writeFileSync(POSTS_FILE, tsContent, 'utf8');
console.log("TS File successfully updated for batch 3.");
