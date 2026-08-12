import { Request, Response } from 'express';

import { ArchdeaconryModel } from '../models/Archdeaconry';
import { config } from '../config/env';

export const getArchdeaconries = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  if (config.useInMemoryMock) {
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
    });

    return;
  }

  const data = await ArchdeaconryModel.find()
    .sort({ name: 1 })
    .lean();

  const formattedData = data.map((item) => ({
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
    count: formattedData.length,
    data: formattedData,
  });
};