import axios from 'axios';
import { Investor, Entrepreneur } from '../types';

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

export const mapInvestor = (u: any): Investor => {
  return {
    id: u.id || u._id,
    name: u.name,
    email: u.email,
    role: 'investor',
    avatarUrl: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
    bio: u.bio || 'Experienced investor looking for promising startups.',
    location: u.location || 'San Francisco, CA',
    createdAt: u.createdAt || new Date().toISOString(),
    investmentInterests: u.investmentFocus && u.investmentFocus.length > 0 ? u.investmentFocus : ['AI/ML', 'SaaS', 'FinTech'],
    investmentStage: u.investmentStage || ['Seed', 'Series A'],
    portfolioCompanies: u.portfolioCompanies || [],
    totalInvestments: u.totalInvestments || 5,
    minimumInvestment: u.minInvestment ? `$${(u.minInvestment / 1000).toFixed(0)}K` : '$100K',
    maximumInvestment: u.maxInvestment ? `$${(u.maxInvestment / 1000000).toFixed(1)}M` : '$1.5M',
    isOnline: !!u.isOnline,
  };
};

export const mapEntrepreneur = (u: any): Entrepreneur => {
  return {
    id: u.id || u._id,
    name: u.name,
    email: u.email,
    role: 'entrepreneur',
    avatarUrl: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
    bio: u.bio || 'Serial entrepreneur focused on building innovative products.',
    location: u.location || 'San Francisco, CA',
    createdAt: u.createdAt || new Date().toISOString(),
    startupName: u.startupName || 'NextGen Tech',
    pitchSummary: u.bio || 'Building the future of technology solutions.',
    fundingNeeded: u.minInvestment ? `$${(u.minInvestment / 1000000).toFixed(1)}M` : '$1.5M',
    industry: u.industry || 'Tech',
    foundedYear: u.foundedYear || 2023,
    teamSize: u.teamSize || 5,
    isOnline: !!u.isOnline,
  };
};

export default API;
