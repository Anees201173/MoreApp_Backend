const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'More App',
    resource_type: 'auto',
    // Allow common image, document, and video formats
    allowed_formats: [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'svg',
      'pdf',
      'mp4',
      'mov',
      'avi',
      'mkv',
      'webm',
    ],
  },
});

const upload = multer({ storage });

module.exports = {
  upload,
  single: (fieldName = 'image') => upload.single(fieldName),
  array: (fieldName = 'images', maxCount = 5) => upload.array(fieldName, maxCount),
  fields: (fields = []) => upload.fields(fields)
};