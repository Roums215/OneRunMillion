import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">OneRun</h3>
            <p className="footer-description">
              The exclusive ranking platform for those who demand recognition.
              Pay to rise, dominate the leaderboard, and showcase your supremacy.
            </p>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/" className="footer-link">Home</Link></li>
              <li><Link to="/leaderboard" className="footer-link">Leaderboard</Link></li>
              <li><Link to="/dashboard" className="footer-link">Dashboard</Link></li>
              <li><Link to="/payment" className="footer-link">Add Funds</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Legal</h3>
            <ul className="footer-links">
              <li><Link to="/terms" className="footer-link">Terms of Service</Link></li>
              <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="copyright">
            &copy; {new Date().getFullYear()} OneRun. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
