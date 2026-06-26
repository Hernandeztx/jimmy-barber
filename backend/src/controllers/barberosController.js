const db = require('../config/db');

exports.getBarberos = (req, res) => {
  const stmt = db.prepare("SELECT * FROM barberos");
  const barberos = stmt.all();
  res.json(barberos);
};
