const db = require('../config/db');

exports.getBarberos = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM barberos');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
