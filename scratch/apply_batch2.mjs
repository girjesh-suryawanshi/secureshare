import fs from 'fs';
import path from 'path';

const batch = [
  { slug: 'security-trends-file-sharing-2026', img: 'security_trends_1790563265801.png' },
  { slug: 'fastest-ways-to-transfer-large-files-2026', img: 'fastest_ways_transfer_1790563278394.png' },
  { slug: 'best-free-file-transfer-no-registration-2026', img: 'best_free_file_transfer_1790563291048.png' },
  { slug: 'how-to-share-files-securely-online-2025', img: 'how_to_share_securely_1790563323753.png' },
  { slug: 'peer-to-peer-vs-cloud-storage-comparison', img: 'p2p_vs_cloud_storage_1790563337192.png' },
  { slug: 'best-free-file-sharing-no-registration', img: 'best_free_file_sharing_1790563349040.png' },
  { slug: 'send-large-files-instantly-methods', img: 'send_large_files_instantly_1790563365053.png' },
  { slug: '6-digit-code-file-sharing-future', img: '6_digit_code_future_1790563389765.png' },
  { slug: 'share-files-iphone-android-cross-platform', img: 'cross_platform_iphone_android_1790563403221.png' },
  { slug: 'zip-file-sharing-compress-multiple-files', img: 'zip_file_sharing_1790563416102.png' },
  { slug: 'how-to-share-confidential-documents-2026', img: 'share_confidential_documents_1790563428833.png' },
  { slug: 'p2p-vs-email-sharing-comparison-2026', img: 'p2p_vs_email_1790563440490.png' },
  { slug: 'cross-platform-file-sharing-guide-2026', img: 'cross_platform_guide_1790563462868.png' }
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
console.log("TS File successfully updated.");
