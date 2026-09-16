import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ResourceModel } from '../models/Resource';
import { config } from '../config/env';

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

async function inspectAll() {
  console.log('=======================================================');
  console.log('🔍 AYPA RESOURCE AUDIT REPORT (READ-ONLY)');
  console.log('=======================================================');
  console.log('Server config.useInMemoryMock:', config.useInMemoryMock);

  // 1. Inspect MongoDB Resources
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('\n--- 1. MONGODB RESOURCE DOCUMENTS ---');
      const docs = await ResourceModel.find({}).sort({ numericId: -1 }).lean();
      console.log(`Total Documents in Mongo: ${docs.length}`);
      docs.forEach((doc: any, i: number) => {
        console.log(`[${i + 1}] ID: ${doc.numericId || doc._id} | Title: "${doc.title}" | Category: "${doc.category}" | Type: "${doc.type}" | PublicID: "${doc.publicId || 'N/A'}"`);
        console.log(`     downloadUrl: ${doc.downloadUrl}`);
        console.log(`     uploadedBy: ${doc.uploadedBy} | uploadedAt: ${doc.uploadedAt || doc.createdAt}`);
      });
    } catch (err: any) {
      console.error('MongoDB error:', err.message);
    } finally {
      await mongoose.disconnect();
    }
  }

  // 2. Inspect Cloudinary Assets
  if (cloudName && apiKey && apiSecret) {
    try {
      console.log('\n--- 2. CLOUDINARY MEDIA LIBRARY ASSETS ---');
      console.log(`Cloud Name: ${cloudName}`);
      console.log('Searching folder "aypa_resources"...');

      // Check raw resources
      const rawRes = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        prefix: 'aypa_resources',
        max_results: 50,
      });

      console.log(`Raw Assets Count in "aypa_resources": ${rawRes.resources.length}`);
      rawRes.resources.forEach((a: any, i: number) => {
        console.log(` [Raw ${i + 1}] Public ID: "${a.public_id}" | Format: "${a.format}" | Bytes: ${a.bytes} | URL: ${a.secure_url}`);
      });

      // Check image resources in folder aypa_resources
      const imgRes = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        prefix: 'aypa_resources',
        max_results: 50,
      });

      console.log(`Image Assets Count in "aypa_resources": ${imgRes.resources.length}`);
      imgRes.resources.forEach((a: any, i: number) => {
        console.log(` [Image ${i + 1}] Public ID: "${a.public_id}" | Format: "${a.format}" | Bytes: ${a.bytes} | URL: ${a.secure_url}`);
      });
    } catch (err: any) {
      console.error('Cloudinary API error:', err.message);
    }
  }

  console.log('\n=======================================================');
}

inspectAll();
