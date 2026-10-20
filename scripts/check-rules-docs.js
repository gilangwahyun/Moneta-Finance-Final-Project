const fs = require('fs');

const ruleFiles = [
  '01-anggaran.md',
  '02-pola-pengeluaran.md',
  '03-analitik-pola.md',
  '04-dompet.md',
  '05-target-finansial.md',
  '06-reinforcement-positif-dan-fallback.md'
];

const nudgeCode = fs.readFileSync('src/lib/nudging.ts', 'utf8');
const localEngineCode = fs.readFileSync('src/lib/notifications/local-engine.ts', 'utf8');

console.log('Comparing docs/rules/*.md against source code...');

for (const file of ruleFiles) {
  const content = fs.readFileSync('docs/rules/' + file, 'utf8');
  console.log(`\n=== File: docs/rules/${file} ===`);
  
  // Find all Rule headers like "## Rule BG-00 — ..."
  const ruleHeaders = content.match(/^## (?:Rule )?([A-Z0-9\-\/b ]+?)(?: — |: |\s*\()/gm) || [];
  console.log(`Rules documented (${ruleHeaders.length}):`, ruleHeaders.map(h => h.replace(/^## (?:Rule )?/, '').trim()));

  // Check for any obsolete phrases:
  const badPhrases = [
    'agar ritme belanja tetap seimbang',
    'Keputusan tetap berada di tanganmu',
    'Keputusan tetap ada di tanganmu',
    'telah terpenuhi, tercatat selisih',
    'menipis',
    'kritis',
    'jebol',
    'peringatan',
    'waspada',
    'defisit'
  ];

  badPhrases.forEach(p => {
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.toLowerCase().includes(p.toLowerCase())) {
        console.log(`  [Line ${idx + 1}] Found "${p}": ${l.trim()}`);
      }
    });
  });
}
