import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple regex to count words in HTML content
function countWords(str) {
  const text = str.replace(/<[^>]*>?/gm, ' '); // remove html tags
  return text.trim().split(/\s+/).length;
}

const content = fs.readFileSync(path.resolve('./client/src/data/blog-posts-data.ts'), 'utf8');

// We'll extract the content fields using regex for a quick check
const contentRegex = /content:\s*`([\s\S]*?)`/g;
let match;
let under800 = 0;
let total = 0;

while ((match = contentRegex.exec(content)) !== null) {
  total++;
  const wordCount = countWords(match[1]);
  if (wordCount < 800) {
    under800++;
  }
}

console.log(`Total posts: ${total}`);
console.log(`Posts under 800 words: ${under800}`);
