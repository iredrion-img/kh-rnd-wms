const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the line with "export default Dashboard;"
let exportLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'export default Dashboard;') {
    exportLine = i;
    break;
  }
}

if (exportLine === -1) {
  console.error('Could not find export default Dashboard;');
  process.exit(1);
}

console.log(`Found export at line ${exportLine + 1}`);
console.log(`Total lines: ${lines.length}`);

// Keep only up to and including the export line
const truncated = lines.slice(0, exportLine + 1).join('\n') + '\n';
fs.writeFileSync(filePath, truncated, 'utf8');
console.log(`File truncated to ${exportLine + 1} lines.`);
