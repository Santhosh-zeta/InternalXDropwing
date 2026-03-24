require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function test() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });
    if (error) {
        // Fallback: select one full row to see keys
        const { data: row } = await supabase.from('profiles').select('*').limit(1).single();
        console.log("Full row keys:", Object.keys(row || {}));
        console.log("Full row data:", row);
    } else {
        console.log("Columns:", data);
    }
}

test();
