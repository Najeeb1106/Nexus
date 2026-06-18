import { Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import DocumentModel from '../models/Document';
import { AuthRequest } from '../middleware/auth';
import '../config/cloudinary';

// Use memoryStorage — upload buffer directly to Cloudinary
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf', 
      'image/png', 
      'image/jpeg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const currentUserId = req.user._id.toString();
    const result = await uploadToCloudinary(req.file.buffer, `nexus/documents/${currentUserId}`);

    const doc = await DocumentModel.create({
      name: req.body.name || req.file.originalname,
      ownerId: new mongoose.Types.ObjectId(currentUserId) as any,
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    });

    res.status(201).json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error });
  }
};

export const getMyDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user._id.toString();
    const userObjectId = new mongoose.Types.ObjectId(currentUserId) as any;

    const docs = await DocumentModel.find({
      $or: [{ ownerId: userObjectId }, { sharedWith: userObjectId }]
    })
    .populate('ownerId sharedWith eSignedBy', 'name email avatar')
    .sort({ createdAt: -1 });

    res.json({ success: true, documents: docs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents', error });
  }
};

export const signDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { signatureImageBase64 } = req.body;
    const currentUserId = req.user._id.toString();

    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Verify ownership or shared access
    const isOwner = doc.ownerId.toString() === currentUserId;
    const isShared = doc.sharedWith.some((id: any) => id.toString() === currentUserId);
    if (!isOwner && !isShared) {
      return res.status(403).json({ message: 'Not authorized to sign this document' });
    }

    // Upload signature image to Cloudinary
    const result = await cloudinary.uploader.upload(signatureImageBase64, {
      folder: `nexus/signatures/${currentUserId}`,
    });

    doc.eSignatureUrl = result.secure_url;
    doc.eSignedBy = new mongoose.Types.ObjectId(currentUserId) as any;
    doc.eSignedAt = new Date();
    doc.status = 'signed';
    await doc.save();

    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ message: 'Error signing document', error });
  }
};

export const shareDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;
    const currentUserId = req.user._id.toString();
    const docId = req.params.id;

    const populatedUserIds = userIds.map((id: string) => new mongoose.Types.ObjectId(id) as any);

    const doc = await DocumentModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(docId) as any, ownerId: new mongoose.Types.ObjectId(currentUserId) as any },
      { $addToSet: { sharedWith: { $each: populatedUserIds } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Document not found or not yours' });
    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ message: 'Error sharing document', error });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user._id.toString();
    const docId = req.params.id;

    const doc = await DocumentModel.findOneAndDelete({ 
      _id: new mongoose.Types.ObjectId(docId) as any, 
      ownerId: new mongoose.Types.ObjectId(currentUserId) as any 
    });
    if (!doc) return res.status(404).json({ message: 'Document not found or not yours' });
    
    await cloudinary.uploader.destroy(doc.cloudinaryPublicId);
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error });
  }
};
