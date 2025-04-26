import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LeaderboardAPI } from '../services/api';
import './Leaderboard.css';

const Leaderboard = () => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('global');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab, currentPage]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      let response;

      switch (activeTab) {
        case 'weekly':
          response = await LeaderboardAPI.getWeekly(currentPage);
          break;
        case 'monthly':
          response = await LeaderboardAPI.getMonthly(currentPage);
          break;
        case 'top10':
          response = await LeaderboardAPI.getTop10();
          break;
        case 'top100':
          response = await LeaderboardAPI.getTop100();
          break;
        default:
          response = await LeaderboardAPI.getGlobal(currentPage);
      }

      if (activeTab === 'top10' || activeTab === 'top100') {
        setLeaderboard(response.data);
        setTotalPages(1);
      } else {
        setLeaderboard(response.data.users);
        setTotalPages(response.data.pages);
      }
    } catch (err) {
      setError('Failed to load leaderboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxDisplayedPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxDisplayedPages / 2));
    let endPage = Math.min(totalPages, startPage + maxDisplayedPages - 1);

    if (endPage - startPage + 1 < maxDisplayedPages) {
      startPage = Math.max(1, endPage - maxDisplayedPages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        className="pagination-btn"
        disabled={currentPage === 1}
        onClick={() => handlePageChange(currentPage - 1)}
      >
        &laquo;
      </button>
    );

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          className={`pagination-btn ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          className={`pagination-btn ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        className="pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => handlePageChange(currentPage + 1)}
      >
        &raquo;
      </button>
    );

    return <div className="pagination">{pages}</div>;
  };

  return (
    <div className="leaderboard-page">
      <div className="container">
        <div className="leaderboard-header">
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">The ultimate ranking of financial dominance</p>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'global' ? 'active' : ''}`}
            onClick={() => handleTabChange('global')}
          >
            Global
          </button>
          <button
            className={`tab ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => handleTabChange('weekly')}
          >
            Weekly
          </button>
          <button
            className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => handleTabChange('monthly')}
          >
            Monthly
          </button>
          <button
            className={`tab ${activeTab === 'top10' ? 'active' : ''}`}
            onClick={() => handleTabChange('top10')}
          >
            Top 10
          </button>
          <button
            className={`tab ${activeTab === 'top100' ? 'active' : ''}`}
            onClick={() => handleTabChange('top100')}
          >
            Top 100
          </button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading elite rankings...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button className="btn btn-gold" onClick={fetchLeaderboard}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="leaderboard-table">
              <div className="leaderboard-header-row">
                <div className="rank-column">Rank</div>
                <div className="user-column">User</div>
                <div className="amount-column">Total Spent</div>
                <div className="badges-column">Status</div>
              </div>

              {leaderboard.length === 0 ? (
                <div className="leaderboard-empty">
                  <p>No entries yet. Be the first to claim your rank!</p>
                </div>
              ) : (
                leaderboard.map((entry) => (
                  <div 
                    key={entry.id} 
                    className={`leaderboard-row ${
                      isAuthenticated && user?.id === entry.id ? 'current-user' : ''
                    } ${entry.rank <= 3 ? 'top-rank top-rank-' + entry.rank : ''}`}
                  >
                    <div className="rank-column">
                      <span className="rank-number">{entry.rank}</span>
                      {entry.rank === 1 && <span className="rank-crown">👑</span>}
                    </div>
                    <div className="user-column">
                      <div className="user-avatar">
                        <img 
                          src={entry.avatar || '/default-avatar.png'} 
                          alt={entry.displayName} 
                        />
                      </div>
                      <div className="user-info">
                        <span className="user-name">{entry.displayName}</span>
                        <span className="user-username">@{entry.username}</span>
                      </div>
                    </div>
                    <div className="amount-column">{formatCurrency(entry.totalSpent)}</div>
                    <div className="badges-column">
                      {entry.badges.map((badge, index) => (
                        <span 
                          key={index} 
                          className={`badge badge-${badge.toLowerCase().replace(' ', '-')}`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {renderPagination()}

            {isAuthenticated && (
              <div className="your-position">
                <h2>Your Position</h2>
                <p className="position-info">
                  Current rank: <span className="text-gold">#{user?.currentRank || 'N/A'}</span> • 
                  Total spent: <span className="text-gold">{formatCurrency(user?.totalSpent || 0)}</span>
                </p>
                <a href="/payment" className="btn btn-gold">Increase Your Rank</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
