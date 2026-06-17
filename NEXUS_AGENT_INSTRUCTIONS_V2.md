# NEXUS PLATFORM — AI AGENT BUILD INSTRUCTIONS (v2)
> **Generated from:** Full-Stack System Report (report_updated) — 2026-06-17
> **Hard Deadline:** June 22, 2026 | **Final Deadline:** June 30, 2026
> **Frontend:** React 18 + TypeScript + Vite → `http://localhost:5173`
> **Backend:** Node.js + Express + TypeScript → `http://localhost:5000`
> **Database:** MongoDB (local `mongodb://127.0.0.1:27017/nexus`)

---

## CURRENT STATE SUMMARY (READ FIRST)

The following has already been scaffolded and partially implemented based on the updated system report. **Do NOT rebuild these — only verify they work before proceeding.**

| Area | Status |
|---|---|
| Backend folder `server/` with Express + TypeScript | DONE |
| MongoDB connection via Mongoose | DONE |
| All 6 Mongoose models (User, Message, Meeting, Document, Transaction, CollaborationRequest) | DONE |
| JWT auth middleware (`protect`) | DONE |
| Auth routes: register, login, profile update, forgot/reset password, OTP send/verify | DONE |
| Meeting routes: create, list, update status | DONE |
| Document routes: upload (Multer+Cloudinary), list, share, sign | DONE |
| Payment routes: deposit intent, confirm, transfer, history | DONE |
| Collaboration routes: send, list, update status | DONE |
| Socket.io server on the HTTP server | DONE |
| Security middleware: helmet, rate-limit, mongo-sanitize, xss-clean, hpp, bcrypt | DONE |
| Stripe sandbox integration (backend) | DONE |
| Cloudinary + Multer (backend) | DONE |

**What is NOT yet done — this is your full remaining task list:**

1. Frontend `AuthContext` still uses mock data — not connected to real backend APIs
2. All frontend pages still import from `src/data/` mock files — not connected to backend
3. Socket.io client not wired in frontend (chat, online status, video signaling)
4. WebRTC video call UI component missing
5. Stripe Elements not added to frontend payment page
6. E-signature canvas UI missing
7. MongoDB Atlas not set up — currently using local MongoDB only (breaks on deployment)
8. Backend not deployed to Render
9. Frontend env vars for production API URL not configured
10. Swagger/API docs missing
11. Message history API endpoint (`/messages/history/:id`) may not be implemented yet

---

## AGENT RULES — READ BEFORE STARTING

1. **Work sequentially.** Every phase depends on the previous one passing its TEST GATE.
2. **Never delete or rewrite existing frontend components.** Extend them only.
3. **Every phase ends with a TEST GATE.** Do not move forward until it passes.
4. **All backend code lives in `server/` folder.** Do not mix frontend and backend.
5. **Use environment variables for all secrets.** No hardcoded keys anywhere.
6. **Commit after each phase:** `git add . && git commit -m "feat: phase-X complete"`
7. **The backend is TypeScript.** Run `npm run dev` inside `server/` separately from the frontend.
8. **Both servers must run simultaneously:** frontend on `:5173`, backend on `:5000`.

---

## PHASE 0 — ENVIRONMENT VERIFICATION
> **Time: 30 minutes | Do this before anything else**

### Step 0.1 — Verify Both Servers Start

```bash
# Terminal 1 — Frontend
cd Nexus
npm install
npm run dev
# Must show: Local: http://localhost:5173

# Terminal 2 — Backend
cd Nexus/server
npm install
npm run dev
# Must show: Server running on http://localhost:5000
# Must show: MongoDB Connected
```

### Step 0.2 — Verify MongoDB is Running Locally

```bash
# On Windows:
net start MongoDB

# Verify connection by opening in browser:
# http://localhost:5000/api/health
# Expected response: { "status": "ok" }
```

### Step 0.3 — Verify `server/.env` Exists and Has All Variables

Check that `server/.env` contains ALL of the following. Fill in any that are missing:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nexus
JWT_SECRET=nexus_super_secret_jwt_key_must_be_32_chars_minimum
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
```

> If Cloudinary credentials are missing: sign up free at https://cloudinary.com
> If Stripe test keys are missing: go to https://stripe.com Developers > API Keys
> If Mailtrap is missing: sign up free at https://mailtrap.io > Email Testing > SMTP Settings

### Step 0.4 — Create Frontend `.env`

In the root `Nexus/` folder (not inside `server/`), create `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### TEST GATE 0

