import { Request, Response } from 'express';
import { ResourceModel, IResource } from '../models/Resource';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { deleteCloudinaryAsset } from '../config/cloudinary';

let inMemoryResources: IResource[] = [
  {
    id: 1,
    title: 'Daily Devotional Guide',
    description: 'A comprehensive 30-day devotional guide designed specifically for young adults, featuring daily Scripture readings and reflections.',
    type: 'pdf',
    category: 'devotional',
    downloadUrl: '#',
    image: '',
    featured: true,
  },
  {
    id: 2,
    title: 'Youth Leadership Workshop Series',
    description: 'Video series covering essential leadership skills for young Christians, including communication, team building, and spiritual leadership.',
    type: 'video',
    category: 'leadership',
    downloadUrl: '#',
    image: '',
    featured: false,
  },
  {
    id: 3,
    title: 'Bible Study: Faith in Action',
    description: 'Interactive Bible study materials exploring how to live out Christian faith in daily life, work, and relationships.',
    type: 'pdf',
    category: 'bible-study',
    downloadUrl: '#',
    image: '',
    featured: false,
  },
  {
    id: 4,
    title: 'Worship Music Collection',
    description: 'Curated collection of contemporary Christian worship songs perfect for youth services and personal worship time.',
    type: 'audio',
    category: 'worship',
    downloadUrl: '#',
    image: '',
    featured: false,
  },
  {
    id: 5,
    title: 'Prayer and Meditation Guide',
    description: 'Practical guide to developing a meaningful prayer life, including various prayer methods and meditation techniques.',
    type: 'pdf',
    category: 'prayer',
    downloadUrl: '#',
    image: '',
    featured: false,
  },
  {
    id: 6,
    title: 'Community Service Project Ideas',
    description: 'Creative and impactful community service project ideas that young people can implement in their local communities.',
    type: 'pdf',
    category: 'service',
    downloadUrl: '#',
    image: '',
    featured: false,
  },
];

export const getResources = async (req: Request, res: Response): Promise<void> => {
  const { category, type, featured } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryResources];
    if (category && category !== 'all') {
      filtered = filtered.filter((r) => r.category.toLowerCase() === (category as string).toLowerCase());
    }
    if (type && type !== 'all') {
      filtered = filtered.filter((r) => r.type.toLowerCase() === (type as string).toLowerCase());
    }
    if (featured !== undefined) {
      filtered = filtered.filter((r) => r.featured === (featured === 'true'));
    }
    res.status(200).json({ success: true, count: filtered.length, data: filtered });
    return;
  }

  const filter: Record<string, unknown> = {};
  if (category && category !== 'all') filter.category = new RegExp(`^${category}$`, 'i');
  if (type && type !== 'all') filter.type = type;
  if (featured !== undefined) filter.featured = featured === 'true';

  const resources = await ResourceModel.find(filter).sort({ numericId: -1 });
  res.status(200).json({ success: true, count: resources.length, data: resources });
};

export const getResourceById = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  if (config.useInMemoryMock) {
    const resource = inMemoryResources.find((r) => r.id === numericId);
    if (!resource) {
      throw new ApiError(404, `Resource with ID ${numericId} not found.`);
    }
    res.status(200).json({ success: true, data: resource });
    return;
  }

  const resource = await ResourceModel.findOne({ numericId });
  if (!resource) {
    throw new ApiError(404, `Resource with ID ${numericId} not found.`);
  }
  res.status(200).json({ success: true, data: resource });
};

export const createResource = async (req: Request, res: Response): Promise<void> => {
  const resourceData = req.body;
  const user = (req as any).user;
  const uploadedBy = user?.name || user?.email || 'Authorized Administrator';
  const uploadedAt = new Date();

  const finalPayload = {
    ...resourceData,
    uploadedBy,
    uploadedAt,
    downloadUrl: resourceData.downloadUrl || resourceData.fileUrl || '#',
    fileUrl: resourceData.fileUrl || resourceData.downloadUrl,
    image: resourceData.image || '',
  };

  if (config.useInMemoryMock) {
    const newId = inMemoryResources.length > 0 ? Math.max(...inMemoryResources.map((r) => r.id)) + 1 : 1;
    const createdResource: IResource = { id: newId, ...finalPayload };
    inMemoryResources.push(createdResource);
    res.status(201).json({ success: true, message: 'Resource created successfully.', data: createdResource });
    return;
  }

  try {
    const highest = await ResourceModel.findOne().sort({ numericId: -1 });
    const newNumericId = highest ? highest.numericId + 1 : 1;

    const resourceDoc = await ResourceModel.create({
      numericId: newNumericId,
      ...finalPayload,
    });

    res.status(201).json({ success: true, message: 'Resource created successfully.', data: resourceDoc });
  } catch (error: any) {
    // Orphan Cleanup: If DB creation fails but Cloudinary asset publicId was provided, clean up Cloudinary asset
    if (resourceData.publicId) {
      console.warn(`[Resource Creation Failed] Triggering orphan asset cleanup for publicId: ${resourceData.publicId}`);
      await deleteCloudinaryAsset(resourceData.publicId, 'raw').catch((cleanupErr) => {
        console.error(`[Orphan Cleanup Failed] Could not delete publicId: ${resourceData.publicId}`, cleanupErr?.message);
      });
    }

    throw new ApiError(500, error?.message || 'Failed to save resource metadata to database.');
  }
};

