const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app } = require('../src/server');
const { contentMatchesExtension, AVATAR_DIR } = require('../src/middleware/upload.middleware');
const { resetUsers, createUser, tokenFor, auth, close } = require('./helpers/db');

afterAll(close);

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const PDF = Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n');
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64)]);
const HTML = Buffer.from('<!DOCTYPE html><script>alert(1)</script>');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');

describe('magic-byte sniffing', () => {
  test.each([
    ['.png', PNG, true], ['.pdf', PDF, true], ['.txt', Buffer.from('plain notes\n'), true], ['.csv', Buffer.from('a,b\n1,2\n'), true],
    ['.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]), true],
    ['.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), true],
    ['.webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]), true],
    ['.pdf', EXE, false], ['.png', EXE, false], ['.txt', EXE, false],
    ['.pdf', HTML, false], ['.txt', HTML, false], ['.txt', SVG, false], ['.png', SVG, false],
    ['.png', PDF, false], ['.pdf', PNG, false], ['.docx', PDF, false],
    ['.txt', Buffer.from([0x41, 0x00, 0x42]), false], ['.pdf', Buffer.alloc(0), false],
    ['.html', HTML, false], ['.svg', SVG, false], ['.exe', EXE, false],
  ])('%s with %j -> %s', (ext, buf, ok) => {
    expect(contentMatchesExtension(ext, buf)).toBe(ok);
  });
});

describe('upload endpoints', () => {
  let headers;
  beforeAll(async () => {
    await resetUsers();
    headers = auth(await tokenFor(await createUser({ level: 5, ventureId: 1 })));
  });

  test('avatar: a real PNG is stored, an executable or SVG named .png is refused and not left on disk', async () => {
    const ok = await request(app).post('/api/team-members/me/avatar').set(headers).attach('avatar', PNG, { filename: 'me.png', contentType: 'image/png' });
    expect(ok.status).toBe(200);
    const stored = path.join(AVATAR_DIR, path.basename(ok.body.data.avatar_url));
    expect(fs.existsSync(stored)).toBe(true);
    fs.unlinkSync(stored);

    const before = fs.existsSync(AVATAR_DIR) ? fs.readdirSync(AVATAR_DIR).length : 0;
    for (const bad of [EXE, SVG, HTML]) {
      const res = await request(app).post('/api/team-members/me/avatar').set(headers).attach('avatar', bad, { filename: 'me.png', contentType: 'image/png' });
      expect(res.status).toBe(400);
    }
    expect(fs.readdirSync(AVATAR_DIR).length).toBe(before);
  });

  test('avatar: svg and html extensions are refused outright', async () => {
    for (const [name, type, buf] of [['a.svg', 'image/svg+xml', SVG], ['a.html', 'text/html', HTML]]) {
      const res = await request(app).post('/api/team-members/me/avatar').set(headers).attach('avatar', buf, { filename: name, contentType: type });
      expect(res.status).toBe(400);
    }
  });

  test('documents: html or exe disguised as a pdf is refused before any record is created', async () => {
    for (const bad of [HTML, EXE]) {
      const res = await request(app).post('/api/documents/upload').set(headers).attach('file', bad, { filename: 'report.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(400);
    }
    const exe = await request(app).post('/api/documents/upload').set(headers).attach('file', EXE, { filename: 'setup.exe', contentType: 'application/x-msdownload' });
    expect(exe.status).toBe(400);
  });
});
