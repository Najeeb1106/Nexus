import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'entrepreneur' | 'investor';
  avatar?: string;
  bio?: string;
  location?: string;
  // Entrepreneur fields
  startupName?: string;
  industry?: string;
  fundingStage?: string;
  pitchDeck?: string;
  // Investor fields
  firm?: string;
  investmentFocus?: string[];
  portfolioCompanies?: string[];
  minInvestment?: number;
  maxInvestment?: number;
  // Security
  twoFactorEnabled: boolean;
  twoFactorOTP?: string;
  twoFactorOTPExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  isActive: boolean;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['entrepreneur', 'investor'], required: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  location: { type: String, default: '' },
  startupName: { type: String, default: '' },
  industry: { type: String, default: '' },
  fundingStage: { type: String, enum: ['idea', 'pre-seed', 'seed', 'series-a', 'series-b', 'growth', ''] },
  pitchDeck: { type: String, default: '' },
  firm: { type: String, default: '' },
  investmentFocus: [{ type: String }],
  portfolioCompanies: [{ type: String }],
  minInvestment: { type: Number },
  maxInvestment: { type: Number },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorOTP: { type: String },
  twoFactorOTPExpiry: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
