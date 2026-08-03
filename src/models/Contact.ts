import { Schema, model, Document } from 'mongoose';

export interface IContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface IContactMessageDocument extends Omit<IContactMessage, 'id'>, Document {}

const contactMessageSchema = new Schema<IContactMessageDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
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

export const ContactMessageModel = model<IContactMessageDocument>('ContactMessage', contactMessageSchema);
