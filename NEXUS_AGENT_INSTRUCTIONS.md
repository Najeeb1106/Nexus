# NEXUS PLATFORM — AI AGENT BUILD INSTRUCTIONS
> **Target Deadline:** June 22, 2026 (hard target) / June 30, 2026 (final fallback)
> **Stack:** React + TypeScript + Vite (existing frontend) · Node.js + Express · MongoDB Atlas · Socket.io · WebRTC · Stripe · AWS S3 / Cloudinary
> **Repo:** https://github.com/Asakusa-k/Nexus (fork and clone this first)

---

## AGENT RULES — READ BEFORE STARTING

1. **Work sequentially.** Never skip a phase. Each phase depends on the previous one.
2. **Never break existing frontend UI.** Only extend it — do not delete or rewrite existing components unless explicitly told to.
3. **Test every phase before moving to the next.** Each phase has a TEST GATE. Do not proceed until it passes.
4. **All backend code goes in `/server` folder** at the root of the repo alongside the existing frontend.
5. **Use environment variables for ALL secrets.** Never hardcode API keys, JWT secrets, DB URIs, or Stripe keys.
6. **Commit after every phase** with a message like `feat: phase-1 backend setup complete`.
7. **If a phase requires a paid service** (AWS S3, Stripe), use the free tier or sandbox/test mode only.
8. **Keep the existing frontend running** at all times on `localhost:5173` via `npm run dev`.

---

## REPOSITORY STRUCTURE TO BUILD

```
Nexus/                          ← root (existing frontend)
├── src/                        ← existing React frontend (DO NOT DELETE)
├── server/                     ← NEW: create this folder
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── package.json                ← existing frontend package.json
└── .env                        ← frontend env vars
```

---

## PHASE 0 — PREREQUISITE SETUP
> **Estimated time: 30 minutes**
> **Do this before any coding**

### Step 0.1 — Fork & Clone

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/Nexus.git
cd Nexus
npm install
npm run dev   # verify frontend runs on localhost:5173
```

### Step 0.2 — Create MongoDB Atlas Cluster

1. Go to https://cloud.mongodb.com → create free account
2. Create a **free M0 cluster** (region: closest to you)
3. Create a database user with username + password
4. Add IP address `0.0.0.0/0` to Network Access (allow all for dev)
5. Copy the connection string: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/nexus`

### Step 0.3 — Create Cloudinary Account (for file storage)

1. Go to https://cloudinary.com → free account
2. Copy: Cloud Name, API Key, API Secret from dashboard

### Step 0.4 — Create Stripe Account (sandbox)

1. Go to https://stripe.com → create account
2. Go to Developers → API Keys
3. Copy **Publishable Key** and **Secret Key** (test mode — starts with `pk_test_` and `sk_test_`)

### ✅ TEST GATE 0
- Frontend runs on `localhost:5173` without errors
- MongoDB Atlas cluster is created and connection string is saved
- Cloudinary credentials are saved
- Stripe test keys are saved

---

## PHASE 1 — BACKEND FOUNDATION
> **Estimated time: 2–3 hours**
> **Week 1 · Milestone 1**

### Step 1.1 — Initialize Backend

```bash
mkdir server && cd server
npm init -y
npm install express mongoose cors dotenv bcryptjs jsonwebtoken
npm install multer cloudinary express-validator helmet morgan
npm install -D typescript ts-node nodemon @types/node @types/express
npm install -D @types/cors @types/bcryptjs @types/jsonwebtoken @types/multer
```

### Step 1.2 — Create `server/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.3 — Create `server/.env`

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/nexus
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Step 1.4 — Create `server/src/config/db.ts`

```typescript
import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
```

### Step 1.5 — Create `server/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db';

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

// Routes (add as phases complete)
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/meetings', meetingRoutes);
// app.use('/api/documents', documentRoutes);
// app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

