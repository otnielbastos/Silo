const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const {
  login,
  logout,
  register,
  verifyToken,
  changePassword,
  validateLogin,
  validateRegister
} = require('../controllers/authController');

// Rate limiting para login (máximo 5 tentativas por 15 minutos)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 50 em dev, 5 em produção
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para registro (máximo 3 registros por hora)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros
  message: {
    success: false,
    message: 'Muitas tentativas de registro. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rotas públicas
router.post('/login', loginLimiter, validateLogin, login);

// Rotas autenticadas
router.post('/logout', authenticate, logout);
router.post('/register', authenticate, registerLimiter, validateRegister, register);
router.get('/verify', authenticate, verifyToken);
router.post('/change-password', authenticate, changePassword);

module.exports = router; 