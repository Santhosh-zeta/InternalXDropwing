require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function test() {
    console.log("Testing teams query...");
    const { data: teams, error: e1 } = await supabase
        .from('teams')
        .select(`
        *,
        companies(id, name),
        manager:profiles!teams_manager_id_fkey(id, full_name, email),
        team_members(user:profiles(id, full_name, email, role))
      `)
        .order('name');
    if (e1) console.error("Teams error:", e1);
    else console.log("Teams query successful");

    console.log("Testing tasks query...");
    const { data: tasks, error: e2 } = await supabase
            .from('tasks')
            .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, email),
        team:teams(id, name, company_id)
      `)
            .order('created_at', { ascending: false });
    if (e2) console.error("Tasks error:", e2);
    else console.log("Tasks query successful");
}
test();
