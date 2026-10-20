const fs = require('fs');
const path = require('path');

const targetWords = [
  'menipis',
  'kritis',
  'jebol',
  'peringatan',
  'warning',
  'awas',
  'tahan',
  'segera',
  'periksa',
  'waspada',
  'defisit',
  'tidak realistis',
  'bahaya'
];

const scanDirs = ['src', 'public', 'tests'];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (/\.(ts|tsx|js|jsx|json|html|css)$/.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = scanDirs.flatMap((d) => (fs.existsSync(d) ? getAllFiles(d) : []));

console.log(`Scanning ${allFiles.length} files across src/, public/, tests/...`);

const findings = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    for (const word of targetWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(line)) {
        findings.push({
          file: file.replace(/\\/g, '/'),
          line: idx + 1,
          word,
          snippet: line.trim()
        });
      }
    }
  });
}

console.log(`Total occurrences found: ${findings.length}`);
const grouped = {};
findings.forEach((f) => {
  grouped[f.word.toLowerCase()] = (grouped[f.word.toLowerCase()] || 0) + 1;
});
console.log('By word:', grouped);

fs.writeFileSync('scripts/audit-results.json', JSON.stringify(findings, null, 2));
console.log('Saved detailed findings to scripts/audit-results.json');