export { httpServer };
```

### Step 1.6 — Add scripts to `server/package.json`

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### ✅ TEST GATE 1

```bash
cd server && npm run dev
# Open browser: http://localhost:5000/api/health
# Expected: { "status": "ok", "timestamp": "..." }
# Terminal must show: "MongoDB Connected: cluster.mongodb.net"
```

---

## PHASE 2 — USER AUTHENTICATION & PROFILES
> **Estimated time: 3–4 hours**
> **Week 1 · Milestone 2**

### Step 2.1 — Create User Model `server/src/models/User.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
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
  bio: { type: String, maxlength: 500 },
  location: { type: String },
  startupName: { type: String },
  industry: { type: String },
  fundingStage: { type: String, enum: ['idea', 'pre-seed', 'seed', 'series-a', 'series-b', 'growth'] },
  pitchDeck: { type: String },
  firm: { type: String },
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
```

### Step 2.2 — Create Auth Middleware `server/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied for your role' });
    }
    next();
  };
};
```

### Step 2.3 — Create Auth Controller `server/src/controllers/authController.ts`

```typescript
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
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
    const token = generateToken(user._id);

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

    const token = generateToken(user._id);

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

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
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

    // In production: send email with resetToken
    // For now: return token in response (mock)
    res.json({ success: true, message: 'Password reset token generated', resetToken });
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

    const token = generateToken(user._id);
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error });
  }
};
```

### Step 2.4 — Create Auth Routes `server/src/routes/authRoutes.ts`

```typescript
import { Router } from 'express';
import { register, login, getMe, updateProfile, forgotPassword, resetPassword } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;
```

### Step 2.5 — Register Routes in `server/src/index.ts`

Uncomment and add this line inside `index.ts`:

```typescript
import authRoutes from './routes/authRoutes';
// ... inside the file after middleware:
app.use('/api/auth', authRoutes);
```

### Step 2.6 — Connect Frontend AuthContext to Real API

In `src/context/AuthContext.tsx`, replace mock logic with real Axios calls:

```typescript
// Add at the top of the file
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// Add token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Replace login function:
const login = async (email: string, password: string) => {
  const { data } = await API.post('/auth/login', { email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  setUser(data.user);
};

// Replace register function:
const register = async (userData: RegisterData) => {
  const { data } = await API.post('/auth/register', userData);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  setUser(data.user);
};

// Replace logout:
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setUser(null);
};
```

### ✅ TEST GATE 2

```bash
# Test with curl or Postman:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"password123","role":"entrepreneur"}'

# Expected: { "success": true, "token": "eyJ...", "user": { ... } }

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Expected: { "success": true, "token": "eyJ...", "user": { ... } }

# In the browser: register a new account via the frontend UI — should work with real DB
```

---

## PHASE 3 — REAL-TIME CHAT WITH SOCKET.IO
> **Estimated time: 2–3 hours**

### Step 3.1 — Install Socket.io

```bash
cd server
npm install socket.io
npm install -D @types/socket.io
```

```bash
# Frontend:
cd ..
npm install socket.io-client
```

### Step 3.2 — Create Message Model `server/src/models/Message.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2000 },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IMessage>('Message', MessageSchema);
```

### Step 3.3 — Add Socket.io to `server/src/index.ts`

```typescript
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

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
    const Message = (await import('./models/Message')).default;
    const msg = await Message.create({
      senderId: userId,
      receiverId: data.receiverId,
      content: data.content,
    });

    const receiverSocketId = onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:receive', msg);
    }
    socket.emit('message:sent', msg);
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});
```

### Step 3.4 — Connect Frontend Chat to Socket.io

In `src/context/AuthContext.tsx` or a new `src/context/SocketContext.tsx`:

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const connectSocket = (token: string) => {
  socket = io('http://localhost:5000', { auth: { token } });
  return socket;
};

export const getSocket = () => socket;
```

In `src/pages/chat/ChatPage.tsx`, replace mock send with:

```typescript
import { getSocket } from '../../context/SocketContext';

const handleSend = () => {
  const socket = getSocket();
  socket.emit('message:send', { receiverId: selectedUser.id, content: newMessage });
  setNewMessage('');
};

useEffect(() => {
  const socket = getSocket();
  socket.on('message:receive', (msg) => {
    setMessages(prev => [...prev, msg]);
  });
  return () => { socket.off('message:receive'); };
}, []);
```

### ✅ TEST GATE 3

