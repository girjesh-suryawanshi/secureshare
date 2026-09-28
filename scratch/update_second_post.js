const fs = require('fs');
const path = 'client/src/data/blog-posts-data.ts';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(
  '/images/blog/share-large-files-online-without-registration.jpg',
  '/images/blog/share-large-files-online-without-registration.png'
);
fs.writeFileSync(path, c);
