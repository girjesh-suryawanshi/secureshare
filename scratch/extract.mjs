import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('client/src/data/blog-posts-data.ts', 'utf8');
const r = /"([^"]+)":\s*\{\s*id:\s*\d+,\s*title:\s*"([^"]+)"/g;
let m;
const arr = [];
while((m = r.exec(content)) !== null) {
  arr.push({ slug: m[1], title: m[2] });
}
console.log(JSON.stringify(arr, null, 2));
