import React, { useState, useEffect } from 'react';
import { Bell, MessageCircle, UserPlus, DollarSign } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import API from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      API.get('/meetings'),
      API.get('/collaborations')
    ]).then(([meetingsRes, collabRes]) => {
      const meetingNotes = meetingsRes.data.meetings
        .filter((m: any) => m.status === 'pending')
        .map((m: any) => {
          const partner = m.organizerId?._id === user.id ? m.attendeeId : m.organizerId;
          const partnerName = partner?.name || 'Someone';
          const partnerAvatar = partner?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=random`;
          
          return {
            id: m.id || m._id,
            type: 'connection',
            user: { name: partnerName, avatar: partnerAvatar },
            content: `wants to schedule a meeting: "${m.title}"`,
            time: formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }),
            unread: true,
            createdAt: m.createdAt
          };
        });

      const collabNotes = collabRes.data.requests
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => {
          const partner = r.investorId?._id === user.id ? r.entrepreneurId : r.investorId;
          const partnerName = partner?.name || 'Someone';
          const partnerAvatar = partner?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=random`;
          
          return {
            id: r.id || r._id,
            type: 'investment',
            user: { name: partnerName, avatar: partnerAvatar },
            content: `sent a collaboration request: "${r.message.slice(0, 60)}..."`,
            time: formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }),
            unread: true,
            createdAt: r.createdAt
          };
        });

      setNotifications(
        [...meetingNotes, ...collabNotes]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      );
    })
    .catch(() => toast.error('Failed to load notifications'))
    .finally(() => setLoading(false));
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={16} className="text-primary-600" />;
      case 'connection':
        return <UserPlus size={16} className="text-secondary-600" />;
      case 'investment':
        return <DollarSign size={16} className="text-accent-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with your network activity</p>
        </div>
        
        <Button variant="outline" size="sm">
          Mark all as read
        </Button>
      </div>
      
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(notification => (
            <Card
              key={notification.id}
              className={`transition-colors duration-200 ${
                notification.unread ? 'bg-primary-50' : ''
              }`}
            >
              <CardBody className="flex items-start p-4">
                <Avatar
                  src={notification.user.avatar}
                  alt={notification.user.name}
                  size="md"
                  className="flex-shrink-0 mr-4"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {notification.user.name}
                    </span>
                    {notification.unread && (
                      <Badge variant="primary" size="sm" rounded>New</Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mt-1">
                    {notification.content}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    {getNotificationIcon(notification.type)}
                    <span>{notification.time}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            No new notifications.
          </div>
        )}
      </div>
    </div>
  );
};