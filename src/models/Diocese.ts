import { Schema, model, Document } from 'mongoose';

export interface IParish {
  id: string;
  name: string;
  location?: string;
  coordinates: [number, number];
  isOutstation?: boolean;
}

export interface IArchdeaconry {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  branches: number;
  members: number;
  parishes: IParish[];
}

export interface IArchdeaconryDocument extends Omit<IArchdeaconry, 'id'>, Document {
  archdeaconryId: string;
}

const parishSchema = new Schema<IParish>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    location: { type: String },
    coordinates: { type: [Number], required: true },
    isOutstation: { type: Boolean, default: false },
  },
  { _id: false }
);

const archdeaconrySchema = new Schema<IArchdeaconryDocument>(
  {
    archdeaconryId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    center: { type: [Number], required: true },
    zoom: { type: Number, required: true },
    branches: { type: Number, required: true },
    members: { type: Number, required: true },
    parishes: [parishSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret.archdeaconryId;
        delete ret.archdeaconryId;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ArchdeaconryModel = model<IArchdeaconryDocument>('Archdeaconry', archdeaconrySchema);
