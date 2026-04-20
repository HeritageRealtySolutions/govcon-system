const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false }
  }
);

async function initDB() {
  try {
    const { error } = await supabase.from('company_profile').select('id').limit(1);
    if (error) throw error;
    console.log('✓ Supabase connected successfully');
  } catch (err) {
    console.error('Supabase connection error:', err.message);
  }
}

module.exports = { supabase, initDB };
