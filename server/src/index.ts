import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
const hpp = require('hpp');
const xss = require('xss-clean');

import connectDB from './config/db';

import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import meetingRoutes from './routes/meetingRoutes';
import documentRoutes from './routes/documentRoutes';
import paymentRoutes from './routes/paymentRoutes';
import collaborationRoutes from './routes/collaborationRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());

// Support comma-separated origins in CLIENT_URL
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(o => o.trim()) 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ 
  origin: (origin, callback) => {
    // If no origin (like server-to-server or curl), do not set CORS header
    if (!origin) return callback(null, false);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, origin); // Pass the matched origin string
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security Sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests from this IP, please try again later' }
});
app.use('/api', apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 login requests
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes' }
});
app.use('/api/auth/login', loginLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/collaborations', collaborationRoutes);

// Swagger Documentation Configuration
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Nexus Platform API', version: '1.0.0', description: 'API documentation for the Nexus Platform' },
    servers: [{
      url: process.env.NODE_ENV === 'production'
        ? 'https://nexus-api.onrender.com/api'
        : 'http://localhost:5000/api',
    }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));






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
