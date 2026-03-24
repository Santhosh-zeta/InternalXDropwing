require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function check() {
    const { data, error } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
        console.error("Query err:", error);
    } else {
        console.log("Profiles found:", data.map(u => ({ id: u.id, email: u.email, role: u.role, company: u.company_id })));
    }
}

check();
