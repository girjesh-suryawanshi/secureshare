import fs from 'fs';
import path from 'path';

const batch = [
  { slug: 'transfer-large-files-between-android-and-iphone-instantly', img: 'transfer_large_files_android_iphone_1790529876431.png' },
  { slug: 'best-wetransfer-alternatives-for-small-files', img: 'best_wetransfer_alternatives_1790529896836.png' },
  { slug: 'how-to-send-files-to-another-computer-using-a-code', img: 'how_to_send_files_code_1790529914065.png' },
  { slug: 'temporary-file-sharing-for-one-time-use', img: 'temporary_file_sharing_1790529933414.png' },
  { slug: 'browser-to-browser-file-transfer-no-setup', img: 'browser_to_browser_transfer_1790529951075.png' },
  { slug: 'share-files-without-signup-instant-send', img: 'share_files_without_signup_1790529972892.png' },
  { slug: 'send-files-using-6-digit-code-secure-way', img: 'send_files_6_digit_code_1790529992241.png' },
  { slug: 'ultimate-guide-to-p2p-file-sharing-2026', img: 'p2p_file_sharing_guide_1790530010656.png' }
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
