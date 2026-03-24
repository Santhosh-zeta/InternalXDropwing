const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(id, name)')
      .limit(1);
  console.log("DATA:", JSON.stringify(data, null, 2));
  console.log("ERROR:", JSON.stringify(error, null, 2));
})();
