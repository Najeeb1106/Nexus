import { Router } from 'express';
import { sendRequest, getMyRequests, updateStatus } from '../controllers/collaborationController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/', sendRequest);
router.get('/', getMyRequests);
router.put('/:id', updateStatus);

export default router;
