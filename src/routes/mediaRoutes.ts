import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

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

export default router;
