const ApiResponse = require("../utils/ApiResponse");

// Single file upload (image or video)
const uploadSingle = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Use form-data with field name "file".',
      });
    }

    const { path, filename, mimetype, size } = req.file;

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          url: path,
          public_id: filename,
          mimetype,
          size,
        },
        "File uploaded successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

// Multiple files upload (images/videos)
const uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        error: 'No files provided. Use form-data with field name "files".',
      });
    }

    const files = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    }));

    return res
      .status(201)
      .json(new ApiResponse(201, files, "Files uploaded successfully"));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
};
