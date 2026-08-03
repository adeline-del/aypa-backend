import { Schema, model, Document } from 'mongoose';

export interface IProgram {
  id: number;
  title: string;
  description: string;
  schedule: string;
  location: string;
  ageGroup: string;
  category: string;
  features: string[];
  image: string;
  featured: boolean;
}

export interface IProgramDocument extends Omit<IProgram, 'id'>, Document {
  numericId: number;
}

const programSchema = new Schema<IProgramDocument>(
  {
    numericId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    schedule: { type: String, required: true },
    location: { type: String, required: true },
    ageGroup: { type: String, required: true },
    category: { type: String, required: true },
    features: [{ type: String, required: true }],
    image: { type: String, required: true },
    featured: { type: Boolean, required: true, default: false },
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

export const ProgramModel = model<IProgramDocument>('Program', programSchema);
