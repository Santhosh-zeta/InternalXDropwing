require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const testUsers = [
  { full_name: 'CEO User', role: 'ceo', email: 'ceo@dropwinggroups.com', password: 'password123' },
  { full_name: 'MD User', role: 'managing_director', email: 'md@dropwinggroups.com', password: 'password123' },
  { full_name: 'Manager User', role: 'manager', email: 'manager@dropwinggroups.com', password: 'password123' },
  { full_name: 'Intern User', role: 'intern', email: 'intern@dropwinggroups.com', password: 'password123' },
  { full_name: 'Client User', role: 'client', email: 'client@company.com', password: 'password123' }
];

async function seedTestUsers() {
  try {
    console.log('Fetching company Webforge...');
    const { data: company, error: compErr } = await supabase.from('companies').select('id').eq('name', 'Webforge').single();
    if (compErr) {
      console.log('Webforge company not found. Please ensure it is seeded. Creating one manually...');
      await supabase.from('companies').insert({ name: 'Webforge' });
    }
    
    let compId = null;
    const { data: comp } = await supabase.from('companies').select('id').eq('name', 'Webforge').single();
    if (comp) compId = comp.id;

    for (const u of testUsers) {
      console.log(`Creating user ${u.email}...`);
      
      const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name }
      });

      if (authErr) {
        console.log(`Failed to create ${u.email} in auth:`, authErr.message);
        continue;
      }

      console.log(`Creating profile for ${u.role}...`);
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: newUser.user.id,
        full_name: u.full_name,
        role: u.role,
        company_id: compId
      });

      if (profileErr) {
        console.log(`Failed to create profile:`, profileErr.message);
      } else {
        console.log(`Successfully created ${u.email}!`);
      }
    }
    console.log('Done!');
  } catch (e) {
    console.error(e);
  }
}

seedTestUsers();
