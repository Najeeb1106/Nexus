import Stripe from 'stripe';
import { Response } from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction';
import { AuthRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { 
  apiVersion: '2024-04-10' as any 
});

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency = 'usd', description } = req.body;
    const currentUserId = req.user._id.toString();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      metadata: { userId: currentUserId },
    });

    const transaction = await Transaction.create({
      userId: new mongoose.Types.ObjectId(currentUserId) as any,
      type: 'deposit',
      amount,
      currency,
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      description,
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment intent creation failed', error });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const status = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';

    const transaction = await Transaction.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status },
      { new: true }
    );

    res.json({ success: true, status, transaction });
  } catch (error) {
    res.status(500).json({ message: 'Payment confirmation failed', error });
  }
};

export const getMyTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user._id.toString();
    const transactions = await Transaction.find({ 
      userId: new mongoose.Types.ObjectId(currentUserId) as any 
    })
    .sort({ createdAt: -1 });

    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
};

export const transferFunds = async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, amount, description } = req.body;
    const currentUserId = req.user._id.toString();

    // Create sender debit transaction
    const senderTx = await Transaction.create({
      userId: new mongoose.Types.ObjectId(currentUserId) as any,
      type: 'transfer',
      amount,
      status: 'completed',
      description: `Transfer to user ${recipientId}: ${description}`,
      recipientId: new mongoose.Types.ObjectId(recipientId) as any,
    });

    // Create recipient credit transaction
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(recipientId) as any,
      type: 'deposit',
      amount,
      status: 'completed',
      description: `Received transfer from ${req.user.name}: ${description}`,
    });

    res.json({ success: true, transaction: senderTx });
  } catch (error) {
    res.status(500).json({ message: 'Transfer failed', error });
  }
};
