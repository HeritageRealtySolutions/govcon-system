const express = require('express');
const router = express.Router();
const { getPricingData } = require('../services/usaSpending');

router.get('/:naicsCode', async (req, res) => {
  try {
    const data = await getPricingData(req.params.naicsCode);
    res.json(data || { error: 'No data found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:naicsCode/:agency', async (req, res) => {
  try {
    const data = await getPricingData(req.params.naicsCode, decodeURIComponent(req.params.agency));
    res.json(data || { error: 'No data found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
