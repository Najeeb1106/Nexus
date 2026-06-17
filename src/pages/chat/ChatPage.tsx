import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Phone, Video, Info, Smile, MessageCircle } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Message } from '../../types';
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [chatPartner, setChatPartner] = useState<any | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Fetch conversations history
  const loadConversations = () => {
    API.get('/messages/conversations')
      .then(({ data }) => {
        setConversations(data.conversations);
      })
      .catch((err) => console.error('Error fetching conversations:', err));
  };

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, userId]);

  // Load chat partner details
  useEffect(() => {
    if (userId) {
      API.get(`/auth/users/${userId}`)
        .then(({ data }) => {
          setChatPartner({
            id: data.user.id || data.user._id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            avatarUrl: data.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.name)}&background=random`,
            isOnline: onlineUserIds.includes(data.user.id || data.user._id)
          });
        })
        .catch((err) => console.error('Error fetching user info:', err));
    } else {
      setChatPartner(null);
    }
  }, [userId, onlineUserIds]);

  // Load message logs between current user and partner
  useEffect(() => {
    if (currentUser && userId) {
      API.get(`/messages/${userId}`)
        .then(({ data }) => {
          const formatted = data.messages.map((m: any) => ({
            id: m._id || m.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            content: m.content,
            timestamp: m.createdAt,
            isRead: m.isRead
          }));
          setMessages(formatted);
        })
        .catch((err) => console.error('Error fetching message logs:', err));
    }
  }, [currentUser, userId]);

  // Handle real-time WS listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('users:online', (userIds: string[]) => {
      setOnlineUserIds(userIds);
    });

    socket.on('message:receive', (msg: any) => {
      // If message is from current active conversation partner, append it
      if (userId && msg.senderId === userId) {
        setMessages((prev) => [...prev, msg]);
      }
      loadConversations();
    });

    socket.on('message:sent', (msg: any) => {
      if (userId && msg.receiverId === userId) {
        setMessages((prev) => [...prev, msg]);
      }
      loadConversations();
    });

    return () => {
      socket.off('users:online');
      socket.off('message:receive');
      socket.off('message:sent');
    };
  }, [socket, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId || !socket) return;

    // Emit event to server
    socket.emit('message:send', { receiverId: userId, content: newMessage });
    setNewMessage('');
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
      {/* Conversations sidebar */}
      <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-gray-200">
        <ChatUserList conversations={conversations} />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        {chatPartner ? (
          <>
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <Avatar
                  src={chatPartner.avatarUrl}
                  alt={chatPartner.name}
                  size="md"
                  status={chatPartner.isOnline ? 'online' : 'offline'}
                  className="mr-3"
                />

                <div>
                  <h2 className="text-lg font-medium text-gray-900">{chatPartner.name}</h2>
                  <p className="text-sm text-gray-500">
                    {chatPartner.isOnline ? 'Online' : 'Last seen recently'}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Voice call"
                >
                  <Phone size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Video call"
                >
                  <Video size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Info"
                >
                  <Info size={18} />
                </Button>
              </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isCurrentUser={message.senderId === currentUser.id}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <MessageCircle size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
                  <p className="text-gray-500 mt-1">Send a message to start the conversation</p>
                </div>
              )}
            </div>

            {/* Message input */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Add emoji"
                >
                  <Smile size={20} />
                </Button>

                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  fullWidth
                  className="flex-1"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim()}
                  className="rounded-full p-2 w-10 h-10 flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <MessageCircle size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-700">Select a conversation</h2>
            <p className="text-gray-500 mt-2 text-center">
              Choose a contact from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};