const User = require('../models/user.model');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        totalSpent: user.totalSpent,
        currentRank: user.currentRank,
        badges: user.badges,
        profileCustomization: user.profileCustomization,
        isAnonymous: user.isAnonymous,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { displayName } = req.body;
    const user = req.user;
    
    // Update fields
    if (displayName) {
      user.displayName = displayName;
    }
    
    await user.save();
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        totalSpent: user.totalSpent,
        currentRank: user.currentRank,
        badges: user.badges,
        profileCustomization: user.profileCustomization,
        isAnonymous: user.isAnonymous
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile', error: error.message });
  }
};

// Update avatar
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = req.user;
    
    // Update avatar
    user.avatar = avatar;
    await user.save();
    
    res.status(200).json({
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating avatar', error: error.message });
  }
};

// Toggle anonymity
exports.toggleAnonymity = async (req, res) => {
  try {
    const user = req.user;
    
    // Toggle anonymity
    user.isAnonymous = !user.isAnonymous;
    await user.save();
    
    res.status(200).json({
      message: `Anonymity ${user.isAnonymous ? 'enabled' : 'disabled'} successfully`,
      isAnonymous: user.isAnonymous
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling anonymity', error: error.message });
  }
};

// Get user badges
exports.getUserBadges = async (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      badges: user.badges
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user badges', error: error.message });
  }
};
