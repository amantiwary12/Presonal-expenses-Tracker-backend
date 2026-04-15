// import multer from "multer";
// import path from "path";

// // Storage configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/");
//   },

//   filename: function (req, file, cb) {
//     const uniqueName =
//       Date.now() + "-" + Math.round(Math.random() * 1e9);

//     cb(null, uniqueName + path.extname(file.originalname));
//   }
// });

// // File filter (security)
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [
//     "image/jpeg",
//     "image/png",
//     "image/jpg"
//   ];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(
//       new Error(
//         "Only JPG, JPEG, PNG images are allowed"
//       ),
//       false
//     );
//   }
// };

// // Upload configuration
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5MB
//   },
//   fileFilter
// });

// export default upload;


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
        crop: "limit"
      }
    ]
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export default upload; 