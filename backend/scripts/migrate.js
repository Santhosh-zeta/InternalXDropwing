#!/usr/bin/env node
/**
 * Dropwing Groups — DB Migration via Supabase SQL Editor API
 * Runs all schema creation SQL statements against the live Supabase project
 */

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const MANAGEMENT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runSQL(sql, label) {
    process.stdout.write(`  ⏳ ${label.padEnd(40)}`);

    try {
        const res = await fetch(MANAGEMENT_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
        });

        const text = await res.text();
        if (!res.ok) {
            // Check if it's a "already exists" type error - that's fine
            if (text.includes('already exists') || text.includes('duplicate')) {
                console.log('✅ (already exists)');
                return true;
            }
            console.log(`❌ HTTP ${res.status}: ${text.slice(0, 100)}`);
            return false;
        }
        console.log('✅');
        return true;
    } catch (e) {
        console.log(`❌ ${e.message}`);
        return false;
    }
}

const migrations = [
    ['CREATE pgcrypto', `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`],

    ['CREATE companies', `
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `],

    ['CREATE profiles', `
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (
        role IN ('managing_director','ceo','manager','intern','client')
      ),
      company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `],

    ['CREATE teams', `
    CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `],

    ['CREATE team_members', `
    CREATE TABLE IF NOT EXISTS team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE (team_id, profile_id)
    );
  `],

    ['CREATE announcements', `
    CREATE TABLE IF NOT EXISTS announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      body TEXT,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `],

    ['CREATE projects', `
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
  `],

    ['CREATE client_projects', `
    CREATE TABLE IF NOT EXISTS client_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE (client_id, project_id)
    );
  `],

    ['CREATE tasks', `
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
  `],

    ['SEED companies', `
    INSERT INTO companies (name) VALUES
      ('Webforge'),
      ('PerSyniX'),
      ('Design Studio'),
      ('Grovia')
    ON CONFLICT (name) DO NOTHING;
  `],

    ['RLS companies', `ALTER TABLE companies ENABLE ROW LEVEL SECURITY;`],
    ['RLS profiles', `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`],
    ['RLS teams', `ALTER TABLE teams ENABLE ROW LEVEL SECURITY;`],
    ['RLS team_members', `ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;`],
    ['RLS announcements', `ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;`],
    ['RLS projects', `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`],
    ['RLS client_projects', `ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;`],
    ['RLS tasks', `ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;`],
];

async function main() {
    console.log('\n🚀 Dropwing Groups — DB Migration');
    console.log(`   Project: ${PROJECT_REF}`);
    console.log(`   URL: ${SUPABASE_URL}\n`);

    let success = 0;
    for (const [label, sql] of migrations) {
        const ok = await runSQL(sql, label);
        if (ok) success++;
    }

    console.log(`\n📊 ${success}/${migrations.length} steps succeeded\n`);

    // Verify with supabase-js
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: companies, error } = await sb.from('companies').select('*');
    if (error) {
        console.log('❌ Verification failed:', error.message);
        console.log('   → Try running supabase_schema.sql manually in the Supabase SQL editor\n');
        process.exit(1);
    }

    console.log('✅ DB Verification passed — Companies:');
    companies.forEach(c => console.log(`   • ${c.name} (${c.id})`));
    console.log('');
}

main().catch(console.error);
