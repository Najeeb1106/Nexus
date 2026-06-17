import { Router } from 'express';
import { scheduleMeeting, getMyMeetings, updateMeetingStatus } from '../controllers/meetingController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);
router.post('/', scheduleMeeting);
router.get('/', getMyMeetings);
router.patch('/:id/status', updateMeetingStatus);

export default router;
