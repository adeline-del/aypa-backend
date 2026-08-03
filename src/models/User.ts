import { Schema, model, Document } from 'mongoose';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'youth' | 'executive';
  profileImage?: string;
  memberSince: string;
  isApproved: boolean;
  church?: string;
  phone?: string;
}

export interface IUserDocument extends Omit<IUser, 'id'>, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['youth', 'executive'], required: true, default: 'youth' },
    profileImage: { type: String, default: '' },
    memberSince: { type: String, required: true },
    isApproved: { type: Boolean, required: true, default: true },
    church: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

export const UserModel = model<IUserDocument>('User', userSchema);
