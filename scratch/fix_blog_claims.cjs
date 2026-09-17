const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../../client/src/data/blog-posts-data.ts');
let content = fs.readFileSync(dataPath, 'utf8');

// Replace zero-knowledge claims
content = content.replace(/zero-knowledge/gi, 'secure TLS');
content = content.replace(/zero knowledge/gi, 'secure TLS');
content = content.replace(/End-to-End Encrypted/gi, 'Securely Encrypted');
content = content.replace(/end-to-end encryption/gi, 'secure TLS encryption');
content = content.replace(/E2EE/gi, 'TLS encryption');
content = content.replace(/military-grade/gi, 'industry-standard');
content = content.replace(/purest implementation of secure TLS architecture/gi, 'highly secure method');
content = content.replace(/purest implementation of zero-knowledge architecture/gi, 'highly secure method');

fs.writeFileSync(dataPath, content, 'utf8');
console.log('Blog posts updated successfully to remove E2EE claims.');