- `http://localhost:5173` loads frontend without errors
- `http://localhost:5000/api/health` returns `{ "status": "ok" }`
- Terminal shows "MongoDB Connected"
- Both `.env` files exist with all required variables filled in

---

## PHASE 1 — CONNECT FRONTEND AUTH TO REAL BACKEND
> **Time: 2–3 hours | Most critical phase**

The frontend `AuthContext` currently uses mock data from `src/data/users.ts`. Replace all of it with real API calls.

### Step 1.1 — Create a Shared Axios Instance

Create file `src/lib/api.ts`:

```typescript
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Automatically attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear storage and redirect to login
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
```

### Step 1.2 — Rewrite `src/context/AuthContext.tsx`

Keep all existing TypeScript interfaces (User, Entrepreneur, Investor, AuthContextType) exactly as they are at the top of the file. Only replace the AuthProvider implementation:

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import API from '../lib/api';

// KEEP ALL EXISTING INTERFACES HERE UNCHANGED

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app load: restore session from localStorage and verify token with backend
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await API.get('/auth/me');
          setUser(data.user);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    role: 'entrepreneur' | 'investor';
  }) => {
    const { data } = await API.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    const { data } = await API.put('/auth/profile', updates);
    const updatedUser = { ...user, ...data.user };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser as User);
  };

  const forgotPassword = async (email: string) => {
    await API.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (token: string, password: string) => {
    await API.post(`/auth/reset-password/${token}`, { password });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      forgotPassword,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Step 1.3 — Add `/auth/me` Route to Backend

In `server/src/routes/authRoutes.ts`, verify this exists (add if missing):

```typescript
import { getMe } from '../controllers/authController';
router.get('/me', protect, getMe);
```

In `server/src/controllers/authController.ts`, verify `getMe` exists:

```typescript
export const getMe = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, user: req.user });
};
```

### Step 1.4 — Add Error Handling to Login and Register Pages

In `src/pages/auth/LoginPage.tsx`, replace the submit handler with:

```typescript
import toast from 'react-hot-toast';
const { login } = useAuth();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await login(email, password);
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Login failed. Check your credentials.');
  }
};
```

In `src/pages/auth/RegisterPage.tsx`:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await register({ name, email, password, role });
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Registration failed.');
  }
};
```

### TEST GATE 1

```bash
# 1. Register a new account at http://localhost:5173/register
#    No errors in the browser console

# 2. Verify password is hashed in MongoDB:
#    mongo shell: use nexus; db.users.find().pretty()
#    Password field must start with $2b$ (bcrypt hash), NOT be plaintext

# 3. Log in — must redirect to correct dashboard based on role

# 4. Refresh the page — user must stay logged in (token verified by /auth/me)

