const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const barberosController = require('../controllers/barberosController');
const turnosController = require('../controllers/turnosController');
const serviciosController = require('../controllers/serviciosController');

// Auth Routes (Simulated)
router.post('/auth/request-otp', authController.requestOTP);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/login-barber', authController.loginBarber);

// Barberos Routes
router.get('/barberos', barberosController.getBarberos);

// Servicios Routes
router.get('/servicios', serviciosController.getServicios);
router.post('/servicios', serviciosController.createServicio);
router.put('/servicios/:id', serviciosController.updateServicio);
router.delete('/servicios/:id', serviciosController.deleteServicio);

// Turnos Routes
router.post('/turnos', turnosController.crearTurno);
router.get('/barberos/:barberoId/turnos', turnosController.getTurnosBarbero);
router.post('/turnos/:turnoId/avisar', turnosController.avisarSiguiente);
router.post('/barberos/:barberoId/retrasar', turnosController.retrasarAgenda);
router.post('/barberos/:barberoId/bloquear', turnosController.bloquearHorario);
router.patch('/turnos/:turnoId', turnosController.actualizarEstadoTurno);
router.delete('/turnos/:turnoId', turnosController.eliminarTurno);
router.post('/barberos/:barberoId/invitar-adelantar', turnosController.invitarAdelantar);

module.exports = router;
