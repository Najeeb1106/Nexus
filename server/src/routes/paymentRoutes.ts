import { Router } from 'express';
import { createPaymentIntent, confirmPayment, getMyTransactions, transferFunds } from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/transactions', getMyTransactions);
router.post('/transfer', transferFunds);

export default router;