# 5. Log out — localStorage cleared, redirected to /login
```

---

## PHASE 2 — CONNECT ALL FRONTEND PAGES TO REAL API
> **Time: 2–3 hours**

Every page in `src/pages/` currently imports from `src/data/*.ts` mock files. Replace those imports with real API calls.

### Step 2.1 — Add `getUsers` Endpoint to Backend

In `server/src/routes/authRoutes.ts`, add:

```typescript
router.get('/users', protect, getUsers);
```

In `server/src/controllers/authController.ts`, add:

```typescript
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
```

### Step 2.2 — Replace Mock Data in `InvestorsPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import API from '../../lib/api';
import toast from 'react-hot-toast';

const [investors, setInvestors] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  API.get('/auth/users?role=investor')
    .then(({ data }) => setInvestors(data.users))
    .catch(() => toast.error('Failed to load investors'))
    .finally(() => setLoading(false));
}, []);
```

### Step 2.3 — Replace Mock Data in `EntrepreneursPage.tsx`

```typescript
useEffect(() => {
  API.get('/auth/users?role=entrepreneur')
    .then(({ data }) => setEntrepreneurs(data.users))
    .catch(() => toast.error('Failed to load entrepreneurs'))
    .finally(() => setLoading(false));
}, []);
```

### Step 2.4 — Replace Mock Data in `CollaborationRequestCard` and Related Pages

Find every file importing from `src/data/collaborationRequests.ts`. Replace with:

```typescript
const [requests, setRequests] = useState([]);

useEffect(() => {
  API.get('/collaborations')
    .then(({ data }) => setRequests(data.requests))
    .catch(() => toast.error('Failed to load requests'));
}, []);

const sendRequest = async (entrepreneurId: string, message: string) => {
  await API.post('/collaborations', { entrepreneurId, message });
  toast.success('Request sent!');
};

const updateRequestStatus = async (id: string, status: 'accepted' | 'rejected') => {
  await API.put(`/collaborations/${id}`, { status });
  setRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r));
  toast.success(`Request ${status}`);
};
```

### Step 2.5 — Replace Mock Data in Meeting-Related Components

```typescript
const [meetings, setMeetings] = useState([]);

useEffect(() => {
  API.get('/meetings')
    .then(({ data }) => setMeetings(data.meetings));
}, []);

const scheduleMeeting = async (meetingData: {
  title: string;
  attendeeId: string;
  scheduledAt: string;
  duration: number;
  agenda?: string;
}) => {
  try {
    const { data } = await API.post('/meetings', meetingData);
    setMeetings(prev => [...prev, data.meeting]);
    toast.success('Meeting scheduled!');
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Failed to schedule meeting');
  }
};

const respondToMeeting = async (id: string, status: 'accepted' | 'rejected' | 'cancelled') => {
  await API.put(`/meetings/${id}`, { status });
  setMeetings(prev => prev.map(m => m._id === id ? { ...m, status } : m));
};
```

### Step 2.6 — Replace Mock Data in `DocumentsPage.tsx`

```typescript
const [documents, setDocuments] = useState([]);

useEffect(() => {
  API.get('/documents')
    .then(({ data }) => setDocuments(data.documents));
}, []);

// File upload using react-dropzone (already installed):
const onDrop = async (acceptedFiles: File[]) => {
  const file = acceptedFiles[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);

  try {
    const { data } = await API.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setDocuments(prev => [data.document, ...prev]);
    toast.success('File uploaded!');
  } catch {
    toast.error('Upload failed.');
  }
};
```

### Step 2.7 — Replace Mock Data in `DealsPage.tsx`

Active deals are collaboration requests with status `accepted`:

```typescript
useEffect(() => {
  API.get('/collaborations')
    .then(({ data }) => {
      const activeDeals = data.requests.filter((r: any) => r.status === 'accepted');
      setDeals(activeDeals);
    });
}, []);
```

### Step 2.8 — Replace Mock Data in `NotificationsPage.tsx`

```typescript
useEffect(() => {
  Promise.all([
    API.get('/meetings'),
    API.get('/collaborations'),
  ]).then(([meetingsRes, collabRes]) => {
    const meetingNotes = meetingsRes.data.meetings
      .filter((m: any) => m.status === 'pending')
      .map((m: any) => ({
        id: m._id,
        type: 'meeting',
        message: `Meeting request: "${m.title}"`,
        createdAt: m.createdAt,
      }));

    const collabNotes = collabRes.data.requests
      .filter((r: any) => r.status === 'pending')
      .map((r: any) => ({
        id: r._id,
        type: 'collaboration',
        message: `New collaboration request`,
        createdAt: r.createdAt,
      }));

    setNotifications(
      [...meetingNotes, ...collabNotes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  });
}, []);
```

### TEST GATE 2

- Register two users (one investor, one entrepreneur)
- Investors page shows the real entrepreneur from DB — not mock Pexels images
- Investor sends collaboration request to entrepreneur — entrepreneur sees it in dashboard
- Entrepreneur accepts request — appears as active deal
- Schedule a meeting with conflict detection — overlapping time returns an error
- Upload a PDF — appears in Cloudinary dashboard AND in Documents page with real data

---

## PHASE 3 — REAL-TIME CHAT WITH SOCKET.IO
> **Time: 2 hours**
> Backend Socket.io server already exists. This phase wires the frontend.

### Step 3.1 — Add Message History Endpoint to Backend

Create `server/src/routes/messageRoutes.ts`:

```typescript
import { Router } from 'express';
import { protect } from '../middleware/auth';
import Message from '../models/Message';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();
router.use(protect);

router.get('/history/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user._id },
      ],
    })
    .sort({ createdAt: 1 })
    .populate('senderId receiverId', 'name avatar');

    // Mark messages as read
    await Message.updateMany(
      { senderId: req.params.userId, receiverId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error });
  }
});

export default router;
```

Register in `server/src/index.ts`:

```typescript
import messageRoutes from './routes/messageRoutes';
app.use('/api/messages', messageRoutes);
```

### Step 3.2 — Create Socket Context in Frontend

Create `src/context/SocketContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: [] });

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('token');
    const serverUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
      .replace('/api', '');

    socketRef.current = io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('users:online', (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

### Step 3.3 — Wrap App with SocketProvider in `src/App.tsx`

The SocketProvider must go INSIDE AuthProvider:

```typescript
import { SocketProvider } from './context/SocketContext';

// Wrap existing router:
<AuthProvider>
  <SocketProvider>
    <BrowserRouter>
      {/* existing routes unchanged */}
    </BrowserRouter>
  </SocketProvider>
