import { Router } from 'express';
import { executionController } from '../controllers/execution.controller.js';

const router = Router();

router.post('/run', executionController.run);
router.get('/status/:executionId', executionController.getStatus);
router.get('/executions', executionController.list);

export default router;
