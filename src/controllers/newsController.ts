import { Request, Response } from 'express';
import { NewsModel, INewsArticle } from '../models/News';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

let inMemoryNews: INewsArticle[] = [
  {
    id: 1,
    title: 'AYPA Youth Leadership Conference 2024',
    excerpt: 'Join us for an inspiring weekend of leadership development, workshops, and fellowship with young Anglicans from across the region.',
    content: 'Our annual Youth Leadership Conference is designed to equip young people with the skills and spiritual foundation needed to lead in their communities...',
    author: 'Rev. Sarah Johnson',
    date: '2024-01-10',
    category: 'events',
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: true,
  },
  {
    id: 2,
    title: 'Community Service Impact Report',
    excerpt: 'See how AYPA members made a difference in 2023 through various community service initiatives and outreach programs.',
    content: 'This year, our members contributed over 500 hours of community service, impacting hundreds of lives through food drives, elderly care visits...',
    author: 'Michael Chen',
    date: '2024-01-08',
    category: 'community',
    image: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 3,
    title: 'New Bible Study Series: "Faith in Action"',
    excerpt: 'Starting this month, we\'re launching a new Bible study series focusing on practical applications of faith in daily life.',
    content: 'Our new study series will explore how young Christians can live out their faith authentically in school, work, and relationships...',
    author: 'Emma Williams',
    date: '2024-01-05',
    category: 'spiritual',
    image: 'https://images.pexels.com/photos/8468471/pexels-photo-8468471.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
];

export const getNews = async (req: Request, res: Response): Promise<void> => {
  const { category, featured } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryNews];
    if (category && category !== 'all') {
      filtered = filtered.filter((n) => n.category.toLowerCase() === (category as string).toLowerCase());
    }
    if (featured !== undefined) {
      filtered = filtered.filter((n) => n.featured === (featured === 'true'));
    }
    res.status(200).json({ success: true, count: filtered.length, data: filtered });
    return;
  }

  const filter: Record<string, unknown> = {};
  if (category && category !== 'all') filter.category = new RegExp(`^${category}$`, 'i');
  if (featured !== undefined) filter.featured = featured === 'true';

  const news = await NewsModel.find(filter).sort({ date: -1 });
  res.status(200).json({ success: true, count: news.length, data: news });
};

export const getNewsById = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  if (config.useInMemoryMock) {
    const article = inMemoryNews.find((n) => n.id === numericId);
    if (!article) {
      throw new ApiError(404, `News article with ID ${numericId} not found.`);
    }
    res.status(200).json({ success: true, data: article });
    return;
  }

  const article = await NewsModel.findOne({ numericId });
  if (!article) {
    throw new ApiError(404, `News article with ID ${numericId} not found.`);
  }
  res.status(200).json({ success: true, data: article });
};

export const createNews = async (req: Request, res: Response): Promise<void> => {
  const newsData = req.body;
  const effectiveDate = newsData.date || new Date().toISOString().split('T')[0];
  const effectiveExcerpt = newsData.excerpt !== undefined ? newsData.excerpt : (newsData.summary || '');
  const effectiveContent = newsData.content !== undefined ? newsData.content : '';
  const effectiveImage = newsData.image || 'https://res.cloudinary.com/dxxmqm9vw/image/upload/v1775140330/3_uph0zl.jpg';

  const finalPayload = {
    ...newsData,
    date: effectiveDate,
    excerpt: effectiveExcerpt,
    content: effectiveContent,
    image: effectiveImage,
    state: newsData.state || 'published',
  };

  if (config.useInMemoryMock) {
    const newId = inMemoryNews.length > 0 ? Math.max(...inMemoryNews.map((n) => n.id)) + 1 : 1;
    const createdArticle: INewsArticle = { id: newId, ...finalPayload };
    inMemoryNews.push(createdArticle);
    res.status(201).json({ success: true, message: 'News article created successfully.', data: createdArticle });
    return;
  }

  const highest = await NewsModel.findOne().sort({ numericId: -1 });
  const newNumericId = highest ? highest.numericId + 1 : 1;

  const newsDoc = await NewsModel.create({
    numericId: newNumericId,
    ...finalPayload,
  });

  res.status(201).json({ success: true, message: 'News article created successfully.', data: newsDoc });
};

export const updateNews = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);
  const updateData = req.body;

  if (config.useInMemoryMock) {
    const index = inMemoryNews.findIndex((n) => n.id === numericId);
    if (index === -1) {
      throw new ApiError(404, `News article with ID ${numericId} not found.`);
    }
    inMemoryNews[index] = { ...inMemoryNews[index], ...updateData };
    res.status(200).json({ success: true, message: 'News article updated successfully.', data: inMemoryNews[index] });
    return;
  }

  const article = await NewsModel.findOne({ numericId });
  if (!article) {
    throw new ApiError(404, `News article with ID ${numericId} not found.`);
  }

  Object.assign(article, updateData);
  await article.save();

  res.status(200).json({ success: true, message: 'News article updated successfully.', data: article });
};

export const deleteNews = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  if (config.useInMemoryMock) {
    const index = inMemoryNews.findIndex((n) => n.id === numericId);
    if (index === -1) {
      throw new ApiError(404, `News article with ID ${numericId} not found.`);
    }
    const [deleted] = inMemoryNews.splice(index, 1);
    res.status(200).json({ success: true, message: 'News article deleted successfully.', data: deleted });
    return;
  }

  const article = await NewsModel.findOneAndDelete({ numericId });
  if (!article) {
    throw new ApiError(404, `News article with ID ${numericId} not found.`);
  }

  res.status(200).json({ success: true, message: 'News article deleted successfully.', data: article });
};