</AuthProvider>
```

### Step 3.4 — Wire `ChatPage.tsx` to Socket and Real API

In `src/pages/chat/ChatPage.tsx`, replace all mock message logic:

```typescript
import { useSocket } from '../../context/SocketContext';
import API from '../../lib/api';

const { socket, onlineUsers } = useSocket();
const [messages, setMessages] = useState([]);
const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [newMessage, setNewMessage] = useState('');
const { user: currentUser } = useAuth();

// Load message history when conversation partner is selected
useEffect(() => {
  if (!selectedUserId) return;
  API.get(`/messages/history/${selectedUserId}`)
    .then(({ data }) => setMessages(data.messages));
}, [selectedUserId]);

// Listen for incoming real-time messages
useEffect(() => {
  if (!socket) return;
  socket.on('message:receive', (msg: any) => {
    const senderId = msg.senderId?._id || msg.senderId;
    if (senderId === selectedUserId) {
      setMessages(prev => [...prev, msg]);
    }
  });
  return () => { socket.off('message:receive'); };
}, [socket, selectedUserId]);

// Send message
const handleSend = () => {
  if (!newMessage.trim() || !selectedUserId || !socket) return;
  socket.emit('message:send', {
    receiverId: selectedUserId,
    content: newMessage.trim(),
  });
  // Optimistic UI update
  setMessages(prev => [...prev, {
    _id: `temp-${Date.now()}`,
    senderId: { _id: currentUser?._id },
    content: newMessage.trim(),
    createdAt: new Date().toISOString(),
  }]);
  setNewMessage('');
};

// Online status helper for user list
const isOnline = (userId: string) => onlineUsers.includes(userId);
```

### TEST GATE 3

- Open two browser windows (normal + incognito), log in as two different users
- Both users show correct online/offline indicator
- Send a message — appears instantly in the other window without page refresh
- Refresh the page — previous messages load from MongoDB (history persists)

---

## PHASE 4 — WEBRTC VIDEO CALLING
> **Time: 2–3 hours**
> The backend signaling server is already in `server/src/index.ts`. This phase builds the frontend UI only.

### Step 4.1 — Verify Signaling Events Exist in Backend

Open `server/src/index.ts` and verify ALL of the following events exist inside `io.on('connection', ...)`. Add any that are missing:

```typescript
socket.on('call:offer', (data: { to: string; offer: RTCSessionDescriptionInit }) => {
  const targetSocket = onlineUsers.get(data.to);
  if (targetSocket) {
    io.to(targetSocket).emit('call:incoming', {
      from: socket.data.userId,
      fromName: socket.data.userName || 'Unknown',
      offer: data.offer,
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

Also update the socket auth middleware to store the user's name:

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id).select('name');
    socket.data.userId = decoded.id;
    socket.data.userName = user?.name || 'Unknown';
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});
```

### Step 4.2 — Create VideoCall Component

Create `src/components/video/VideoCall.tsx`:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface VideoCallProps {
  targetUserId: string;
  targetUserName: string;
  isIncoming: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  onClose: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  targetUserId, targetUserName, isIncoming, incomingOffer, onClose,
}) => {
  const { socket } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected'>('connecting');

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const getLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const createPC = (stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      setCallStatus('connected');
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket?.emit('call:ice-candidate', { to: targetUserId, candidate: e.candidate });
    };
    return pc;
  };

  const startCall = async () => {
    const stream = await getLocalStream();
    const pc = createPC(stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit('call:offer', { to: targetUserId, offer });
  };

  const answerCall = async () => {
    if (!incomingOffer) return;
    const stream = await getLocalStream();
    const pc = createPC(stream);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket?.emit('call:answer', { to: targetUserId, answer });
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    socket?.emit('call:end', { to: targetUserId });
    onClose();
  };

  useEffect(() => {
    if (isIncoming) answerCall();
    else startCall();

    socket?.on('call:answered', async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });
    socket?.on('call:ice-candidate', async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
    socket?.on('call:ended', onClose);

    return () => {
      socket?.off('call:answered');
      socket?.off('call:ice-candidate');
      socket?.off('call:ended');
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [socket]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <video ref={localVideoRef} autoPlay playsInline muted
        className="absolute bottom-24 right-4 w-40 h-28 rounded-xl border-2 border-white object-cover" />

      {callStatus === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-white text-xl font-semibold">
            {isIncoming ? `Connecting to ${targetUserName}...` : `Calling ${targetUserName}...`}
          </p>
        </div>
      )}

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
        <button onClick={() => {
          localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
          setIsMuted(m => !m);
        }} className={`p-4 rounded-full text-white ${isMuted ? 'bg-red-500' : 'bg-gray-700'}`}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button onClick={endCall} className="p-5 rounded-full bg-red-600 text-white">
          <PhoneOff size={28} />
        </button>

        <button onClick={() => {
          localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
          setIsVideoOff(v => !v);
        }} className={`p-4 rounded-full text-white ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'}`}>
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
      </div>
    </div>
  );
};
```

### Step 4.3 — Add Incoming Call Handler and Video Button to `ChatPage.tsx`

```typescript
import { VideoCall } from '../../components/video/VideoCall';
import { Phone } from 'lucide-react';

