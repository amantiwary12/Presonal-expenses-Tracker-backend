import multer from "multer";

const errorHandler = (
  err,
  req,
  res,
  next
) => {

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Other errors
  if (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

export default errorHandler;