const { sequelize } = require('../config/database');
const User = require('./User');
const CMO = require('./CMO');

// Define associations
User.hasMany(CMO, {
  foreignKey: 'userId',
  as: 'cmos'
});

CMO.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Sync database (create tables if not exist)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log('✅ Database synchronized successfully.');

    if (force) {
      console.log('⚠️  Database tables recreated (all data lost)');
    }
  } catch (error) {
    console.error('❌ Database sync error:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  CMO,
  syncDatabase
};
