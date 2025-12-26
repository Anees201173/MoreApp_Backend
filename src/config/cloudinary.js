const cloudinary = require('cloudinary').v2;
const config = require('./config');

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME || config.cloudinary.cloud_name,
	api_key: process.env.CLOUDINARY_API_KEY || config.cloudinary.api_key,
	api_secret: process.env.CLOUDINARY_API_SECRET || config.cloudinary.api_secret,
	//secure: process.env.CLOUDINARY_SECURE === 'true' || config.cloudinary.secure || true,
});

module.exports = cloudinary;