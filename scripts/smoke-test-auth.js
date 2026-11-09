/**
 * Smoke test for the auth flow against a running local backend.
 *
 *   SMOKE_EMAIL=you@company.com SMOKE_PASSWORD='...' node scripts/smoke-test-auth.js
 *
 * Login is two-step (password, then emailed OTP), so the script pauses and asks
 * for the code (in development without SMTP the backend prints it to its
 * console). No credentials are stored in this file; use an account you created
 * with `npm run create-admin` or `npm run seed:dev`.
 */
const http = require('http');
const readline = require('readline');

const promptOtp = () => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter the OTP: ', (a) => { rl.close(); resolve(a.trim()); });
});

const postJson = (path, payload) => new Promise((resolve, reject) => {
  const data = JSON.stringify(payload);
  const req = http.request({
    hostname: 'localhost', port: 5000, path, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  }, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body || '{}') }));
  });
  req.on('error', reject);
  req.write(data);
  req.end();
});

const testUser = async (email, password, role) => {
  console.log(`\n--- Testing Role: ${role} (${email}) ---`);
  
  // 1. Login (password) then 2. OTP
  const step1 = await postJson('/api/auth/login', { email, password });
  if (step1.statusCode !== 200 || !step1.body.success) {
    console.error(`❌ Login failed for ${role}:`, step1.body);
    return;
  }
  const loginRes = step1.body.requiresOTP
    ? await postJson('/api/auth/verify-otp', { email, otp: await promptOtp() })
    : step1;

  if (loginRes.statusCode !== 200 || !loginRes.body.success || !loginRes.body.data?.token) {
    console.error(`❌ Login failed for ${role}:`, loginRes.body);
    return;
  }

  console.log(`✅ Login successful. Token received.`);
  
  // Extract token from response or cookies
  const token = loginRes.body.data.token;
  const cookies = loginRes.headers['set-cookie'] || [];
  let cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

  const fetchEndpoint = async (path, name) => {
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': cookieHeader
      }
    };

    const res = await new Promise((resolve, reject) => {
      const req = http.request(opts, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body || '{}') });
          } catch(e) {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (res.statusCode === 200) {
      console.log(`✅ ${name} (${path}) - 200 OK`);
    } else {
      console.log(`⚠️ ${name} (${path}) - ${res.statusCode} ${res.body?.message || res.body}`);
    }
  };

  await fetchEndpoint('/api/platform-metrics', 'Platform Metrics');
  await fetchEndpoint('/api/tasks', 'Tasks');
  await fetchEndpoint('/api/notifications', 'Notifications');
  await fetchEndpoint('/api/team-members/me', 'Team Member Profile');

  // Logout
  const logoutOpts = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': cookieHeader
    }
  };

  const logoutRes = await new Promise((resolve, reject) => {
    const req = http.request(logoutOpts, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode }));
    });
    req.on('error', reject);
    req.end();
  });

  if (logoutRes.statusCode === 200) {
    console.log(`✅ Logout successful.`);
  } else {
    console.log(`❌ Logout failed with status ${logoutRes.statusCode}`);
  }
};

const runTests = async () => {
  const { SMOKE_EMAIL, SMOKE_PASSWORD } = process.env;
  if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
    console.error('Set SMOKE_EMAIL and SMOKE_PASSWORD (an account you created yourself).');
    process.exit(1);
  }
  await testUser(SMOKE_EMAIL, SMOKE_PASSWORD, 'smoke user');
};

runTests();
