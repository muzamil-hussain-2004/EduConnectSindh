import multer from 'multer';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_MATERIAL_BYTES = 15 * 1024 * 1024;

const memoryUpload = (fileSize: number) =>
  multer({ storage: multer.memoryStorage(), limits: { fileSize, files: 1 } }).single('file');

// Files are held in memory first so their real type can be checked before anything touches the disk.
export const uploadSingleFile = memoryUpload(MAX_UPLOAD_BYTES);
export const uploadAvatarFile = memoryUpload(MAX_AVATAR_BYTES);
export const uploadMaterialFile = memoryUpload(MAX_MATERIAL_BYTES);
