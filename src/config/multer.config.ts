import { memoryStorage } from 'multer';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const multerConfig: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },
  fileFilter: (_req, file, cb) => {
    const allowed = (
      process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp'
    ).split(',');
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
};
