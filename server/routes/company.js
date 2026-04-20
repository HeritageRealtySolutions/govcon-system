const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('company_profile')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('company_profile')
      .select('id')
      .limit(1)
      .single();

    const payload = { ...req.body, updated_at: new Date().toISOString() };

    if (existing) {
      const { data, error } = await supabase
        .from('company_profile')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const { data, error } = await supabase
      .from('company_profile')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
