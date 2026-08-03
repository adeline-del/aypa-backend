import { Request, Response } from 'express';
import { ProjectModel, DonationModel, IProject, IDonation } from '../models/Support';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

let inMemoryProjects: IProject[] = [
  {
    id: 1,
    title: 'Clean Water Initiative',
    description: 'Providing clean water access to 5 rural communities through borehole construction and maintenance.',
    goal: 50000,
    raised: 32500,
    supporters: 145,
    image: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Community Development',
    urgent: true,
  },
  {
    id: 2,
    title: 'Youth Scholarship Program',
    description: 'Supporting education for underprivileged youth through scholarships and educational materials.',
    goal: 30000,
    raised: 18750,
    supporters: 89,
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Education',
    urgent: false,
  },
  {
    id: 3,
    title: 'Elderly Care Outreach',
    description: 'Weekly visits and support for elderly community members including medical care and companionship.',
    goal: 20000,
    raised: 15600,
    supporters: 67,
    image: 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Healthcare',
    urgent: false,
  },
  {
    id: 4,
    title: 'Youth Center Construction',
    description: 'Building a modern youth center with facilities for worship, education, and recreational activities.',
    goal: 100000,
    raised: 45000,
    supporters: 203,
    image: 'https://images.pexels.com/photos/8468470/pexels-photo-8468470.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Infrastructure',
    urgent: true,
  },
];

let inMemoryDonations: IDonation[] = [];

export const getProjects = async (_req: Request, res: Response): Promise<void> => {
  if (config.useInMemoryMock) {
    res.status(200).json({ success: true, count: inMemoryProjects.length, data: inMemoryProjects });
    return;
  }

  const projects = await ProjectModel.find();
  res.status(200).json({ success: true, count: projects.length, data: projects });
};

export const submitDonation = async (req: Request, res: Response): Promise<void> => {
  const { projectId, amount, donorName, donorEmail } = req.body;

  if (config.useInMemoryMock) {
    const project = inMemoryProjects.find((p) => p.id === projectId);
    if (!project) {
      throw new ApiError(404, `Project with ID ${projectId} not found.`);
    }

    project.raised += amount;
    project.supporters += 1;

    const newDonation: IDonation = {
      id: Date.now().toString(),
      projectId,
      amount,
      donorName,
      donorEmail,
      createdAt: new Date().toISOString(),
    };
    inMemoryDonations.push(newDonation);

    res.status(201).json({
      success: true,
      message: 'Donation processed successfully. Thank you for your support!',
      data: {
        donation: newDonation,
        updatedProject: project,
      },
    });
    return;
  }

  const project = await ProjectModel.findOne({ numericId: projectId });
  if (!project) {
    throw new ApiError(404, `Project with ID ${projectId} not found.`);
  }

  project.raised += amount;
  project.supporters += 1;
  await project.save();

  const donationDoc = await DonationModel.create({
    projectId,
    amount,
    donorName,
    donorEmail,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({
    success: true,
    message: 'Donation processed successfully. Thank you for your support!',
    data: {
      donation: donationDoc,
      updatedProject: project,
    },
  });
};