const [incomingCall, setIncomingCall] = useState<{
  from: string; fromName: string; offer: RTCSessionDescriptionInit;
} | null>(null);
const [activeCall, setActiveCall] = useState<{
  userId: string; userName: string; isIncoming: boolean; offer?: RTCSessionDescriptionInit;
} | null>(null);

// Listen for incoming calls
useEffect(() => {
  if (!socket) return;
  socket.on('call:incoming', ({ from, fromName, offer }) => {
    setIncomingCall({ from, fromName, offer });
  });
  return () => { socket.off('call:incoming'); };
}, [socket]);

// In JSX — incoming call notification (fixed top-right):
{incomingCall && (
  <div className="fixed top-4 right-4 z-40 bg-white rounded-2xl shadow-xl p-5 flex items-center gap-4 border">
    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
      <Phone className="text-primary-600" size={24} />
    </div>
    <div>
      <p className="font-semibold">Incoming Video Call</p>
      <p className="text-sm text-gray-500">{incomingCall.fromName}</p>
    </div>
    <div className="flex gap-2 ml-4">
      <button onClick={() => {
        setActiveCall({ userId: incomingCall.from, userName: incomingCall.fromName,
          isIncoming: true, offer: incomingCall.offer });
        setIncomingCall(null);
      }} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">
        Accept
      </button>
      <button onClick={() => setIncomingCall(null)}
        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium">
        Decline
      </button>
    </div>
  </div>
)}

{/* In the chat header, next to the existing phone icon: */}
<button onClick={() => selectedUserId && setActiveCall({
  userId: selectedUserId, userName: selectedUserName, isIncoming: false,
})} className="p-2 rounded-lg hover:bg-gray-100">
  <Video size={20} />
</button>

{/* Active call overlay */}
{activeCall && (
  <VideoCall
    targetUserId={activeCall.userId}
    targetUserName={activeCall.userName}
    isIncoming={activeCall.isIncoming}
    incomingOffer={activeCall.offer}
    onClose={() => setActiveCall(null)}
  />
)}
```

### TEST GATE 4

- Open two browsers, log in as two different users
- Click the Video button in the chat header → incoming call prompt appears in the other browser
- Accept → both local and remote video streams appear
- Mute, toggle video, end call — all must work
- Ending call in one browser closes it in both

---

## PHASE 5 — STRIPE PAYMENT FRONTEND
> **Time: 1–2 hours**
> Backend payment endpoints already exist. This phase adds the Stripe Elements UI.

### Step 5.1 — Install Stripe Frontend Packages

```bash
# In root Nexus/ folder:
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 5.2 — Create Deposit Form Component

Create `src/components/payments/DepositForm.tsx`:

