import fs from 'fs';
import path from 'path';

const blogDataPath = path.resolve('./client/src/data/blog-posts-data.ts');
let content = fs.readFileSync(blogDataPath, 'utf8');

const titleUpdates = [
  { old: 'title: "Share Large Files Online Without Registration",', new: 'title: "How to Share Large Files Online Without Registration in 2026",' },
  { old: 'title: "Browser to Browser File Transfer - No Setup Required",', new: 'title: "Direct Browser-to-Browser File Transfer: No Setup Required",' },
  { old: 'title: "Share Files Without Sign Up - Instant Send Guide",', new: 'title: "Anonymous File Transfer: No Signup Instant Send Guide",' },
  { old: 'title: "Ultimate Guide to P2P File Sharing in 2026",', new: 'title: "Private P2P File Sharing: Ultimate Guide 2026",' },
  { old: 'title: "Send Large Files Instantly - Best Methods",', new: 'title: "Send Large Files Without Account: Instant Methods",' },
  { old: 'title: "Anonymous File Sharing & Privacy in 2026",', new: 'title: "Anonymous File Sharing: Privacy Without Registration in 2026",' },
];

titleUpdates.forEach(update => {
  content = content.replace(update.old, update.new);
});

fs.writeFileSync(blogDataPath, content, 'utf8');
console.log('Blog titles updated for SEO.');
