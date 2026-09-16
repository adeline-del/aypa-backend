import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ResourceModel } from '../models/Resource';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const mongoUri = process.env.MONGODB_URI;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

async function auditOrphanedAssets() {
  console.log('--- READ-ONLY ORPHAN ASSET AUDIT ---');

  // 1. Check MongoDB Resource Records
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('[MongoDB Status] Connected to database successfully.');
      const mongoResources = await ResourceModel.find({}).lean();
      console.log(`[MongoDB Resource Records Count] Found ${mongoResources.length} records:`);
      mongoResources.forEach((r: any) => {
        console.log(` - ID: ${r.numericId || r._id}, Title: "${r.title}", PublicId: "${r.publicId || 'N/A'}", downloadUrl: "${r.downloadUrl}"`);
      });
    } catch (dbErr: any) {
      console.error('[MongoDB Audit Error]', dbErr?.message || dbErr);
    } finally {
      await mongoose.disconnect();
    }
  }

  // 2. Check Cloudinary Assets in folder aypa_resources
  if (cloudName && apiKey && apiSecret) {
    try {
      console.log('\n[Cloudinary Status] Searching assets in folder "aypa_resources"...');
      const cloudinaryResult = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'aypa_resources',
        max_results: 50,
      });

      console.log(`[Cloudinary Assets Count] Found ${cloudinaryResult.resources.length} assets:`);
      cloudinaryResult.resources.forEach((asset: any) => {
        console.log(` - Public ID: "${asset.public_id}", Format: "${asset.format}", Resource Type: "${asset.resource_type}", Bytes: ${asset.bytes}, Created At: ${asset.created_at}, URL: "${asset.secure_url}"`);
      });
    } catch (cErr: any) {
      console.error('[Cloudinary Audit Error]', cErr?.message || cErr);
    }
  }

  console.log('--- AUDIT COMPLETE ---');
}

auditOrphanedAssets();
