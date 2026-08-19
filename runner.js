const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, 'tests');

// Mendapatkan semua file berakhiran .spec.ts dari direktori tests
const files = fs.readdirSync(testsDir)
  .filter(file => file.endsWith('.spec.ts'))
  .sort();

console.log(`[Test Runner] Ditemukan ${files.length} file tes. Akan dijalankan satu per satu...`);

// runner.js
// Script ini diperbarui untuk menggunakan eksekusi sekuensial bawaan Playwright

console.log(`\n======================================================`);
console.log(`[Test Runner] Menjalankan seluruh tes secara sekuensial...`);
console.log(`[Test Runner] Membangun Production Server (1 kali saja)`);
console.log(`======================================================\n`);

try {
  // Flag --workers=1 menjamin Playwright mengeksekusi file tes satu per satu
  // secara sekuensial (01-auth, 02-wallets, dst), TETAPI hanya menjalankan
  // webServer (npm run build) satu kali saja di awal.
  execSync(`npm run test:e2e -- --workers=1`, { stdio: 'inherit' });
  
  console.log(`\n✅ Semua tes berhasil dilewati! 🎉`);
} catch (error) {
  console.error(`\n❌ [Test Runner] Terdapat tes yang gagal. Silakan periksa log di atas atau buka Playwright Report.`);
  process.exit(1);
}
