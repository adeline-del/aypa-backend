import { Schema, model, Document } from 'mongoose';

export interface IResource {
  id: number;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'audio' | string;
  category: string;
  downloadUrl: string;
  fileUrl?: string;
  image?: string;
  featured: boolean;
  publicId?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt?: Date;
}

export interface IResourceDocument extends Omit<IResource, 'id'>, Document {
  numericId: number;
}

const resourceSchema = new Schema<IResourceDocument>(
  {
    numericId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: false, default: '' },
    type: { type: String, required: true, default: 'pdf' },
    category: { type: String, required: true },
    downloadUrl: { type: String, required: true, default: '#' },
    fileUrl: { type: String, required: false },
    image: { type: String, required: false, default: '' },
    featured: { type: Boolean, required: true, default: false },
    publicId: { type: String, required: false },
    originalFilename: { type: String, required: false },
    mimeType: { type: String, required: false },
    fileSize: { type: Number, required: false },
    uploadedBy: { type: String, required: false },
    uploadedAt: { type: Date, required: false, default: Date.now },
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
