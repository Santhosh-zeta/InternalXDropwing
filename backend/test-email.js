require('dotenv').config();
const { sendEmail } = require('./src/services/email.service');

async function test() {
  console.log('Sending test email to internal@dropwinggroups.com...');
  const result = await sendEmail({
    to: 'internal@dropwinggroups.com',
    subject: '[InternalX Test] Automated Notification Engine',
    html: `
      <h2>Hello!</h2>
      <p>This is a test of the InternalX Automated Notification Engine via Hostinger SMTP.</p>
      <p>If you see this, the integration is working perfectly.</p>
    `
  });
  console.log('Result:', result);
  process.exit(0);
}

test();