```typescript
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import API from '../../lib/api';
import toast from 'react-hot-toast';

interface DepositFormProps {
  onSuccess: (transaction: any) => void;
}

export const DepositForm: React.FC<DepositFormProps> = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    if (!stripe || !elements) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      toast.error('Minimum deposit is $1');
      return;
    }
    setLoading(true);
    try {
      // Step 1 — create payment intent on backend
      const { data } = await API.post('/payments/deposit', { amount: amountNum });

      // Step 2 — confirm card on Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: elements.getElement(CardElement)! },
      });

      if (result.error) {
        toast.error(result.error.message || 'Payment failed');
        return;
      }

      // Step 3 — confirm on backend to record in DB
      const confirmRes = await API.post('/payments/confirm', {
        paymentIntentId: result.paymentIntent?.id,
      });

      toast.success(`$${amountNum} deposited successfully!`);
      onSuccess(confirmRes.data.transaction);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00" min="1"
            className="pl-7 w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Card Details</label>
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
          <CardElement options={{
            style: { base: { fontSize: '16px', color: '#374151' }, invalid: { color: '#EF4444' } }
          }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Test card: 4242 4242 4242 4242 · Any future date · Any CVC
        </p>
      </div>
      <button onClick={handleDeposit} disabled={loading || !stripe}
        className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg">
        {loading ? 'Processing...' : `Deposit $${amount || '0'}`}
      </button>
    </div>
  );
};
```

### Step 5.3 — Create Transaction History Component

Create `src/components/payments/TransactionHistory.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import API from '../../lib/api';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/payments/history')
      .then(({ data }) => setTransactions(data.transactions))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-500">Loading...</p>;

  return (
    <div className="divide-y divide-gray-100">
      {transactions.length === 0 && (
        <p className="text-center py-8 text-gray-500">No transactions yet.</p>
      )}
      {transactions.map((tx: any) => (
        <div key={tx._id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              {tx.type === 'deposit' ? <ArrowDownLeft className="text-green-500" size={20} /> :
               tx.type === 'transfer_sent' ? <ArrowUpRight className="text-red-500" size={20} /> :
               <ArrowLeftRight className="text-blue-500" size={20} />}
            </div>
            <div>
              <p className="text-sm font-medium capitalize">{tx.type.replace('_', ' ')}</p>
              <p className="text-xs text-gray-400">{format(new Date(tx.createdAt), 'MMM d, yyyy · h:mm a')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${
              tx.type === 'deposit' || tx.type === 'transfer_received'
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {tx.type === 'deposit' || tx.type === 'transfer_received' ? '+' : '-'}
              ${tx.amount.toFixed(2)}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              tx.status === 'completed' ? 'bg-green-100 text-green-700' :
              tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>{tx.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Step 5.4 — Integrate Into DealsPage or Payment Section

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { DepositForm } from '../../components/payments/DepositForm';
import { TransactionHistory } from '../../components/payments/TransactionHistory';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// In JSX:
<Elements stripe={stripePromise}>
  <DepositForm onSuccess={(tx) => console.log('Transaction saved:', tx)} />
</Elements>

<TransactionHistory />
```

### TEST GATE 5

- Use test card `4242 4242 4242 4242`, expiry `12/29`, CVC `123` — payment succeeds
- Transaction appears in history with status "completed"
- Use failing card `4000 0000 0000 0002` — shows error, transaction status "failed"
- MongoDB: `db.transactions.find().pretty()` shows correct records

---

## PHASE 6 — E-SIGNATURE CANVAS IN DOCUMENTS PAGE
> **Time: 1 hour**
> Backend `/documents/:id/sign` endpoint already accepts base64 signature. This phase adds the canvas UI.

### Step 6.1 — Create Signature Pad Component

Create `src/components/documents/SignaturePad.tsx`:

```typescript
import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onCancel: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e, canvasRef.current);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-2">Draw Your Signature</h3>
        <p className="text-sm text-gray-500 mb-4">Use your mouse or finger to sign below.</p>
        <canvas ref={canvasRef} width={460} height={180}
          className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-crosshair w-full touch-none"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        <div className="flex justify-between mt-4">
          <button onClick={clear} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600">
            <Trash2 size={16} /> Clear
          </button>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">
              Cancel
            </button>
            <button onClick={() => canvasRef.current && onSave(canvasRef.current.toDataURL('image/png'))}
              disabled={!hasSignature}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 disabled:opacity-40 text-white rounded-lg font-medium">
              <Check size={16} /> Sign Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Step 6.2 — Wire SignaturePad into `DocumentsPage.tsx`

```typescript
import { SignaturePad } from '../../components/documents/SignaturePad';

const [signingDocId, setSigningDocId] = useState<string | null>(null);

