import { Schema, model, Document } from 'mongoose';

export interface IBranch {
  id: string;
  name: string;
  code: string;
  description?: string;
  location?: string;
  archdeaconryId: string;
  dioceseId: string;
  executiveIds: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBranchDocument extends Omit<IBranch, 'id'>, Document {}

const branchSchema = new Schema<IBranchDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    archdeaconryId: { type: String, required: true, index: true },
    dioceseId: { type: String, required: true, default: 'accra', index: true },
    executiveIds: { type: [String], default: [] },
    isActive: { type: Boolean, required: true, default: true },
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

export const BranchModel = model<IBranchDocument>('Branch', branchSchema);
