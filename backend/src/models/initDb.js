const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

const db = new DatabaseSync(dbPath);

console.log('Initializing SQLite database...');

// Drop existing tables to start fresh with new schema in development
db.exec(`
  DROP TABLE IF EXISTS turnos;
  DROP TABLE IF EXISTS usuarios;
  DROP TABLE IF EXISTS barberos;
  DROP TABLE IF EXISTS servicios;
`);

const initScript = `
  CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    icono TEXT NOT NULL,
    duracion_min INTEGER DEFAULT 45,
    precio REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE,
    whatsapp TEXT UNIQUE NOT NULL,
    verificado INTEGER DEFAULT 0 CHECK (verificado IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS barberos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rol TEXT DEFAULT 'trabajador' CHECK (rol IN ('admin', 'trabajador')),
    estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_descanso')),
    pin TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barbero_id INTEGER NOT NULL,
    usuario_id INTEGER, -- Nullable for blocked times
    servicio_id INTEGER, -- Nullable for blocked times
    hora_inicio TEXT NOT NULL, -- Format: YYYY-MM-DD HH:MM
    hora_fin TEXT NOT NULL,    -- Format: YYYY-MM-DD HH:MM
    preferencia TEXT DEFAULT 'hora_fija' CHECK (preferencia IN ('hora_fija', 'puedo_adelantar')),
    estado_turno TEXT DEFAULT 'pendiente' CHECK (estado_turno IN ('pendiente', 'asistio', 'no_asistio', 'reprogramado', 'bloqueado')),
    FOREIGN KEY (barbero_id) REFERENCES barberos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (servicio_id) REFERENCES servicios(id)
  );

  -- Trigger to enforce max 1 pending appointment per day per user
  CREATE TRIGGER IF NOT EXISTS trg_max_1_pending_per_day
  BEFORE INSERT ON turnos
  FOR EACH ROW
  WHEN NEW.estado_turno = 'pendiente'
  BEGIN
    SELECT RAISE(ABORT, 'El usuario ya tiene un turno pendiente para este dia.')
    WHERE EXISTS (
      SELECT 1 FROM turnos
      WHERE usuario_id = NEW.usuario_id
        AND estado_turno = 'pendiente'
        AND date(hora_inicio) = date(NEW.hora_inicio)
    );
  END;
`;

db.exec(initScript);

// Seed initial services
const stmtServiciosCount = db.prepare('SELECT count(*) as count FROM servicios');
const resServicios = stmtServiciosCount.get();
if (resServicios.count === 0) {
  console.log('Seeding initial services...');
  const insertServicio = db.prepare('INSERT INTO servicios (nombre, icono, duracion_min, precio) VALUES (?, ?, ?, ?)');
  insertServicio.run('Corte Clásico', '✂️', 45, 15000);
  insertServicio.run('Fade / Degradado', '💈', 45, 18000);
  insertServicio.run('Corte y Barba', '🧔', 45, 25000);
}

// Seed initial barbers
const stmtBarberosCount = db.prepare('SELECT count(*) as count FROM barberos');
const resBarberos = stmtBarberosCount.get();
if (resBarberos.count === 0) {
  console.log('Seeding initial barbers...');
  const insertBarbero = db.prepare('INSERT INTO barberos (nombre, rol, pin) VALUES (?, ?, ?)');
  insertBarbero.run('Jimmy (Admin)', 'admin', '1234');
  insertBarbero.run('Pedro', 'trabajador', '5555');
  insertBarbero.run('Carlos', 'trabajador', '7777');
}

console.log('Database initialized successfully at', dbPath);
db.close();
