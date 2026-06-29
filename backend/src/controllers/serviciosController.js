const db = require('../config/db');

exports.getServicios = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM servicios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createServicio = async (req, res) => {
  const { nombre, icono, duracion_min, precio } = req.body;
  if (!nombre || !icono || !duracion_min || !precio) {
    return res.status(400).json({ error: 'Todos los campos son requeridos (nombre, icono, duracion_min, precio)' });
  }

  try {
    const result = await db.query(
      'INSERT INTO servicios (nombre, icono, duracion_min, precio) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, icono, Number(duracion_min), Number(precio)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateServicio = async (req, res) => {
  const { id } = req.params;
  const { nombre, icono, duracion_min, precio } = req.body;

  try {
    const result = await db.query(
      'UPDATE servicios SET nombre = $1, icono = $2, duracion_min = $3, precio = $4 WHERE id = $5 RETURNING *',
      [nombre, icono, Number(duracion_min), Number(precio), id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteServicio = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM servicios WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json({ message: 'Servicio eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
