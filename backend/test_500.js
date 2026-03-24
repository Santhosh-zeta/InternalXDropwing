require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function test500() {
    // Attempt login with known CEO account
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'ceo@webforge.com',
        password: 'password123'
    });

    if (authError) {
        console.error("Auth Fail:", authError.message);
        return;
    }

    const token = authData.session.access_token;
    console.log("Authenticated. Fetching /api/users...");

    try {
        const res = await fetch('http://localhost:3001/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const body = await res.json();
        console.log("STATUS:", res.status);
        if (res.status === 500) {
            console.log("ERROR MESSAGE:", body.error);
            console.log("STACK TRACE:", body.stack);
        } else {
            console.log("SUCCESS DATA:", body);
        }
    } catch (e) {
        console.error("Fetch implementation error:", e);
    }
}

test500();
