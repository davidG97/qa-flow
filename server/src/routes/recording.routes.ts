import { Router } from 'express';
import { recordingController } from '../controllers/recording.controller.js';

const router = Router();

// Grabación con Codegen
router.post('/record/start', recordingController.start);
router.get('/record/status/:sessionId', recordingController.getStatus);
router.post('/record/stop/:sessionId', recordingController.stop);
router.get('/record/code/:sessionId', recordingController.getCode);
router.get('/record/nodes/:sessionId', recordingController.getNodes);

// Parseo de código
router.post('/parse-code', recordingController.parseCode);

// Gestión de grabaciones
router.get('/recordings', recordingController.listRecordings);
router.delete('/recordings/:sessionId', recordingController.deleteOne);
router.delete('/recordings', recordingController.deleteAll);
router.post('/recordings/cleanup', recordingController.cleanup);

export default router;