const handleSign = async (base64: string) => {
  if (!signingDocId) return;
  try {
    await API.post(`/documents/${signingDocId}/sign`, { signatureImageBase64: base64 });
    toast.success('Document signed!');
    setSigningDocId(null);
    const { data } = await API.get('/documents');
    setDocuments(data.documents);
  } catch {
    toast.error('Failed to sign document.');
  }
};

// Add to each document card:
<button onClick={() => setSigningDocId(doc._id)}
  className="text-sm text-primary-600 hover:underline font-medium">
  Sign
</button>

// At the bottom of JSX:
{signingDocId && (
  <SignaturePad onSave={handleSign} onCancel={() => setSigningDocId(null)} />
)}
```

### TEST GATE 6

- Upload a PDF → appears in documents list
- Click Sign → canvas pad opens → draw a signature → click "Sign Document"
- Document status changes to "signed" in the list
- MongoDB: document has `eSignatureUrl` and `eSignedAt` populated

---

## PHASE 7 — SWITCH TO MONGODB ATLAS (DEPLOYMENT PREREQUISITE)
> **Time: 30 minutes**
> Currently using local MongoDB. Must switch to Atlas before deploying.

### Step 7.1 — Create MongoDB Atlas Cluster

1. Go to https://cloud.mongodb.com → sign up or log in
2. Create a free **M0 cluster** → any region
3. Database Access → Add New User → create username + password (save these)
4. Network Access → Add IP Address → `0.0.0.0/0` (allow all for now)
5. Connect → Drivers → copy the connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/nexus?retryWrites=true&w=majority`

### Step 7.2 — Update `server/.env`

```env
# Replace local URI:
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/nexus?retryWrites=true&w=majority
```

### Step 7.3 — Restart Backend and Verify

```bash
cd server && npm run dev
# Terminal must show: MongoDB Connected: cluster0.xxxxx.mongodb.net
# Must NOT show 127.0.0.1
```

Register a test user — verify it appears in Atlas Collections dashboard.

### TEST GATE 7

- Terminal shows Atlas cluster hostname (not localhost)
- Atlas dashboard Collections tab shows `users` collection with your test data
- All features from previous phases still work (login, chat, documents)

---

## PHASE 8 — DEPLOYMENT
> **Time: 2 hours**

### Step 8.1 — Prepare Backend for Production

In `server/src/index.ts`, add this block (add if missing):

```typescript
import path from 'path';

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
  });
}
```

Verify `server/package.json` has:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts"
  }
}
```

### Step 8.2 — Deploy Backend to Render

1. Go to https://render.com → New → Web Service → Connect GitHub repo
2. Settings:
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/index.js`
   - Node Version: `20`
3. Add all environment variables from `server/.env` in the Render dashboard
4. Set `NODE_ENV=production` and `CLIENT_URL` as placeholder for now
5. Deploy → copy the URL: `https://nexus-api.onrender.com`

### Step 8.3 — Build and Deploy Frontend to Vercel

```bash
# Test the production build locally first:
npm run build
# Must complete with no TypeScript errors

# Push to GitHub:
git add .
git commit -m "feat: full-stack integration complete"
git push origin main
```

In Vercel dashboard → Import → select repo → add environment variables:
- `VITE_API_URL` = `https://nexus-api.onrender.com/api`
- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_your_key`

Deploy → copy Vercel URL: `https://nexus-xyz.vercel.app`

### Step 8.4 — Update CORS on Render

Go to Render → Environment → update:

```
CLIENT_URL=https://nexus-xyz.vercel.app
```

Trigger redeploy on Render.

### TEST GATE 8

- Vercel URL loads the app without blank screen or console errors
- Register a new user → appears in Atlas Collections
- Log in → JWT stored, correct dashboard loads
- Upload a document → appears in Cloudinary
- Make Stripe test deposit → transaction in Atlas
- Chat works in real time on the live URL
- No CORS errors in browser console

---

## PHASE 9 — API DOCUMENTATION (SWAGGER)
> **Time: 1 hour**

### Step 9.1 — Install Swagger

