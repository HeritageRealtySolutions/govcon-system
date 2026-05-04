const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { supabase } = require('../db');

const NAICS_KEYWORDS = {
  '236116': ['multifamily','apartment','residential housing'],
  '236115': ['single family','single-family','residential home'],
  '236220': ['commercial construction','renovation','building','facility','retrofit','repair','institutional'],
  '237310': ['highway','street','road','bridge','pavement','asphalt'],
  '333120': ['construction machinery','heavy equipment','equipment manufacturing'],
  '532412': ['equipment rental','machinery rental','heavy equipment lease'],
  '541320': ['landscape architecture','site planning'],
  '561730': ['landscaping','grounds','lawn','mowing','irrigation','turf','tree'],
};

function guessNaics(text) {
  const lower = (text || '').toLowerCase();
  let best = '236220', bestCount = 0;
  for (const [code, words] of Object.entries(NAICS_KEYWORDS)) {
    const count = words.filter(w => lower.includes(w)).length;
    if (count > bestCount) { bestCount = count; best = code; }
  }
  return best;
}

function calcBidScore(bid) {
  let score = 0;
  const naics = ['236116','236115','236220','237310','333120','532412','541320','561730'];
  if (naics.includes(bid.naics_code)) score += 25;
  const setAside = (bid.set_aside_type || '').toUpperCase();
  if (setAside.includes('8A') || setAside === '8AN') score += 30;
  else if (setAside.includes('SB') || setAside.includes('SMALL')) score += 15;
  const val = parseFloat(bid.estimated_value || 0);
  if (val >= 100000 && val <= 2000000) score += 25;
  else if (val > 0) score += 10;
  if (bid.response_deadline) {
    const days = (new Date(bid.response_deadline) - new Date()) / 86400000;
    if (days >= 14) score += 20;
    else if (days >= 7) score += 10;
  }
  return Math.min(score, 100);
}

const EXTRACT_PROMPT = `Extract government bid information from the content below. Return ONLY valid JSON, no markdown, no preamble:
{
  "title": "bid/project title",
  "agency": "issuing agency or entity",
  "naics_code": "best matching NAICS from: 236116, 236115, 236220, 237310, 333120, 532412, 541320, 561730",
  "bid_number": "solicitation/bid number",
  "response_deadline": "YYYY-MM-DD or empty",
  "estimated_value": numeric or 0,
  "description": "2-3 sentence scope summary",
  "contact_name": "contracting officer or empty",
  "contact_email": "email or empty",
  "set_aside_type": "8AN, SBA, SDVOSBC, WOSB, or empty",
  "state": "2-letter state code if location identifiable, else empty"
}`;

async function extractWithGemini(content) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini not configured');
  const r = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ role: 'user', parts: [{ text: `${EXTRACT_PROMPT}\n\nCONTENT:\n${content.substring(0, 8000)}` }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
    },
    { timeout: 30000 }
  );
  const text = r.data.candidates[0].content.parts[0].text.trim().replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text);
  if (!parsed.naics_code) parsed.naics_code = guessNaics(parsed.description || parsed.title || '');
  return parsed;
}

async function fetchUrl(url) {
  const r = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LumenBidIntel/1.0)' },
    maxContentLength: 2 * 1024 * 1024,
  });
  return String(r.data).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// POST /api/quick-add/extract — preview only, no save
router.post('/extract', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input?.trim()) return res.status(400).json({ error: 'Input required' });

    let content = input;
    let sourceUrl = '';

    // URL detection — if input starts with http or contains a domain pattern
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      sourceUrl = urlMatch[0];
      try {
        content = await fetchUrl(sourceUrl);
      } catch (fetchErr) {
        // If URL fetch fails, fall back to using input as text
        console.warn('URL fetch failed, using as text:', fetchErr.message);
        content = input;
      }
    }

    const extracted = await extractWithGemini(content);
    res.json({ ...extracted, source_url: sourceUrl });
  } catch (err) {
    console.error('Quick add extract error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quick-add/save — extract + save + add to pipeline in one call
router.post('/save', async (req, res) => {
  try {
    const { bid, addToPipeline } = req.body;
    if (!bid?.title?.trim()) return res.status(400).json({ error: 'Title required' });

    // Calculate score
    const bid_score = calcBidScore(bid);

    // Save to municipal_bids
    const { data: saved, error: saveError } = await supabase.from('municipal_bids').insert({
      title:              bid.title.trim(),
      agency:             bid.agency || null,
      naics_code:         bid.naics_code || '236220',
      bid_number:         bid.bid_number || null,
      response_deadline:  bid.response_deadline || null,
      estimated_value:    parseFloat(bid.estimated_value) || null,
      description:        bid.description || null,
      contact_name:       bid.contact_name || null,
      contact_email:      bid.contact_email || null,
      source_url:         bid.source_url || null,
      set_aside_type:     bid.set_aside_type || null,
      state:              bid.state || null,
      bid_score,
      status:             'new',
    }).select().single();

    if (saveError) throw saveError;

    let pipelineEntry = null;
    if (addToPipeline) {
      // Check for existing pipeline entry to avoid duplicates
      const { data: existing } = await supabase
        .from('pipeline')
        .select('id')
        .eq('municipal_bid_id', saved.id)
        .single();

      if (!existing) {
        const { data: pipe } = await supabase.from('pipeline').insert({
          title:           saved.title,
          agency:          saved.agency,
          naics_code:      saved.naics_code,
          source:          'quick_add',
          municipal_bid_id: saved.id,
          deadline:        saved.response_deadline,
          proposed_price:  saved.estimated_value,
          bid_score,
          status:          'reviewing',
          notes:           saved.source_url ? `Source: ${saved.source_url}` : 'Added via Quick Add',
        }).select().single();
        pipelineEntry = pipe;
      } else {
        pipelineEntry = existing;
      }
    }

    res.json({
      success:     true,
      bid:         saved,
      pipeline_id: pipelineEntry?.id,
    });
  } catch (err) {
    console.error('Quick add save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET recent quick adds (last 5)
router.get('/recent', async (req, res) => {
  try {
    const { data } = await supabase
      .from('municipal_bids')
      .select('id, title, agency, bid_score, response_deadline, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
