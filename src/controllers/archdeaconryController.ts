import { Request, Response } from 'express';
import { ArchdeaconryModel } from '../models/Archdeaconry';
import { config } from '../config/env';
import { archdeaconries as seedArchdeaconries } from '../seed/archdeaconrySeed';

export const getArchdeaconries = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  if (config.useInMemoryMock) {
    const formattedSeedData = seedArchdeaconries.map((item) => ({
      id: item.archdeaconryId,
      name: item.name,
      center: item.center,
      zoom: item.zoom,
      branches: item.branches,
      members: item.members,
      parishes: item.parishes,
    }));

    res.status(200).json({
      success: true,
      count: formattedSeedData.length,
      data: formattedSeedData,
    });
    return;
  }

  const dbData = await ArchdeaconryModel.find()
    .sort({ name: 1 })
    .lean();

  const data = dbData.length > 0 ? dbData : (seedArchdeaconries as any[]);

  const formattedData = data.map((item) => ({
    id: item.archdeaconryId || item.id,
    name: item.name,
    center: item.center,
    zoom: item.zoom,
    branches: item.branches,
    members: item.members,
    parishes: item.parishes || [],
  }));

  res.status(200).json({
    success: true,
    count: formattedData.length,
    data: formattedData,
  });
};