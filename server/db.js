const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  
  console.log('Supabase URL present:', !!url);
  console.log('Supabase KEY present:', !!key);
  
  if (!url || !key) {
    throw new Error(`Supabase env vars missing. URL: ${!!url}, KEY: ${!!key}`);
  }
  
  supabase = createClient(url, key, {
    auth: { persistSession: false }
  });
  return supabase;
}

async function initDB() {
  try {
    const client = getSupabase();
    const { error } = await client.from('company_profile').select('id').limit(1);
    if (error) throw error;
    console.log('✓ Supabase connected successfully');
  } catch (err) {
    console.error('Supabase connection error:', err.message);
  }
}

module.exports = { 
  get supabase() { return getSupabase(); },
  initDB 
};
