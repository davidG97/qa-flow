import { Router } from 'express';
import { pickerController } from '../controllers/picker.controller.js';

const router = Router();

// Iniciar sesión de picker visual
router.post('/start', pickerController.startSession);

// Cancelar sesión
router.post('/cancel/:sessionId', pickerController.cancelSession);

// Obtener estado de sesión
router.get('/status/:sessionId', pickerController.getSessionStatus);

export default router;
