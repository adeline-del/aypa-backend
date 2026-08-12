import { Schema, model, type Document } from 'mongoose';

export interface IEventRegistration {
  eventId: number;
  fullName: string;
  email: string;
  phone: string;
  archdeaconry: string;
  parish: string;
  age?: number;
}

export interface IEventRegistrationDocument
  extends IEventRegistration,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

const eventRegistrationSchema =
  new Schema<IEventRegistrationDocument>(
    {
      eventId: {
        type: Number,
        required: true,
        index: true,
      },

      fullName: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      archdeaconry: {
        type: String,
        required: true,
        trim: true,
      },

      parish: {
        type: String,
        required: true,
        trim: true,
      },

      age: {
        type: Number,
        min: 1,
        max: 120,
      },
    },
    {
      timestamps: true,
    },
  );

export const EventRegistrationModel =
  model<IEventRegistrationDocument>(
    'EventRegistration',
    eventRegistrationSchema,
  );