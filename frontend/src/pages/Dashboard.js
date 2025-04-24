import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LeaderboardAPI, PaymentAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = ({ socket }) => {
  const { user } = useContext(AuthContext);
  const [userPosition, setUserPosition] = useState(null);
  const [nearbyCompetitors, setNearbyCompetitors] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Join socket room for real-time updates
    if (socket) {
      socket.emit('join_leaderboard');
      
      // Join user-specific room for notifications
      socket.emit('join_user', { userId: user.id });
      
      return () => {
        socket.emit('leave_leaderboard');
        socket.emit('leave_user');
      };
    }
  }, [socket, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user position in leaderboards
      const positionResponse = await LeaderboardAPI.getUserPosition();
      setUserPosition(positionResponse.data);
      
      // Fetch nearby competitors
      const competitorsResponse = await LeaderboardAPI.getNearbyCompetitors();
      setNearbyCompetitors(competitorsResponse.data);
      
      // Fetch payment history
      const historyResponse = await PaymentAPI.getHistory(1, 5);
      setPaymentHistory(historyResponse.data.payments);
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="welcome-message">
            Welcome, <span className="user-name">{user?.displayName || user?.username}</span>
          </h1>
          <p className="dashboard-subtitle">Your personal command center</p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading your elite status...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button className="btn btn-gold" onClick={fetchDashboardData}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="dashboard-grid">
              <div className="dashboard-card rank-overview">
                <h2 className="card-title">Your Ranks</h2>
                
                {userPosition && (
                  <div className="ranks-container">
                    <div className="rank-item">
                      <div className="rank-label">Global</div>
                      <div className="rank-value">#{userPosition.global.rank}</div>
                      <div className="rank-metric">{formatCurrency(userPosition.global.total)}</div>
                    </div>
                    
                    <div className="rank-item">
                      <div className="rank-label">Weekly</div>
                      <div className="rank-value">#{userPosition.weekly.rank}</div>
                      <div className="rank-metric">{formatCurrency(userPosition.weekly.total)}</div>
                    </div>
                    
                    <div className="rank-item">
                      <div className="rank-label">Monthly</div>
                      <div className="rank-value">#{userPosition.monthly.rank}</div>
                      <div className="rank-metric">{formatCurrency(userPosition.monthly.total)}</div>
                    </div>
                  </div>
                )}
                
                <Link to="/payment" className="btn btn-gold">Increase Rank</Link>
              </div>
              
              <div className="dashboard-card status-badges">
                <h2 className="card-title">Your Status</h2>
                
                <div className="badges-container">
                  {user?.badges && user.badges.length > 0 ? (
                    user.badges.map((badge, index) => (
                      <div 
                        key={index} 
                        className={`badge-card badge-${badge.toLowerCase().replace(' ', '-')}`}
                      >
                        <div className="badge-icon">{getBadgeIcon(badge)}</div>
                        <div className="badge-name">{badge}</div>
                      </div>
                    ))
                  ) : (
                    <p className="no-badges">Make your first contribution to earn badges!</p>
                  )}
                </div>
              </div>
              
              <div className="dashboard-card nearby-competitors">
                <h2 className="card-title">Competition</h2>
                
                {nearbyCompetitors && (
                  <div className="competitors-container">
                    {/* Users above (you need to overtake) */}
                    {nearbyCompetitors.above && nearbyCompetitors.above.length > 0 && (
                      <div className="competitors-section">
                        <h3 className="section-title">Above You</h3>
                        
                        {nearbyCompetitors.above.map((competitor) => (
                          <div className="competitor-item" key={competitor.id}>
                            <div className="competitor-rank">#{competitor.rank}</div>
                            <div className="competitor-avatar">
                              <img 
                                src={competitor.avatar || '/default-avatar.png'} 
                                alt={competitor.displayName} 
                              />
                            </div>
                            <div className="competitor-info">
                              <div className="competitor-name">{competitor.displayName}</div>
                              <div className="competitor-amount">{formatCurrency(competitor.totalSpent)}</div>
                            </div>
                            <div className="competitor-gap">
                              {formatCurrency(competitor.totalSpent - user.totalSpent)} ahead
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Current user */}
                    <div className="competitors-section current-user-section">
                      <h3 className="section-title">You</h3>
                      
                      <div className="competitor-item current-user-item">
                        <div className="competitor-rank">#{nearbyCompetitors.current.rank}</div>
                        <div className="competitor-avatar">
                          <img 
                            src={user.avatar || '/default-avatar.png'} 
                            alt={user.displayName} 
                          />
                        </div>
                        <div className="competitor-info">
                          <div className="competitor-name">{user.displayName}</div>
                          <div className="competitor-amount">{formatCurrency(user.totalSpent)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Users below (who might overtake you) */}
                    {nearbyCompetitors.below && nearbyCompetitors.below.length > 0 && (
                      <div className="competitors-section">
                        <h3 className="section-title">Below You</h3>
                        
                        {nearbyCompetitors.below.map((competitor) => (
                          <div className="competitor-item" key={competitor.id}>
                            <div className="competitor-rank">#{competitor.rank}</div>
                            <div className="competitor-avatar">
                              <img 
                                src={competitor.avatar || '/default-avatar.png'} 
                                alt={competitor.displayName} 
                              />
                            </div>
                            <div className="competitor-info">
                              <div className="competitor-name">{competitor.displayName}</div>
                              <div className="competitor-amount">{formatCurrency(competitor.totalSpent)}</div>
                            </div>
                            <div className="competitor-gap">
                              {formatCurrency(user.totalSpent - competitor.totalSpent)} behind
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="dashboard-card recent-payments">
                <h2 className="card-title">Recent Contributions</h2>
                
                {paymentHistory && paymentHistory.length > 0 ? (
                  <div className="payments-container">
                    {paymentHistory.map((payment) => (
                      <div className="payment-item" key={payment._id}>
                        <div className="payment-amount">{formatCurrency(payment.amount)}</div>
                        <div className="payment-details">
                          <div className="payment-date">{formatDate(payment.createdAt)}</div>
                          <div className="payment-status">
                            <span className={`status-badge status-${payment.status}`}>{payment.status}</span>
                          </div>
                        </div>
                        <div className="payment-rank-change">
                          {payment.rankBefore !== payment.rankAfter ? (
                            <span className="rank-improved">
                              Rank: #{payment.rankBefore} → #{payment.rankAfter}
                            </span>
                          ) : (
                            <span className="rank-maintained">
                              Maintained Rank: #{payment.rankAfter}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <Link to="/payment-history" className="btn btn-outline btn-sm">View All History</Link>
                  </div>
                ) : (
                  <div className="no-payments">
                    <p>No payment history yet.</p>
                    <Link to="/payment" className="btn btn-gold">Make Your First Contribution</Link>
                  </div>
                )}
              </div>
            </div>
            
            <div className="quick-actions">
              <Link to="/payment" className="action-btn btn-gold">
                <span className="action-icon">💲</span>
                Add Funds
              </Link>
              <Link to="/leaderboard" className="action-btn btn-outline">
                <span className="action-icon">🏆</span>
                View Leaderboard
              </Link>
              <Link to="/profile" className="action-btn btn-outline">
                <span className="action-icon">👤</span>
                Edit Profile
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper function to get badge icon
const getBadgeIcon = (badge) => {
  switch (badge.toLowerCase()) {
    case 'newcomer':
      return '🌱';
    case 'rookie':
      return '🔰';
    case 'enthusiast':
      return '🔥';
    case 'dedicated':
      return '⭐';
    case 'whale':
      return '🐳';
    case 'top spender':
      return '💎';
    case 'millionaire':
      return '💰';
    default:
      return '🏅';
  }
};

export default Dashboard;
