const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const prodDir = path.join(rootDir, 'DGOS-PRODUCTION');
const zipFile = path.join(rootDir, 'DGOS-PRODUCTION.zip');

console.log('--- DGOS Production Packager ---');

// 1. Build Frontend
console.log('\n[1/7] Building Frontend...');
try {
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
} catch (error) {
  console.error('Frontend build failed:', error.message);
  process.exit(1);
}

// 2. Prepare Output Directory
console.log('\n[2/7] Preparing DGOS-PRODUCTION directory...');
if (fs.existsSync(prodDir)) {
  fs.rmSync(prodDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}
fs.mkdirSync(prodDir, { recursive: true });
fs.mkdirSync(path.join(prodDir, 'public', 'frontend-build'), { recursive: true });
fs.mkdirSync(path.join(prodDir, 'src'), { recursive: true });
fs.mkdirSync(path.join(prodDir, 'uploads'), { recursive: true });

// 3. Copy Frontend Build
console.log('\n[3/7] Copying Frontend Build...');
fs.cpSync(path.join(frontendDir, 'out'), path.join(prodDir, 'public', 'frontend-build'), { recursive: true });

// 4. Copy Backend Source
console.log('\n[4/7] Copying Backend Files...');
fs.cpSync(path.join(backendDir, 'src'), path.join(prodDir, 'src'), { recursive: true });

// 5. Generate configuration files
console.log('\n[5/7] Generating configuration files...');

// package.json
const backendPackage = JSON.parse(fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8'));
backendPackage.main = 'start.js';
backendPackage.scripts.start = 'node start.js';
// Remove devDependencies for production
delete backendPackage.devDependencies;
fs.writeFileSync(path.join(prodDir, 'package.json'), JSON.stringify(backendPackage, null, 2));

// package-lock.json
if (fs.existsSync(path.join(backendDir, 'package-lock.json'))) {
  fs.copyFileSync(path.join(backendDir, 'package-lock.json'), path.join(prodDir, 'package-lock.json'));
}

// start.js
fs.writeFileSync(path.join(prodDir, 'start.js'), `require('./src/server.js');\n`);

// .env.example
const envExample = `NODE_ENV=production

PORT=3000

DB_HOST=CHANGE_ME
DB_PORT=5432
DB_NAME=internalx
DB_USER=CHANGE_ME
DB_PASSWORD=CHANGE_ME

JWT_SECRET=CHANGE_ME

FRONTEND_URL=https://YOURDOMAIN.COM

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
`;
fs.writeFileSync(path.join(prodDir, '.env.example'), envExample);

// uploads/.gitkeep
fs.writeFileSync(path.join(prodDir, 'uploads', '.gitkeep'), '');

// .htaccess
const htaccessContent = `RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
`;
fs.writeFileSync(path.join(prodDir, '.htaccess'), htaccessContent);

// README_DEPLOY.md / HOSTINGER_UPLOAD_GUIDE.md
const readme = `# Hostinger Node.js Deployment Guide for DGOS InternalX

## 1. Upload Package
1. Go to Hostinger File Manager.
2. Upload \`DGOS-PRODUCTION.zip\` to the domain root (e.g., \`public_html\` or the specific subdomain folder).
3. Extract the contents directly into the folder. The files (\`package.json\`, \`start.js\`, \`src/\`, etc.) should be in the root of that folder.

## 2. Environment Variables
1. Rename \`.env.production.example\` to \`.env\` or setup environment variables directly in Hostinger's Node.js App interface.
2. Ensure you fill out \`DB_PASSWORD\`, \`JWT_SECRET\`, and other sensitive keys.

## 3. Hostinger App Configuration
- **Application Startup File:** \`start.js\`
- **Application URL:** Ensure your domain is selected.
- Click **NPM Install** via Hostinger panel.
- Click **Start App** via Hostinger panel.

## 4. SSL Configuration
- Hostinger generally provisions Auto SSL for domains. Ensure SSL is Active.

If using a SPA framework (Next.js export) it is now served directly by the Express backend.
`;
fs.writeFileSync(path.join(prodDir, 'README_DEPLOY.md'), readme);
fs.writeFileSync(path.join(prodDir, 'HOSTINGER_UPLOAD_GUIDE.md'), readme);

// 6. Zip Package
console.log('\n[6/7] Creating ZIP archive...');
try {
  execSync('powershell -Command "Compress-Archive -Path DGOS-PRODUCTION/* -DestinationPath DGOS-PRODUCTION.zip -Force"', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to create zip archive:', error.message);
  process.exit(1);
}

// 7. Verify
console.log('\n[7/7] Package ready!');
console.log('HOSTINGER_PACKAGE_READY = YES');
