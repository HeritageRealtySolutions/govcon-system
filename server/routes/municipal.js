const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db } = require('../db');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

function calcBidScore(bid) {
  let score = 0;
  const deadline = bid.response_deadline ? new Date(bid.response_deadline) : null;
  if (deadline) {
    const days = (deadline - new Date()) / (1000 * 60 * 60 * 24);
    if (days > 14) score += 20;
    else if (days >= 7) score += 10;
  }
  const val = parseFloat(bid.estimated_value || 0);
  if (val >= 100000 && val <= 2000000) score += 20;
  else if (val > 0) score += 5;
  if (bid.naics_code === '238210') score += 20;
  else if (bid.naics_code) score += 10;
  score += 25; // municipal bids are manually added so presumed relevant
  return Math.min(score, 100);
}

router.get('/', (req, res) => {
  res.json(db.prepare(`SELECT * FROM municipal_bids ORDER BY response_deadline ASC`).all());
});

router.post('/', (req, res) => {
  const b = req.body;
  const score = calcBidScore(b);
  const result = db.prepare(`
    INSERT INTO municipal_bids (title, agency, state, city, naics_code, posted_date, response_deadline,
      estimated_value, description, contact_email, contact_name, bid_number, bid_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(b.title, b.agency, b.state || 'MS', b.city, b.naics_code, b.posted_date, b.response_deadline,
    b.estimated_value, b.description, b.contact_email, b.contact_name, b.bid_number, score);
  res.json({ id: result.lastInsertRowid, bid_score: score });
});

router.post('/upload', upload.single('file'), (req, res) => {
  const b = req.body;
  const filePath = req.file ? req.file.filename : null;
  const score = calcBidScore(b);
  const result = db.prepare(`
    INSERT INTO municipal_bids (title, agency, state, city, naics_code, posted_date, response_deadline,
      estimated_value, description, contact_email, contact_name, bid_number, file_path, bid_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(b.title || 'Uploaded Bid', b.agency, b.state || 'MS', b.city, b.naics_code, b.posted_date,
    b.response_deadline, b.estimated_value, b.description, b.contact_email, b.contact_name,
    b.bid_number, filePath, score);
  res.json({ id: result.lastInsertRowid, file: filePath, bid_score: score });
});

router.patch('/:id', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
  const values = Object.values(req.body);
  db.prepare(`UPDATE municipal_bids SET ${fields} WHERE id = ?`).run(...values, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM municipal_bids WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
