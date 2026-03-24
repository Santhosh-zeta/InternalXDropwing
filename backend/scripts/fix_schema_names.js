const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', '..');
const frontendSrc = path.join(rootDir, 'frontend', 'src');
const backendDir = path.join(rootDir, 'backend');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist') return;
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
  
  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;
  
  content = content.replace(/profiles/g, 'profiles');
  
  // Note: order is important!
  content = content.replace(/Companies/g, 'Companies');
  content = content.replace(/companies/g, 'companies');
  
  content = content.replace(/Company/g, 'Company');
  content = content.replace(/company_id/g, 'company_id');
  content = content.replace(/company/g, 'company');

  // Fix custom URL prefixes safely if any
  content = content.replace(/\/api\/companies/g, '/api/companies');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

console.log('Processing frontend src...');
walkDir(frontendSrc, processFile);

console.log('Processing backend...');
walkDir(backendDir, processFile);

console.log('Done replacing old names with new names.');
