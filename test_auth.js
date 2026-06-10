const http = require('http');

const testUser = async (email, password, role) => {
  console.log(`\n--- Testing Role: ${role} (${email}) ---`);
  
  // 1. Login
  const loginData = JSON.stringify({ email, password });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const loginRes = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  if (loginRes.statusCode !== 200 || !loginRes.body.success) {
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
  await testUser('sa@dropwinggroups.com', 'Test@1234', 'Super Admin');
  await testUser('mg@dropwing.in', 'Test@1234', 'Manager');
  await testUser('in@dropwing.in', 'Test@1234', 'Intern');
};

runTests();
