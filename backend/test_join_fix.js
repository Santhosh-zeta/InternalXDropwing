require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function test() {
    // Try to select profiles with companies join and catch error
    const { data, error } = await supabase
        .from('profiles')
        .select('*, companies!company_id(*)')
        .limit(1);
    
    if (error) {
        console.log("JOIN ERROR:", error.message);
        const { data: error2, error: err2 } = await supabase
            .from('profiles')
            .select('*, companies!profiles_company_id_fkey(*)')
            .limit(1);
        if (err2) {
             console.log("FK JOIN ERROR:", err2.message);
        } else {
             console.log("FK JOIN SUCCESS!");
        }
    } else {
        console.log("JOIN SUCCESS!");
    }
}

test();
