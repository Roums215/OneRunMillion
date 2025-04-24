import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserAPI } from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    avatar: user?.avatar || ''
  });
  
  const [isAnonymous, setIsAnonymous] = useState(user?.isAnonymous || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess('');
      
      const response = await UserAPI.updateProfile({
        displayName: formData.displayName
      });
      
      updateUser(response.data.user);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAvatarUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess('');
      
      const response = await UserAPI.updateAvatar({
        avatar: formData.avatar
      });
      
      updateUser({ avatar: response.data.avatar });
      setSuccess('Avatar updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating avatar');
      console.error('Avatar update error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAnonymity = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess('');
      
      const response = await UserAPI.toggleAnonymity();
      
      setIsAnonymous(response.data.isAnonymous);
      updateUser({ isAnonymous: response.data.isAnonymous });
      setSuccess(`Anonymous mode ${response.data.isAnonymous ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error toggling anonymity');
      console.error('Anonymity toggle error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <h1 className="page-title">Your Profile</h1>
          <p className="page-subtitle">Manage your personal information</p>
        </div>
        
        <div className="profile-grid">
          <div className="profile-card user-info">
            <div className="profile-avatar">
              <img src={user?.avatar || '/default-avatar.png'} alt={user?.displayName} />
            </div>
            
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">Rank</span>
                <span className="stat-value">#{user?.currentRank || '---'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Spent</span>
                <span className="stat-value">{formatCurrency(user?.totalSpent || 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Member Since</span>
                <span className="stat-value">{user?.createdAt ? formatDate(user.createdAt) : '---'}</span>
              </div>
            </div>
            
            <div className="profile-badges">
              {user?.badges && user.badges.map((badge, index) => (
                <span 
                  key={index} 
                  className={`badge badge-${badge.toLowerCase().replace(' ', '-')}`}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          
          <div className="profile-card profile-form-card">
            {success && (
              <div className="success-message">
                <p>{success}</p>
              </div>
            )}
            
            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}
            
            <form className="profile-form" onSubmit={handleSubmit}>
              <h2 className="form-title">Edit Profile</h2>
              
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  className="form-control"
                  placeholder="Enter your display name"
                  value={formData.displayName}
                  onChange={handleChange}
                />
                <small className="form-text">This is the name shown on the leaderboard</small>
              </div>
              
              <button
                type="submit"
                className="btn btn-gold"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
            
            <form className="profile-form" onSubmit={handleAvatarUpdate}>
              <h2 className="form-title">Change Avatar</h2>
              
              <div className="form-group">
                <label htmlFor="avatar">Avatar URL</label>
                <input
                  type="text"
                  id="avatar"
                  name="avatar"
                  className="form-control"
                  placeholder="Enter avatar image URL"
                  value={formData.avatar}
                  onChange={handleChange}
                />
                <small className="form-text">Enter the URL of your avatar image</small>
              </div>
              
              <button
                type="submit"
                className="btn btn-gold"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Avatar'}
              </button>
            </form>
          </div>
          
          <div className="profile-card privacy-settings">
            <h2 className="form-title">Privacy Settings</h2>
            
            <div className="privacy-option">
              <div className="privacy-info">
                <h3 className="option-title">Anonymous Mode</h3>
                <p className="option-description">
                  Hide your username and display name on the public leaderboard.
                  Your rank and amount spent will still be visible.
                </p>
              </div>
              
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={toggleAnonymity}
                  disabled={loading}
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div className="account-deletion">
              <h3 className="form-title">Delete Account</h3>
              <p className="warning-text">
                Warning: Account deletion is permanent and cannot be undone.
                All your data including rank and payment history will be permanently removed.
              </p>
              <button className="btn btn-danger">Delete Account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
