//upload middleware js
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: "finance-app",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      {
        width: 800,
        height: 800,
        crop: "limit",
      },
    ],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// In-memory storage for OCR scanning — the image is only read for text
// extraction and never persisted, so it doesn't need to hit Cloudinary.
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;
