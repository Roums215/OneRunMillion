import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">OneRun</span>
        </Link>

        <div className="navbar-links">
          <Link to="/leaderboard" className="nav-link">Leaderboard</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <Link to="/payment" className="nav-link btn btn-gold">Add Funds</Link>
              <button onClick={handleLogout} className="nav-link btn btn-outline">Logout</button>
              <div className="user-status">
                <div className="rank">#{user?.currentRank || '---'}</div>
                <div className="user-avatar">
                  <img src={user?.avatar || '/default-avatar.png'} alt={user?.username} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link btn btn-gold">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
