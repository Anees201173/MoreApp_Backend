const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    // Store uploads for shipments in a dedicated folder and allow common image/PDF formats.
    folder: "shipments_uploads",
    // Use 'auto' so Cloudinary accepts images and PDFs
    resource_type: "auto",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "svg", "pdf"],
  },
});

const upload = multer({ storage });

module.exports = upload;