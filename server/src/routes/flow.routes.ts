import { Router } from 'express';
import { flowController } from '../controllers/flow.controller.js';

const router = Router();

router.get('/health', flowController.health);
router.post('/flows', flowController.save);
router.post('/generate-code', flowController.generateCode);

export default router;
