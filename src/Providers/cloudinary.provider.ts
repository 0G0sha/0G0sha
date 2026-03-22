import type { UploadApiResponse } from 'cloudinary'
import multer from 'multer'
import streamifier from 'streamifier'
import cloudinary from '@/config/cloudinary'

export const upload = multer({ storage: multer.memoryStorage() })

export interface UploadOptions {
     folder?: string;
     transformation?: object;
}

export function uploadToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? 'uploads',
        ...options.transformation,
      },
      (error, result) => {
        if (error || !result) return reject(error)
        resolve(result)
      },
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })
}
