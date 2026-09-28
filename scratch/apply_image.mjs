import fs from 'fs';
import path from 'path';

const [slug, artifactPath] = process.argv.slice(2);
if (!slug || !artifactPath) {
  console.error("Usage: node apply_image.mjs <slug> <artifactPath>");
  process.exit(1);
}

const destPath = path.resolve(`client/public/images/blog/${slug}.png`);

// Copy the file
fs.copyFileSync(path.resolve(artifactPath), destPath);
console.log(`Copied image for ${slug}`);

// Update TS file
const POSTS_FILE = path.resolve('client/src/data/blog-posts-data.ts');
let tsContent = fs.readFileSync(POSTS_FILE, 'utf8');

const regex = new RegExp(`("${slug}":\\s*\\{[\\s\\S]*?)(?:featureImage:\\s*"[^"]+",)?([\\s\\S]*?content:\\s*\`)`, 'g');

tsContent = tsContent.replace(regex, (match, p1, p2) => {
  // If it already had a featureImage, we might capture it or not depending on the regex.
  // Actually, a safer replace: just find the block for the slug, then replace the image line or insert it.
  return match; // We'll do it safer below
});

// Let's do a simpler replacement. Find the block for the slug.
const blockStart = tsContent.indexOf(`"${slug}": {`);
if (blockStart === -1) {
  console.error("Slug not found in TS file.");
  process.exit(1);
}

const blockEnd = tsContent.indexOf('content: `', blockStart);
const block = tsContent.substring(blockStart, blockEnd);

let newBlock = block;
if (newBlock.includes('featureImage:')) {
  newBlock = newBlock.replace(/featureImage:\s*"[^"]+",/, `featureImage: "/images/blog/${slug}.png",`);
} else {
  newBlock = newBlock.replace(/iconName:\s*"([^"]+)",/, `iconName: "$1",\n    featureImage: "/images/blog/${slug}.png",`);
}

tsContent = tsContent.substring(0, blockStart) + newBlock + tsContent.substring(blockEnd);
fs.writeFileSync(POSTS_FILE, tsContent, 'utf8');
console.log(`Updated TS file for ${slug}`);
