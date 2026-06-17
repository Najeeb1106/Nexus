import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { MessageCircle } from 'lucide-react';
import API from '../../lib/api';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      API.get('/messages/conversations')
        .then(({ data }) => {
          setConversations(data.conversations);
        })
        .catch((err) => console.error('Error fetching conversations:', err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (!user) return null;
  
  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : conversations.length > 0 ? (
        <ChatUserList conversations={conversations} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="bg-gray-100 p-6 rounded-full mb-4">
            <MessageCircle size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">No messages yet</h2>
          <p className="text-gray-600 text-center mt-2">
            Start connecting with entrepreneurs and investors to begin conversations
          </p>
        </div>
      )}
    </div>
  );
};