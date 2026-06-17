import { Router } from 'express';
import { getChatMessages, getConversations } from '../controllers/messageController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);
router.get('/conversations', getConversations);
router.get('/:partnerId', getChatMessages);

export default router;