export const downloadResource = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);
  const resource = await ResourceModel.findOne({ numericId });

  if (!resource || !resource.downloadUrl || resource.downloadUrl === '#') {
    throw new ApiError(404, `Resource file not found for ID ${numericId}.`);
  }

  const filename = resource.originalFilename || `${resource.title || 'resource'}.${resource.type || 'pdf'}`;
  const encodedFilename = encodeURIComponent(filename);

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
  );

  if (resource.mimeType) {
    res.setHeader('Content-Type', resource.mimeType);
  }

  // Stream raw file content from Cloudinary url so browser receives disposition headers with exact filename
  try {
    const response = await fetch(resource.downloadUrl);
    if (!response.ok || !response.body) {
      throw new ApiError(500, `Failed to retrieve file from storage provider.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (fetchErr: any) {
    console.error(`[Resource Download Error] Could not fetch file from ${resource.downloadUrl}:`, fetchErr?.message);
    throw new ApiError(500, 'Failed to stream resource file from cloud storage.');
  }
};

export const viewResource = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);
  const resource = await ResourceModel.findOne({ numericId });

  if (!resource || !resource.downloadUrl || resource.downloadUrl === '#') {
    throw new ApiError(404, `Resource file not found for ID ${numericId}.`);
  }

  const filename = resource.originalFilename || `${resource.title || 'resource'}.${resource.type || 'pdf'}`;
  const encodedFilename = encodeURIComponent(filename);

  const isPdf =
    resource.mimeType?.toLowerCase().includes('pdf') ||
    resource.type?.toLowerCase() === 'pdf' ||
    filename.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    throw new ApiError(400, 'Inline browser preview is only supported for PDF documents.');
  }

  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
  );
  res.setHeader('Content-Type', 'application/pdf');

  try {
    const response = await fetch(resource.downloadUrl);
    if (!response.ok || !response.body) {
      throw new ApiError(500, `Failed to retrieve PDF stream from storage provider.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (fetchErr: any) {
    console.error(`[Resource View Error] Could not fetch PDF from ${resource.downloadUrl}:`, fetchErr?.message);
    throw new ApiError(500, 'Failed to stream resource PDF file from cloud storage.');
  }
};

export const updateResource = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);
  const updateData = req.body;

  if (config.useInMemoryMock) {
    const resource = inMemoryResources.find((r) => r.id === numericId);
    if (!resource) {
      throw new ApiError(404, `Resource with ID ${numericId} not found.`);
    }
    Object.assign(resource, updateData);
    res.status(200).json({ success: true, message: 'Resource updated successfully.', data: resource });
    return;
  }

  const resource = await ResourceModel.findOne({ numericId });
  if (!resource) {
    throw new ApiError(404, `Resource with ID ${numericId} not found.`);
  }

  Object.assign(resource, updateData);
  await resource.save();

  res.status(200).json({ success: true, message: 'Resource updated successfully.', data: resource.toJSON() });
};

export const deleteResource = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  if (config.useInMemoryMock) {
    const idx = inMemoryResources.findIndex((r) => r.id === numericId);
    if (idx === -1) {
      throw new ApiError(404, `Resource with ID ${numericId} not found.`);
    }
    const [deleted] = inMemoryResources.splice(idx, 1);
    if (deleted.publicId) {
      const resourceType = deleted.mimeType?.startsWith('image') ? 'image' : 'raw';
      deleteCloudinaryAsset(deleted.publicId, resourceType).catch((err) => {
        console.warn(`[Cloudinary Asset Cleanup Warning] Failed to delete asset ${deleted.publicId}:`, err?.message);
      });
    }
    res.status(200).json({ success: true, message: 'Resource deleted successfully.' });
    return;
  }

  const resource = await ResourceModel.findOne({ numericId });
  if (!resource) {
    throw new ApiError(404, `Resource with ID ${numericId} not found.`);
  }

  const publicIdToDelete = resource.publicId;
  const mimeTypeToDelete = resource.mimeType;

  // STEP 1: Delete metadata record from MongoDB first
  await ResourceModel.deleteOne({ numericId });

  // STEP 2: Perform Cloudinary asset cleanup if publicId exists
  if (publicIdToDelete) {
    const resourceType = mimeTypeToDelete?.startsWith('image') ? 'image' : 'raw';
    deleteCloudinaryAsset(publicIdToDelete, resourceType).catch((err) => {
      console.warn(`[Cloudinary Asset Cleanup Warning] MongoDB deleted, but Cloudinary asset cleanup failed for ${publicIdToDelete}:`, err?.message);
    });
  }

  res.status(200).json({ success: true, message: 'Resource deleted successfully.' });
};



