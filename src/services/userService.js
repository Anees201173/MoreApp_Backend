const { User } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');

class UserService {
  /**
   * Get user statistics
   */
  static async getUserStats() {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const inactiveUsers = await User.count({ where: { is_active: false } });
    const verifiedUsers = await User.count({ where: { email_verified: true } });
    
    const usersByRole = await User.findAll({
      attributes: ['role', [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true
    });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr.role] = parseInt(curr.count);
        return acc;
      }, {})
    };
  }

  /**
   * Search users with advanced filters
   */
  static async searchUsers(filters = {}) {
    const { search, role, isActive, dateFrom, dateTo, limit = 10, offset = 0 } = filters;
    
    const whereClause = {};
    
    // Text search
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Role filter
    if (role) {
      whereClause.role = role;
    }
    
    // Active status filter
    if (isActive !== undefined) {
      whereClause.is_active = isActive;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.created_at = {};
      if (dateFrom) whereClause.created_at[Op.gte] = dateFrom;
      if (dateTo) whereClause.created_at[Op.lte] = dateTo;
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    return {
      users: rows,
      totalCount: count,
      hasMore: offset + limit < count
    };
  }

  /**
   * Get users who haven't logged in for specified days
   */
  static async getInactiveUsers(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await User.findAll({
      where: {
        [Op.or]: [
          { last_login: { [Op.lt]: cutoffDate } },
          { last_login: null }
        ],
        is_active: true
      },
      attributes: { exclude: ['password'] },
      order: [['last_login', 'ASC']]
    });
  }

  /**
   * Bulk update user status
   */
  static async bulkUpdateStatus(userIds, isActive) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new ApiError(400, 'User IDs array is required');
    }

    const [updatedCount] = await User.update(
      { is_active: isActive },
      { where: { id: { [Op.in]: userIds } } }
    );

    return {
      updatedCount,
      message: `${updatedCount} users ${isActive ? 'activated' : 'deactivated'} successfully`
    };
  }

  /**
   * Get user activity summary
   */
  static async getUserActivity(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // You can add more activity tracking here
    // For example, login history, action logs, etc.
    
    return {
      user,
      lastLogin: user.last_login,
      accountAge: user.created_at ? Math.floor((new Date() - user.created_at) / (1000 * 60 * 60 * 24)) : 0,
      isActive: user.is_active,
      emailVerified: user.email_verified
    };
  }
}

module.exports = UserService;