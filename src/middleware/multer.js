const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

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

const imageOnlyFilter = (req, file, cb) => {
  if (file && file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  return cb(new ApiError(400, 'Only image files are allowed'), false);
};

const uploadImagesOnly = multer({ storage, fileFilter: imageOnlyFilter });

module.exports = {
  upload,
  single: (fieldName = 'image') => upload.single(fieldName),
  array: (fieldName = 'images', maxCount = 5) => upload.array(fieldName, maxCount),
  fields: (fields = []) => upload.fields(fields),
  singleImage: (fieldName = 'image') => uploadImagesOnly.single(fieldName),
  arrayImages: (fieldName = 'images', maxCount = 5) => uploadImagesOnly.array(fieldName, maxCount),
};