require('dotenv').config();
const PROJECT_REF = process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const MANAGEMENT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function main() {
    const res = await fetch(MANAGEMENT_API, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: "select tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'public';" }),
    });
    console.log(await res.text());
}
main();
