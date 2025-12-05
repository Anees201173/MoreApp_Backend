const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Category = require('./Category')
const User = require('./User')

const Product = sequelize.define('products', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },

    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Product name is required' },
            len: { args: [2, 100], msg: 'Name must be between 2 and 100 characters' }
        }
    },

    description: {
        type: DataTypes.STRING(500),
        allowNull: true
    },

    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            isFloat: true,
            min: 0
        }
    },

    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: true,
            min: 0
        }
    },

    size: {
        type: DataTypes.STRING, // 'S', 'M', 'L', 'XL', etc.
        allowNull: true
    },

    color: {
        type: DataTypes.STRING,
        allowNull: true
    },

    uploads: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },

    energyPoints: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },

    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: " SET NULL"
    },

    category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Category,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    }

}, {
    tableName: 'products',
    timestamps: true
});




module.exports = Product;
