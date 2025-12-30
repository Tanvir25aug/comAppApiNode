const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { jwtSecret, jwtExpire, jwtRefreshExpire } = require('../config/auth');

class AuthService {
  // Generate JWT token
  generateToken(user, expiresIn = jwtExpire) {
    const userJson = user.toJSON();
    return jwt.sign(
      {
        id: userJson.id,
        email: userJson.email,
        roleId: userJson.roleId
      },
      jwtSecret,
      { expiresIn }
    );
  }

  // Login user with ASP.NET Identity
  async login(email, password) {
    // Find user by username (case-insensitive search using NormalizedUserName)
    const normalizedUserName = email.toUpperCase();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { UserName: email },
          { NormalizedUserName: normalizedUserName },
          { Email: email },
          { NormalizedEmail: normalizedUserName }
        ]
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is activated
    if (!user.Activated) {
      throw new Error('Account is deactivated');
    }

    // Check password using ASP.NET Identity password hasher
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Update last login time
    await user.update({ LastLoginTime: new Date() });

    // Generate tokens
    const accessToken = this.generateToken(user);
    const refreshToken = this.generateToken(user, jwtRefreshExpire);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }

  // Refresh token
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtSecret);
      const user = await User.findByPk(decoded.id);

      if (!user || !user.Activated) {
        throw new Error('Invalid refresh token');
      }

      const newAccessToken = this.generateToken(user);

      return {
        accessToken: newAccessToken
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Get user profile
  async getProfile(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  }

  // Update user profile (limited fields only)
  async updateProfile(userId, updates) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Only allow updating these fields
    const allowedFields = ['FirstName', 'LastName', 'PhoneNumber', 'ProfilePicUrl'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length > 0) {
      await user.update(filteredUpdates);
    }

    return user.toJSON();
  }
}

module.exports = new AuthService();
