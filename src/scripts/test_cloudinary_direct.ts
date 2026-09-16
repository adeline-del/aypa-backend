import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

console.log('Testing with inline credentials in options:');
console.log('cloudName:', cloudName);
console.log('apiKey:', apiKey);
// Do NOT print apiSecret value, only length
console.log('apiSecret length:', apiSecret?.length);

const validPdfBase64 =
  'JVBERi0xLjQKJSCjldCSCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9Db3VudCAxPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ1Pj4Kc3RyZWFtCkJUCi9GIDEyIFRmCjEwMCA3MDAgVGQKKEhlbGxvIEFZUEEgSW50ZWdyYXRpb24pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUNCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAyMzQ1Njc4OSAwMDAwMCBuIAowMDAwMDAwMDY4IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKMDAyMzQ1Njg5MCAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNSAvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoyMzQ1Njk1MAolJUVPRg==';

async function testWithExplicitOptions(resourceType: 'auto' | 'raw' | 'image') {
  try {
    const pdfBuffer = Buffer.from(validPdfBase64, 'base64');
    console.log(`Testing upload_stream with explicit options (type: ${resourceType})...`);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          folder: 'aypa_resources',
          resource_type: resourceType,
        },
        (error, res) => {
          if (error) reject(error);
          else resolve(res);
        }
      );
      stream.end(pdfBuffer);
    });

    console.log(`SUCCESS for explicit options (${resourceType})! URL:`, (result as any).secure_url);
    return true;
  } catch (err: any) {
    console.error(`FAILED for explicit options (${resourceType})! Code: ${err?.http_code}, Message: "${err?.message}"`);
    return false;
  }
}

async function run() {
  await testWithExplicitOptions('auto');
  await testWithExplicitOptions('raw');
  await testWithExplicitOptions('image');
}

run();
