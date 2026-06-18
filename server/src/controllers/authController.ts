import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.EMAIL_PORT || '2525'),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, startupName, firm } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role, startupName, firm });
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, user: req.user });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    delete updates.password;
    delete updates.email;
    delete updates.role;

    const user = await User.findByIdAndUpdate(req.user._id.toString(), updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'No user with that email' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Log token to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset link: ${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);
    }

    try {
      await transporter.sendMail({
        from: 'Nexus Platform <no-reply@nexus.app>',
        to: user.email,
        subject: 'Password Reset Request',
        html: `<h2>Password Reset Request</h2><p>Click <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}">here</a> to reset your password. The link is valid for 10 minutes.</p>`,
      });
    } catch (mailErr) {
      console.error('Failed to send password reset email:', mailErr);
    }

    res.json({ success: true, message: 'Password reset link sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Error in forgot password', error });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    const token = generateToken(user._id.toString());
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // Compatibility layer for mock demo users
    if (['i1', 'i2', 'i3', 'e1', 'e2', 'e3', 'e4'].includes(id)) {
      const mockUsers: Record<string, any> = {
        i1: {
          id: 'i1',
          name: 'Michael Rodriguez',
          email: 'michael@vcinnovate.com',
          role: 'investor',
          avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
          bio: 'Early-stage investor with focus on B2B SaaS and fintech. Previously founded and exited two startups.',
          investmentFocus: ['FinTech', 'SaaS', 'AI/ML'],
          minInvestment: 250000,
          maxInvestment: 1500000,
          location: 'San Francisco, CA'
        },
        i2: {
          id: 'i2',
          name: 'Jennifer Lee',
          email: 'jennifer@impactvc.org',
          role: 'investor',
          avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg',
          bio: 'Impact investor focused on climate tech, sustainable agriculture, and clean energy.',
          investmentFocus: ['CleanTech', 'AgTech', 'Sustainability'],
          minInvestment: 500000,
          maxInvestment: 3000000,
          location: 'Portland, OR'
        },
        i3: {
          id: 'i3',
          name: 'Robert Torres',
          email: 'robert@healthventures.com',
          role: 'investor',
          avatar: 'https://images.pexels.com/photos/834863/pexels-photo-834863.jpeg',
          bio: 'Healthcare-focused investor with medical background. Looking for innovations in patient care and biotech.',
          investmentFocus: ['HealthTech', 'BioTech', 'Medical Devices'],
          minInvestment: 1000000,
          maxInvestment: 5000000,
          location: 'Boston, MA'
        },
        e1: {
          id: 'e1',
          name: 'Sarah Johnson',
          email: 'sarah@techwave.io',
          role: 'entrepreneur',
          avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
          bio: 'Serial entrepreneur with 10+ years of experience in SaaS and fintech.',
          startupName: 'TechWave AI',
          industry: 'FinTech',
          fundingStage: 'seed',
          location: 'San Francisco, CA'
        },
        e2: {
          id: 'e2',
          name: 'David Chen',
          email: 'david@greenlife.co',
          role: 'entrepreneur',
          avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
          bio: 'Environmental scientist turned entrepreneur. Passionate about sustainable solutions.',
          startupName: 'GreenLife Solutions',
          industry: 'CleanTech',
          fundingStage: 'seed',
          location: 'Portland, OR'
        },
        e3: {
          id: 'e3',
          name: 'Maya Patel',
          email: 'maya@healthpulse.com',
          role: 'entrepreneur',
          avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
          bio: 'Former healthcare professional with an MBA. Building tech to improve patient care.',
          startupName: 'HealthPulse',
          industry: 'HealthTech',
          fundingStage: 'seed',
          location: 'Boston, MA'
        },
        e4: {
          id: 'e4',
          name: 'James Wilson',
          email: 'james@urbanfarm.io',
          role: 'entrepreneur',
          avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
          bio: 'Agricultural engineer focused on urban farming solutions and food security.',
          startupName: 'UrbanFarm',
          industry: 'AgTech',
          fundingStage: 'seed',
          location: 'Chicago, IL'
        }
      };

      return res.json({ success: true, user: mockUsers[id] });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user', error });
  }
};

export const sendOTP = async (req: AuthRequest, res: Response) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findByIdAndUpdate(req.user._id, {
      twoFactorOTP: otp,
      twoFactorOTPExpiry: expiry,
    });

    await transporter.sendMail({
      from: 'Nexus Platform <no-reply@nexus.app>',
      to: req.user.email,
      subject: 'Your Nexus OTP Code',
      html: `<h2>Your OTP: <strong>${otp}</strong></h2><p>Expires in 10 minutes.</p>`,
    });

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send OTP', error });
  }
};

export const verifyOTP = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.twoFactorOTP !== req.body.otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if (user.twoFactorOTPExpiry && user.twoFactorOTPExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpiry = undefined;
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ success: true, message: '2FA verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'OTP verification failed', error });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.query;
    const filter: any = { isActive: true };
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password -twoFactorOTP -resetPasswordToken')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
};


