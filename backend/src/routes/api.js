const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const barberosController = require('../controllers/barberosController');
const turnosController = require('../controllers/turnosController');
const serviciosController = require('../controllers/serviciosController');
const staffController = require('../controllers/staffController');

// Auth Routes
router.post('/auth/google-login', authController.googleLogin);
router.post('/auth/staff-login', authController.staffLogin);
router.post('/auth/request-otp', authController.requestOTP);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/login-barber', authController.loginBarber);
router.post('/auth/complete-profile', authController.completeProfile);

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

// Staff Management Routes
router.post('/staff/invite', staffController.inviteStaff);
router.get('/staff/validate-token/:token', staffController.validateToken);
router.post('/staff/complete-registration', staffController.completeRegistration);
router.get('/staff', staffController.getStaffList);

module.exports = router;

