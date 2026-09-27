import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const blogFiles = [
  'hexasend-blog-article-send-large-files-free.md',
  'hexasend-blog-article-large-file-transfer.md',
  'hexasend-blog-article-secure-file-transfer.md',
  'hexasend-blog-article-send-files-larger-25mb.md',
  'hexasend-blog-article-send-large-videos.md',
  'hexasend-blog-article-transfer-phone-pc.md',
  'hexasend-blog-article-send-large-files-by-email.md',
  'hexasend-blog-article-share-files-secure-link.md',
  'hexasend-blog-article-free-transfer-no-registration.md',
  'hexasend-blog-article-wetransfer-alternatives.md'
];

const artifactsDir = 'C:/Users/MPPKVVCL/.gemini/antigravity-ide/brain/8ed78bd8-0eeb-4634-bff7-08bce890f2b3';
const dataPath = 'f:/reactworkspace/secureshare/client/src/data/blog-posts-data.ts';

let newPostsData = '';

let idCounter = 1001;
const startDate = new Date();

for (const file of blogFiles) {
  const filePath = path.join(artifactsDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File missing: ${filePath}`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const seoTitleMatch = content.match(/\*\*SEO Title:\*\* (.+)/);
  const title = seoTitleMatch ? seoTitleMatch[1].trim() : 'Untitled';
  
  const metaDescMatch = content.match(/\*\*Meta Description:\*\* (.+)/);
  const excerpt = metaDescMatch ? metaDescMatch[1].trim() : '';
  
  const slugMatch = content.match(/\*\*SEO URL Slug:\*\* \`\/blog\/([^\`]+)\`/);
  const slug = slugMatch ? slugMatch[1].trim() : `post-${idCounter}`;
  
  const tagsMatch = content.match(/\*\*Primary Keyword:\*\* \`?([^\`\n]+)\`?/);
  const primaryTag = tagsMatch ? tagsMatch[1].trim() : 'file sharing';
  
  const articleStartMatch = content.match(/## 4\. ARTICLE/);
  const articleEndMatch = content.match(/## 7\. INTERNAL LINKING/);
  
  if (!articleStartMatch || !articleEndMatch) {
    console.error(`Could not find article bounds for ${file}`);
    continue;
  }
  
  const rawArticle = content.substring(articleStartMatch.index, articleEndMatch.index);
  
  let cleanMarkdown = rawArticle
    .replace(/## 4\. ARTICLE/, '')
    .replace(/---/g, '')
    .replace(/# [^\n]+/, '') // Remove main title
    .replace(/\*By HexaSend Team[^\n]+/, '') // Remove author
    .trim();
    
  // Transform Quick Answer block
  cleanMarkdown = cleanMarkdown.replace(/### Quick Answer\n\n> ([\s\S]+?)\n\n/, (match, quote) => {
    return `<div class="bg-blue-50 border-l-4 border-blue-600 p-5 rounded-r-xl my-6 shadow-sm">
  <h4 class="text-blue-900 font-bold text-lg m-0 mb-2 flex items-center">
    💡 Direct Answer / Quick Summary
  </h4>
  <p class="text-blue-950 text-base leading-relaxed m-0">
    ${quote.trim()}
  </p>
</div>\n\n`;
  });

  let htmlContent = marked.parse(cleanMarkdown);
  
  htmlContent = htmlContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  const dateStr = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  startDate.setDate(startDate.getDate() - 2);
  
  const postObjectStr = `
  "${slug}": {
    id: ${idCounter++},
    title: "${title.replace(/"/g, '\\"')}",
    excerpt: "${excerpt.replace(/"/g, '\\"')}",
    category: "Guide",
    readTime: "8 min read",
    date: "${dateStr}",
    slug: "${slug}",
    tags: ["${primaryTag}", "file transfer", "HexaSend"],
    iconName: "FileText",
    content: \`${htmlContent}\`
  }`;
  
  newPostsData += postObjectStr + ',\n';
}

let existingTs = fs.readFileSync(dataPath, 'utf-8');
const lastBraceIndex = existingTs.lastIndexOf('};');
existingTs = existingTs.substring(0, lastBraceIndex) + ',\n' + newPostsData + '\n' + existingTs.substring(lastBraceIndex);

fs.writeFileSync(dataPath, existingTs, 'utf-8');
console.log('Successfully appended 10 new blog posts!');
