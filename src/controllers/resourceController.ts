import { Request, Response } from 'express';
import { ResourceModel, IResource } from '../models/Resource';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

let inMemoryResources: IResource[] = [
  {
    id: 1,
    title: 'Daily Devotional Guide',
    description: 'A comprehensive 30-day devotional guide designed specifically for young adults, featuring daily Scripture readings and reflections.',
    type: 'pdf',
    category: 'devotional',
    downloadUrl: '#',
    image: 'https://images.pexels.com/photos/1112048/pexels-photo-1112048.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: true,
  },
  {
    id: 2,
    title: 'Youth Leadership Workshop Series',
    description: 'Video series covering essential leadership skills for young Christians, including communication, team building, and spiritual leadership.',
    type: 'video',
    category: 'leadership',
    downloadUrl: '#',
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 3,
    title: 'Bible Study: Faith in Action',
    description: 'Interactive Bible study materials exploring how to live out Christian faith in daily life, work, and relationships.',
    type: 'pdf',
    category: 'bible-study',
    downloadUrl: '#',
    image: 'https://images.pexels.com/photos/8468471/pexels-photo-8468471.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 4,
    title: 'Worship Music Collection',
    description: 'Curated collection of contemporary Christian worship songs perfect for youth services and personal worship time.',
    type: 'audio',
    category: 'worship',
    downloadUrl: '#',
    image: 'https://images.pexels.com/photos/8468470/pexels-photo-8468470.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 5,
    title: 'Prayer and Meditation Guide',
    description: 'Practical guide to developing a meaningful prayer life, including various prayer methods and meditation techniques.',
    type: 'pdf',
    category: 'prayer',
    downloadUrl: '#',
    image: 'https://images.pexels.com/photos/1112048/pexels-photo-1112048.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 6,
    title: 'Community Service Project Ideas',
    description: 'Creative and impactful community service project ideas that young people can implement in their local communities.',
    type: 'pdf',
    category: 'service',
    downloadUrl: '#',
    image: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=800',
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

  const resources = await ResourceModel.find(filter);
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

  if (config.useInMemoryMock) {
    const newId = inMemoryResources.length > 0 ? Math.max(...inMemoryResources.map((r) => r.id)) + 1 : 1;
    const createdResource: IResource = { id: newId, ...resourceData };
    inMemoryResources.push(createdResource);
    res.status(201).json({ success: true, message: 'Resource created successfully.', data: createdResource });
    return;
  }

  const highest = await ResourceModel.findOne().sort({ numericId: -1 });
  const newNumericId = highest ? highest.numericId + 1 : 1;

  const resourceDoc = await ResourceModel.create({
    numericId: newNumericId,
    ...resourceData,
  });

  res.status(201).json({ success: true, message: 'Resource created successfully.', data: resourceDoc });
};
