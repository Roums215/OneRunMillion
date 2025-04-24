import axios from 'axios';
import config from '../config';

// Base API configuration
const API = axios.create({
  baseURL: `${config.apiUrl}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const AuthAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  getCurrentUser: () => API.get('/auth/me')
};

// Leaderboard API
export const LeaderboardAPI = {
  getGlobal: (page = 1, limit = 20) => 
    API.get(`/leaderboard/global?page=${page}&limit=${limit}`),
  getWeekly: (page = 1, limit = 20) => 
    API.get(`/leaderboard/weekly?page=${page}&limit=${limit}`),
  getMonthly: (page = 1, limit = 20) => 
    API.get(`/leaderboard/monthly?page=${page}&limit=${limit}`),
  getTop10: () => API.get('/leaderboard/top10'),
  getTop100: () => API.get('/leaderboard/top100'),
  getUserPosition: () => API.get('/leaderboard/position'),
  getNearbyCompetitors: () => API.get('/leaderboard/nearby')
};

// Payment API
export const PaymentAPI = {
  processPayment: (paymentData) => API.post('/payments/process', paymentData),
  getHistory: (page = 1, limit = 10) => 
    API.get(`/payments/history?page=${page}&limit=${limit}`)
};

// User API
export const UserAPI = {
  getProfile: () => API.get('/users/profile'),
  updateProfile: (profileData) => API.put('/users/profile', profileData),
  updateAvatar: (avatarData) => API.put('/users/avatar', avatarData),
  toggleAnonymity: () => API.put('/users/anonymity'),
  getBadges: () => API.get('/users/badges')
};

export default API;
