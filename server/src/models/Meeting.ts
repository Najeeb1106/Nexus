import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  organizerId: mongoose.Types.ObjectId;
  attendeeId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  duration: number; // minutes
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
  agenda?: string;
}

const MeetingSchema = new Schema<IMeeting>({
  title: { type: String, required: true },
  organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  attendeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 60 },
  status: { type: String, enum: ['pending','accepted','rejected','completed','cancelled'], default: 'pending' },
  meetingLink: { type: String },
  notes: { type: String },
  agenda: { type: String },
}, { timestamps: true });

MeetingSchema.index({ organizerId: 1 });
MeetingSchema.index({ attendeeId: 1 });

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);