- Open two browser tabs, log in as two different users
- Send a message in one tab — it must appear in the other tab in real time without page refresh
- Both users must show as "online"

---

## PHASE 4 — MEETING SCHEDULING SYSTEM
> **Estimated time: 2–3 hours**
> **Week 2 · Milestone 3**

### Step 4.1 — Create Meeting Model `server/src/models/Meeting.ts`

```typescript
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

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);
```

### Step 4.2 — Create Meeting Controller `server/src/controllers/meetingController.ts`

```typescript
import { Response } from 'express';
import Meeting from '../models/Meeting';
import { AuthRequest } from '../middleware/auth';

export const scheduleMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { title, attendeeId, scheduledAt, duration, agenda } = req.body;

    // Conflict detection — check if slot is taken for either party
    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + (duration || 60) * 60000);

    const conflict = await Meeting.findOne({
      status: { $in: ['pending', 'accepted'] },
      $or: [
        { organizerId: req.user._id },
        { attendeeId: req.user._id },
        { organizerId: attendeeId },
        { attendeeId: attendeeId },
      ],
      scheduledAt: { $lt: endTime },
      $expr: {
        $gt: [{ $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] }, startTime]
      }
    });

    if (conflict) {
      return res.status(409).json({ message: 'Time slot conflicts with an existing meeting' });
    }

    const meeting = await Meeting.create({
      title,
      organizerId: req.user._id,
      attendeeId,
      scheduledAt: startTime,
      duration: duration || 60,
      agenda,
    });

    await meeting.populate(['organizerId', 'attendeeId'], 'name email avatar');

    res.status(201).json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ message: 'Error scheduling meeting', error });
  }
};

export const getMyMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const meetings = await Meeting.find({
      $or: [{ organizerId: req.user._id }, { attendeeId: req.user._id }]
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

    // Only the attendee can accept/reject; only organizer can cancel
    const isAttendee = meeting.attendeeId.toString() === req.user._id.toString();
    const isOrganizer = meeting.organizerId.toString() === req.user._id.toString();

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
```

### Step 4.3 — Create Meeting Routes `server/src/routes/meetingRoutes.ts`

```typescript
import { Router } from 'express';
import { scheduleMeeting, getMyMeetings, updateMeetingStatus } from '../controllers/meetingController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);
router.post('/', scheduleMeeting);
router.get('/', getMyMeetings);
router.patch('/:id/status', updateMeetingStatus);

export default router;
```

### Step 4.4 — Register in `index.ts`

```typescript
import meetingRoutes from './routes/meetingRoutes';
app.use('/api/meetings', meetingRoutes);
```

### Step 4.5 — Connect to Frontend

In the existing `src/pages/` meeting-related components, replace mock data calls with:

```typescript
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });
API.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  return config;
});

// Fetch meetings
const { data } = await API.get('/meetings');

// Schedule meeting
const { data } = await API.post('/meetings', {
  title, attendeeId, scheduledAt, duration, agenda
});

// Accept meeting
await API.patch(`/meetings/${meetingId}/status`, { status: 'accepted' });
```

### ✅ TEST GATE 4

- Log in as investor → schedule a meeting with an entrepreneur for a future date/time
- Log in as entrepreneur → should see pending meeting → accept it
- Try to schedule overlapping meeting → should get conflict error
- Accepted meeting should have a generated `meetingLink`

---

## PHASE 5 — VIDEO CALLING WITH WEBRTC
> **Estimated time: 3–4 hours**
> **Week 2 · Milestone 4**

### Step 5.1 — Install Dependencies

```bash
cd server && npm install uuid
cd .. && npm install simple-peer
npm install -D @types/simple-peer
```

### Step 5.2 — Add WebRTC Signaling to `server/src/index.ts`

Add inside the `io.on('connection')` block:

