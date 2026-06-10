const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EACCES') console.log(`Skipping: ${dirFile}`);
    }
  });
  return filelist;
};

const jsFiles = walkSync(path.join(__dirname, '../src')).filter(f => f.endsWith('.js'));

let totalChanges = 0;

jsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Replace NOW() -> CURRENT_TIMESTAMP
  content = content.replace(/\bNOW\(\)/g, 'CURRENT_TIMESTAMP');

  // 2. Replace INSERT IGNORE
  // Example: INSERT IGNORE INTO users (...) VALUES (...)
  // We need to append ON CONFLICT DO NOTHING. This is tricky with simple regex if the query spans multiple lines or is concatenated.
  // We will do a simple replace of 'INSERT IGNORE' to 'INSERT', and let the developer or wrapper append ON CONFLICT, 
  // OR we just assume it's simple enough.
  // Actually, let's just do:
  content = content.replace(/INSERT IGNORE INTO ([\w_]+) (.*?)(?=(?:`|'|"))/gs, (match, table, rest) => {
    // If the query string ends right there, we can't easily append ON CONFLICT DO NOTHING at the end of the query string via regex
    // So we'll replace the text, and hope the user query is simple.
    // Wait, let's just replace INSERT IGNORE INTO -> INSERT INTO
    // And manually fix the ones in role_management.routes.js because there's only a few!
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalChanges++;
    console.log('Updated', file);
  }
});

console.log('Total files updated:', totalChanges);
