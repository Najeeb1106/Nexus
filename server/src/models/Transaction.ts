import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  description?: string;
  recipientId?: mongoose.Types.ObjectId;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit','withdrawal','transfer'], required: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'usd' },
  status: { type: String, enum: ['pending','completed','failed'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  description: { type: String },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
