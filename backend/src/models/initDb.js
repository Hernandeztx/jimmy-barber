const db = require('../config/db');

async function initDb() {
  console.log('Initializing database...');

  try {
    // Create tables first
    await db.query(`
      CREATE TABLE IF NOT EXISTS servicios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        icono VARCHAR(50) NOT NULL,
        duracion_min INTEGER DEFAULT 45,
        precio NUMERIC(12, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        whatsapp VARCHAR(50) UNIQUE,
        verificado INTEGER DEFAULT 0 CHECK (verificado IN (0, 1)),
        picture VARCHAR(500)
      );

      CREATE TABLE IF NOT EXISTS barberos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'trabajador' CHECK (rol IN ('admin', 'trabajador')),
        estado VARCHAR(50) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_descanso')),
        pin VARCHAR(50),
        email VARCHAR(255) UNIQUE,
        whatsapp VARCHAR(50),
        phone_number VARCHAR(50),
        password VARCHAR(255),
        google_id VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS staff_invites (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        nombre VARCHAR(255),
        barbero_id INTEGER REFERENCES barberos(id) ON DELETE SET NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
      );

      CREATE TABLE IF NOT EXISTS turnos (
        id SERIAL PRIMARY KEY,
        barbero_id INTEGER NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        servicio_id INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
        hora_inicio TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        hora_fin TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        preferencia VARCHAR(50) DEFAULT 'hora_fija' CHECK (preferencia IN ('hora_fija', 'puedo_adelantar')),
        estado_turno VARCHAR(50) DEFAULT 'pendiente' CHECK (estado_turno IN ('pendiente', 'asistio', 'no_asistio', 'reprogramado', 'bloqueado'))
      );
    `);

    // Drop trigger if exists to redefine it cleanly
    await db.query(`DROP TRIGGER IF EXISTS trg_max_1_pending_per_day ON turnos;`);
    await db.query(`DROP FUNCTION IF EXISTS check_max_1_pending_per_day;`);

    // Create Trigger Function
    await db.query(`
      CREATE OR REPLACE FUNCTION check_max_1_pending_per_day()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.estado_turno = 'pendiente' AND EXISTS (
          SELECT 1 FROM turnos
          WHERE usuario_id = NEW.usuario_id
            AND estado_turno = 'pendiente'
            AND hora_inicio::date = NEW.hora_inicio::date
        ) THEN
          RAISE EXCEPTION 'El usuario ya tiene un turno pendiente para este dia.';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create Trigger
    await db.query(`
      CREATE TRIGGER trg_max_1_pending_per_day
      BEFORE INSERT ON turnos
      FOR EACH ROW
      EXECUTE FUNCTION check_max_1_pending_per_day();
    `);

    console.log('Tables and triggers verified.');

    // Seed Services if empty
    const sCount = await db.query('SELECT count(*) FROM servicios');
    if (parseInt(sCount.rows[0].count) === 0) {
      console.log('Seeding services...');
      await db.query(`
        INSERT INTO servicios (nombre, icono, duracion_min, precio) VALUES
        ('Corte Clásico', '✂️', 45, 15000),
        ('Fade / Degradado', '💈', 45, 18000),
        ('Corte y Barba', '🧔', 45, 25000);
      `);
    }

    // Seed Barbers if empty
    const bCount = await db.query('SELECT count(*) FROM barberos');
    if (parseInt(bCount.rows[0].count) === 0) {
      console.log('Seeding barbers...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.query(`
        INSERT INTO barberos (nombre, rol, pin, email, password) VALUES
        ('Jimmy (Admin)', 'admin', '1234', 'jimmy@barber.com', '${hashedPassword}'),
        ('Pedro', 'trabajador', '5555', 'pedro@barber.com', '${hashedPassword}'),
        ('Carlos', 'trabajador', '7777', 'carlos@barber.com', '${hashedPassword}');
      `);
    }

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error during database initialization:', err);
  } finally {
    db.pool.end();
  }
}

initDb();
