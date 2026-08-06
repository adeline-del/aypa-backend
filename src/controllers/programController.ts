import { Request, Response } from 'express';
import { ProgramModel, IProgram } from '../models/Program';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

let inMemoryPrograms: IProgram[] = [
  {
    id: 1,
    title: 'Sunday Youth Fellowship',
    description: 'Weekly gathering for worship, teaching, and fellowship designed specifically for young people.',
    schedule: 'Sundays, 10:30 AM - 12:00 PM',
    location: 'Youth Center',
    ageGroup: '13-25 years',
    category: 'worship',
    features: ['Contemporary Worship', 'Biblical Teaching', 'Small Groups', 'Fellowship Time'],
    image: 'https://images.pexels.com/photos/8468470/pexels-photo-8468470.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: true,
  },
  {
    id: 2,
    title: 'Leadership Development Program',
    description: 'Comprehensive program to develop leadership skills and spiritual maturity in young adults.',
    schedule: 'Monthly Workshops',
    location: 'Conference Room',
    ageGroup: '18-30 years',
    category: 'leadership',
    features: ['Leadership Training', 'Mentorship', 'Public Speaking', 'Team Building'],
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 3,
    title: 'Community Service Initiative',
    description: 'Regular community service projects to put faith into action and serve those in need.',
    schedule: 'Bi-weekly Saturdays',
    location: 'Various Locations',
    ageGroup: 'All Ages',
    category: 'service',
    features: ['Food Bank Volunteering', 'Elderly Care Visits', 'Community Clean-up', 'Charity Drives'],
    image: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 4,
    title: 'Bible Study Groups',
    description: 'Small group Bible studies focusing on relevant topics for young Christians.',
    schedule: 'Wednesdays, 7:00 PM - 8:30 PM',
    location: 'Small Group Rooms',
    ageGroup: '16-35 years',
    category: 'study',
    features: ['Interactive Discussion', 'Practical Application', 'Prayer Time', 'Accountability'],
    image: 'https://images.pexels.com/photos/8468471/pexels-photo-8468471.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 5,
    title: 'Youth Choir & Music Ministry',
    description: 'Musical worship ministry for young people to use their talents in service to God.',
    schedule: 'Thursdays, 6:30 PM - 8:00 PM',
    location: 'Music Room',
    ageGroup: '13-30 years',
    category: 'worship',
    features: ['Vocal Training', 'Instrument Lessons', 'Performance Opportunities', 'Worship Leading'],
    image: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
  {
    id: 6,
    title: 'Discipleship Mentoring',
    description: 'One-on-one mentoring relationships to guide spiritual growth and personal development.',
    schedule: 'Flexible Scheduling',
    location: 'Various Locations',
    ageGroup: '16-25 years',
    category: 'discipleship',
    features: ['Personal Mentorship', 'Spiritual Guidance', 'Life Skills', 'Career Counseling'],
    image: 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
  },
];

export const getPrograms = async (req: Request, res: Response): Promise<void> => {
  const { category, featured } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryPrograms];
    if (category && category !== 'all') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === (category as string).toLowerCase());
    }
    if (featured !== undefined) {
      filtered = filtered.filter((p) => p.featured === (featured === 'true'));
    }
    res.status(200).json({ success: true, count: filtered.length, data: filtered });
    return;
  }

  const filter: Record<string, unknown> = {};
  if (category && category !== 'all') filter.category = new RegExp(`^${category}$`, 'i');
  if (featured !== undefined) filter.featured = featured === 'true';

  const programs = await ProgramModel.find(filter);
  res.status(200).json({ success: true, count: programs.length, data: programs });
};

export const getProgramById = async (req: Request, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);

  if (config.useInMemoryMock) {
    const program = inMemoryPrograms.find((p) => p.id === numericId);
    if (!program) {
      throw new ApiError(404, `Program with ID ${numericId} not found.`);
    }
    res.status(200).json({ success: true, data: program });
    return;
  }

  const program = await ProgramModel.findOne({ numericId });
  if (!program) {
    throw new ApiError(404, `Program with ID ${numericId} not found.`);
  }
  res.status(200).json({ success: true, data: program });
};

export const createProgram = async (req: Request, res: Response): Promise<void> => {
  const programData = req.body;

  if (config.useInMemoryMock) {
    const newId = inMemoryPrograms.length > 0 ? Math.max(...inMemoryPrograms.map((p) => p.id)) + 1 : 1;
    const createdProgram: IProgram = { id: newId, ...programData };
    inMemoryPrograms.push(createdProgram);
    res.status(201).json({ success: true, message: 'Program created successfully.', data: createdProgram });
    return;
  }

  const highest = await ProgramModel.findOne().sort({ numericId: -1 });
  const newNumericId = highest ? highest.numericId + 1 : 1;

  const programDoc = await ProgramModel.create({
    numericId: newNumericId,
    ...programData,
  });

  res.status(201).json({ success: true, message: 'Program created successfully.', data: programDoc });
};