```typescript
// WebRTC Signaling
socket.on('call:offer', (data: { to: string; offer: RTCSessionDescriptionInit; from: string }) => {
  const targetSocket = onlineUsers.get(data.to);
  if (targetSocket) {
    io.to(targetSocket).emit('call:incoming', {
      from: data.from,
      offer: data.offer,
      callerName: socket.data.userName,
    });
  }
});

socket.on('call:answer', (data: { to: string; answer: RTCSessionDescriptionInit }) => {
  const targetSocket = onlineUsers.get(data.to);
  if (targetSocket) io.to(targetSocket).emit('call:answered', { answer: data.answer });
});

socket.on('call:ice-candidate', (data: { to: string; candidate: RTCIceCandidateInit }) => {
  const targetSocket = onlineUsers.get(data.to);
  if (targetSocket) io.to(targetSocket).emit('call:ice-candidate', { candidate: data.candidate });
});

socket.on('call:end', (data: { to: string }) => {
  const targetSocket = onlineUsers.get(data.to);
  if (targetSocket) io.to(targetSocket).emit('call:ended');
});
```

### Step 5.3 — Create Video Call Component `src/components/video/VideoCall.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../../context/SocketContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoCallProps {
  targetUserId: string;
  targetUserName: string;
  onClose: () => void;
  isIncoming?: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  targetUserId, targetUserName, onClose, isIncoming, incomingOffer
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socket = getSocket();

  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const startCall = async () => {
    const stream = await startLocalStream();
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      setIsConnected(true);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', { to: targetUserId, candidate: event.candidate });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('call:offer', { to: targetUserId, offer, from: socket.id });
  };

  const answerCall = async () => {
    if (!incomingOffer) return;
    const stream = await startLocalStream();
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      setIsConnected(true);
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice-candidate', { to: targetUserId, candidate: event.candidate });
      }
    };

    await pc.setRemoteDescription(incomingOffer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('call:answer', { to: targetUserId, answer });
  };

  const endCall = () => {
    pcRef.current?.close();
    socket.emit('call:end', { to: targetUserId });
    onClose();
  };

  useEffect(() => {
    if (isIncoming) answerCall();
    else startCall();

    socket.on('call:answered', async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(answer);
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      await pcRef.current?.addIceCandidate(candidate);
    });

    socket.on('call:ended', onClose);

    return () => {
      socket.off('call:answered');
      socket.off('call:ice-candidate');
      socket.off('call:ended');
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="relative w-full h-full">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted
          className="absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-white object-cover" />
      </div>
      <div className="absolute bottom-8 flex gap-4">
        <button onClick={() => setIsMuted(m => !m)}
          className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600">
          {isMuted ? <MicOff /> : <Mic />}
        </button>
        <button onClick={endCall} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700">
          <PhoneOff />
        </button>
        <button onClick={() => setIsVideoOff(v => !v)}
          className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600">
          {isVideoOff ? <VideoOff /> : <Video />}
        </button>
      </div>
      {!isConnected && (
        <div className="absolute top-1/2 text-white text-xl">
          {isIncoming ? 'Connecting...' : `Calling ${targetUserName}...`}
        </div>
      )}
    </div>
  );
};
```

### Step 5.4 — Add Incoming Call Listener in Chat Page

In `ChatPage.tsx`, add:

```typescript
const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);

useEffect(() => {
  const socket = getSocket();
  socket.on('call:incoming', ({ from, offer }) => {
    setIncomingCall({ from, offer });
  });
}, []);

// In JSX, render incoming call prompt:
{incomingCall && (
  <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50">
    <p>Incoming call from {incomingCall.from}</p>
    <button onClick={() => setShowVideoCall(true)}>Accept</button>
    <button onClick={() => setIncomingCall(null)}>Decline</button>
  </div>
)}
```

### ✅ TEST GATE 5

- Open two browsers (or incognito), log in as two users
- Click the video call button on the chat page
- Both video feeds must appear — local (small) and remote (full screen)
- Mute/unmute and end call must work
- Ending call in one browser must close the call in the other

---

## PHASE 6 — DOCUMENT PROCESSING CHAMBER
> **Estimated time: 2–3 hours**
> **Week 2 · Milestone 5**

### Step 6.1 — Install Cloudinary in Backend

```bash
cd server
npm install cloudinary multer-storage-cloudinary
npm install -D @types/multer
```

### Step 6.2 — Create Cloudinary Config `server/src/config/cloudinary.ts`

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
```

