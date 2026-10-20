const fs = require('fs');

const catalog = fs.readFileSync('docs/skripsi/skripsi-rule-catalog.md', 'utf8');
const sections = catalog.split(/^### /m).slice(1);

console.log('Total sections in catalog:', sections.length);

const rules = [];
for (const sec of sections) {
  const firstLine = sec.split('\n')[0].trim();
  
  // Extract ID
  let id = '';
  const idMatch = firstLine.match(/^([A-Z0-9\-\/b]+(?:\s*\([^\)]+\))?)/);
  if (idMatch) {
    id = idMatch[1];
  }

  // Extract English Name / Concept
  // usually format: "ID: English Name — Indonesian Title" or "BG-00 (Budget Threshold 50%): Penggunaan Anggaran Berjalan"
  let concept = '';
  let idClean = firstLine.split(':')[0].trim();
  let rest = firstLine.substring(firstLine.indexOf(':') + 1).trim();

  // Extract Output lines
  const lines = sec.split('\n');
  let judul = '';
  let body = '';
  let cta = '';
  let severity = '';
  let tingkatan = '';

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('- Judul:') || l.startsWith('- **Judul**:') || l.startsWith('Judul:')) {
      judul = l.replace(/^[-* ]*(?:Judul|\*\*Judul\*\*):\s*/, '').replace(/^"|"$/g, '').trim();
    }
    if (l.startsWith('- Body:') || l.startsWith('- **Body**:') || l.startsWith('Body:')) {
      body = l.replace(/^[-* ]*(?:Body|\*\*Body\*\*):\s*/, '').replace(/^"|"$/g, '').trim();
    }
    if (l.startsWith('- CTA:') || l.startsWith('- **CTA**:') || l.startsWith('CTA:')) {
      cta = l.replace(/^[-* ]*(?:CTA|\*\*CTA\*\*):\s*/, '').replace(/^"|"$/g, '').trim();
    }
    if (l.startsWith('- Severity:')) {
      severity = l.replace('- Severity:', '').trim();
    }
    if (l.startsWith('- **Tingkat Taksonomi**:')) {
      tingkatan = l.replace('- **Tingkat Taksonomi**:', '').trim();
    }
  }

  rules.push({
    header: firstLine,
    idClean,
    rest,
    judul,
    body,
    cta,
    severity,
    tingkatan
  });
}

console.log(JSON.stringify(rules, null, 2));
