import multer, { StorageEngine, FileFilterCallback } from "multer";
import appRoot from "app-root-path";
import path from "path";
import fs from "fs";
import { Request } from "express";

// Multer Storage Configuration
const storage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const dirPath = `/public/${req.body.imagePath}`;
    const dir = path.join(appRoot.path, dirPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, `public/${req.body.imagePath}`);
  },

  filename: (req: Request, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Multer File Filter
const multerFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  (req as any).error = null;

  if (req.body.imagePath && req.body.imagePath === "user") {
    const allowedTypes = ["png", "jpg", "jpeg"];
    const fileType = file.mimetype.split("/")[1];

    if (allowedTypes.includes(fileType)) {
      cb(null, true);
    } else {
      (req as any).error = "Only png, jpg, jpeg allowed.";
      cb(null, false);
    }
  } else if (req.body.imagePath && req.body.imagePath === "streamer") {
    const allowedTypes = ["png", "jpg", "jpeg"];
    const fileType = file.mimetype.split("/")[1];

    if (allowedTypes.includes(fileType)) {
      cb(null, true);
    } else {
      (req as any).error = "Only png, jpg, jpeg allowed.";
      cb(null, false);
    }
  }else {
    cb(null, true);
  }
};

// Export configured multer
const upload = multer({
  storage,
  fileFilter: multerFilter,
});

export default upload;
