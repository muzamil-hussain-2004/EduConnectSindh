import multer from 'multer';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Files are held in memory first so their real type can be checked before anything touches the disk.
export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single('file');