### Step 6.3 — Create Document Model `server/src/models/Document.ts`

```typescript
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

export default mongoose.model<IDocument>('Document', DocumentSchema);
```

### Step 6.4 — Create Document Controller `server/src/controllers/documentController.ts`

```typescript
import { Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import DocumentModel from '../models/Document';
import { AuthRequest } from '../middleware/auth';
import '../config/cloudinary';

// Use memoryStorage — upload buffer directly to Cloudinary
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not supported'));
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

    const result = await uploadToCloudinary(req.file.buffer, `nexus/documents/${req.user._id}`);

    const doc = await DocumentModel.create({
      name: req.body.name || req.file.originalname,
      ownerId: req.user._id,
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
    const docs = await DocumentModel.find({
      $or: [{ ownerId: req.user._id }, { sharedWith: req.user._id }]
    }).populate('ownerId sharedWith eSignedBy', 'name email avatar').sort({ createdAt: -1 });

    res.json({ success: true, documents: docs });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents', error });
  }
};

export const signDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { signatureImageBase64 } = req.body;
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Upload signature image to Cloudinary
    const result = await cloudinary.uploader.upload(signatureImageBase64, {
      folder: `nexus/signatures/${req.user._id}`,
    });

    doc.eSignatureUrl = result.secure_url;
    doc.eSignedBy = req.user._id;
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
    const doc = await DocumentModel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { $addToSet: { sharedWith: { $each: userIds } } },
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
    const doc = await DocumentModel.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found or not yours' });
    await cloudinary.uploader.destroy(doc.cloudinaryPublicId);
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error });
  }
};
```

### Step 6.5 — Create Document Routes `server/src/routes/documentRoutes.ts`

```typescript
import { Router } from 'express';
import { uploadDocument, getMyDocuments, signDocument, shareDocument, deleteDocument, upload } from '../controllers/documentController';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getMyDocuments);
router.post('/:id/sign', signDocument);
router.post('/:id/share', shareDocument);
router.delete('/:id', deleteDocument);

export default router;
```

### Step 6.6 — Register in `index.ts`

```typescript
import documentRoutes from './routes/documentRoutes';
app.use('/api/documents', documentRoutes);
```

### Step 6.7 — Connect Frontend DocumentsPage

In `src/pages/documents/DocumentsPage.tsx`:

```typescript
// Replace mock data with:
const [documents, setDocuments] = useState([]);

useEffect(() => {
  API.get('/documents').then(({ data }) => setDocuments(data.documents));
}, []);

// For upload (react-dropzone already installed):
const onDrop = async (acceptedFiles: File[]) => {
  const formData = new FormData();
  formData.append('file', acceptedFiles[0]);
  formData.append('name', acceptedFiles[0].name);
  const { data } = await API.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  setDocuments(prev => [data.document, ...prev]);
};
```

### ✅ TEST GATE 6

- Upload a PDF → it should appear in Cloudinary dashboard under `nexus/documents/`
- The document must appear in the UI with real data
- Sign a document by providing a base64 signature → status changes to "signed"
- Share a document with another user → they can see it when logged in

---

## PHASE 7 — PAYMENT SYSTEM (STRIPE SANDBOX)
> **Estimated time: 2–3 hours**
> **Week 3 · Milestone 6**

### Step 7.1 — Install Stripe

```bash
cd server && npm install stripe
npm install -D @types/stripe
cd .. && npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 7.2 — Create Transaction Model `server/src/models/Transaction.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId?: string;
  description?: string;
  recipientId?: mongoose.Types.ObjectId;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit','withdrawal','transfer'], required: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'usd' },
  status: { type: String, enum: ['pending','completed','failed'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  description: { type: String },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
```

### Step 7.3 — Create Payment Controller `server/src/controllers/paymentController.ts`

```typescript
import Stripe from 'stripe';
import { Response } from 'express';
import Transaction from '../models/Transaction';
import { AuthRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency = 'usd', description } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      metadata: { userId: req.user._id.toString() },
    });

    const transaction = await Transaction.create({
      userId: req.user._id,
      type: 'deposit',
      amount,
      currency,
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      description,
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment intent creation failed', error });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const status = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';

    const transaction = await Transaction.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status },
      { new: true }
    );

    res.json({ success: true, status, transaction });
  } catch (error) {
    res.status(500).json({ message: 'Payment confirmation failed', error });
  }
};

