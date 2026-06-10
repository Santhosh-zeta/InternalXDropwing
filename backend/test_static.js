const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Create dummy _next folder and file
fs.mkdirSync(path.join(__dirname, 'test_public/_next/static'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'test_public/_next/static/test.css'), 'body { color: red; }');

app.use(express.static(path.join(__dirname, 'test_public')));

app.get('*', (req, res) => res.send('FALLBACK'));

app.listen(3002, async () => {
    console.log('Server started');
    const res = await fetch('http://localhost:3002/_next/static/test.css');
    const text = await res.text();
    console.log('RESPONSE:', text);
    process.exit(0);
});
