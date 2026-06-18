import mongoose, { Schema, Document as MongoDoc } from 'mongoose';

export interface IDocument extends MongoDoc {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  fileType: string;
  fileSize: number;
  version: number;
  status: 'draft' | 'review' | 'signed' | 'archived';
  eSignatureUrl?: string;
  eSignedBy?: mongoose.Types.ObjectId;
  eSignedAt?: Date;
  tags: string[];
}

const DocumentSchema = new Schema<IDocument>({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft','review','signed','archived'], default: 'draft' },
  eSignatureUrl: { type: String },
  eSignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  eSignedAt: { type: Date },
  tags: [{ type: String }],
}, { timestamps: true });

DocumentSchema.index({ ownerId: 1 });
DocumentSchema.index({ sharedWith: 1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);
