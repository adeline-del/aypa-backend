import { Request, Response } from 'express';
import { ArchdeaconryModel, IArchdeaconry } from '../models/Diocese';
import { config } from '../config/env';

let inMemoryArchdeaconries: IArchdeaconry[] = [
  {
    id: 'accra-east',
    name: 'Accra East',
    center: [5.602, -0.13],
    zoom: 12,
    branches: 10,
    members: 1250,
    parishes: [
      { id: 'e1', name: 'St. Peter', location: 'Nungua', coordinates: [5.6, -0.076] },
      { id: 'e2', name: 'St. Augustine', location: 'Nungua North', coordinates: [5.613, -0.079] },
      { id: 'e3', name: 'Messiah', location: 'Nungua South', coordinates: [5.59, -0.081] },
    ],
  },
  {
    id: 'accra-west',
    name: 'Accra West',
    center: [5.56, -0.23],
    zoom: 12,
    branches: 12,
    members: 1800,
    parishes: [
      { id: 'w1', name: 'St. Joseph', location: 'Dansoman', coordinates: [5.55, -0.25] },
      { id: 'w2', name: 'St. Mary', location: 'Kaneshie', coordinates: [5.57, -0.22] },
    ],
  },
];

export const getArchdeaconries = async (_req: Request, res: Response): Promise<void> => {
  if (config.useInMemoryMock) {
    res.status(200).json({ success: true, count: inMemoryArchdeaconries.length, data: inMemoryArchdeaconries });
    return;
  }

  const data = await ArchdeaconryModel.find();
  res.status(200).json({ success: true, count: data.length, data });
};
