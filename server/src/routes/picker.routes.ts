import { Router } from 'express';
import { pickerController } from '../controllers/picker.controller.js';

const router = Router();

// Iniciar sesión de picker visual (requiere GUI o CDP)
router.post('/start', pickerController.startSession);

// Iniciar sesión de picker interactivo (funciona en Docker)
router.post('/interactive/start', pickerController.startInteractiveSession);

// Seleccionar elemento por coordenadas
router.post('/interactive/select', pickerController.selectAtCoordinates);

// Hover para highlight
router.post('/interactive/hover', pickerController.hoverAtCoordinates);

// Scroll en picker interactivo
router.post('/interactive/scroll', pickerController.scroll);

// Cancelar sesión
router.post('/cancel/:sessionId', pickerController.cancelSession);

// Obtener estado de sesión
router.get('/status/:sessionId', pickerController.getSessionStatus);

export default router;