export const getMyTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
};

export const transferFunds = async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, amount, description } = req.body;

    // Create sender debit transaction
    const senderTx = await Transaction.create({
      userId: req.user._id,
      type: 'transfer',
      amount,
      status: 'completed',
      description: `Transfer to user ${recipientId}: ${description}`,
      recipientId,
    });

    // Create recipient credit transaction
    await Transaction.create({
      userId: recipientId,
      type: 'deposit',
      amount,
      status: 'completed',
      description: `Received transfer from ${req.user.name}: ${description}`,
    });

    res.json({ success: true, transaction: senderTx });
  } catch (error) {
    res.status(500).json({ message: 'Transfer failed', error });
  }
};
```

### Step 7.4 — Create Payment Routes `server/src/routes/paymentRoutes.ts`

```typescript
import { Router } from 'express';
import { createPaymentIntent, confirmPayment, getMyTransactions, transferFunds } from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/transactions', getMyTransactions);
router.post('/transfer', transferFunds);

export default router;
```

### Step 7.5 — Register in `index.ts`

```typescript
import paymentRoutes from './routes/paymentRoutes';
app.use('/api/payments', paymentRoutes);
```

### Step 7.6 — Add Stripe Frontend to Payment Page

In the deals or payment-related page:

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

const PaymentForm = ({ amount }: { amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handlePay = async () => {
    const { data } = await API.post('/payments/create-intent', { amount });
    const result = await stripe!.confirmCardPayment(data.clientSecret, {
      payment_method: { card: elements!.getElement(CardElement)! }
    });
    if (result.paymentIntent?.status === 'succeeded') {
      await API.post('/payments/confirm', { paymentIntentId: result.paymentIntent.id });
      toast.success('Payment successful!');
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <CardElement className="p-3 border rounded" />
      <button onClick={handlePay} className="mt-4 btn-primary">Pay ${amount}</button>
    </div>
  );
};

// Wrap with Elements provider:
<Elements stripe={stripePromise}>
  <PaymentForm amount={500} />
</Elements>
```

**Test card number:** `4242 4242 4242 4242` — any future expiry, any CVC.

### ✅ TEST GATE 7

- Use test card `4242 4242 4242 4242` to make a deposit
- Transaction must appear in the transactions list with status "completed"
- Transfer funds between two logged-in users — both must see updated transaction history
- Failed card (`4000 0000 0000 0002`) must create a "failed" transaction

---

## PHASE 8 — SECURITY HARDENING
> **Estimated time: 2 hours**
> **Week 3 · Milestone 7**

### Step 8.1 — Install Security Packages

```bash
cd server
npm install express-rate-limit express-mongo-sanitize xss-clean hpp
npm install nodemailer
npm install -D @types/nodemailer
```

### Step 8.2 — Add Security Middleware to `server/src/index.ts`

```typescript
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Sanitize against NoSQL injection (e.g. { "$gt": "" })
app.use(mongoSanitize());

// Sanitize against XSS (strips HTML tags from req.body, params, query)
app.use(xss());

// Prevent HTTP parameter pollution
app.use(hpp());
```

### Step 8.3 — Add Input Validation to Auth Routes

In `server/src/routes/authRoutes.ts`:

```typescript
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.post('/register', [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('role').isIn(['entrepreneur', 'investor']),
  validate,
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], login);
```

### Step 8.4 — 2FA (OTP via Email — Mock/Nodemailer)

Add to `server/src/controllers/authController.ts`:

```typescript
import nodemailer from 'nodemailer';

// Create transporter (use Gmail or Mailtrap for dev)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
```

Add to `.env`:

```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
```

> **Note:** Sign up at https://mailtrap.io (free) for a dev email inbox. No real emails sent.

### ✅ TEST GATE 8

