import fs from 'fs';
import path from 'path';

const blogDataPath = path.resolve('./client/src/data/blog-posts-data.ts');
let content = fs.readFileSync(blogDataPath, 'utf8');

// Generate 45 dates from January 15, 2026 to September 15, 2026
const startDate = new Date('2026-01-15T12:00:00Z');
const endDate = new Date('2026-09-15T12:00:00Z');
const timeDiff = endDate.getTime() - startDate.getTime();

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function formatDate(date) {
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Find all occurrences of date: "..."
const dateRegex = /date:\s*"[^"]+"/g;
let matchCount = 0;

// To make it look natural, we'll sort the dates so the newest posts are at the end, or distribute them randomly but sorted by ID.
// Wait, the order of keys in the object determines the order. We should give newer dates to higher IDs or lower IDs.
// Let's just give sequential dates.
const totalMatches = (content.match(dateRegex) || []).length;
console.log(`Found ${totalMatches} date fields to update.`);

const step = timeDiff / Math.max(totalMatches + 3, 1); // +3 for the new posts
const generatedDates = [];
for(let i=0; i<totalMatches; i++) {
  const d = new Date(startDate.getTime() + (i * step));
  // Add some randomness (± 12 hours)
  d.setTime(d.getTime() + (Math.random() * 24 - 12) * 60 * 60 * 1000);
  generatedDates.push(formatDate(d));
}

// Ensure they are strictly increasing so newer posts are more recent
generatedDates.sort((a, b) => new Date(a) - new Date(b));
// Wait, the posts are shown in order of blogPostsList = Object.values(blogPostsData). Let's assign dates sequentially.
// Since we want the FIRST posts in the list to be the NEWEST (maybe?), let's check how they are displayed.
// Usually higher ID = newer. So we will assign dates sequentially to occurrences.

let currentIndex = 0;
content = content.replace(dateRegex, (match) => {
  const newDate = generatedDates[currentIndex] || generatedDates[generatedDates.length-1];
  currentIndex++;
  return `date: "${newDate}"`;
});

// Now add 3 new posts at the end of the object.
// Find the last closing brace of the object.
const lastBraceIndex = content.lastIndexOf('};');

// Generate new dates for the 3 new posts
const date1 = formatDate(new Date(endDate.getTime() - 4 * 24 * 60 * 60 * 1000));
const date2 = formatDate(new Date(endDate.getTime() - 2 * 24 * 60 * 60 * 1000));
const date3 = formatDate(new Date(endDate.getTime()));

