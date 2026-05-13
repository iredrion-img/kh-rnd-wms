const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
const lines = content.split('\n');
let depth = 0;

lines.forEach((l, i) => {
  const divOpen = (l.match(/<div/g) || []).length;
  const divClose = (l.match(/<\/div>/g) || []).length;
  depth += divOpen - divClose;
  
  if (i > 483 && i < 942) {
    console.log(`L${i+1} [depth:${depth}] ${l.trim().substring(0, 70)}`);
  }
});

console.log('\nFinal depth:', depth);
