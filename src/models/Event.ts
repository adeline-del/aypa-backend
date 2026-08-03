import { Schema, model, Document } from 'mongoose';

export interface IEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  capacity: number;
  registered: number;
  isLive: boolean;
  streamUrl?: string;
  image: string;
}

export interface IEventDocument extends Omit<IEvent, 'id'>, Document {
  numericId: number;
}

const eventSchema = new Schema<IEventDocument>(
  {
    numericId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    capacity: { type: Number, required: true },
    registered: { type: Number, required: true, default: 0 },
    isLive: { type: Boolean, required: true, default: false },
    streamUrl: { type: String, default: '' },
    image: { type: String, required: true },
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

export const EventModel = model<IEventDocument>('Event', eventSchema);