```bash
cd server
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

### Step 9.2 — Configure Swagger in `server/src/index.ts`

```typescript
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Nexus Platform API', version: '1.0.0' },
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
  apis: ['./src/routes/*.ts'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Step 9.3 — Add JSDoc Comments to All Route Files

Add directly above each router line. Example for `authRoutes.ts`:

```typescript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "investor@nexus.com" }
 *               password: { type: string, example: "SecurePass123" }
 *     responses:
 *       200:
 *         description: Returns JWT token and user profile
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);
```

Repeat for every route in all route files.

### TEST GATE 9

- Visit `http://localhost:5000/api/docs`
- Swagger UI loads with all route groups visible
- Click Authorize → paste JWT token → execute `GET /auth/me` → returns user profile

---

## FINAL SUBMISSION CHECKLIST

Check every item before submitting. Do not submit with unchecked items.

### Backend
- [ ] Server starts on Render without errors
- [ ] Atlas hostname appears in terminal (not localhost)
- [ ] All 6 models exist in DB collections
- [ ] All route groups registered: `/auth`, `/messages`, `/meetings`, `/documents`, `/payments`, `/collaborations`
- [ ] Protected routes return 401 without token
- [ ] Passwords are bcrypt hashed in DB (NOT plaintext — verify in Atlas)
- [ ] Rate limiting: 11th login attempt in 15min returns 429
- [ ] Swagger docs live at `/api/docs`

### Frontend Connected to Backend
- [ ] Login and register use real backend (no mock data)
- [ ] Page refresh keeps user logged in (token verified on load)
- [ ] Investors and entrepreneurs pages show real DB users
- [ ] Collaboration requests: send, accept, reject — all persist in DB
- [ ] Meetings: schedule with conflict detection, accept, reject — all persist
- [ ] Documents: upload to Cloudinary, list from DB, e-signature canvas saves to DB
- [ ] Payments: Stripe deposit with test card, transaction history from DB
- [ ] Chat: real-time messages, history persists across page refresh
- [ ] Video calling: local + remote streams, mute, toggle video, end call on both sides

### Deployment
- [ ] Frontend live on Vercel — no 404 on page refresh
- [ ] Backend live on Render — HTTPS endpoint
- [ ] No localhost URLs in production build
- [ ] CORS configured for Vercel URL in Render env vars
- [ ] All env vars set in both dashboards — no secrets in Git

### GitHub and Docs
- [ ] Repo has both `src/` (frontend) and `server/` (backend)
- [ ] `.env` files are NOT committed (in `.gitignore`)
- [ ] `README.md` has live URLs, setup steps, API docs link, test card info

---

## REVISED TIMELINE (From June 17)

| Date | Phase | Target |
|---|---|---|
| **June 17 (today)** | Phase 0 — Environment verification | Do immediately |
| **June 17–18** | Phase 1 — AuthContext connected to real API | High priority |
| **June 18** | Phase 2 — All pages connected to real API | High priority |
| **June 18–19** | Phase 3 — Socket.io chat wired in frontend | Medium |
| **June 19** | Phase 4 — WebRTC video calling UI | Medium |
| **June 19–20** | Phase 5 — Stripe Elements frontend | Medium |
| **June 20** | Phase 6 — E-signature canvas | Lower |
| **June 20** | Phase 7 — Switch to MongoDB Atlas | Blocker for deploy |
| **June 21** | Phase 8 — Deploy Render + Vercel | Critical |
| **June 21–22** | Phase 9 — Swagger docs | Documentation |
| **June 22** | Full checklist review + bug fixes | Hard target |
| **June 23–29** | Buffer — polish, edge cases, demo prep | Buffer |
| **June 30** | Final submission | Deadline |

---

## COMMON ERRORS QUICK REFERENCE

| Error | Cause | Fix |
|---|---|---|
| `Network Error` in browser | Backend not running | Start `server/` with `npm run dev`, check port 5000 |
| `CORS error` | `CLIENT_URL` mismatch | Ensure it exactly matches frontend URL including protocol |
| `401 Unauthorized` | No token or expired token | Check `localStorage.getItem('token')` in browser devtools |
| `MongoServerError: E11000` | Duplicate email on register | Return "email already registered" message |
| `jwt must be provided` | Empty Authorization header | Check `API.interceptors.request` is attaching the token |
| `WebRTC ICE failed` | STUN server unreachable | Add more STUN servers; test on real network not VPN |
| Stripe `card_error` | Wrong key mode | Ensure `pk_test_` on frontend, `sk_test_` on backend |
| Vercel 404 on refresh | Missing SPA rewrite | `vercel.json` already has it — just ensure it was not deleted |
| Render cold start delay | Free tier sleeps after 15min | Expected on free tier; upgrade or add a cron health-check ping |
| `Cannot read properties of undefined` | Mongoose doc not populated | Add `.populate()` to the Mongoose query |
