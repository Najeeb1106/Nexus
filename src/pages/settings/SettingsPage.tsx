import React, { useState } from 'react';
import { User as UserIcon, Lock, Bell, Globe, Palette, CreditCard, Save } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  
  // Basic states
  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');
  
  // Entrepreneur specific states
  const [startupName, setStartupName] = useState((user as any)?.startupName || '');
  const [industry, setIndustry] = useState((user as any)?.industry || '');
  
  // Investor specific states
  const [firm, setFirm] = useState((user as any)?.firm || '');
  const [minInvestment, setMinInvestment] = useState((user as any)?.minInvestment || '');
  const [maxInvestment, setMaxInvestment] = useState((user as any)?.maxInvestment || '');

  const [isSaving, setIsSaving] = useState(false);
  
  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const updates: any = {
        name,
        location,
        bio,
      };

      if (user.role === 'entrepreneur') {
        updates.startupName = startupName;
        updates.industry = industry;
      } else if (user.role === 'investor') {
        updates.firm = firm;
        if (minInvestment !== '') updates.minInvestment = Number(minInvestment);
        if (maxInvestment !== '') updates.maxInvestment = Number(maxInvestment);
      }

      await updateProfile(user.id, updates);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <Card className="lg:col-span-1">
          <CardBody className="p-2">
            <nav className="space-y-1">
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md">
                <UserIcon size={18} className="mr-3" />
                Profile
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Lock size={18} className="mr-3" />
                Security
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Bell size={18} className="mr-3" />
                Notifications
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Globe size={18} className="mr-3" />
                Language
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Palette size={18} className="mr-3" />
                Appearance
              </button>
              
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <CreditCard size={18} className="mr-3" />
                Billing
              </button>
            </nav>
          </CardBody>
        </Card>
        
        {/* Main settings content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.name}
                    size="xl"
                  />
                  
                  <div>
                    <Button type="button" variant="outline" size="sm">
                      Change Photo
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      JPG, GIF or PNG. Max size of 800K
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    value={user.email}
                    disabled
                  />
                  
                  <Input
                    label="Role"
                    value={user.role}
                    disabled
                  />
                  
                  <Input
                    label="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />

                  {user.role === 'entrepreneur' && (
                    <>
                      <Input
                        label="Startup Name"
                        value={startupName}
                        onChange={(e) => setStartupName(e.target.value)}
                      />
                      <Input
                        label="Industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                      />
                    </>
                  )}

                  {user.role === 'investor' && (
                    <>
                      <Input
                        label="Firm / Organization"
                        value={firm}
                        onChange={(e) => setFirm(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Min Investment ($)"
                          type="number"
                          value={minInvestment}
                          onChange={(e) => setMinInvestment(e.target.value)}
                        />
                        <Input
                          label="Max Investment ($)"
                          type="number"
                          value={maxInvestment}
                          onChange={(e) => setMaxInvestment(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  ></textarea>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline">Cancel</Button>
                  <Button type="submit" isLoading={isSaving} leftIcon={<Save size={18} />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
          
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Add an extra layer of security to your account
                    </p>
                    <Badge variant="error" className="mt-1">Not Enabled</Badge>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                  />
                  
                  <Input
                    label="New Password"
                    type="password"
                  />
                  
                  <Input
                    label="Confirm New Password"
                    type="password"
                  />
                  
                  <div className="flex justify-end">
                    <Button>Update Password</Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};