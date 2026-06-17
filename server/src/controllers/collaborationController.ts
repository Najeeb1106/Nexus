import { Response } from 'express';
import mongoose from 'mongoose';
import CollaborationRequest from '../models/CollaborationRequest';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const sendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId, message, dealTerms } = req.body;
    const currentUserId = req.user._id.toString();

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    let investorId: string;
    let entrepreneurId: string;

    if (req.user.role === 'investor') {
      investorId = currentUserId;
      entrepreneurId = targetUserId;
    } else {
      entrepreneurId = currentUserId;
      investorId = targetUserId;
    }

    // Check if request already exists
    const existing = await CollaborationRequest.findOne({
      investorId: new mongoose.Types.ObjectId(investorId) as any,
      entrepreneurId: new mongoose.Types.ObjectId(entrepreneurId) as any,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ message: 'A pending collaboration request already exists between these users' });
    }

    const collabRequest = await CollaborationRequest.create({
      investorId: new mongoose.Types.ObjectId(investorId) as any,
      entrepreneurId: new mongoose.Types.ObjectId(entrepreneurId) as any,
      message,
      dealTerms,
    });

    await collabRequest.populate('investorId entrepreneurId', 'name email avatar role startupName firm');

    res.status(201).json({ success: true, request: collabRequest });
  } catch (error) {
    res.status(500).json({ message: 'Error sending collaboration request', error });
  }
};

export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user._id.toString();

    const requests = await CollaborationRequest.find({
      $or: [
        { investorId: new mongoose.Types.ObjectId(currentUserId) as any },
        { entrepreneurId: new mongoose.Types.ObjectId(currentUserId) as any }
      ]
    })
    .populate('investorId entrepreneurId', 'name email avatar role startupName firm')
    .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collaboration requests', error });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, dealTerms } = req.body;
    const request = await CollaborationRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Collaboration request not found' });
    }

    const currentUserId = req.user._id.toString();
    const isInvestor = request.investorId.toString() === currentUserId;
    const isEntrepreneur = request.entrepreneurId.toString() === currentUserId;

    if (!isInvestor && !isEntrepreneur) {
      return res.status(403).json({ message: 'Not authorized to modify this request' });
    }

    request.status = status;
    if (dealTerms !== undefined) {
      request.dealTerms = dealTerms;
    }

    await request.save();
    await request.populate('investorId entrepreneurId', 'name email avatar role startupName firm');

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ message: 'Error updating collaboration request', error });
  }
};
