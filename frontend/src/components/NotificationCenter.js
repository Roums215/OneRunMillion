import React, { useEffect } from 'react';
import './NotificationCenter.css';

const NotificationCenter = ({ notifications, removeNotification }) => {
  useEffect(() => {
    // Auto-remove notifications after 5 seconds
    notifications.forEach(notification => {
      const timer = setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
      
      return () => clearTimeout(timer);
    });
  }, [notifications, removeNotification]);

  return (
    <div className="notification-center">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification notification-${notification.type || 'info'}`}
        >
          <p className="notification-message">{notification.message}</p>
          <button 
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