- Try registering with a weak password (e.g. `123`) → should get validation error
- Send `{"email": {"$gt": ""}}` as login body → should be rejected (NoSQL injection blocked)
- Hit `/api/auth/login` 11 times quickly → 11th request should be rate-limited (429 status)
- Request OTP → check Mailtrap inbox → verify OTP → `twoFactorEnabled` should be `true` in DB

---

## PHASE 9 — COLLABORATION REQUESTS (BACKEND)
> **Estimated time: 1–2 hours**

### Step 9.1 — Create Collaboration Request Model `server/src/models/CollaborationRequest.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ICollaborationRequest extends Document {
  investorId: mongoose.Types.ObjectId;
  entrepreneurId: mongoose.Types.ObjectId;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  dealTerms?: string;
}

const CollabSchema = new Schema<ICollaborationRequest>({
  investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  entrepreneurId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  dealTerms: { type: String },
}, { timestamps: true });

export default mongoose.model<ICollaborationRequest>('CollaborationRequest', CollabSchema);
```

### Step 9.2 — Create Routes and Wire Up

Follow the same pattern as Meetings — create a `collaborationController.ts` with CRUD operations: `sendRequest`, `getMyRequests`, `updateStatus`. Register at `/api/collaborations`.

Replace the frontend mock `collaborationRequests.ts` data file with real API calls using `axios`.

### ✅ TEST GATE 9

- Log in as investor → send collaboration request to entrepreneur
- Log in as entrepreneur → see pending request → accept it
- Request status must update in DB

---

## PHASE 10 — DEPLOYMENT
> **Estimated time: 2–3 hours**
> **Week 3 · Milestone 8**

### Step 10.1 — Prepare Backend for Production

Add to `server/src/index.ts`:

```typescript
// Serve frontend in production
import path from 'path';

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
  });
}
```

### Step 10.2 — Deploy Backend to Render

1. Go to https://render.com → New Web Service
2. Connect your GitHub repo
3. **Root directory:** `server`
4. **Build command:** `npm install && npm run build`
5. **Start command:** `node dist/index.js`
6. Add all environment variables from `server/.env` in the Render dashboard
7. Copy the deployed URL: `https://nexus-api.onrender.com`

### Step 10.3 — Update Frontend API URL

In `src/context/AuthContext.tsx` and any Axios instances, update:

```typescript
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});
```

Create `.env` in the root (frontend):

```env
VITE_API_URL=https://nexus-api.onrender.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

### Step 10.4 — Deploy Frontend to Vercel

```bash
# Build first to verify no TS errors:
npm run build

# Then push to GitHub — Vercel auto-deploys
git add . && git commit -m "feat: full-stack integration complete"
git push origin main
```

In Vercel dashboard → Settings → Environment Variables → add `VITE_API_URL` and `VITE_STRIPE_PUBLISHABLE_KEY`.

### Step 10.5 — Update CORS on Backend

In `server/.env` (production):

```env
CLIENT_URL=https://nexus-your-app.vercel.app
```

### ✅ TEST GATE 10

- Visit Vercel URL → login works with real DB
- Register a new user → appears in MongoDB Atlas
- Upload a document → appears in Cloudinary
- Make a Stripe test payment → transaction stored in DB
- Socket.io chat works on the live deployment

---

## PHASE 11 — API DOCUMENTATION
> **Estimated time: 1 hour**

### Step 11.1 — Install Swagger

```bash
cd server
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

### Step 11.2 — Add Swagger to `index.ts`

```typescript
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Nexus API', version: '1.0.0', description: 'Nexus Platform API Documentation' },
    servers: [{ url: process.env.NODE_ENV === 'production'
      ? 'https://nexus-api.onrender.com/api'
      : 'http://localhost:5000/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Step 11.3 — Add JSDoc Comments to Routes

Example in `authRoutes.ts`:

```typescript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);
```

Add similar JSDoc to all routes. Swagger UI will be available at `http://localhost:5000/api/docs`.

### ✅ TEST GATE 11

- Visit `http://localhost:5000/api/docs` → Swagger UI loads
- All routes are visible and documented
- Can execute API calls from Swagger UI using the Authorize button with a JWT token

---

## FINAL CHECKLIST BEFORE SUBMISSION

Go through every item. Do not submit until all are ✅.

