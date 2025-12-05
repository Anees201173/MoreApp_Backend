const { DataTypes, where } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const User = require('./User'); // Import the User model

const Company = sequelize.define('company', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'company name is required' },
            len: { args: [2, 50], msg: 'company name must be between 2 and 50 characters' }
        }
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: User,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: { msg: 'company Email address already exists' },
        validate: {
            notEmpty: { msg: 'company Email is required' },
            isEmail: { msg: 'Must be a valid email address' }
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Password is required' },
            len: { args: [6, 255], msg: 'Password must be at least 6 characters long' }
        }
    },
    address: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Address is required ' },
            len: { args: [5, 255], msg: 'Address must be at least 5 characters long' }
        }
    },
    uploads: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [] // Optional: default empty array
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            len: { args: [10, 20], msg: 'Phone number must be between 10 and 20 characters' }
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
}, {
    tableName: 'companies',
    hooks: {
        beforeCreate: async (company) => {
            if (company.password) {
                const salt = await bcrypt.genSalt(12);
                company.password = await bcrypt.hash(company.password, salt);
            }
        },
        beforeUpdate: async (company) => {
            if (company.changed('password')) {
                const salt = await bcrypt.genSalt(12);
                company.password = await bcrypt.hash(company.password, salt);
            }
        }
    }
});


// Instance methods
Company.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

Company.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
};

// find by email 
Company.findByEmail = function (email) {
    return this.findOne({ where: { email } })
}

// find by companyAdmin
Company.findByCompanyAdmin = function (companyAdmin) {
    return this.findOne({ where: { companyAdmin } })
}

// find all active comapnies
Company.findActiveCompanies = function () {
    return this.findAll({ where: { is_active: true } })
}

module.exports = Company;
