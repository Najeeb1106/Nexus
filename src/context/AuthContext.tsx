import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';
import axios from 'axios';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const USER_STORAGE_KEY = 'business_nexus_user';
const RESET_TOKEN_KEY = 'business_nexus_reset_token';

// API Axios Instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

// Auto-inject JWT token into requests if it exists in localStorage
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper mapper to bridge DB schema changes (avatar) to existing frontend type (avatarUrl)
const mapUser = (apiUser: any): User => {
  return {
    id: apiUser.id || apiUser._id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    avatarUrl: apiUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiUser.name)}&background=random`,
    bio: apiUser.bio || '',
    createdAt: apiUser.createdAt || new Date().toISOString()
  };
};

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem('token');
    }
    setIsLoading(false);
  }, []);

  // Real login function making an API call
  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      if (data.user.role !== role) {
        throw new Error(`User is registered as ${data.user.role}, not ${role}`);
      }
      const mapped = mapUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapped));
      setUser(mapped);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Login failed';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Real register function making an API call
  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const { data } = await API.post('/auth/register', { name, email, password, role });
      const mapped = mapUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapped));
      setUser(mapped);
      toast.success('Account created successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Real forgot password function
  const forgotPassword = async (email: string): Promise<void> => {
    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      if (data.resetToken) {
        localStorage.setItem(RESET_TOKEN_KEY, data.resetToken);
      }
      toast.success('Password reset instructions generated');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Forgot password failed';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  // Real reset password function
  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await API.post(`/auth/reset-password/${token}`, { password: newPassword });
      localStorage.removeItem(RESET_TOKEN_KEY);
      toast.success('Password reset successfully');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Reset password failed';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  // Logout function
  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const backendUpdates: any = { ...updates };
      if (updates.avatarUrl !== undefined) {
        backendUpdates.avatar = updates.avatarUrl;
        delete backendUpdates.avatarUrl;
      }
      const { data } = await API.put('/auth/profile', backendUpdates);
      const mapped = mapUser(data.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapped));
      setUser(mapped);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Profile update failed';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};