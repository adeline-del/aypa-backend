import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';

const router = Router();

const FRONTEND_MANIFEST_PATH = path.resolve(
  process.cwd(),
  '../FRONTEND/src/data/galleryManifest.json'
);

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
 * Handles Event Flyer image uploads and Branch Report document (PDF/Word) uploads.
 * Accepts fileData (base64 Data URL or remote URL), fileName, and fileType.
 */
router.post('/upload', authenticate, (req: Request, res: Response) => {
  try {
    const { fileData, fileName, fileType } = req.body;

    if (!fileData) {
      return res.status(400).json({
        success: false,
        message: 'No file data or URL was provided.',
      });
    }

    // If fileData is already a valid HTTPS URL link, return it directly
    if (typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://'))) {
      return res.status(200).json({
        success: true,
        message: 'File reference validated successfully.',
        url: fileData,
        fileName: fileName || 'document',
      });
    }

    // Validate Base64 Data URL for image or document
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const allowedImageTypes = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/gif'];
      const allowedDocTypes = ['data:application/pdf', 'data:application/msword', 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

      const isImage = allowedImageTypes.some((type) => fileData.startsWith(type));
      const isDoc = allowedDocTypes.some((type) => fileData.startsWith(type));

      if (!isImage && !isDoc) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported file format. Please upload a valid image (JPG, PNG, WEBP) or document (PDF, DOC, DOCX).',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'File processed successfully.',
        url: fileData,
        fileName: fileName || (isImage ? 'event_flyer' : 'branch_report'),
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid file format or local file path submitted.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'File upload processing failed.',
    });
  }
});

export default router;
