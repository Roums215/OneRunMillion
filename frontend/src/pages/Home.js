import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Pay to Rise. <span className="text-gold">Rule the Ranks.</span></h1>
            <p className="hero-subtitle">
              Welcome to OneRun, where status is purchased, rank is power, and everyone knows your position.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-gold btn-lg">Claim Your Rank</Link>
              <Link to="/leaderboard" className="btn btn-outline btn-lg">View Leaderboard</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">The <span className="text-gold">Exclusive</span> Experience</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3 className="feature-title">Simple Concept</h3>
              <p className="feature-text">Pay more, rank higher. No hidden rules. Pure financial dominance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3 className="feature-title">Real-Time Rankings</h3>
              <p className="feature-text">Watch as your rank updates instantly with each payment.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Global Competition</h3>
              <p className="feature-text">Compete in weekly, monthly, and all-time leaderboards.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3 className="feature-title">Instant Notifications</h3>
              <p className="feature-text">Get alerted when someone overtakes your position.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rankings-preview">
        <div className="container">
          <h2 className="section-title">Current <span className="text-gold">Elite</span></h2>
          <p className="section-subtitle">The top spenders dominating the global rankings right now.</p>
          
          <div className="top-ranks">
            <div className="rank rank-1">
              <div className="rank-position">1</div>
              <div className="rank-avatar">
                <img src="/avatars/elite1.jpg" alt="Top Rank" />
              </div>
              <div className="rank-info">
                <h3 className="rank-name">Anonymous Whale</h3>
                <p className="rank-amount">$1,250,000</p>
              </div>
              <div className="rank-crown">👑</div>
            </div>
            
            <div className="rank rank-2">
              <div className="rank-position">2</div>
              <div className="rank-avatar">
                <img src="/avatars/elite2.jpg" alt="Second Rank" />
              </div>
              <div className="rank-info">
                <h3 className="rank-name">GoldenEagle</h3>
                <p className="rank-amount">$980,000</p>
              </div>
            </div>
            
            <div className="rank rank-3">
              <div className="rank-position">3</div>
              <div className="rank-avatar">
                <img src="/avatars/elite3.jpg" alt="Third Rank" />
              </div>
              <div className="rank-info">
                <h3 className="rank-name">LuxuryKing</h3>
                <p className="rank-amount">$750,000</p>
              </div>
            </div>
          </div>
          
          <div className="rankings-link">
            <Link to="/leaderboard" className="btn btn-outline">View Full Rankings</Link>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Claim Your Position?</h2>
            <p className="cta-text">
              Start now and establish your dominance on the global stage.
              Remember, in OneRun, your wealth is your power.
            </p>
            <Link to="/register" className="btn btn-gold btn-lg">Join the Elite</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
