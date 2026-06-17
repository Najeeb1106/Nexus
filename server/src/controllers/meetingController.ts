import { Response } from 'express';
import mongoose from 'mongoose';
import Meeting from '../models/Meeting';
import { AuthRequest } from '../middleware/auth';

export const scheduleMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { title, attendeeId, scheduledAt, duration, agenda } = req.body;
    const currentUserId = req.user._id.toString();

    // Conflict detection — check if slot is taken for either party
    const startTime = new Date(scheduledAt);
    const durationMin = Number(duration) || 60;
    const endTime = new Date(startTime.getTime() + durationMin * 60000);

    const conflict = await Meeting.findOne({
      status: { $in: ['pending', 'accepted'] },
      $or: [
        { organizerId: new mongoose.Types.ObjectId(currentUserId) as any },
        { attendeeId: new mongoose.Types.ObjectId(currentUserId) as any },
        { organizerId: new mongoose.Types.ObjectId(attendeeId) as any },
        { attendeeId: new mongoose.Types.ObjectId(attendeeId) as any },
      ],
      scheduledAt: { $lt: endTime },
      $expr: {
        $gt: [{ $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] }, startTime]
      }
    } as any);

    if (conflict) {
      return res.status(409).json({ message: 'Time slot conflicts with an existing meeting' });
    }

    const meeting = await Meeting.create({
      title,
      organizerId: new mongoose.Types.ObjectId(currentUserId) as any,
      attendeeId: new mongoose.Types.ObjectId(attendeeId) as any,
      scheduledAt: startTime,
      duration: durationMin,
      agenda,
    });

    await meeting.populate('organizerId', 'name email avatar');
    await meeting.populate('attendeeId', 'name email avatar');

    res.status(201).json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ message: 'Error scheduling meeting', error });
  }
};

export const getMyMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user._id.toString();
    const meetings = await Meeting.find({
      $or: [
        { organizerId: new mongoose.Types.ObjectId(currentUserId) as any },
        { attendeeId: new mongoose.Types.ObjectId(currentUserId) as any }
      ]
    })
    .populate('organizerId attendeeId', 'name email avatar role')
    .sort({ scheduledAt: 1 });

    res.json({ success: true, meetings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching meetings', error });
  }
};

export const updateMeetingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const currentUserId = req.user._id.toString();
    // Only the attendee can accept/reject; only organizer can cancel
    const isAttendee = meeting.attendeeId.toString() === currentUserId;
    const isOrganizer = meeting.organizerId.toString() === currentUserId;

    if (['accepted', 'rejected'].includes(status) && !isAttendee) {
      return res.status(403).json({ message: 'Only the attendee can accept or reject' });
    }
    if (status === 'cancelled' && !isOrganizer) {
      return res.status(403).json({ message: 'Only the organizer can cancel' });
    }

    meeting.status = status;
    if (status === 'accepted') {
      meeting.meetingLink = `https://meet.nexus.app/room/${meeting._id}`;
    }
    await meeting.save();

    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ message: 'Error updating meeting', error });
  }
};
