const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\moneta-finance-final-project\\src';
const searchRegex = /text-slate-400 dark:text-slate-500/g;
const replaceText = 'text-slate-500 dark:text-slate-400';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(targetDir);
let changedCount = 0;

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.match(searchRegex)) {
    const newContent = content.replace(searchRegex, replaceText);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated: ${file}`);
    changedCount++;
  }
});

console.log(`Total files updated: ${changedCount}`);
