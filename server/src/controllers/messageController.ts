import { Response } from 'express';
import Message from '../models/Message';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

// Get messages between current user and partner
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: partnerId },
        { senderId: partnerId, receiverId: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error });
  }
};

// Get conversations list (active chats) for current user
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user._id;

    // Aggregate unique partners we have chatted with
    const activePartners = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: currentUserId },
            { receiverId: currentUserId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', currentUserId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    // Populate user info for active partners
    const conversations = await Promise.all(
      activePartners.map(async (item) => {
        const partner = await User.findById(item._id).select('name email avatar role isActive');
        if (!partner) return null;
        return {
          id: partner._id.toString(),
          participants: [currentUserId.toString(), partner._id.toString()],
          lastMessage: {
            id: item.lastMessage._id.toString(),
            senderId: item.lastMessage.senderId.toString(),
            receiverId: item.lastMessage.receiverId.toString(),
            content: item.lastMessage.content,
            timestamp: item.lastMessage.createdAt.toISOString(),
            isRead: item.lastMessage.isRead
          },
          updatedAt: item.lastMessage.createdAt.toISOString()
        };
      })
    );

    // Filter nulls and sort by updatedAt descending
    const filteredConversations = conversations
      .filter((c) => c !== null)
      .sort((a, b) => new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime());

    res.json({ success: true, conversations: filteredConversations });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations', error });
  }
};
