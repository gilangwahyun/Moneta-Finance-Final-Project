const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const buf = fs.readFileSync('c:/moneta-finance-final-project/docs/skripsi/Perencanaan dan Deskripsi Hasil Uji Perangkat Lunak.pdf');
const parser = new PDFParse({ data: buf });
// Use getText() which seems to be available
parser.load().then(async () => {
  const pages = parser.doc ? parser.doc.numPages : '?';
  console.log('PAGES:' + pages);
  let fullText = '';
  for (let i = 1; i <= pages; i++) {
    const pg = await parser.getPageText(i);
    fullText += pg + '\n';
  }
  fs.writeFileSync('c:/moneta-finance-final-project/docs/skripsi/pdhupl_text.txt', fullText, 'utf8');
  console.log('DONE, chars:' + fullText.length);
  await parser.destroy();
}).catch(e => console.error('ERR:' + e.message));
