/**
 * Run the weekly digest and/or the daily alert rules by hand.
 *
 *   node scripts/run-digest.js --dry            # print what would be sent, write nothing
 *   node scripts/run-digest.js --digest         # send the digests now
 *   node scripts/run-digest.js --alerts         # send today's alerts now
 *
 * Bypasses the scheduler's once-per-occurrence guard, so use --dry first.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pgPool } = require('../src/config/database.pg');
const { runWeeklyDigest } = require('../src/services/digest');
const { runDailyAlerts } = require('../src/services/alerts');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry');
const both = !args.has('--digest') && !args.has('--alerts');

(async () => {
  if (both || args.has('--digest')) {
    const r = await runWeeklyDigest({ dryRun });
    console.log(`Digest: ${r.digests.length} built, ${r.sent} sent, ${r.emailed} emailed, ${r.skipped} skipped`);
    if (dryRun) r.digests.forEach((d) => console.log(`\n--- user ${d.userId}: ${d.title}\n${d.text}`));
  }
  if (both || args.has('--alerts')) {
    const a = await runDailyAlerts({ dryRun });
    console.log(`Alerts: ${a.findings} findings, ${a.notified} managers notified`);
    if (dryRun) a.alerts.forEach((x) => console.log(`\n--- user ${x.userId}: ${x.title}\n${x.text}`));
  }
  await pgPool.end();
})().catch((err) => { console.error(err); process.exit(1); });
