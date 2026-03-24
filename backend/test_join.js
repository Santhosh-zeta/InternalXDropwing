require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function test() {
    // Try to select profiles with companies join and catch error
    const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .limit(1);
    
    if (error) {
        console.log("JOIN ERROR:", error.message);
        console.log("DETAILS:", error.details);
        console.log("HINT:", error.hint);
    } else {
        console.log("JOIN SUCCESS:", data);
    }
}

test();
