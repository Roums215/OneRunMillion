const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  currentRank: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String,
    enum: ['Newcomer', 'Rookie', 'Enthusiast', 'Dedicated', 'Whale', 'Top Spender', 'Millionaire']
  }],
  profileCustomization: {
    theme: {
      type: String,
      enum: ['default', 'gold', 'platinum', 'diamond', 'obsidian'],
      default: 'default'
    },
    effects: {
      type: [String],
      default: []
    }
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update user rank
UserSchema.methods.updateRank = function(newRank) {
  this.currentRank = newRank;
  return this.save();
};

// Method to update total spent
UserSchema.methods.updateTotalSpent = function(amount) {
  this.totalSpent += amount;
  
  // Update badges based on total spent
  if (this.totalSpent >= 1000000) {
    if (!this.badges.includes('Millionaire')) {
      this.badges.push('Millionaire');
    }
  } else if (this.totalSpent >= 100000) {
    if (!this.badges.includes('Top Spender')) {
      this.badges.push('Top Spender');
    }
  } else if (this.totalSpent >= 10000) {
    if (!this.badges.includes('Whale')) {
      this.badges.push('Whale');
    }
  } else if (this.totalSpent >= 5000) {
    if (!this.badges.includes('Dedicated')) {
      this.badges.push('Dedicated');
    }
  } else if (this.totalSpent >= 1000) {
    if (!this.badges.includes('Enthusiast')) {
      this.badges.push('Enthusiast');
    }
  } else if (this.totalSpent >= 500) {
    if (!this.badges.includes('Rookie')) {
      this.badges.push('Rookie');
    }
  } else if (this.totalSpent > 0) {
    if (!this.badges.includes('Newcomer')) {
      this.badges.push('Newcomer');
    }
  }
  
  return this.save();
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
