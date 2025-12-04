const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')




const Products = sequelize.define('products', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    
})