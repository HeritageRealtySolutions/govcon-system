const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const axios    = require('axios');
const path     = require('path');
const { supabase } = require('../db');

const storage = multer.memoryStorage();
const upload  = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const NAICS_KEYWORDS = {
  '238210': ['electrical','wiring','power','lighting','circuit'],
  '238220': ['plumbing','hvac','mechanical','heating','cooling','piping'],
  '238160': ['roofing','roof','shingles','membrane','waterproof'],
  '561730': ['landscaping','grounds','lawn','mowing','irrigation','turf'],
  '236220': ['construction','renovation','building','facility','retrofit'],
};

function guessNaics(text) {
  const lower = text.toLowerCase();
  let best = '236220', bestCount = 0;
  for (const [code, words] of Object.entries(NAICS_KEYWORDS)) {
    const count = words.filter(w => lower.includes(w)).length;
    if (count > bestCount) { bestCount = count; best = code; }
  }
  return best;
}

const EXTRACT_PROMPT = `Extract government bid/contract information from the following content and return ONLY a valid JSON object with these exact fields. No markdown, no preamble, just the JSON:
{
  "title": "bid title or project name",
  "agency": "issuing government agency or entity",
  "naics_code": "most appropriate NAICS code from: 238210, 238220, 238160, 561730, 236220",
  "bid_number": "solicitation or bid number if present",
  "response_deadline": "deadline in YYYY-MM-DD format or empty string",
  "estimated_value": numeric dollar amount or 0,
  "description": "scope of work summary, 2-3 sentences",
  "contact_name": "contracting officer name or empty string",
  "contact_email": "contact email or empty string",
  "source_url": "source URL if known or empty string",
  "notes": "any important requirements or notes"
}`;

async function extractWithGemini(content) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ role: 'user', parts: [{ text: `${EXTRACT_PROMPT}\n\nCONTENT:\n${content.substring(0, 8000)}` }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
    },
    { timeout: 30000 }
  );

  const text   = response.data.candidates[0].content.parts[0].text.trim();
  const clean  = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!parsed.naics_code) parsed.naics_code = guessNaics(parsed.description || parsed.title || '');
  return parsed;
}

async function extractWithGeminiVision(base64Data, mimeType) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: mimeType, data: base64Data } },
        { text: EXTRACT_PROMPT }
      ]}],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
    },
    { timeout: 30000 }
  );

  const text   = response.data.candidates[0].content.parts[0].text.trim();
  const clean  = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!parsed.naics_code) parsed.naics_code = guessNaics(parsed.description || '');
  return parsed;
}

// GET all municipal bids
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('municipal_bids')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST extract from URL or text
router.post('/extract', async (req, res) => {
  try {
    const { url, text } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to Railway Variables.' });
    }

    let content = '';
    if (url) {
      const r = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      content = r.data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } else if (text) {
      content = text;
    } else {
      return res.status(400).json({ error: 'URL or text required' });
    }

    const extracted = await extractWithGemini(content);
    res.json(extracted);
  } catch (err) {
    console.error('Extract error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST upload PDF or image
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    const ext      = path.extname(req.file.originalname).toLowerCase();
    const base64   = req.file.buffer.toString('base64');
    let mimeType   = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.pdf') mimeType = 'application/pdf';

    // Upload to Supabase Storage
    const fileName = `bids/${Date.now()}-${req.file.originalname}`;
    const { data: fileData, error: uploadError } = await supabase.storage
      .from('bid-documents')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) console.error('Storage upload error:', uploadError.message);
    const filePath = fileData?.path || fileName;

    // Extract with Gemini Vision
    const extracted = await extractWithGeminiVision(base64, mimeType);
    res.json({ ...extracted, file: filePath });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST save bid
router.post('/', async (req, res) => {
  try {
    const {
      title, agency, naics_code, bid_number, response_deadline,
      estimated_value, description, contact_name, contact_email,
      source_url, notes, file
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const { data, error } = await supabase.from('municipal_bids').insert({
      title:              title.trim(),
      agency:             agency || null,
      naics_code:         naics_code || '236220',
      bid_number:         bid_number || null,
      response_deadline:  response_deadline || null,
      estimated_value:    parseFloat(estimated_value) || null,
      description:        description || null,
      contact_name:       contact_name || null,
      contact_email:      contact_email || null,
      source_url:         source_url || null,
      notes:              notes || null,
      document_path:      file || null,
      status:             'new',
    }).select().single();

    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH update bid
router.patch('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('municipal_bids')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE bid
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('municipal_bids').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
