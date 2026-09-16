import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { uploadBufferToCloudinary, getCloudinaryConfig } from '../config/cloudinary';

const router = Router();

const FRONTEND_MANIFEST_PATH = path.resolve(
  process.cwd(),
  '../FRONTEND/src/data/galleryManifest.json'
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

/**
 * GET /api/media
 * Returns approved AYPA Gallery media items
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(FRONTEND_MANIFEST_PATH)) {
      const raw = fs.readFileSync(FRONTEND_MANIFEST_PATH, 'utf-8');
      const items = JSON.parse(raw);
      return res.status(200).json({
        success: true,
        count: items.length,
        data: items,
      });
    }

    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve media archive items',
    });
  }
});

/**
 * POST /api/media/upload
 * Authenticated persistent media upload endpoint.
 * Field Name: "file"
 */
router.post('/upload', authenticate, (req: AuthenticatedRequest, res: Response) => {
  console.log(`[Media Upload Request] User ID: "${req.user?.id}", Role: "${req.user?.role}"`);

  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE' || err.message === 'File too large') {
        console.warn(`[Media Upload Rejection] 413 File Size Limit Exceeded (${req.headers['content-length']} bytes)`);
        return res.status(413).json({
          success: false,
          message: 'File size exceeds the maximum allowed limit of 10MB.',
        });
      }
      if (err.message === 'INVALID_FILE_TYPE') {
        console.warn(`[Media Upload Rejection] 400 Invalid File Format / Extension`);
        return res.status(400).json({
          success: false,
          message: 'Unsupported file format or extension. Allowed formats are PDF, DOC, DOCX, JPG, PNG, WEBP.',
        });
      }
      console.warn(`[Media Upload Rejection] 400 Multer Error:`, err.message);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload parsing failed.',
      });
    }

    try {
      // Diagnostic check for Cloudinary credentials
      const creds = getCloudinaryConfig();
      console.log(`[Media Upload Diagnostic] Cloudinary Creds Configured: ${!!creds}`);

      // 1. Binary multipart/form-data upload handling
      if (req.file) {
        console.log(`[Media Upload Processing] Field: "${req.file.fieldname}", Original Name: "${req.file.originalname}", MIME: "${req.file.mimetype}", Size: ${req.file.size} bytes`);

        const isImage = req.file.mimetype.startsWith('image/');
        const targetFolder = isImage ? 'aypa_images' : 'aypa_resources';

        const uploadResult = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          targetFolder
        );

        return res.status(200).json({
          success: true,
          message: 'File uploaded to persistent cloud storage successfully.',
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          originalFilename: uploadResult.fileName,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
        });
      }

      // 2. Fallback JSON HTTPS URL string input handling
      const { fileData, fileName } = req.body;
      if (typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://'))) {
        console.log(`[Media Upload Processing] Validated remote HTTPS URL: "${fileData}"`);
        return res.status(200).json({
          success: true,
          message: 'Remote HTTPS URL reference validated successfully.',
          url: fileData,
          publicId: `external_${Date.now()}`,
          originalFilename: fileName || 'document',
          mimeType: 'application/octet-stream',
          fileSize: 0,
        });
      }

      console.warn(`[Media Upload Rejection] 400 No file attached in request`);
      return res.status(400).json({
        success: false,
        message: 'No valid file attached under field "file". Please attach a PDF, DOC, or DOCX document.',
      });
    } catch (error: any) {
      console.error('[Media Upload Error]', error?.message || error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to complete cloud storage file upload.',
      });
    }
  });
});

export default router;
