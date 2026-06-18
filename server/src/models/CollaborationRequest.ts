import mongoose, { Schema, Document } from 'mongoose';

export interface ICollaborationRequest extends Document {
  investorId: mongoose.Types.ObjectId;
  entrepreneurId: mongoose.Types.ObjectId;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  dealTerms?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollabSchema = new Schema<ICollaborationRequest>({
  investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  entrepreneurId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  dealTerms: { type: String },
}, { timestamps: true });

CollabSchema.index({ investorId: 1, entrepreneurId: 1 });
CollabSchema.index({ entrepreneurId: 1 });

export default mongoose.model<ICollaborationRequest>('CollaborationRequest', CollabSchema);
