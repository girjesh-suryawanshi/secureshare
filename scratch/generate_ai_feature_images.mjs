import fs from 'fs';
import path from 'path';
import https from 'https';

const POSTS_FILE = path.resolve('client/src/data/blog-posts-data.ts');
const OUTPUT_DIR = path.resolve('client/public/images/blog');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let tsContent = fs.readFileSync(POSTS_FILE, 'utf8');

// Regex to capture the post key, id, title, excerpt, iconName, and optionally the existing featureImage
const postRegex = /"([^"]+)":\s*{\s*id:\s*(\d+),\s*title:\s*"([^"]+)",\s*excerpt:\s*"([^"]+)",([\s\S]*?)iconName:\s*"([^"]+)",(\s*featureImage:\s*"[^"]+",)?/g;

let match;
const posts = [];
while ((match = postRegex.exec(tsContent)) !== null) {
  posts.push({
    matchString: match[0],
    slug: match[1],
    id: match[2],
    title: match[3],
    excerpt: match[4],
    middleContent: match[5],
    iconName: match[6],
    hasFeatureImage: !!match[7]
  });
}

console.log(`Found ${posts.length} blog posts. Starting sequential AI image generation...`);

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get image, status code: ${response.statusCode}`));
        return;
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

async function processPosts() {
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i+1}/${posts.length}] Generating image for: "${post.title}"`);
    
    // Construct prompt based on title and actual content (excerpt)
    const prompt = `A modern, high-quality, professional blog header illustration for an article titled "${post.title}". Concept: ${post.excerpt}. Flat vector style, corporate tech aesthetic, secure file sharing theme, deep blue and vibrant accent colors, clean UI, NO text, NO words.`;
    
    const encodedPrompt = encodeURIComponent(prompt);
    // Using pollinations.ai for free, fast, high-quality AI image generation
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=400&nologo=true&seed=${post.id}`;
    const imageFilename = `${post.slug}.jpg`;
    const destPath = path.join(OUTPUT_DIR, imageFilename);
    
    try {
      await downloadImage(imageUrl, destPath);
      console.log(` -> Saved ${imageFilename}`);
      
      // Update TS file
      if (!post.hasFeatureImage) {
        // Inject featureImage after iconName
        const replacement = post.matchString.replace(
          new RegExp(`iconName:\\s*"${post.iconName}",`), 
          `iconName: "${post.iconName}",\n    featureImage: "/images/blog/${imageFilename}",`
        );
        tsContent = tsContent.replace(post.matchString, replacement);
      } else {
        // Replace existing featureImage
        const replacement = post.matchString.replace(
          /featureImage:\s*"[^"]+",/,
          `featureImage: "/images/blog/${imageFilename}",`
        );
        tsContent = tsContent.replace(post.matchString, replacement);
      }
      
      // Save incrementally so it updates the file one post at a time
      fs.writeFileSync(POSTS_FILE, tsContent, 'utf8');
      
    } catch (err) {
      console.error(` -> Failed for ${post.slug}:`, err.message);
    }
    
    // Wait slightly to be polite to the API
    await new Promise(r => setTimeout(r, 800));
  }
  console.log('\\nAll 45 blog posts have been successfully processed with unique AI featured images!');
}

processPosts();
