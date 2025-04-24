import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Configure axios to include token in headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch current user
          const response = await axios.get(`${config.apiUrl}/api/auth/me`);
          
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (err) {
          // If token is invalid, clear it
          localStorage.removeItem('token');
          axios.defaults.headers.common['Authorization'] = '';
          
          setError('Session expired. Please login again.');
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post(`${config.apiUrl}/api/auth/register`, userData);
      
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      
      // Configure axios to include token in headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      setUser(response.data.user);
      setIsAuthenticated(true);
      setError(null);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await axios.post(`${config.apiUrl}/api/auth/login`, credentials);
      
      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      
      // Configure axios to include token in headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      setUser(response.data.user);
      setIsAuthenticated(true);
      setError(null);
      
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Remove token from axios headers
    axios.defaults.headers.common['Authorization'] = '';
    
    setUser(null);
    setIsAuthenticated(false);
  };

  // Update user data
  const updateUser = (userData) => {
    setUser({ ...user, ...userData });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        register,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
