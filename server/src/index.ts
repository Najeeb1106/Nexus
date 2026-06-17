import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import connectDB from './config/db';

import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import meetingRoutes from './routes/meetingRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/meetings', meetingRoutes);


const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});

// Auth middleware for sockets
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    socket.data.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const onlineUsers = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  onlineUsers.set(userId, socket.id);
  io.emit('users:online', Array.from(onlineUsers.keys()));

  socket.on('message:send', async (data: { receiverId: string; content: string }) => {
    try {
      const Message = (await import('./models/Message')).default;
      const msg = await Message.create({
        senderId: userId,
        receiverId: data.receiverId,
        content: data.content,
      });

      const formattedMsg = {
        id: msg._id.toString(),
        senderId: msg.senderId.toString(),
        receiverId: msg.receiverId.toString(),
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
        isRead: msg.isRead
      };

      const receiverSocketId = onlineUsers.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:receive', formattedMsg);
      }
      socket.emit('message:sent', formattedMsg);
    } catch (err) {
      console.error('Error saving socket message:', err);
    }
  });

  // WebRTC Signaling
  socket.on('call:offer', (data: { to: string; offer: any }) => {
    const targetSocket = onlineUsers.get(data.to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:incoming', {
        from: userId,
        offer: data.offer,
      });
    }
  });

  socket.on('call:answer', (data: { to: string; answer: any }) => {
    const targetSocket = onlineUsers.get(data.to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:answered', { answer: data.answer });
    }
  });

  socket.on('call:ice-candidate', (data: { to: string; candidate: any }) => {
    const targetSocket = onlineUsers.get(data.to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:ice-candidate', { candidate: data.candidate });
    }
  });

  socket.on('call:end', (data: { to: string }) => {
    const targetSocket = onlineUsers.get(data.to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:ended');
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

export { httpServer };
