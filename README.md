# Nexus Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

Nexus is an elite, secure, and modern B2B investment matchmaking and deal flow platform designed to connect startup entrepreneurs and private investors. It facilitates seamless collaboration, real-time messaging, WebRTC video calling, digital contract e-signatures, and secure escrow transactions via Stripe.

---

## 🚀 Key Features

*   **Secure Authentication**: Role-based access control (Entrepreneur & Investor), OTP Verification, and password recovery.
*   **Real-time Collaboration**: Secure matching workflow where requests progress from pending to active deals.
*   **Instant Chat**: Low-latency real-time messaging using Socket.io with persistent chat history.
*   **WebRTC Video Calling**: High-fidelity video and audio calling integrated directly into the chat dashboard.
*   **Stripe Sandbox Escrow**: Mock sandbox transactions allowing investors to fund deals and maintain deposit history securely.
*   **Document Vault**: Secure document uploads with e-signing using an interactive HTML5 Canvas signature pad.
*   **Swagger API Docs**: Fully documented REST API endpoints accessible directly in the development dashboard.

---

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Axios, Socket.io-client, Stripe Elements, Lucide-React.
*   **Backend**: Node.js, Express, TypeScript, Socket.io, Mongoose (MongoDB), Stripe SDK, Cloudinary SDK, Nodemailer.
*   **Database**: MongoDB (Local for Dev, Atlas for Production).

---

## 📂 Repository Structure

```ascii
Nexus/
├── public/                  # Public static assets
├── src/                     # Frontend source code
│   ├── components/          # Reusable UI/feature components
│   │   ├── chat/            # Chat components
│   │   ├── deals/           # Deals/Stripe form components
│   │   ├── documents/       # Document / Signature components
│   │   ├── layout/          # Dashboard wrappers
│   │   └── ui/              # Atom-level design system elements
│   ├── context/             # Global states (AuthContext, SocketContext)
│   ├── lib/                 # Core utilities & API Axios client
│   ├── pages/               # Page components (Dashboard, Profile, Chat, Deals, Docs)
│   └── App.tsx              # React router entrypoint
├── server/                  # Backend Node.js / Express service
│   ├── src/
│   │   ├── config/          # DB connection setups
│   │   ├── controllers/     # API request handlers
│   │   ├── middleware/      # Auth & security interceptors
│   │   ├── models/          # Mongoose collection schemas
│   │   ├── routes/          # API route definitions
│   │   └── index.ts         # Server configuration & Socket.io server
│   ├── package.json
│   └── tsconfig.json
├── package.json
└── vite.config.ts
```

---

## ⚙️ Installation and Setup

### Prerequisites

*   [Node.js (v18 or higher)](https://nodejs.org/)
*   [MongoDB Community Server](https://www.mongodb.com/try/download/community)

### 1. Backend Setup

1. Navigate to the server folder:
    ```bash
    cd server
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Copy the environment template and configure your secrets:
    ```bash
    copy .env.example .env
    ```
4. Start the backend development server:
    ```bash
    npm run dev
    ```
    *Should display:* `Server running on http://localhost:5000` & `MongoDB Connected`

### 2. Frontend Setup

1. Navigate back to the root workspace:
    ```bash
    cd ..
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Copy the client environment template:
    ```bash
    copy .env.example .env
    ```
4. Launch the Vite dev server:
    ```bash
    npm run dev
    ```
    *Should display:* `Local: http://localhost:5173/`

---

## 📑 API Documentation (Swagger)

When the backend server is running in development mode, you can explore the fully interactive Swagger API documentation directly at:

```
http://localhost:5000/api/docs/
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
