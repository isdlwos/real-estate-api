import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class CloudinaryService {
  upload(file: Express.Multer.File, folder = 'properties'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) return reject(new InternalServerErrorException('Cloudinary upload failed'));
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
