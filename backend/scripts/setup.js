#!/usr/bin/env node
/**
 * Dropwing Groups — Setup Script
 * Creates missing tables (teams, announcements, projects, tasks) via Supabase-js
 * and seeds initial sample data. Run once after the DB is connected.
 * Usage: node scripts/setup.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAndReport() {
    console.log('\n🔍 Checking existing data...\n');

    const [companies, userRoles] = await Promise.all([
        sb.from('companies').select('*'),
        sb.from('profiles').select('*'),
    ]);

    console.log('✅ Companies:');
    companies.data?.forEach(v => console.log(`   • ${v.name} (${v.id})`));

    console.log('\n✅ Users (profiles):');
    userRoles.data?.forEach(u => console.log(`   • ${u.full_name} — ${u.role} — ${u.email}`));

    // Check for missing tables
    const tables = ['teams', 'announcements', 'projects', 'tasks'];
    console.log('\n🔍 Checking additional tables...');

    for (const table of tables) {
        const { error } = await sb.from(table).select('id').limit(1);
        if (error) {
            console.log(`   ❌ ${table}: ${error.message}`);
        } else {
            console.log(`   ✅ ${table}: exists`);
        }
    }

    console.log('\n📋 Action required:\n');
    console.log('   The teams, announcements, projects, and tasks tables need to be');
    console.log('   created via the Supabase SQL editor. Copy and run this SQL:\n');

    const companies_data = companies.data || [];
    console.log('-- Copy and paste this into your Supabase SQL editor:\n');

    const sql = `
-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (team_id, user_id)
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active','completed','on_hold')
  ),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Client Projects
CREATE TABLE IF NOT EXISTS client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE (client_id, project_id)
);
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (
    status IN ('todo','in_progress','done')
  ),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
`;

    console.log(sql);
    console.log('\nAfter running the SQL, run this script again to seed sample data.\n');
}

async function seedSampleData() {
    console.log('\n🌱 Seeding sample data...\n');

    // Get companies and users
    const { data: companies } = await sb.from('companies').select('*');
    const { data: users } = await sb.from('profiles').select('*');

    if (!companies || !users) {
        console.log('❌ Cannot fetch companies or users');
        return;
    }

    const webforge = companies.find(v => v.name === 'Webforge');
    const grovia = companies.find(v => v.name === 'Grovia');
    const designStudio = companies.find(v => v.name.includes('Design'));

    const ashwin = users.find(u => u.email === 'ashwin@dropwing.io');
    const yazhini = users.find(u => u.email === 'yazhini@dropwing.io');
    const santhosh = users.find(u => u.email === 'santhosh@dropwing.io');

    // Check if teams already has data
    const { data: existingTeams } = await sb.from('teams').select('id').limit(1);
    const teamsExist = existingTeams && existingTeams.length > 0;

    if (!teamsExist) {
        // Seed teams
        const { data: teams, error: teamsErr } = await sb.from('teams').insert([
            { name: 'Frontend Team', company_id: webforge?.id, manager_id: ashwin?.id },
            { name: 'Backend Team', company_id: webforge?.id, manager_id: ashwin?.id },
            { name: 'Marketing', company_id: grovia?.id, manager_id: yazhini?.id },
            { name: 'Design Team', company_id: designStudio?.id },
        ]).select();

        if (teamsErr) console.log('Teams:', teamsErr.message);
        else console.log(`✅ Created ${teams.length} teams`);
    }

    // Seed announcements
    const { data: existingAnn } = await sb.from('announcements').select('id').limit(1);
    if (!existingAnn || existingAnn.length === 0) {
        const { error: annErr } = await sb.from('announcements').insert([
            {
                title: 'Welcome to Dropwing Groups Internal Portal!',
                body: 'We are excited to launch our internal team portal. This platform will be your central hub for team communication, task management, and project tracking.',
                company_id: null,
                created_by: santhosh?.id,
            },
            {
                title: 'Q1 2026 Goals',
                body: 'All CEOs please submit your quarterly goals by end of this week.',
                company_id: null,
                created_by: santhosh?.id,
            },
            {
                title: 'Webforge: Sprint Review',
                body: 'The frontend team sprint review is scheduled for this Friday at 3pm.',
                company_id: webforge?.id,
                created_by: ashwin?.id,
            },
        ]);
        if (annErr) console.log('Announcements:', annErr.message);
        else console.log('✅ Created 3 announcements');
    }

    // Seed projects
    const { data: existingProj } = await sb.from('projects').select('id').limit(1);
    if (!existingProj || existingProj.length === 0) {
        const { error: projErr } = await sb.from('projects').insert([
            { name: 'Dropwing Portal v1.0', description: 'Internal employee portal development', company_id: webforge?.id, status: 'active' },
            { name: 'E-Commerce Platform', description: 'Client-facing online store', company_id: webforge?.id, status: 'active' },
            { name: 'Brand Identity 2026', description: 'New brand guidelines and visual identity', company_id: designStudio?.id, status: 'in_progress' },
            { name: 'Grovia App', description: 'Mobile app for Grovia services', company_id: grovia?.id, status: 'active' },
        ]);
        if (projErr) console.log('Projects:', projErr.message);
        else console.log('✅ Created 4 projects');
    }

    // Seed tasks
    const { data: existingTasks } = await sb.from('tasks').select('id').limit(1);
    const { data: teams } = await sb.from('teams').select('*').limit(4);

    if ((!existingTasks || existingTasks.length === 0) && teams?.length > 0) {
        const frontendTeam = teams[0];
        const { error: taskErr } = await sb.from('tasks').insert([
            { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions', team_id: frontendTeam?.id, assignee_id: ashwin?.id, status: 'in_progress', due_date: '2026-03-31' },
            { title: 'Design login system', description: 'Design the auth flow and login UI', team_id: frontendTeam?.id, assignee_id: ashwin?.id, status: 'done', due_date: '2026-03-20' },
            { title: 'Write API documentation', description: 'Document all REST endpoints', team_id: frontendTeam?.id, status: 'todo', due_date: '2026-04-05' },
            { title: 'Implement user roles', description: 'Add RBAC to the backend', team_id: frontendTeam?.id, assignee_id: ashwin?.id, status: 'done' },
            { title: 'Mobile responsive design', description: 'Make all pages mobile-friendly', team_id: frontendTeam?.id, status: 'todo', due_date: '2026-04-15' },
        ]);
        if (taskErr) console.log('Tasks:', taskErr.message);
        else console.log('✅ Created 5 tasks');
    }

    console.log('\n✅ Sample data seeded successfully!\n');
}

async function main() {
    // First check what's there
    await checkAndReport();

    // Try to seed if tables exist
    const { error: teamCheck } = await sb.from('teams').select('id').limit(1);
    if (!teamCheck) {
        await seedSampleData();
    }
}

main().catch(console.error);
