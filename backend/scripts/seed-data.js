/**
 * Seed script for initial MongoDB data
 * This creates sample users and payment data for development
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');

// Sample user data
const users = [
  {
    username: 'goldwhale',
    email: 'gold@example.com',
    password: 'password123',
    displayName: 'Gold Whale',
    totalSpent: 500000,
    badges: ['Whale', 'Top Spender'],
    profileCustomization: {
      theme: 'gold'
    }
  },
  {
    username: 'silverking',
    email: 'silver@example.com',
    password: 'password123',
    displayName: 'Silver King',
    totalSpent: 250000,
    badges: ['Whale', 'Dedicated'],
    profileCustomization: {
      theme: 'platinum' 
    }
  },
  {
    username: 'bronzestar',
    email: 'bronze@example.com',
    password: 'password123',
    displayName: 'Bronze Star',
    totalSpent: 100000,
    badges: ['Enthusiast', 'Dedicated'],
    profileCustomization: {
      theme: 'default'
    }
  },
  {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    displayName: 'Test User',
    totalSpent: 1000,
    badges: ['Rookie', 'Newcomer'],
    profileCustomization: {
      theme: 'default'
    }
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/onerun', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected for seeding data');
  
  try {
    // Clear existing data
    await User.deleteMany({});
    await Payment.deleteMany({});
    console.log('Cleared existing data');
    
    // Create users with hashed passwords
    const createdUsers = [];
    
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      const newUser = await User.create({
        ...user,
        password: hashedPassword
      });
      
      createdUsers.push(newUser);
      console.log(`Created user: ${newUser.username}`);
      
      // Create payment records for each user
      if (newUser.totalSpent > 0) {
        const paymentCount = Math.floor(Math.random() * 5) + 1;
        let remainingAmount = newUser.totalSpent;
        
        for (let i = 0; i < paymentCount; i++) {
          const isLastPayment = i === paymentCount - 1;
          const amount = isLastPayment ? remainingAmount : Math.floor(remainingAmount / (paymentCount - i) * Math.random() * 1.5);
          remainingAmount -= amount;
          
          await Payment.create({
            userId: newUser._id,
            amount,
            paymentMethod: ['credit_card', 'debit_card', 'crypto'][Math.floor(Math.random() * 3)],
            status: 'completed',
            rankBefore: i === 0 ? 99 : 0, 
            rankAfter: i === paymentCount - 1 ? createdUsers.length - users.indexOf(user) : 0,
            createdAt: new Date(Date.now() - (paymentCount - i) * 86400000 * Math.random() * 5)
          });
        }
        
        console.log(`Created ${paymentCount} payments for ${newUser.username}`);
      }
    }
    
    console.log('Data seeding completed successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});
