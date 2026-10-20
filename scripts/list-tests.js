const fs = require('fs');
const content = fs.readFileSync('tests/08-insight-engine.spec.ts', 'utf8');

const lines = content.split('\n');
const tests = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const match = line.match(/^test\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (match) {
    tests.push({ lineNum: i + 1, name: match[1] });
  }
}

console.log('Total tests found in 08-insight-engine.spec.ts:', tests.length);
tests.forEach((t, idx) => {
  console.log(`${idx + 1}. [L${t.lineNum}] ${t.name}`);
});
