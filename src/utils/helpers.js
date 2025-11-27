const crypto = require('crypto');

// Generate random string
const generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Generate random number between min and max
const generateRandomNumber = (min = 100000, max = 999999) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Format date to readable string
const formatDate = (date, options = {}) => {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number format
const isValidPhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
};

// Generate slug from string
const generateSlug = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// Capitalize first letter of each word
const capitalizeWords = (str) => {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

// Remove sensitive data from object
const sanitizeObject = (obj, fieldsToRemove = ['password', 'token', 'resetPasswordToken', 'resetPasswordExpires']) => {
    const sanitized = { ...obj };
    fieldsToRemove.forEach(field => {
        delete sanitized[field];
    });
    return sanitized;
};

// Deep clone object
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
const isEmpty = (obj) => {
    return Object.keys(obj).length === 0;
};

// Generate OTP
const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
};

module.exports = {
    generateRandomString,
    generateRandomNumber,
    formatDate,
    isValidEmail,
    isValidPhone,
    generateSlug,
    capitalizeWords,
    sanitizeObject,
    deepClone,
    isEmpty,
    generateOTP
};