### Authentication & Profiles
- [ ] Register with real DB storage (passwords hashed with bcrypt)
- [ ] Login returns JWT token
- [ ] Protected routes reject requests without valid token
- [ ] Role-based access (investor vs entrepreneur routes)
- [ ] Profile update persists in DB
- [ ] Forgot/reset password works with token

### Real-time Chat
- [ ] Messages stored in MongoDB
- [ ] Messages appear in real time (no page refresh)
- [ ] Online status indicator works
- [ ] Message history loads from DB on page open

### Meeting Scheduling
- [ ] Schedule meeting with conflict detection
- [ ] Accept / reject / cancel meetings
- [ ] Meetings display correct status and time
- [ ] Meeting link generated on acceptance

### Video Calling
- [ ] Local video stream appears
- [ ] Remote video stream appears after call is accepted
- [ ] Mute / unmute audio works
- [ ] Toggle video works
- [ ] End call works on both sides

### Document Chamber
- [ ] Upload PDF / DOC file → stored in Cloudinary
- [ ] Files list with real metadata
- [ ] E-signature stored and linked to document
- [ ] Document sharing between users works

### Payments
- [ ] Stripe test deposit works with card `4242 4242 4242 4242`
- [ ] Failed card creates "failed" transaction
- [ ] Transfer between users records transactions on both sides
- [ ] Transaction history displays in dashboard

### Security
- [ ] Passwords hashed with bcrypt (verify in MongoDB — must NOT be plaintext)
- [ ] Rate limiting blocks excessive requests (429 response)
- [ ] NoSQL injection attempt blocked
- [ ] XSS attempt blocked
- [ ] 2FA OTP sent and verified

### Deployment
- [ ] Backend live on Render, accessible via HTTPS
- [ ] Frontend live on Vercel, all routes work (no 404 on refresh)
- [ ] Environment variables set in both platforms (no hardcoded secrets)
- [ ] CORS configured for production frontend URL

### Documentation
- [ ] Swagger UI live at `/api/docs`
- [ ] All endpoints documented
- [ ] GitHub repo has both `src/` (frontend) and `server/` (backend)
- [ ] README.md updated with setup instructions and live links

---

## TIMELINE SUMMARY

| Date | Target |
|---|---|
| **June 17–18** | Phase 0 + Phase 1 (Setup + Backend Foundation) |
| **June 18–19** | Phase 2 (Auth + DB connected to frontend) |
| **June 19–20** | Phase 3 (Real-time chat with Socket.io) |
| **June 20** | Phase 4 (Meeting Scheduling) |
| **June 20–21** | Phase 5 (WebRTC Video Calling) |
| **June 21** | Phase 6 (Document Chamber + Cloudinary) |
| **June 21–22** | Phase 7 (Stripe Payments) |
| **June 22** | Phase 8 + 9 (Security + Collaboration Requests) |
| **June 22** ✅ | Phase 10 (Deployment) — **HARD TARGET** |
| **June 23–25** | Phase 11 (API Docs) + Bug fixes + Buffer |
| **June 30** | Final submission with demo presentation |

---

## COMMON ERRORS & FIXES

| Error | Cause | Fix |
|---|---|---|
| `CORS error` in browser | Backend not allowing frontend origin | Check `CLIENT_URL` in `.env` matches exactly |
| `jwt malformed` | Token not being sent or wrong format | Ensure `Authorization: Bearer <token>` header |
| `MongoServerError: E11000` | Duplicate email on register | User already exists — return "email already registered" |
| `Cannot read property of undefined` | Mongoose doc not populated | Add `.populate()` to query |
| `Stripe error: No such payment_intent` | Wrong API key mode (live vs test) | Ensure both keys are `test` mode |
| `WebRTC ICE failed` | Firewall blocking STUN/TURN | Add more STUN servers or use a TURN server |
| Socket.io `xhr poll error` | Backend not running or wrong port | Verify server is on port 5000 |
| Vercel 404 on refresh | Missing SPA rewrite rule | `vercel.json` must have the rewrite rule (already exists) |
| Render cold start delay | Free tier spins down after inactivity | Add a health check ping or upgrade to paid tier |
