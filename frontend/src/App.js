import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import config from './config'; // Importer la configuration

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Payment from './pages/Payment';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotificationCenter from './components/NotificationCenter';

// Context
import { AuthProvider } from './context/AuthContext';

// Styles
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Initialize socket
    // Utiliser la configuration depuis config.js avec des options supplémentaires pour résoudre les problèmes CORS
    const newSocket = io(config.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(newSocket);

    // Clean up on unmount
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (socket) {
      // Listen for leaderboard updates
      socket.on('leaderboard_update', (data) => {
        console.log('Leaderboard update:', data);
      });

      // Listen for rank changes
      socket.on('rank_change', (data) => {
        setNotifications(prev => [
          ...prev,
          { id: Date.now(), message: data.message, type: 'warning' }
        ]);
      });
    }
  }, [socket]);

  // Remove notification after 5 seconds
  const removeNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <AuthProvider>
      <Router>
        <div className="app">
          {/* Effet d'animation des rayons lumineux */}
          <div className="light-rays"></div>
          
          <Navbar />
          <main className="main-content">
          
          {/* Animation des billets qui tombent - Repositionné pour meilleure visibilité */}
          <div className="falling-money-container">
            {[...Array(25)].map((_, index) => (
              <div 
                key={index} 
                className={`falling-money money-${index % 4}`} 
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${Math.random() * 8 + 15}s`,
                  transform: `rotate(${Math.random() * 40 - 20}deg) rotateY(${Math.random() * 40 - 20}deg)`,
                  opacity: 0.7 + Math.random() * 0.3
                }}
              ></div>
            ))}
          </div>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard socket={socket} />
                  </PrivateRoute>
                } 
              />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/payment" 
                element={
                  <PrivateRoute>
                    <Payment />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </main>
          <Footer />
          <NotificationCenter 
            notifications={notifications} 
            removeNotification={removeNotification} 
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

// Private route component
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default App;
