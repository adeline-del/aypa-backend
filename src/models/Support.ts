import { Schema, model, Document } from 'mongoose';

export interface IProject {
  id: number;
  title: string;
  description: string;
  goal: number;
  raised: number;
  supporters: number;
  image: string;
  category: string;
  urgent: boolean;
}

export interface IDonation {
  id: string;
  projectId: number;
  amount: number;
  donorName: string;
  donorEmail: string;
  createdAt: string;
}

export interface IProjectDocument extends Omit<IProject, 'id'>, Document {
  numericId: number;
}

export interface IDonationDocument extends Omit<IDonation, 'id'>, Document {}

const projectSchema = new Schema<IProjectDocument>(
  {
    numericId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    goal: { type: Number, required: true },
    raised: { type: Number, required: true, default: 0 },
    supporters: { type: Number, required: true, default: 0 },
    image: { type: String, required: true },
    category: { type: String, required: true },
    urgent: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret.numericId;
        delete ret.numericId;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const donationSchema = new Schema<IDonationDocument>(
  {
    projectId: { type: Number, required: true },
    amount: { type: Number, required: true },
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ProjectModel = model<IProjectDocument>('Project', projectSchema);
export const DonationModel = model<IDonationDocument>('Donation', donationSchema);