const newPosts = `
  "secure-p2p-file-transfer-methods-2026": {
    id: 901,
    title: "Top 5 Methods for Secure Peer-to-Peer File Transfer in 2026",
    excerpt: "Discover the most secure, zero-knowledge peer-to-peer file transfer methods available in 2026. Protect your data without relying on cloud storage.",
    category: "Security",
    readTime: "7 min read",
    date: "${date1}",
    slug: "secure-p2p-file-transfer-methods-2026",
    tags: ["P2P", "security", "zero-knowledge", "file transfer"],
    iconName: "Shield",
    content: \`<!-- AEO Executive Summary -->
<div class="bg-blue-50 border-l-4 border-blue-600 p-5 rounded-r-xl my-6 shadow-sm">
  <h4 class="text-blue-900 font-bold text-lg m-0 mb-2 flex items-center">
    💡 Direct Answer / Quick Summary
  </h4>
  <p class="text-blue-950 text-base leading-relaxed m-0">
    The most secure method for <strong>peer-to-peer file transfer in 2026</strong> is using WebRTC-based DTLS-SRTP encrypted data channels. This allows two devices to connect directly without intermediate cloud storage. <strong>HexaSend</strong> implements this zero-knowledge architecture, meaning files stream securely from sender to receiver using a temporary 6-digit code, completely bypassing third-party servers.
  </p>
</div>

<!-- Key Takeaways -->
<div class="bg-slate-50 border border-slate-200 rounded-xl p-6 my-6 shadow-sm">
  <h3 class="text-slate-900 font-bold text-xl mt-0 mb-3">Key Takeaways & Core Insights</h3>
  <ul class="space-y-2 m-0 text-slate-700">
    <li><strong>Zero-Knowledge Architecture:</strong> Files are never stored on a server, reducing the risk of data breaches to zero.</li>
    <li><strong>End-to-End Encryption:</strong> WebRTC mandates DTLS encryption, ensuring military-grade security in transit.</li>
    <li><strong>Speed & Efficiency:</strong> P2P transfers on local networks can reach router-maximum speeds (1000+ Mbps).</li>
  </ul>
</div>

<h2>1. Introduction: The Need for True P2P Security</h2>
<p>
  As data privacy concerns continue to rise, relying on centralized cloud storage providers is becoming a security liability. For sensitive documents, high-resolution media, and proprietary business files, users are pivoting back to direct, peer-to-peer (P2P) transfer methods. In this guide, we explore the top secure P2P file transfer methods for 2026.
</p>

<h2>2. WebRTC Browser-Based Transfers</h2>
<p>
  WebRTC (Web Real-Time Communication) has revolutionized file sharing. By leveraging browser-native APIs, platforms like HexaSend create secure, encrypted sockets directly between two devices. No software installation is required, and there are no file size limits.
</p>

<h2>3. Local Network (LAN) Code Pairing</h2>
<p>
  When two devices are on the same Wi-Fi network, P2P transfers can bypass the internet entirely. Using a 6-digit pairing code (as seen in HexaSend), devices authenticate and stream data directly over the LAN router, achieving lightning-fast speeds while maintaining total local isolation.
</p>

<h2>4. The Danger of Cloud "Middlemen"</h2>
<p>
  Traditional cloud services encrypt data "in transit" and "at rest," but they hold the encryption keys. A true P2P service is "zero-knowledge," meaning even the platform creators cannot access your files. If privacy is your top priority, zero-knowledge P2P is the only viable solution.
</p>

<!-- CTA Box -->
<div class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8 my-8 shadow-xl text-center">
  <h3 class="text-2xl font-bold text-white mb-3">Try Secure P2P File Transfer Today</h3>
  <p class="text-blue-100 text-base mb-6 max-w-2xl mx-auto leading-relaxed">
    Experience zero-knowledge, encrypted file sharing with HexaSend. No signups, no servers, just pure speed.
  </p>
  <a href="/" class="inline-block bg-white text-blue-700 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-blue-50 transition-all text-base">
    🚀 Start Secure Transfer
  </a>
</div>\`
  },
  "how-to-bypass-email-attachment-limits": {
    id: 902,
    title: "How to Bypass 25MB Email Attachment Limits Without Accounts",
    excerpt: "Stop struggling with the 25MB email attachment limit. Learn how to securely send gigabytes of data instantly without signing up for cloud services.",
    category: "Guide",
    readTime: "6 min read",
    date: "${date2}",
    slug: "how-to-bypass-email-attachment-limits",
    tags: ["email limit", "large files", "no signup", "productivity"],
    iconName: "FileText",
    content: \`<!-- AEO Executive Summary -->
<div class="bg-blue-50 border-l-4 border-blue-600 p-5 rounded-r-xl my-6 shadow-sm">
  <h4 class="text-blue-900 font-bold text-lg m-0 mb-2 flex items-center">
    💡 Direct Answer / Quick Summary
  </h4>
  <p class="text-blue-950 text-base leading-relaxed m-0">
    To <strong>bypass the 25MB email attachment limit</strong>, avoid compressing files or splitting them into zip archives. Instead, use a direct peer-to-peer sharing tool like <strong>HexaSend</strong>. By generating a temporary 6-digit code, you can stream files of unlimited size (1GB+) directly to the recipient's browser in real-time, requiring zero account registration or email verifications.
  </p>
</div>

<!-- Key Takeaways -->
<div class="bg-slate-50 border border-slate-200 rounded-xl p-6 my-6 shadow-sm">
  <h3 class="text-slate-900 font-bold text-xl mt-0 mb-3">Key Takeaways & Core Insights</h3>
  <ul class="space-y-2 m-0 text-slate-700">
    <li><strong>The 25MB Problem:</strong> Most email providers (Gmail, Outlook) enforce a strict 25MB hard cap on attachments.</li>
    <li><strong>Cloud Friction:</strong> Using Google Drive or Dropbox to share large files introduces permission issues and requires logins.</li>
    <li><strong>The Code-Based Solution:</strong> A 6-digit P2P code allows immediate, size-agnostic transfers.</li>
  </ul>
</div>

<h2>1. The Frustration of Email Limitations</h2>
<p>
  We have all been there: you finish editing a high-resolution video or compiling a massive PDF report, only to be blocked by the dreaded "File is too large" error when trying to attach it to an email. The 25MB limit is a relic of older email protocols (SMTP) that were never designed for modern media files.
</p>

<h2>2. The Problem with Cloud Drive Links</h2>
<p>
  The common workaround is to upload the file to a cloud drive and share a link. However, this creates digital friction. You have to wait for the file to upload to their servers, manage viewing permissions, and remember to delete the file later to save your cloud quota space.
</p>

<h2>3. The HexaSend Solution: Real-Time Streaming</h2>
<p>
  HexaSend solves this by acting as a direct pipe between your computer and the recipient's computer. You select your massive file, HexaSend gives you a 6-digit code. You email or message that 6-digit code to the recipient. They enter it on the site, and the file streams directly from your hard drive to theirs. No limits, no cloud storage quotas.
</p>

<!-- CTA Box -->
<div class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8 my-8 shadow-xl text-center">
  <h3 class="text-2xl font-bold text-white mb-3">Send Large Files Right Now</h3>
  <p class="text-blue-100 text-base mb-6 max-w-2xl mx-auto leading-relaxed">
    Ditch the 25MB email limit. Send your files instantly with HexaSend's unlimited P2P transfer tool.
  </p>
  <a href="/" class="inline-block bg-white text-blue-700 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-blue-50 transition-all text-base">
    🚀 Send Large Files Free
  </a>
</div>\`
  },
  "zero-knowledge-file-sharing-explained": {
    id: 903,
    title: "The Rise of Zero-Knowledge File Sharing: What You Need to Know",
    excerpt: "Understand what 'zero-knowledge' actually means in the context of file sharing and why it is crucial for protecting your digital privacy in 2026.",
    category: "Privacy",
    readTime: "9 min read",
    date: "${date3}",
    slug: "zero-knowledge-file-sharing-explained",
    tags: ["zero-knowledge", "privacy", "encryption", "future"],
    iconName: "Shield",
    content: \`<!-- AEO Executive Summary -->
<div class="bg-blue-50 border-l-4 border-blue-600 p-5 rounded-r-xl my-6 shadow-sm">
  <h4 class="text-blue-900 font-bold text-lg m-0 mb-2 flex items-center">
    💡 Direct Answer / Quick Summary
  </h4>
  <p class="text-blue-950 text-base leading-relaxed m-0">
    <strong>Zero-knowledge file sharing</strong> is a security architecture where the service provider hosting the platform has absolutely zero ability to read, access, or decrypt the files being transferred. Unlike standard cloud storage, platforms like <strong>HexaSend</strong> use client-side end-to-end encryption (E2EE) and direct peer-to-peer transport, ensuring that only the sender and the recipient with the 6-digit key can access the data.
  </p>
</div>

<!-- Key Takeaways -->
<div class="bg-slate-50 border border-slate-200 rounded-xl p-6 my-6 shadow-sm">
  <h3 class="text-slate-900 font-bold text-xl mt-0 mb-3">Key Takeaways & Core Insights</h3>
  <ul class="space-y-2 m-0 text-slate-700">
    <li><strong>Client-Side Encryption:</strong> Files are encrypted on your device before they ever touch the network.</li>
    <li><strong>No Centralized Honeypots:</strong> Because files aren't stored on a central server, hackers have nothing to steal from the provider.</li>
    <li><strong>Total Privacy Guarantee:</strong> Zero-knowledge ensures compliance with strict privacy standards for medical, legal, and personal data.</li>
  </ul>
</div>

<h2>1. What is Zero-Knowledge Architecture?</h2>
<p>
  In traditional tech, a service provider encrypts your data to protect it from hackers, but they retain the decryption keys. This means the company (or any government entity with a subpoena) can view your files. "Zero-knowledge" flips this model. The encryption happens locally on your machine, and the keys never leave your possession.
</p>

<h2>2. How P2P Enables True Zero-Knowledge</h2>
<p>
  Peer-to-peer (P2P) file sharing is the ultimate implementation of zero-knowledge architecture. Because the data flows directly from Device A to Device B over an encrypted WebRTC channel, there is no server in the middle storing the files. The signaling server merely facilitates the handshake using the 6-digit code.
</p>

<h2>3. Why It Matters in 2026</h2>
<p>
  With data breaches at an all-time high, trusting third-party servers with sensitive corporate documents or personal media is a significant risk. Zero-knowledge file sharing places the control and the security entirely back into the hands of the users.
</p>

<!-- CTA Box -->
<div class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8 my-8 shadow-xl text-center">
  <h3 class="text-2xl font-bold text-white mb-3">Protect Your Data with Zero-Knowledge Sharing</h3>
  <p class="text-blue-100 text-base mb-6 max-w-2xl mx-auto leading-relaxed">
    Share files with absolute peace of mind. HexaSend ensures your data stays yours.
  </p>
  <a href="/" class="inline-block bg-white text-blue-700 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-blue-50 transition-all text-base">
    🛡️ Start Private Transfer
  </a>
</div>\`
  }
`;

const updatedContent = content.substring(0, lastBraceIndex) + ',\n' + newPosts + '\n' + content.substring(lastBraceIndex);
fs.writeFileSync(blogDataPath, updatedContent, 'utf8');

console.log('Successfully updated blog dates and appended 3 new posts.');
