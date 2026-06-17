import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';
import API from '../lib/api';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const USER_STORAGE_KEY = 'business_nexus_user';

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user on initial load and verify with backend
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
        try {
          const { data } = await API.get('/auth/me');
          setUser(data.user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem(USER_STORAGE_KEY);
          setUser(null);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // Real login function making an API call
  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      if (data.user.role !== role) {
        throw new Error(`User is registered as ${data.user.role}, not ${role}`);
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
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
      localStorage.setItem('token', data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
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
      await API.post('/auth/forgot-password', { email });
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
  const updateProfile = async (_userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const { data } = await API.put('/auth/profile', updates);
      const updatedUser = { ...user, ...data.user };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser as User);
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