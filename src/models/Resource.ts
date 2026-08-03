import { Schema, model, Document } from 'mongoose';

export interface IResource {
  id: number;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'audio';
  category: string;
  downloadUrl: string;
  image: string;
  featured: boolean;
}

export interface IResourceDocument extends Omit<IResource, 'id'>, Document {
  numericId: number;
}

const resourceSchema = new Schema<IResourceDocument>(
  {
    numericId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['pdf', 'video', 'audio'], required: true },
    category: { type: String, required: true },
    downloadUrl: { type: String, required: true, default: '#' },
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

export const ResourceModel = model<IResourceDocument>('Resource', resourceSchema);
