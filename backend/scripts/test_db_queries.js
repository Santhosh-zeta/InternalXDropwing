require('dotenv').config();
const { supabase } = require('../src/config/supabase');

async function testAll() {
    console.log("Testing tasks query...");
    const { data: tasks, error: e1 } = await supabase
        .from('tasks')
        .select(`*, assignee:profiles!tasks_assignee_id_fkey(id, full_name), team:teams(id, name, company_id)`)
        .limit(1);
    if (e1) console.error("Tasks query failed:", JSON.stringify(e1));
    else console.log("Tasks query okay");

    console.log("Testing teams query...");
    const { data: teams, error: e2 } = await supabase
        .from('teams')
        .select(`*, companies(id, name), manager:profiles!teams_manager_id_fkey(id, full_name), team_members(user:profiles(id, full_name, role))`)
        .limit(1);
    if (e2) console.error("Teams query failed:", JSON.stringify(e2));
    else console.log("Teams query okay");

    console.log("Testing notifications schema...");
    const { data: notifs, error: e3 } = await supabase.from('notifications').select('*').limit(1);
    if (e3) console.error("Notifications query failed:", JSON.stringify(e3));
    else console.log("Notifications query okay");
    
    // Also trigger schema reload for PostgREST
    console.log("Reloading schema cache...");
    try {
      const res = await supabase.rpc('reload_schema_cache');
      console.log("RPC reload schema done");
    } catch(e) { console.log("RPC error (ignored)", e.message); }
}

testAll();
