const db = require('../config/db');

exports.getServicios = (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM servicios');
    const servicios = stmt.all();
    res.json(servicios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createServicio = (req, res) => {
  const { nombre, icono, duracion_min, precio } = req.body;
  if (!nombre || !icono || !duracion_min || !precio) {
    return res.status(400).json({ error: 'Todos los campos son requeridos (nombre, icono, duracion_min, precio)' });
  }

  try {
    const stmt = db.prepare('INSERT INTO servicios (nombre, icono, duracion_min, precio) VALUES (?, ?, ?, ?)');
    const info = stmt.run(nombre, icono, Number(duracion_min), Number(precio));
    res.json({ id: info.lastInsertRowid, nombre, icono, duracion_min, precio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateServicio = (req, res) => {
  const { id } = req.params;
  const { nombre, icono, duracion_min, precio } = req.body;

  try {
    const stmt = db.prepare('UPDATE servicios SET nombre = ?, icono = ?, duracion_min = ?, precio = ? WHERE id = ?');
    const info = stmt.run(nombre, icono, Number(duracion_min), Number(precio), id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json({ id, nombre, icono, duracion_min, precio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteServicio = (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM servicios WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json({ message: 'Servicio eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
