import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded from root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Initializes and returns the Cloudinary SDK configuration dynamically.
 */
export const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret };
};

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Uploads a file buffer directly to Cloudinary using upload_stream.
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  originalname: string,
  mimeType: string,
  folder: string = 'aypa_resources'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const creds = getCloudinaryConfig();

    if (!creds) {
      console.error('[Cloudinary Storage Error] Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing or incomplete.');
      return reject(
        new Error(
          'Cloudinary persistent cloud storage is not configured on the server. Please verify environment variables.'
        )
      );
    }

    const isDocument = mimeType.startsWith('application/') || originalname.match(/\.(pdf|doc|docx)$/i);
    const resourceType = isDocument ? 'raw' : 'auto';

    console.log(`[Cloudinary Upload Init] Target folder: "${folder}", Resource Type: "${resourceType}", File: "${originalname}" (${buffer.length} bytes)`);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error: any, result?: UploadApiResponse) => {
        if (error || !result) {
          const httpCode = error?.http_code || 500;
          const errorMsg = error?.message || 'Unknown Cloudinary error';
          console.error(`[Cloudinary API Error] HTTP ${httpCode}: "${errorMsg}"`);
          return reject(
            new Error(`Cloudinary API Storage Failure (${httpCode}): ${errorMsg}`)
          );
        }

        console.log(`[Cloudinary Upload Success] Asset Public ID: "${result.public_id}", URL: "${result.secure_url}"`);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          fileName: originalname,
          mimeType,
          fileSize: result.bytes || buffer.length,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes an asset from Cloudinary by publicId.
 */
export const deleteCloudinaryAsset = async (publicId: string, resourceType: 'raw' | 'image' | 'auto' = 'raw'): Promise<boolean> => {
  try {
    const creds = getCloudinaryConfig();
    if (!creds || !publicId) return false;

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result.result === 'ok' || result.result === 'not found';
  } catch (error: any) {
    console.error(`[Cloudinary Cleanup Error] Failed to delete orphaned asset identifier "${publicId}":`, error?.message || error);
    return false;
  }
};

export default cloudinary;
