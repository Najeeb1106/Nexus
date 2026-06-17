import axios from 'axios';
import { CollaborationRequest } from '../types';

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

// Helper function to get collaboration requests for an entrepreneur
export const getRequestsForEntrepreneur = async (_entrepreneurId: string): Promise<CollaborationRequest[]> => {
  try {
    const { data } = await API.get('/collaborations');
    return data.requests.map((req: any) => ({
      id: req._id,
      investorId: req.investorId,
      entrepreneurId: req.entrepreneurId,
      message: req.message,
      status: req.status,
      createdAt: req.createdAt,
      dealTerms: req.dealTerms
    }));
  } catch (err) {
    console.error('Error fetching collaborations:', err);
    return [];
  }
};

// Helper function to get collaboration requests sent by an investor
export const getRequestsFromInvestor = async (_investorId: string): Promise<CollaborationRequest[]> => {
  try {
    const { data } = await API.get('/collaborations');
    return data.requests.map((req: any) => ({
      id: req._id,
      investorId: req.investorId,
      entrepreneurId: req.entrepreneurId,
      message: req.message,
      status: req.status,
      createdAt: req.createdAt,
      dealTerms: req.dealTerms
    }));
  } catch (err) {
    console.error('Error fetching collaborations:', err);
    return [];
  }
};

// Helper function to update a collaboration request status
export const updateRequestStatus = async (requestId: string, newStatus: 'pending' | 'accepted' | 'rejected'): Promise<CollaborationRequest | null> => {
  try {
    const { data } = await API.put(`/collaborations/${requestId}`, { status: newStatus });
    const req = data.request;
    return {
      id: req._id,
      investorId: req.investorId,
      entrepreneurId: req.entrepreneurId,
      message: req.message,
      status: req.status,
      createdAt: req.createdAt,
      dealTerms: req.dealTerms
    };
  } catch (err) {
    console.error('Error updating collaboration status:', err);
    return null;
  }
};

// Helper function to create a new collaboration request
export const createCollaborationRequest = async (
  _investorId: string,
  entrepreneurId: string,
  message: string
): Promise<CollaborationRequest | null> => {
  try {
    const { data } = await API.post('/collaborations', {
      targetUserId: entrepreneurId,
      message
    });
    const req = data.request;
    return {
      id: req._id,
      investorId: req.investorId,
      entrepreneurId: req.entrepreneurId,
      message: req.message,
      status: req.status,
      createdAt: req.createdAt,
      dealTerms: req.dealTerms
    };
  } catch (err) {
    console.error('Error creating collaboration request:', err);
    return null;
  }
};