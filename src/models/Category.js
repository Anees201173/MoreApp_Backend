const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const { types } = require('pg')
const User = require('./User')


const Category = sequelize.define('categories', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: { msg: 'category name is required' },
            len: { args: [2, 50], msg: 'category name must be between 2 and 50 characters' }
        }
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'category description is required' },
            len: { args: [2, 255], msg: 'category description must be at between 2 and 255 charaters' },
        }
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: { msg: 'Must be a valid URL' }
        }
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },

}, {
    tableName: 'categories',
    // timestamps: true
})

// ================ Instance Methods ============= //
// =============================================== //

Category.findByName = function (name) {
    return this.findOne({ where: { name } })
}

Category.findActiveCategories = function () {
    return this.findAll({ where: { status: true } })
}


module.exports = Category;